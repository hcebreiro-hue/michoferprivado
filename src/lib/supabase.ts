import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Lee las variables desde el .env (Expo las expone con prefijo EXPO_PUBLIC_*).
// También permite configurarlas en app.json -> expo.extra como alternativa.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

/** true si hay credenciales de Supabase configuradas. */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * true solo si hay una sesión de chofer activa. Es el que decide el "modo
 * real" (multi-chofer, Supabase). Sin sesión —aunque haya credenciales— la app
 * funciona en modo local en el dispositivo. El login es opcional y se activa
 * desde Configuración cuando el chofer quiere dar de alta su cuenta real.
 */
export async function hasActiveSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/**
 * Cliente de Supabase. Es `null` cuando no hay credenciales; en ese caso la
 * app funciona en "modo demo" usando almacenamiento local (AsyncStorage).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Deep link para recuperación de contraseña / OAuth (referencia para el futuro).
export const redirectTo = Linking.createURL('/');
