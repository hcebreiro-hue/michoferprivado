import { ed25519 } from '@noble/curves/ed25519.js';

/**
 * Verificación de la licencia firmada por el servidor (Ed25519).
 *
 * Es JavaScript puro a propósito: no depende de ningún módulo nativo ni de
 * `TextDecoder`/`atob`, así corre igual en Hermes, en la web y en los tests de
 * Node. NO importa `config.ts` (que depende de react-native): las claves
 * públicas entran por parámetro.
 *
 * Formato del token (lo arma el servidor): base64url(payload JSON) + '.' +
 * base64url(firma). Se verifica sobre los bytes tal cual viajan, sin
 * canonicalizar nada.
 */

export type Plan = 'trial' | 'mensual' | 'anual' | 'vip';

export interface LicenciaPayload {
  v: 1;
  kid: string;
  whatsapp: string;
  equipo: string;
  plan: Plan;
  inicio: string;
  /** null = VIP perpetuo. */
  vence: string | null;
  gracia_hasta: string | null;
  emitida: string;
  offline_hasta: string;
}

export interface TopePayload {
  v: 1;
  kid: string;
  tipo: 'tope';
  hasta: string;
  emitida: string;
}

export type ClavesPublicas = Record<string, string>;

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function b64uADecodificar(texto: string): Uint8Array | null {
  const limpio = texto.replace(/=+$/, '');
  if (limpio.length % 4 === 1) return null;
  const salida = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let acumulado = 0;
  let bits = 0;
  let pos = 0;
  for (let i = 0; i < limpio.length; i++) {
    const valor = ALFABETO.indexOf(limpio[i]);
    if (valor === -1) return null;
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida[pos++] = (acumulado >> bits) & 0xff;
    }
  }
  return salida.subarray(0, pos);
}

/** UTF-8 -> texto, sin TextDecoder. Devuelve null si los bytes no son UTF-8 válido. */
export function utf8ATexto(bytes: Uint8Array): string | null {
  let salida = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let cp: number;
    let extra: number;
    if (b < 0x80) {
      cp = b;
      extra = 0;
    } else if (b >= 0xc2 && b < 0xe0) {
      cp = b & 0x1f;
      extra = 1;
    } else if (b >= 0xe0 && b < 0xf0) {
      cp = b & 0x0f;
      extra = 2;
    } else if (b >= 0xf0 && b < 0xf5) {
      cp = b & 0x07;
      extra = 3;
    } else {
      return null;
    }
    for (let k = 0; k < extra; k++) {
      const c = bytes[i++];
      if (c === undefined || (c & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (c & 0x3f);
    }
    salida += String.fromCodePoint(cp);
  }
  return salida;
}

function fechaValida(valor: unknown): valor is string {
  return typeof valor === 'string' && !Number.isNaN(Date.parse(valor));
}

/** Verifica la firma con la clave del `kid` y devuelve el objeto, sin validar su forma. */
function abrirToken(token: unknown, claves: ClavesPublicas): Record<string, unknown> | null {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const bytes = b64uADecodificar(partes[0]);
  const firma = b64uADecodificar(partes[1]);
  if (!bytes || !firma || firma.length !== 64) return null;

  const texto = utf8ATexto(bytes);
  if (texto === null) return null;
  let objeto: unknown;
  try {
    objeto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof objeto !== 'object' || objeto === null) return null;
  const registro = objeto as Record<string, unknown>;

  // El kid viaja dentro del payload firmado: primero se elige la clave y luego
  // se verifica. Un kid desconocido se rechaza.
  const kid = registro.kid;
  if (typeof kid !== 'string' || !Object.prototype.hasOwnProperty.call(claves, kid)) return null;
  const clave = b64uADecodificar(claves[kid]);
  if (!clave || clave.length !== 32) return null;

  try {
    return ed25519.verify(firma, bytes, clave) ? registro : null;
  } catch {
    return null;
  }
}

const PLANES: Plan[] = ['trial', 'mensual', 'anual', 'vip'];

export function verificarLicencia(token: unknown, claves: ClavesPublicas): LicenciaPayload | null {
  const p = abrirToken(token, claves);
  if (!p || p.v !== 1) return null;
  if (typeof p.whatsapp !== 'string' || typeof p.equipo !== 'string') return null;
  if (typeof p.plan !== 'string' || !PLANES.includes(p.plan as Plan)) return null;
  if (!fechaValida(p.inicio) || !fechaValida(p.emitida) || !fechaValida(p.offline_hasta)) return null;
  if (p.vence !== null && !fechaValida(p.vence)) return null;
  if (p.gracia_hasta !== null && !fechaValida(p.gracia_hasta)) return null;
  // Un plan con vencimiento sin gracia (o al revés) es una licencia mal armada.
  if ((p.vence === null) !== (p.gracia_hasta === null)) return null;
  return p as unknown as LicenciaPayload;
}

export function verificarTope(token: unknown, claves: ClavesPublicas): TopePayload | null {
  const p = abrirToken(token, claves);
  if (!p || p.v !== 1 || p.tipo !== 'tope') return null;
  if (!fechaValida(p.hasta) || !fechaValida(p.emitida)) return null;
  return p as unknown as TopePayload;
}
