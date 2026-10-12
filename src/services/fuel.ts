import type { FuelLog } from '../types';
import { supabase, hasActiveSession } from '../lib/supabase';
import { loadCollection, saveCollection, localId } from './localStore';
import { seedFuelLogs, withoutDemoSeedRecords } from './seed';

const KEY = 'fuel_logs';

/** Obtiene las cargas de combustible ordenadas por fecha descendente. */
export async function listFuelLogs(seedDemoData = true): Promise<FuelLog[]> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('filled_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as FuelLog[];
  }

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
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as FuelLog;
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
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
    if (error) throw error;
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
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase
      .from('fuel_logs')
      .delete()
      .not('id', 'is', null);
    if (error) throw error;
    return;
  }
  await saveCollection(KEY, []);
}
