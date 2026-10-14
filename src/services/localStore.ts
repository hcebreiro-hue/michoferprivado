import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Almacén local genérico basado en AsyncStorage. Se usa como "modo demo"
 * mientras el chofer no tiene cuenta en la nube (datos de prueba y primer uso),
 * de modo que la app sea completamente funcional desde el primer momento.
 */

const PREFIX = 'michoferprivado:';

export async function loadCollection<T>(key: string): Promise<T[] | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

export async function saveCollection<T>(key: string, value: T[]): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function loadValue<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveValue<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

/** Genera un id local suficientemente único. */
export function localId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
