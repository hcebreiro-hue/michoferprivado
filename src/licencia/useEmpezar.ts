import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { notify } from '../utils/notify';
import { identidadDeLicencia } from './identidad';
import { useLicencia } from './LicenciaContext';

/**
 * Devuelve la acción "Borrar datos de prueba y empezar" (con confirmación).
 *
 * Marca el perfil como completo: a partir de ahí la app descarta los datos de
 * ejemplo (registros "seed-") y la identidad queda fija. Lo que el chofer cargó
 * a mano mientras probaba se conserva.
 */
export function useEmpezar(): () => void {
  const { licencia } = useLicencia();
  const { settings, updateSettings } = useSettings();

  return useCallback(() => {
    const identidad = identidadDeLicencia(licencia) ?? {
      driver_name: settings.driver_name,
      driver_phone: settings.driver_phone,
    };
    Alert.alert(
      '¿Borrar los datos de prueba?',
      'Se borran los viajes, cargas de combustible, mantenimientos y gastos de ejemplo. Lo que hayas cargado vos se conserva. Tu nombre y tu WhatsApp quedan fijos y ya no se pueden cambiar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar y empezar',
          style: 'destructive',
          onPress: () => {
            updateSettings({ ...identidad, profile_complete: true }).catch((causa: unknown) => {
              notify('No se pudo completar', causa instanceof Error ? causa.message : 'Inténtalo nuevamente.');
            });
          },
        },
      ],
    );
  }, [licencia, settings.driver_name, settings.driver_phone, updateSettings]);
}
