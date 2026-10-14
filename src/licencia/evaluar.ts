import type { LicenciaPayload } from './verificar';

/**
 * Decide qué puede hacer el chofer. Es una función PURA (sin red, sin disco, sin
 * reloj propio): recibe todo por parámetro, así se prueba con `node --test`.
 */

const MS_DIA = 86_400_000;

/** Atraso máximo tolerado del reloj antes de considerarlo manipulado (ajustes de red, etc.). */
export const TOLERANCIA_RELOJ_MS = 10 * 60_000;

/** Con este margen o menos para vencer se muestra el aviso "por vencer". */
export const DIAS_POR_VENCER = 7;

export type EstadoAcceso =
  /** Puede usar la app. `diasRestantes` es null en VIP (sin vencimiento). */
  | { tipo: 'activa'; diasRestantes: number | null; porVencer: boolean }
  /** Venció pero sigue en los 3 días de gracia. */
  | { tipo: 'gracia'; diasDeGracia: number }
  /** Pasó la gracia: pantalla de renovación + exportar datos. */
  | { tipo: 'vencida' }
  /** No hay licencia (o es de otro equipo): hay que activar. */
  | { tipo: 'sin_licencia' }
  /** Este APK ya no admite activaciones nuevas (pasó el tope). */
  | { tipo: 'apk_vencido' }
  /** La licencia exige volver a validarse por internet. */
  | { tipo: 'requiere_conexion' }
  /** El reloj del teléfono está atrasado o es imposible. */
  | { tipo: 'reloj' }
  /** El dueño bloqueó a este chofer: pantalla explicativa, sin pedir el alta de nuevo. */
  | { tipo: 'suspendida' };

export interface EntradaEvaluar {
  licencia: LicenciaPayload | null;
  /** ID de este equipo; null si no se pudo leer. */
  equipoId: string | null;
  /** Hora actual del teléfono (ms). */
  ahora: number;
  /** Mayor hora que la app llegó a ver (ms), o null la primera vez. */
  ultimaVista: number | null;
  /** Tope vigente (ms): el mayor entre el grabado y el remoto firmado. */
  tope: number;
  /** Fecha por debajo de la cual el reloj es seguro erróneo (ms). */
  fechaMinima: number;
  /** El servidor respondió «bloqueado» en la última consulta. Si falta, se toma como false. */
  suspendida?: boolean;
}

export function evaluarAcceso(e: EntradaEvaluar): EstadoAcceso {
  if (e.ahora < e.fechaMinima) return { tipo: 'reloj' };
  if (e.ultimaVista !== null && e.ahora < e.ultimaVista - TOLERANCIA_RELOJ_MS) {
    return { tipo: 'reloj' };
  }

  // Bloqueado por el dueño: manda sobre todo lo demás (incluso con licencia local vigente).
  if (e.suspendida) return { tipo: 'suspendida' };

  const { licencia } = e;
  if (!licencia || !e.equipoId || licencia.equipo !== e.equipoId) {
    // Sin licencia propia: este APK solo admite activaciones hasta el tope.
    return e.ahora >= e.tope ? { tipo: 'apk_vencido' } : { tipo: 'sin_licencia' };
  }

  if (licencia.vence !== null) {
    const vence = Date.parse(licencia.vence);
    const graciaHasta = Date.parse(licencia.gracia_hasta ?? licencia.vence);
    if (e.ahora >= graciaHasta) return { tipo: 'vencida' };
    if (e.ahora >= vence) {
      return { tipo: 'gracia', diasDeGracia: Math.max(1, Math.ceil((graciaHasta - e.ahora) / MS_DIA)) };
    }
  }

  if (e.ahora > Date.parse(licencia.offline_hasta)) return { tipo: 'requiere_conexion' };

  if (licencia.vence === null) return { tipo: 'activa', diasRestantes: null, porVencer: false };
  const dias = Math.ceil((Date.parse(licencia.vence) - e.ahora) / MS_DIA);
  return { tipo: 'activa', diasRestantes: dias, porVencer: dias <= DIAS_POR_VENCER };
}

/** El mayor entre lo que ya se vio y ahora: es lo que se guarda para detectar atrasos de reloj. */
export function nuevaUltimaVista(ultimaVista: number | null, ahora: number): number {
  return ultimaVista === null ? ahora : Math.max(ultimaVista, ahora);
}
