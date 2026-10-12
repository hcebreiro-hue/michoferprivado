import type { Trip } from '../types';
import { supabase, hasActiveSession } from '../lib/supabase';
import {
  loadCollection,
  saveCollection,
  localId,
} from './localStore';
import { seedTrips, withoutDemoSeedRecords } from './seed';

const KEY = 'trips';

/** Obtiene todos los viajes ordenados por fecha ascendente. */
export async function listTrips(seedDemoData = true): Promise<Trip[]> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Trip[];
  }

  const stored = await loadCollection<Trip>(KEY);
  if (stored == null) {
    const seeded = seedDemoData ? seedTrips() : [];
    await saveCollection(KEY, seeded);
    return seeded;
  }
  const records = seedDemoData ? stored : withoutDemoSeedRecords(stored);
  if (records.length !== stored.length) await saveCollection(KEY, records);
  return records.sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
}

export type NewTrip = Omit<Trip, 'id' | 'created_at'>;

/** Crea un viaje y devuelve el registro creado. */
export async function createTrip(input: NewTrip): Promise<Trip> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('trips')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as Trip;
  }

  const trips = (await loadCollection<Trip>(KEY)) ?? [];
  const trip: Trip = {
    ...input,
    id: localId(),
    created_at: new Date().toISOString(),
  };
  await saveCollection(KEY, [...trips, trip]);
  return trip;
}

/** Actualiza un viaje existente. */
export async function updateTrip(
  id: string,
  patch: Partial<Trip>,
): Promise<Trip> {
  if (supabase && (await hasActiveSession())) {
    const { data, error } = await supabase
      .from('trips')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Trip;
  }

  const trips = (await loadCollection<Trip>(KEY)) ?? [];
  const idx = trips.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Viaje no encontrado');
  const updated = { ...trips[idx], ...patch };
  trips[idx] = updated;
  await saveCollection(KEY, trips);
  return updated;
}

/** Elimina un viaje. */
export async function deleteTrip(id: string): Promise<void> {
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const trips = (await loadCollection<Trip>(KEY)) ?? [];
  await saveCollection(
    KEY,
    trips.filter((t) => t.id !== id),
  );
}

/** Elimina todos los viajes. */
export async function deleteAllTrips(): Promise<void> {
  if (supabase && (await hasActiveSession())) {
    const { error } = await supabase
      .from('trips')
      .delete()
      .not('id', 'is', null);
    if (error) throw error;
    return;
  }
  await saveCollection(KEY, []);
}
