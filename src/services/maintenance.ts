import type { MaintenanceLog, MaintenanceType } from '../types';
import { supabase, hasActiveSession } from '../lib/supabase';
import { loadCollection, saveCollection, localId } from './localStore';
import { seedMaintenanceLogs, withoutDemoSeedRecords } from './seed';

const KEY = 'maintenance_logs';

/** Obtiene los mantenimientos ordenados por fecha descendente. */
export async function listMaintenanceLogs(
  seedDemoData = true,
): Promise<MaintenanceLog[]> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .order('performed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MaintenanceLog[];
  }

  const stored = await loadCollection<MaintenanceLog>(KEY);
  if (stored == null) {
    const seeded = seedDemoData ? seedMaintenanceLogs() : [];
    await saveCollection(KEY, seeded);
    return seeded;
  }
  const records = seedDemoData ? stored : withoutDemoSeedRecords(stored);
  if (records.length !== stored.length) await saveCollection(KEY, records);
  return records.sort(
    (a, b) =>
      new Date(b.performed_at).getTime() -
      new Date(a.performed_at).getTime(),
  );
}

export type NewMaintenanceLog = Omit<MaintenanceLog, 'id' | 'created_at'>;

/** Registra un mantenimiento realizado. */
export async function createMaintenanceLog(
  input: NewMaintenanceLog,
): Promise<MaintenanceLog> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as MaintenanceLog;
  }

  const logs = (await loadCollection<MaintenanceLog>(KEY)) ?? [];
  const log: MaintenanceLog = {
    ...input,
    id: localId(),
    created_at: new Date().toISOString(),
  };
  await saveCollection(KEY, [...logs, log]);
  return log;
}

/** Elimina un mantenimiento. */
export async function deleteMaintenanceLog(id: string): Promise<void> {
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase
      .from('maintenance_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return;
  }
  const logs = (await loadCollection<MaintenanceLog>(KEY)) ?? [];
  await saveCollection(
    KEY,
    logs.filter((l) => l.id !== id),
  );
}

/** Elimina todos los registros de mantenimiento. */
export async function deleteAllMaintenanceLogs(): Promise<void> {
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase
      .from('maintenance_logs')
      .delete()
      .not('id', 'is', null);
    if (error) throw error;
    return;
  }
  await saveCollection(KEY, []);
}

/**
 * Obtiene el odómetro del último mantenimiento de un tipo, a partir del
 * historial. Sirve como respaldo si no hay ajustes persistidos.
 */
export function lastOdometerForType(
  logs: MaintenanceLog[],
  type: MaintenanceType,
): number {
  const filtered = logs
    .filter((l) => l.type === type)
    .sort(
      (a, b) =>
        new Date(b.performed_at).getTime() -
        new Date(a.performed_at).getTime(),
    );
  return filtered[0]?.odometer_km ?? 0;
}
