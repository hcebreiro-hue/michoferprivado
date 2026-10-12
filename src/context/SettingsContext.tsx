import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { getSettings, saveSettings } from '../services/settings';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  usingSupabase: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const writesRef = useRef<Promise<void>>(Promise.resolve());
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>();
  const loading =
    authLoading || loadedSessionId !== (session?.user.id ?? null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    (async () => {
      try {
        const s = await getSettings();
        if (active) {
          settingsRef.current = s;
          setSettings(s);
        }
      } catch (cause) {
        if (active) {
          console.error('No se pudieron cargar los ajustes.', cause);
        }
      } finally {
        if (active) setLoadedSessionId(session?.user.id ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, session?.user.id]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const operation = writesRef.current.then(async () => {
      const current = settingsRef.current;
      if (
        current.profile_complete &&
        ((patch.driver_name !== undefined &&
          patch.driver_name !== current.driver_name) ||
          (patch.driver_phone !== undefined &&
            patch.driver_phone !== current.driver_phone) ||
          patch.profile_complete === false ||
          (patch.driver_slug !== undefined &&
            patch.driver_slug !== current.driver_slug))
      ) {
        throw new Error(
          'Los datos identificatorios del perfil no se pueden cambiar después del alta.',
        );
      }

      const saved = await saveSettings({ ...current, ...patch });
      settingsRef.current = saved;
      setSettings(saved);
    });
    writesRef.current = operation.catch(() => undefined);
    return operation;
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, updateSettings, usingSupabase: isSupabaseConfigured }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider');
  }
  return ctx;
}
