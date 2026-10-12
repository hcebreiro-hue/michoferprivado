import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Información de versión y compilación de la app.
 *
 * La versión visible (1.2.0, etc.) se define UNA sola vez en `app.json`
 * (`version`) y el `versionCode` de Android lo calcula automáticamente el
 * plugin `plugins/withBuildStamp.js` en cada build, derivado de la fecha.
 *
 * En desarrollo (Expo Go) no hay APK nativo, así que caemos a valores
 * razonables en lugar de mostrar datos falsos.
 */

/** Nombre del paquete nativo, usado para leer el BuildConfig de Android. */
const ANDROID_PACKAGE = 'com.michoferprivado.app';

/**
 * Lee `BuildConfig.BUILD_STAMP` (fecha ISO de compilación). No existe en
 * desarrollo ni en iOS, por eso se envuelve en try/catch.
 */
function readNativeBuildStamp(): string | null {
  if (Platform.OS !== 'android') return null;
  try {
    const buildConfig = NativeModules?.[ANDROID_PACKAGE]?.BuildConfig;
    return typeof buildConfig?.BUILD_STAMP === 'string' ? buildConfig.BUILD_STAMP : null;
  } catch {
    return null;
  }
}

/** Versión visible de la app (la de app.json). */
export const appVersion: string =
  Constants.expoConfig?.version ?? '1.0.0';

/**
 * Número de build interno de Android. En Expo Go es null porque no hay APK
 * nativo propio.
 */
export const buildNumber: number | null =
  Platform.OS === 'android' ? (Constants.nativeBuildVersion ?? null) : null;

/** Fecha/hora en que se compiló el APK, o null si corre en desarrollo. */
export const buildStamp: string | null = readNativeBuildStamp();

/** true si la app corre desde un APK compilado (no en Expo Go). */
export const isReleaseBuild = buildStamp !== null;

/** Fecha de compilación ya formateada para mostrar, o null. */
export function formatBuildDate(): string | null {
  if (!buildStamp) return null;
  const date = new Date(buildStamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Hora de compilación formateada, o null. */
export function formatBuildTime(): string | null {
  if (!buildStamp) return null;
  const date = new Date(buildStamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Texto de una línea para "Acerca de". Ejemplo:
 *   "Versión 1.2.0 (build 26101203) · Compilado el 12/10/2026 13:45"
 */
export function versionSummary(): string {
  const parts = [`Versión ${appVersion}`];
  if (buildNumber !== null) parts.push(`build ${buildNumber}`);
  const date = formatBuildDate();
  const time = formatBuildTime();
  if (date) parts.push(`Compilado el ${date}${time ? ` ${time}` : ''}`);
  return parts.join(' · ');
}
