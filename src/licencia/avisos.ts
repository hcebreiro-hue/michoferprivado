import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { guardarAvisosGracia, leerAvisosGracia } from './almacen';
import type { LicenciaPayload } from './verificar';

/**
 * Los 3 avisos de gracia: uno cada 24 hs a partir del vencimiento. Son
 * notificaciones LOCALES: funcionan sin internet. Se programan por adelantado
 * apenas llega una licencia con vencimiento, así suenan aunque el chofer no
 * abra la app.
 *
 * Mismo criterio que `src/services/notifications.ts`: el módulo se carga solo
 * si no estamos en Expo Go, y un fallo acá nunca rompe la app.
 */

type Notificaciones = typeof import('expo-notifications');

const CANAL = 'licencia';
const ID_AVISO = (n: number) => `licencia-gracia-${n}`;
const MS_DIA = 86_400_000;
const CANTIDAD = 3;

function cargar(): Notificaciones | null {
  if (isRunningInExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as Notificaciones;
  } catch {
    return null;
  }
}

/** Instantes (ms) de los 3 avisos: vence + 0, +24 h y +48 h. */
export function instantesDeAviso(vence: string): number[] {
  const base = Date.parse(vence);
  return Array.from({ length: CANTIDAD }, (_, i) => base + i * MS_DIA);
}

/**
 * Programa los avisos de gracia de esta licencia. Es idempotente: si ya se
 * programaron para este mismo vencimiento no hace nada, y si el vencimiento
 * cambió (renovación) cancela los viejos y programa los nuevos.
 * Devuelve cuántos quedaron programados.
 */
export async function programarAvisosGracia(licencia: LicenciaPayload, ahora: number): Promise<number> {
  const N = cargar();
  if (!N) return 0;

  try {
    const clave = `${licencia.whatsapp}|${licencia.vence ?? 'vip'}`;
    if ((await leerAvisosGracia()) === clave) return 0;

    for (let i = 0; i < CANTIDAD; i++) {
      await N.cancelScheduledNotificationAsync(ID_AVISO(i)).catch(() => undefined);
    }
    if (licencia.vence === null) {
      await guardarAvisosGracia(clave);
      return 0; // VIP: nada que avisar
    }

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CANAL, {
        name: 'Aviso de licencia',
        importance: N.AndroidImportance.HIGH,
      });
    }
    const permiso = await N.getPermissionsAsync();
    if (permiso.status !== 'granted') {
      const pedido = await N.requestPermissionsAsync();
      if (pedido.status !== 'granted') return 0; // sin permiso: no se marca como hecho, se reintenta
    }

    let programados = 0;
    const instantes = instantesDeAviso(licencia.vence);
    for (let i = 0; i < instantes.length; i++) {
      if (instantes[i] <= ahora) continue;
      await N.scheduleNotificationAsync({
        identifier: ID_AVISO(i),
        content: {
          title: 'Tu licencia de Senda venció',
          body:
            i < CANTIDAD - 1
              ? 'Te quedan unos días de gracia. Pedí la renovación por WhatsApp para no perder el acceso.'
              : 'Último aviso: mañana se bloquea la carga de datos. Renová por WhatsApp.',
          data: { tipo: 'licencia' },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(instantes[i]), channelId: CANAL },
      });
      programados++;
    }
    await guardarAvisosGracia(clave);
    return programados;
  } catch (causa) {
    console.warn('No se pudieron programar los avisos de licencia.', causa);
    return 0;
  }
}
