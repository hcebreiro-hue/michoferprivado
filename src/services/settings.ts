import type { AccountType, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { api, hayCuenta } from '../lib/api';
import { loadValue, saveValue } from './localStore';

const KEY = 'settings';

/** Normaliza el tipo de cuenta leído de la base a un valor válido. */
function normalizeAccountType(value: unknown): AccountType {
  return typeof value === 'string' && value.trim().toUpperCase() === 'VIP_PAGO'
    ? 'VIP_PAGO'
    : 'VIP_GRATIS';
}

export function driverSlugFromName(name: string, ownerId?: string): string {
  const nameSlug =
    name
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'conductor';
  return ownerId
    ? `${nameSlug}-${ownerId.replace(/-/g, '').toLowerCase()}`
    : nameSlug;
}

/** Une lo que devuelve el servidor con los valores por defecto (fechas vacías = ''). */
function desdeServidor(data: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    driver_slug: data.driver_slug ?? '',
    profile_complete: data.profile_complete ?? false,
    vtv_expiry: data.vtv_expiry ?? '',
    license_expiry: data.license_expiry ?? '',
    insurance_expiry: data.insurance_expiry ?? '',
    tipo_cuenta: normalizeAccountType(data.tipo_cuenta),
  };
}

/** Obtiene los ajustes (con valores por defecto si no existen). */
export async function getSettings(): Promise<Settings> {
  if (await hayCuenta()) {
    // null = el chofer todavía no guardó su perfil en la nube.
    const data = await api<Partial<Settings> | null>('/v1/settings');
    return data ? desdeServidor(data) : { ...DEFAULT_SETTINGS };
  }

  const stored = await loadValue<Settings>(KEY);
  const merged = stored
    ? { ...DEFAULT_SETTINGS, ...stored }
    : { ...DEFAULT_SETTINGS };
  return { ...merged, tipo_cuenta: normalizeAccountType(merged.tipo_cuenta) };
}

/** Guarda los ajustes (en la nube si hay sesión; si no, en el dispositivo). */
export async function saveSettings(settings: Settings): Promise<Settings> {
  if (await hayCuenta()) {
    // El servidor decide el slug público y el tipo de cuenta (la app no los elige): se
    // mandan los demás campos y se usa lo que devuelve.
    const { driver_slug: _slug, tipo_cuenta: _tipo, ...editable } = settings;
    const data = await api<Partial<Settings>>('/v1/settings', {
      method: 'PUT',
      body: {
        ...editable,
        vtv_expiry: settings.vtv_expiry || null,
        license_expiry: settings.license_expiry || null,
        insurance_expiry: settings.insurance_expiry || null,
      },
    });
    return desdeServidor(data);
  }

  const saved = {
    ...settings,
    driver_slug:
      settings.driver_slug || driverSlugFromName(settings.driver_name),
  };
  await saveValue(KEY, saved);
  return { ...saved, tipo_cuenta: normalizeAccountType(saved.tipo_cuenta) };
}

