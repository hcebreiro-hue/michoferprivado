import type { AccountType, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { supabase, hasActiveSession } from '../lib/supabase';
import { loadValue, saveValue, saveCollection } from './localStore';
import {
  seedTrips,
  seedFuelLogs,
  seedMaintenanceLogs,
  seedFixedCosts,
} from './seed';

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

/** Obtiene los ajustes (con valores por defecto si no existen). */
export async function getSettings(): Promise<Settings> {
  if (supabase && (await hasActiveSession())) {
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError) throw authError;
    const user = session?.user;
    if (!user) return { ...DEFAULT_SETTINGS };

    const { data, error } = await supabase
      .from('driver_settings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ...DEFAULT_SETTINGS };

    return {
      ...DEFAULT_SETTINGS,
      ...(data as Partial<Settings>),
      driver_slug: data.driver_slug ?? '',
      profile_complete: data.profile_complete ?? false,
      vtv_expiry: data.vtv_expiry ?? '',
      license_expiry: data.license_expiry ?? '',
      insurance_expiry: data.insurance_expiry ?? '',
      tipo_cuenta: normalizeAccountType(data.tipo_cuenta),
    };
  }

  const stored = await loadValue<Settings>(KEY);
  const merged = stored
    ? { ...DEFAULT_SETTINGS, ...stored }
    : { ...DEFAULT_SETTINGS };
  return { ...merged, tipo_cuenta: normalizeAccountType(merged.tipo_cuenta) };
}

/** Guarda los ajustes (upsert en Supabase, persistencia local en demo). */
export async function saveSettings(settings: Settings): Promise<Settings> {
  if (supabase && (await hasActiveSession())) {
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError) throw authError;
    const user = session?.user;
    if (!user) throw new Error('Inicia sesión para guardar tu configuración.');

    const driverSlug =
      settings.driver_slug || driverSlugFromName(settings.driver_name, user.id);
    const { data, error } = await supabase
      .from('driver_settings')
      .upsert({
        ...settings,
        owner_id: user.id,
        driver_slug: driverSlug,
        tipo_cuenta: normalizeAccountType(settings.tipo_cuenta),
        vtv_expiry: settings.vtv_expiry || null,
        license_expiry: settings.license_expiry || null,
        insurance_expiry: settings.insurance_expiry || null,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...DEFAULT_SETTINGS,
      ...(data as Partial<Settings>),
      driver_slug: data.driver_slug ?? driverSlug,
      profile_complete: data.profile_complete ?? false,
      vtv_expiry: data.vtv_expiry ?? '',
      license_expiry: data.license_expiry ?? '',
      insurance_expiry: data.insurance_expiry ?? '',
      tipo_cuenta: normalizeAccountType(data.tipo_cuenta),
    };
  }

  const saved = {
    ...settings,
    driver_slug:
      settings.driver_slug || driverSlugFromName(settings.driver_name),
  };
  await saveValue(KEY, saved);
  return { ...saved, tipo_cuenta: normalizeAccountType(saved.tipo_cuenta) };
}

/**
 * Restablece la app al estado de demostración: vuelve al perfil genérico
 * "Conductor" (perfil incompleto) y recarga los datos de ejemplo en el
 * dispositivo. Es la acción del botón "Volver a datos de ejemplo" de Ajustes.
 * Solo afecta el almacenamiento local; para salir del modo cuenta hay que
 * cerrar sesión por separado.
 */
export async function resetToDemo(): Promise<void> {
  await saveValue(KEY, { ...DEFAULT_SETTINGS });
  await saveCollection('trips', seedTrips());
  await saveCollection('fuel_logs', seedFuelLogs());
  await saveCollection('maintenance_logs', seedMaintenanceLogs());
  await saveCollection('fixed_costs', seedFixedCosts());
}
