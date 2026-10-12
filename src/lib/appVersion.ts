import Constants from 'expo-constants';
import * as Application from 'expo-application';

/**
 * Información de versión y compilación de la app.
 *
 * La versión visible (1.2.0, etc.) se define UNA sola vez en `app.json`
 * (`version`) y el `versionCode` de Android lo calcula automáticamente el
 * plugin `plugins/withBuildStamp.js` en cada build, derivado de la fecha.
 *
 * Ojo con `buildConfigField`: genera una constante JAVA dentro de `BuildConfig`,
 * que NO es un módulo de React Native y por eso NUNCA es alcanzable desde JS
 * (`NativeModules[paquete].BuildConfig` es `undefined`). Verificar que el string
 * está en el dex no alcanza: el dex es código nativo. Por eso la fecha se
 * DECODIFICA del `versionCode`, que sí llega a JS vía `expo-application`.
 */

/** Nombre del paquete nativo, informativo. */
const ANDROID_PACKAGE = 'com.michoferprivado.app';

/** Año base del `versionCode` (guarda solo 2 dígitos: 26 -> 2026). */
const VERSION_CODE_CENTURY = 2000;

/** Versión visible de la app (la de app.json). */
export const appVersion: string =
  Constants.expoConfig?.version ?? '1.0.0';

/**
 * Número de build interno (el `versionCode` de Android). `expo-application` es
 * la API vigente: `Constants.nativeBuildVersion` no existe y la vieja
 * `Constants.platform.android.versionCode` está deprecada. Devuelve null en
 * Expo Go y en web, donde no hay binario nativo propio.
 */
export const buildNumber: number | null = (() => {
  const raw = Application.nativeBuildVersion;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
})();

/**
 * Decodifica la fecha de compilación desde el `versionCode`.
 *
 * El plugin codifica el versionCode como `AAMMDDNN`: año(2) mes(2) día(2) más
 * un contador de build del día (2). Los dos últimos dígitos son minutos del día
 * truncados a 99, así que NO permiten recuperar la hora: solo la fecha.
 *
 * Devuelve null si el número no tiene esa forma (versionCode puesto a mano,
 * plataforma sin build propio, etc.), en lugar de inventar una fecha.
 */
export function decodeBuildDate(versionCode: number | null): Date | null {
  if (versionCode == null || !Number.isInteger(versionCode)) return null;

  const digits = String(versionCode);
  if (!/^\d{8}$/.test(digits)) return null;

  const year = VERSION_CODE_CENTURY + Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));

  // Meses en JS van de 0 a 11.
  const date = new Date(year, month - 1, day);
  const esValida =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return esValida ? date : null;
}

/** Fecha en que se compiló el APK, o null si corre en desarrollo. */
export const buildDate: Date | null = decodeBuildDate(buildNumber);

/** true si la app corre desde un APK compilado (no en Expo Go). */
export const isReleaseBuild = buildNumber !== null;

/** Fecha de compilación ya formateada para mostrar, o null. */
export function formatBuildDate(): string | null {
  if (!buildDate) return null;
  return buildDate.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Texto de una línea para "Acerca de". Ejemplo:
 *   "Versión 1.2.0 (build 26101203) · Compilado el 12/10/2026"
 */
export function versionSummary(): string {
  const parts = [`Versión ${appVersion}`];
  if (buildNumber !== null) parts.push(`build ${buildNumber}`);
  const date = formatBuildDate();
  if (date) parts.push(`Compilado el ${date}`);
  return parts.join(' · ');
}

/** Nombre del paquete nativo, para pruebas. @internal */
export { ANDROID_PACKAGE };
