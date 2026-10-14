import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { guardarSesion, leerSesion, suscribir, type Sesion } from '../lib/api';

interface AuthContextValue {
  /** Sesión de la nube del chofer (la abre sola la app; null = modo local). */
  session: Sesion | null;
  loading: boolean;
  /** Siempre true: el servidor de Senda es parte de la app, no hay nada que configurar. */
  enabled: boolean;
  /**
   * Guarda la sesión que entregó el servidor de licencias al activar. El chofer no
   * crea ni escribe mail ni contraseña.
   */
  abrirSesion: (sesion: Sesion) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Se avisa cada vez que la sesión se guarda o se borra (por ejemplo, si el servidor
    // la revoca al renovarla): la app pasa sola de la nube al modo local y al revés.
    const dejarDeEscuchar = suscribir((nueva) => {
      if (active) setSession(nueva);
    });
    leerSesion()
      .then((guardada) => {
        if (active) setSession(guardada);
      })
      .catch((cause: unknown) => {
        console.error('No se pudo recuperar la sesión.', cause);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      dejarDeEscuchar();
    };
  }, []);

  const abrirSesion = useCallback((sesion: Sesion) => guardarSesion(sesion), []);

  return (
    <AuthContext.Provider
      value={{ session, loading, enabled: true, abrirSesion }}
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
