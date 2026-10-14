import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  enabled: boolean;
  /**
   * Abre la sesión de la nube con el token de un solo uso que da el servidor de
   * licencias. El chofer no crea ni escribe mail ni contraseña.
   */
  signInWithToken: (tokenHash: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setSession(null);
          setLoading(false);
          console.error('No se pudo recuperar la sesión de Supabase.', cause);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithToken = useCallback(async (tokenHash: string) => {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        enabled: isSupabaseConfigured,
        signInWithToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
