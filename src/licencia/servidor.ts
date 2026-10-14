import { TIMEOUT_SERVIDOR_MS, URL_SERVIDOR } from './config';

/** Respuesta de POST /v1/activar del servidor (ver ~/Desarrollos/claudia-licencias). */
export interface RespuestaActivar {
  ok: boolean;
  estado: 'ok' | 'pendiente' | 'no_autorizado' | 'bloqueado' | 'invalido';
  licencia?: string;
  tope_hasta: string | null;
  /** Hora del servidor (ISO): sirve para detectar un reloj del teléfono muy desfasado. */
  ahora: string;
}

export class ErrorDeRed extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeRed';
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_SERVIDOR_MS);
  try {
    const respuesta = await fetch(`${URL_SERVIDOR}${ruta}`, { ...init, signal: controlador.signal });
    if (respuesta.status === 429) throw new ErrorDeRed('Demasiados intentos. Esperá un rato y probá de nuevo.');
    if (respuesta.status >= 500) throw new ErrorDeRed('El servidor no está disponible ahora.');
    return (await respuesta.json()) as T;
  } catch (causa) {
    if (causa instanceof ErrorDeRed) throw causa;
    throw new ErrorDeRed('No hay conexión con el servidor de licencias.');
  } finally {
    clearTimeout(temporizador);
  }
}

export function activar(whatsapp: string, equipo: string): Promise<RespuestaActivar> {
  return pedir<RespuestaActivar>('/v1/activar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp, equipo }),
  });
}

/** Tope global firmado (solo alarga). Devuelve el token o null si no hay tope remoto. */
export async function pedirTope(): Promise<string | null> {
  const r = await pedir<{ ok: boolean; tope: string | null }>('/v1/tope');
  return r.tope;
}
