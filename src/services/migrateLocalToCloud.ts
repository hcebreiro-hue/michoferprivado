import type {
  FixedCost,
  FuelLog,
  MaintenanceLog,
  Settings,
  Trip,
} from '../types';
import { api, leerSesion } from '../lib/api';
import { loadCollection, loadValue, saveValue } from './localStore';
import { withoutDemoSeedRecords } from './seed';
import { saveSettings } from './settings';

export interface MigrationSummary {
  trips: number;
  fuelLogs: number;
  maintenanceLogs: number;
  fixedCosts: number;
  profileMigrated: boolean;
}

/** Colección local → ruta de la API de Senda. */
type Ruta = '/v1/trips' | '/v1/fuel' | '/v1/maintenance' | '/v1/fixed-costs';

/** Máximo que acepta el servidor por lote (MAX_LOTE en senda-api/src/datos.js). */
const TAMANO_LOTE = 40;

/**
 * Quita el id local antes de enviar: el servidor genera el suyo (UUID) y asigna el
 * dueño a partir de la sesión. Se conserva created_at para no alterar el orden ni el
 * historial (el servidor lo respeta).
 */
function toInsertPayload<T extends { id: string }>(record: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = record;
  return rest;
}

/**
 * Migra una colección local a la nube solo si la nube está vacía para este
 * chofer (así nunca duplica ni pisa datos que ya estén cargados). Devuelve
 * la cantidad de registros migrados.
 */
async function migrateCollection(
  ruta: Ruta,
  localRecords: { id: string }[],
  choferId: number,
): Promise<number> {
  if (localRecords.length === 0) return 0;
  // Avance guardado: cuántos registros de esta colección ya subieron. Si un lote falla a
  // mitad de camino, el reintento retoma desde ahí; sin esto, al ver datos en la nube se
  // daría por terminada la migración y los registros restantes nunca subirían.
  const claveAvance = `migrated_progress:${choferId}:${ruta}`;
  const hechos = (await loadValue<number>(claveAvance)) ?? 0;
  if (hechos === 0) {
    const enNube = await api<unknown[]>(ruta);
    if (enNube.length > 0) return 0; // ya hay datos en la nube: no duplicar
  }
  // Por lotes de 40, cada uno todo o nada en el servidor.
  for (let i = hechos; i < localRecords.length; i += TAMANO_LOTE) {
    const lote = localRecords.slice(i, i + TAMANO_LOTE).map(toInsertPayload);
    await api(`${ruta}/lote`, { method: 'POST', body: lote });
    await saveValue(claveAvance, Math.min(i + TAMANO_LOTE, localRecords.length));
  }
  return localRecords.length - hechos;
}

/**
 * Migra los datos guardados en modo local (sin cuenta) a la nube la
 * primera vez que el chofer inicia sesión, para que no "pierda" lo que cargó
 * antes de tener cuenta.
 *
 * Es idempotente y segura:
 * - Se ejecuta una sola vez por usuario (bandera `migrated_to_cloud:<id>`).
 * - Nunca pisa datos que ya estén en la nube (migra solo si está vacía).
 * - Excluye los registros de demostración (prefijo "seed-").
 * - Migra también el perfil/ajustes reales (nombre, tarifas, vencimientos).
 *
 * Devuelve un resumen si migró algo, o null si no había nada que hacer.
 */
export async function maybeMigrateLocalToCloud(): Promise<MigrationSummary | null> {
  const sesion = await leerSesion();
  if (!sesion) return null;

  const flagKey = `migrated_to_cloud:${sesion.chofer}`;
  if (await loadValue<boolean>(flagKey)) return null;

  const [localTrips, localFuel, localMaintenance, localCosts, localSettings] =
    await Promise.all([
      loadCollection<Trip>('trips'),
      loadCollection<FuelLog>('fuel_logs'),
      loadCollection<MaintenanceLog>('maintenance_logs'),
      loadCollection<FixedCost>('fixed_costs'),
      loadValue<Settings>('settings'),
    ]);

  const summary: MigrationSummary = await Promise.all([
    migrateCollection('/v1/trips', withoutDemoSeedRecords(localTrips ?? []), sesion.chofer),
    migrateCollection('/v1/fuel', withoutDemoSeedRecords(localFuel ?? []), sesion.chofer),
    migrateCollection(
      '/v1/maintenance',
      withoutDemoSeedRecords(localMaintenance ?? []),
      sesion.chofer,
    ),
    migrateCollection(
      '/v1/fixed-costs',
      withoutDemoSeedRecords(localCosts ?? []),
      sesion.chofer,
    ),
  ]).then(([trips, fuelLogs, maintenanceLogs, fixedCosts]) => ({
    trips,
    fuelLogs,
    maintenanceLogs,
    fixedCosts,
    profileMigrated: false,
  }));

  // Migrar el perfil real (no el genérico "Conductor" ni el perfil incompleto).
  if (
    localSettings &&
    localSettings.driver_name &&
    localSettings.driver_name !== 'Conductor'
  ) {
    await saveSettings(localSettings);
    summary.profileMigrated = true;
  }

  await saveValue(flagKey, true);
  return summary;
}
