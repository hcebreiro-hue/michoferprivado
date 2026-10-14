import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { perfilPendiente } from './identidad';
import { useLicencia } from './LicenciaContext';

/**
 * Completa el perfil del chofer con los datos de su licencia (nombre cargado
 * por el dueño + WhatsApp). Va DENTRO del guardia: solo corre con licencia
 * vigente.
 *
 * Mientras aplica el perfil no muestra la app, para que el chofer no vea ni un
 * instante los datos de ejemplo ni el nombre "Conductor". Si falla, deja pasar
 * igual: nunca debe quedar trabado por esto.
 */
export function AplicarIdentidad({ children }: { children: React.ReactNode }) {
  const { licencia } = useLicencia();
  const { settings, loading, updateSettings } = useSettings();
  const [fallo, setFallo] = useState(false);

  const pendiente = loading ? null : perfilPendiente(licencia, settings.profile_complete);

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

  if (loading) return null;
  if (pendiente && !fallo) return null;
  return <>{children}</>;
}
