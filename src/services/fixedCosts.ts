import type { FixedCost } from '../types';
import { supabase, hasActiveSession } from '../lib/supabase';
import { loadCollection, saveCollection, localId } from './localStore';
import { seedFixedCosts, withoutDemoSeedRecords } from './seed';

const KEY = 'fixed_costs';

/** Lista los gastos fijos mensuales. */
export async function listFixedCosts(seedDemoData = true): Promise<FixedCost[]> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('fixed_costs')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as FixedCost[];
  }

  const stored = await loadCollection<FixedCost>(KEY);
  if (stored == null) {
    const seeded = seedDemoData ? seedFixedCosts() : [];
    await saveCollection(KEY, seeded);
    return seeded;
  }
  const records = seedDemoData ? stored : withoutDemoSeedRecords(stored);
  if (records.length !== stored.length) await saveCollection(KEY, records);
  return records;
}

export type NewFixedCost = Omit<FixedCost, 'id' | 'created_at'>;

/** Crea un gasto fijo. */
export async function createFixedCost(input: NewFixedCost): Promise<FixedCost> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('fixed_costs')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as FixedCost;
  }

  const list = (await loadCollection<FixedCost>(KEY)) ?? [];
  const item: FixedCost = {
    ...input,
    id: localId(),
    created_at: new Date().toISOString(),
  };
  await saveCollection(KEY, [...list, item]);
  return item;
}

/** Actualiza un gasto fijo (monto, etiqueta, activo). */
export async function updateFixedCost(
  id: string,
  patch: Partial<FixedCost>,
): Promise<FixedCost> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('fixed_costs')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as FixedCost;
  }

  const list = (await loadCollection<FixedCost>(KEY)) ?? [];
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Gasto fijo no encontrado');
  const updated = { ...list[idx], ...patch };
  list[idx] = updated;
  await saveCollection(KEY, list);
  return updated;
}

/** Elimina un gasto fijo. */
export async function deleteFixedCost(id: string): Promise<void> {
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase.from('fixed_costs').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const list = (await loadCollection<FixedCost>(KEY)) ?? [];
  await saveCollection(
    KEY,
    list.filter((c) => c.id !== id),
  );
}

/** Elimina todos los costos fijos. */
export async function deleteAllFixedCosts(): Promise<void> {
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase
      .from('fixed_costs')
      .delete()
      .not('id', 'is', null);
    if (error) throw error;
    return;
  }
  await saveCollection(KEY, []);
}
