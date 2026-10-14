import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import * as almacen from './almacen';
import { identidadDeLicencia, perfilPendiente } from './identidad';
import { useLicencia } from './LicenciaContext';
import { PantallaBienvenida } from './PantallaBienvenida';

/**
 * Carga en los ajustes el nombre y el WhatsApp de la licencia (nombre cargado
 * por el dueño). Va DENTRO del guardia: solo corre con licencia vigente.
 *
 * NO completa el perfil: tras activar se muestra una bienvenida (una sola vez)
 * y la app arranca con datos de prueba, que quedan hasta que el chofer toque
 * "Borrar datos de prueba y empezar" (eso completa el perfil y fija la identidad).
 *
 * Mientras aplica la identidad no muestra la app, para que el chofer no vea ni
 * un instante el nombre "Conductor". Si falla, deja pasar igual: nunca debe
 * quedar trabado por esto.
 */
export function AplicarIdentidad({ children }: { children: React.ReactNode }) {
  const { licencia } = useLicencia();
  const { settings, loading, updateSettings } = useSettings();
  const [fallo, setFallo] = useState(false);
  // null = todavía leyendo si ya vio la bienvenida.
  const [bienvenidaVista, setBienvenidaVista] = useState<boolean | null>(null);

  useEffect(() => {
    let activo = true;
    almacen
      .leerBienvenidaVista()
      .then((vista) => activo && setBienvenidaVista(vista))
      .catch(() => activo && setBienvenidaVista(true));
    return () => {
      activo = false;
    };
  }, []);

  const pendiente = loading
    ? null
    : perfilPendiente(licencia, settings.profile_complete, {
        driver_name: settings.driver_name,
        driver_phone: settings.driver_phone,
      });

  useEffect(() => {
    if (!pendiente) return;
    let activo = true;
    updateSettings(pendiente).catch((causa: unknown) => {
      console.error('No se pudo aplicar el perfil de la licencia.', causa);
      if (activo) setFallo(true);
    });
    return () => {
      activo = false;
    };
    // `pendiente` es un objeto nuevo en cada render: se depende de sus datos.
  }, [pendiente?.driver_name, pendiente?.driver_phone, updateSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || bienvenidaVista === null) return null;
  if (pendiente && !fallo) return null;

  const identidad = identidadDeLicencia(licencia);
  if (licencia && identidad && !settings.profile_complete && !bienvenidaVista) {
    return (
      <PantallaBienvenida
        licencia={licencia}
        nombre={identidad.driver_name}
        telefono={identidad.driver_phone}
        onEntrar={() => {
          setBienvenidaVista(true);
          almacen.guardarBienvenidaVista().catch(() => undefined);
        }}
      />
    );
  }
  return <>{children}</>;
}
