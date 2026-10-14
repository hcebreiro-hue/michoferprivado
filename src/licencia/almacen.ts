import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Estado local de la licencia. Va en AsyncStorage (ya instalado), NO en
 * expo-secure-store: nada de lo que se guarda acá es secreto (el token está
 * firmado, no cifrado) y su integridad la da la firma, no el almacenamiento.
 *
 * Reinstalar el APK borra todo esto. Es lo esperado: lo que impide ganar días es
 * el servidor, que recuerda el equipo y la fecha de inicio.
 */

const PREFIJO = 'licencia:';
const K_TOKEN = `${PREFIJO}token`;
const K_TOPE = `${PREFIJO}tope`;
const K_ULTIMA_VISTA = `${PREFIJO}ultima_vista`;
const K_WHATSAPP = `${PREFIJO}whatsapp`;
const K_AVISOS = `${PREFIJO}avisos_gracia`;
const K_BIENVENIDA = `${PREFIJO}bienvenida_vista`;

export const leerToken = () => AsyncStorage.getItem(K_TOKEN);
export const guardarToken = (token: string) => AsyncStorage.setItem(K_TOKEN, token);
export const borrarToken = () => AsyncStorage.removeItem(K_TOKEN);

export const leerTope = () => AsyncStorage.getItem(K_TOPE);
export const guardarTope = (token: string) => AsyncStorage.setItem(K_TOPE, token);

/** WhatsApp que el chofer escribió, para no pedírselo de nuevo en cada chequeo. */
export const leerWhatsapp = () => AsyncStorage.getItem(K_WHATSAPP);
export const guardarWhatsapp = (w: string) => AsyncStorage.setItem(K_WHATSAPP, w);

/** La pantalla de bienvenida se muestra una sola vez tras activar. */
export async function leerBienvenidaVista(): Promise<boolean> {
  return (await AsyncStorage.getItem(K_BIENVENIDA)) === '1';
}
export const guardarBienvenidaVista = () => AsyncStorage.setItem(K_BIENVENIDA, '1');

export async function leerUltimaVista(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(K_ULTIMA_VISTA);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Guarda la mayor hora vista: nunca retrocede. */
export async function guardarUltimaVista(ahora: number): Promise<void> {
  const actual = await leerUltimaVista();
  if (actual === null || ahora > actual) {
    await AsyncStorage.setItem(K_ULTIMA_VISTA, String(ahora));
  }
}

/** Avisos de gracia ya programados para un vencimiento dado (evita duplicarlos). */
export async function leerAvisosGracia(): Promise<string | null> {
  return AsyncStorage.getItem(K_AVISOS);
}
export const guardarAvisosGracia = (clave: string) => AsyncStorage.setItem(K_AVISOS, clave);
