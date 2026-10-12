import type {
  FixedCost,
  FuelLog,
  MaintenanceLog,
  Settings,
  Trip,
} from '../types';
import { supabase } from '../lib/supabase';
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

/**
 * Quita el id local antes de insertar en la nube: el id de Supabase es UUID y
 * lo genera la base (gen_random_uuid). Se conserva created_at para no alterar el
 * orden/historial. El owner_id lo asigna el RLS a partir de auth.uid().
 */
function toInsertPayload<T extends { id: string }>(record: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = record;
  return rest;
}

/**
 * Migra una colección local a la nube solo si la nube está vacía para este
 * chofer (así nunca duplica ni pisa datos que ya estén en Supabase). Devuelve
 * la cantidad de registros migrados.
 */
async function migrateCollection(
  table: 'trips' | 'fuel_logs' | 'maintenance_logs' | 'fixed_costs',
  localRecords: { id: string }[],
): Promise<number> {
  if (localRecords.length === 0) return 0;
  const { count, error: countError } = await supabase!
    .from(table)
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0) return 0; // ya hay datos en la nube: no duplicar
  const { error } = await supabase!
    .from(table)
    .insert(localRecords.map(toInsertPayload));
  if (error) throw error;
  return localRecords.length;
}

/**
 * Migra los datos guardados en modo local (sin cuenta) a la nube (Supabase) la
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
  if (!supabase) return null;

  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const userId = auth.session?.user?.id;
  if (!userId) return null;

  const flagKey = `migrated_to_cloud:${userId}`;
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
    migrateCollection('trips', withoutDemoSeedRecords(localTrips ?? [])),
    migrateCollection('fuel_logs', withoutDemoSeedRecords(localFuel ?? [])),
    migrateCollection(
      'maintenance_logs',
      withoutDemoSeedRecords(localMaintenance ?? []),
    ),
    migrateCollection('fixed_costs', withoutDemoSeedRecords(localCosts ?? [])),
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
