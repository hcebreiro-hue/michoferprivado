import type { FuelLog } from '../types';
import { api, hayCuenta } from '../lib/api';
import { loadCollection, saveCollection, localId } from './localStore';
import { seedFuelLogs, withoutDemoSeedRecords } from './seed';

const KEY = 'fuel_logs';

/** Obtiene las cargas de combustible ordenadas por fecha descendente. */
export async function listFuelLogs(seedDemoData = true): Promise<FuelLog[]> {
  if (await hayCuenta()) return api<FuelLog[]>('/v1/fuel');

  const stored = await loadCollection<FuelLog>(KEY);
  if (stored == null) {
    const seeded = seedDemoData ? seedFuelLogs() : [];
    await saveCollection(KEY, seeded);
    return seeded;
  }
  const records = seedDemoData ? stored : withoutDemoSeedRecords(stored);
  if (records.length !== stored.length) await saveCollection(KEY, records);
  return records.sort(
    (a, b) =>
      new Date(b.filled_at).getTime() - new Date(a.filled_at).getTime(),
  );
}

export type NewFuelLog = Omit<FuelLog, 'id' | 'created_at'>;

/** Registra una carga de combustible. */
export async function createFuelLog(input: NewFuelLog): Promise<FuelLog> {
  if (await hayCuenta()) {
    return api<FuelLog>('/v1/fuel', { method: 'POST', body: input });
  }

  const logs = (await loadCollection<FuelLog>(KEY)) ?? [];
  const log: FuelLog = {
    ...input,
    id: localId(),
    created_at: new Date().toISOString(),
  };
  await saveCollection(KEY, [...logs, log]);
  return log;
}

/** Elimina una carga de combustible. */
export async function deleteFuelLog(id: string): Promise<void> {
  if (await hayCuenta()) {
    await api(`/v1/fuel/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return;
  }
  const logs = (await loadCollection<FuelLog>(KEY)) ?? [];
  await saveCollection(
    KEY,
    logs.filter((l) => l.id !== id),
  );
}

/** Elimina todos los registros de combustible. */
export async function deleteAllFuelLogs(): Promise<void> {
  if (await hayCuenta()) {
    await api('/v1/fuel', { method: 'DELETE' });
    return;
  }
  await saveCollection(KEY, []);
}
