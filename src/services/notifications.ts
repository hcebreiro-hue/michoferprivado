import { Platform } from 'react-native';
import type { Trip } from '../types';
import { isCalendarBlock } from '../types';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'trip-reminders';

/** Minutos antes del viaje en que se dispara el recordatorio. */
const REMINDER_MINUTES_BEFORE = 60;

let cachedModule: NotificationsModule | null = null;
let loadAttempted = false;

/**
 * Carga expo-notifications de forma tolerante a fallos. En Expo Go el módulo
 * nativo fue removido (SDK 53+) y su import lanza un error; aquí lo aislamos
 * para que la app no se rompa. Devuelve null si no está disponible.
 */
function getNotifications(): NotificationsModule | null {
  if (loadAttempted) return cachedModule;
  loadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch (cause) {
    console.warn(
      'Las notificaciones no están disponibles en este entorno (p. ej. Expo Go).',
      cause,
    );
    cachedModule = null;
  }
  return cachedModule;
}

/** Identificador determinístico por viaje, para poder cancelarlo/reprogramarlo. */
function reminderId(tripId: string): string {
  return `trip-reminder-${tripId}`;
}

/**
 * Configura el canal de Android y solicita el permiso de notificaciones.
 * Devuelve true si el permiso está concedido.
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de viajes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (cause) {
    console.warn(
      'No se pudieron gestionar los permisos de notificación.',
      cause,
    );
    return false;
  }
}

/**
 * Programa (o reprograma) el recordatorio de un viaje. Si el viaje no califica
 * para recordatorio (de ejemplo, cancelado/completado, en el pasado o bloqueo de
 * agenda), cancela cualquier recordatorio previo y no programa nada.
 */
export async function scheduleTripReminder(trip: Trip): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    // Siempre cancelamos el recordatorio previo antes de reprogramar.
    await Notifications.cancelScheduledNotificationAsync(reminderId(trip.id));

    if (trip.id.startsWith('seed-')) return; // viajes de ejemplo: sin recordatorio
    if (isCalendarBlock(trip)) return; // bloqueos de agenda: no son viajes
    if (trip.status !== 'pending') return; // solo viajes pendientes

    const triggerDate = new Date(
      new Date(trip.scheduled_at).getTime() - REMINDER_MINUTES_BEFORE * 60_000,
    );
    if (triggerDate.getTime() <= Date.now()) return; // ya pasó el momento

    const granted = await ensureNotificationPermissions();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(trip.id),
      content: {
        title: '🚗 Recordatorio de viaje',
        body: `${trip.client_name}: ${trip.origin} → ${trip.destination}`,
        data: { tripId: trip.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: CHANNEL_ID,
      },
    });
  } catch (cause) {
    // Los recordatorios nunca deben romper el flujo de guardado del viaje.
    console.warn('No se pudo programar el recordatorio del viaje.', cause);
  }
}

/** Cancela el recordatorio asociado a un viaje (al eliminarlo). */
export async function cancelTripReminder(tripId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(
    reminderId(tripId),
  ).catch(() => undefined);
}
