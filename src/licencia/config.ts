import { Platform } from 'react-native';
import type { ClavesPublicas } from './verificar';

/**
 * Servidor de Senda (Cloudflare Worker + D1): licencias, sesión y datos de los choferes.
 * Repo: ~/Desarrollos/senda-api. Un subdominio por aplicación: <app>.api.<dominio>.
 */
export const URL_SERVIDOR = 'https://senda.api.unitecapplications.com';

/**
 * Claves PÚBLICAS de verificación, por `kid`. No son secretas (la privada vive
 * solo en el Worker). Para rotar la clave se agrega la nueva acá SIN quitar la
 * vieja hasta que todos los equipos hayan renovado su licencia.
 */
export const CLAVES_PUBLICAS: ClavesPublicas = {
  k1: 'O5AGJZG2v9itfEbxLRINA8TGdj6mU1G-3Z4L0tWlrsQ',
};

/**
 * Tope grabado: pasada esta fecha, este APK NO admite activaciones nuevas (ni
 * reinstalaciones sin licencia): hay que pedir la versión nueva. No afecta a
 * quien ya tiene una licencia vigente en su equipo. Se puede alargar SIN
 * recompilar desde el panel del dueño (el servidor lo firma; solo alarga).
 *
 * 90 días desde el 13/10/2026. Se cambia a mano en cada build nuevo.
 */
export const TOPE_GRABADO = Date.parse('2027-01-11T23:59:59Z');

/** Ningún reloj de teléfono real marca una fecha anterior a esta. */
export const FECHA_MINIMA = Date.parse('2026-10-13T00:00:00Z');

/** Segundos máximos de espera por una respuesta del servidor. */
export const TIMEOUT_SERVIDOR_MS = 12_000;

/** WhatsApp del dueño, para pedir alta o renovar (mismo número de soporte de "Acerca de"). */
export const WHATSAPP_DUENO = '5491157418523';

/**
 * La licencia solo se exige en el APK de Android. La web (portal de reservas
 * para pasajeros) y el desarrollo con Metro quedan libres; para probar el
 * bloqueo en desarrollo: `EXPO_PUBLIC_LICENCIA_FORZAR=1 npx expo start`.
 */
export const LICENCIA_EXIGIDA =
  Platform.OS === 'android' &&
  (!__DEV__ || process.env.EXPO_PUBLIC_LICENCIA_FORZAR === '1');
