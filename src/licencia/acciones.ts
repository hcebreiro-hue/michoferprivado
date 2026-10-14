import * as Application from 'expo-application';
import { CLAVES_PUBLICAS, TOPE_GRABADO } from './config';
import * as almacen from './almacen';
import type { RespuestaActivar } from './servidor';
import { verificarTope } from './verificar';

export type MotivoFallo = 'pendiente' | 'no_autorizado' | 'bloqueado' | 'invalido' | 'red' | 'firma' | 'equipo';

export type ResultadoActivacion = { ok: true } | { ok: false; motivo: MotivoFallo; mensaje: string };

/** ID de este equipo (solo Android). null si no se pudo leer. */
export function leerEquipoId(): string | null {
  try {
    const id = Application.getAndroidId();
    return typeof id === 'string' && id.length >= 8 ? id : null;
  } catch {
    return null;
  }
}

/** El tope vigente es el MAYOR entre el grabado y el remoto firmado (el remoto solo alarga). */
export async function topeVigente(): Promise<number> {
  const guardado = await almacen.leerTope();
  const firmado = guardado ? verificarTope(guardado, CLAVES_PUBLICAS) : null;
  return Math.max(TOPE_GRABADO, firmado ? Date.parse(firmado.hasta) : 0);
}

const MENSAJES = {
  pendiente: 'Este teléfono es distinto al que ya está registrado. Escribile al soporte por WhatsApp para aprobarlo.',
  no_autorizado: 'Ese número no está dado de alta. Pedí tu alta por WhatsApp.',
  bloqueado: 'Tu acceso está suspendido. Escribile al soporte por WhatsApp.',
  invalido: 'El número no es válido. Escribilo con código de área, por ejemplo 11 5555 0000.',
} as const;

/** Traduce una respuesta del servidor que NO trae licencia a un mensaje para el chofer. */
export function falloDeRespuesta(r: RespuestaActivar): ResultadoActivacion {
  const motivo = r.estado === 'ok' ? 'invalido' : r.estado;
  return { ok: false, motivo, mensaje: MENSAJES[motivo] };
}

/** Estados en los que este equipo ya no debe conservar su licencia local. */
export const ESTADOS_QUE_CORTAN: readonly RespuestaActivar['estado'][] = ['bloqueado', 'no_autorizado', 'pendiente'];
