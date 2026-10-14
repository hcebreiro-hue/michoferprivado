import type { FixedCost } from '../types';
import { api, hayCuenta } from '../lib/api';
import { loadCollection, saveCollection, localId } from './localStore';
import { seedFixedCosts, withoutDemoSeedRecords } from './seed';

const KEY = 'fixed_costs';

/** Lista los gastos fijos mensuales. */
export async function listFixedCosts(seedDemoData = true): Promise<FixedCost[]> {
  if (await hayCuenta()) return api<FixedCost[]>('/v1/fixed-costs');

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
  if (await hayCuenta()) {
    return api<FixedCost>('/v1/fixed-costs', { method: 'POST', body: input });
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
  if (await hayCuenta()) {
    return api<FixedCost>(`/v1/fixed-costs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
    });
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
  if (await hayCuenta()) {
    await api(`/v1/fixed-costs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
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
  if (await hayCuenta()) {
    await api('/v1/fixed-costs', { method: 'DELETE' });
    return;
  }
  await saveCollection(KEY, []);
}
