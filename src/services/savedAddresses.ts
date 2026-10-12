import type { SavedAddress } from '../types';
import { loadCollection, saveCollection, localId } from './localStore';
import { seedSavedAddresses } from './seed';

// Las direcciones frecuentes son propias del pasajero y se guardan siempre en
// el dispositivo (memoria local), sin necesidad de backend.
const KEY = 'saved_addresses';

/** Lista las direcciones frecuentes del pasajero. */
export async function listSavedAddresses(): Promise<SavedAddress[]> {
  const stored = await loadCollection<SavedAddress>(KEY);
  if (stored == null) {
    const seeded = seedSavedAddresses();
    await saveCollection(KEY, seeded);
    return seeded;
  }
  return stored;
}

/** Agrega una dirección frecuente. */
export async function addSavedAddress(
  label: string,
  address: string,
): Promise<SavedAddress> {
  const list = (await loadCollection<SavedAddress>(KEY)) ?? [];
  const item: SavedAddress = { id: localId(), label, address };
  await saveCollection(KEY, [...list, item]);
  return item;
}

/** Elimina una dirección frecuente. */
export async function removeSavedAddress(id: string): Promise<void> {
  const list = (await loadCollection<SavedAddress>(KEY)) ?? [];
  await saveCollection(
    KEY,
    list.filter((a) => a.id !== id),
  );
}
