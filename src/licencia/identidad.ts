/**
 * Identidad y leyenda de la licencia firmada.
 *
 * El dueño carga nombre y WhatsApp en el panel; la licencia los trae firmados.
 * Con eso la app completa nombre y teléfono sola: el chofer no pasa por el alta,
 * no puede quedarse como "Conductor" y no puede escribir otro nombre.
 *
 * OJO: acá NO se marca `profile_complete`. El perfil queda "sin completar" a
 * propósito: la app muestra los datos de prueba hasta que el chofer toca
 * "Borrar datos de prueba y empezar" (eso sí completa el perfil y lo bloquea).
 *
 * Lógica PURA (sin React ni módulos nativos) para probarla con `node --test`.
 */

import type { Plan } from './verificar';

export interface IdentidadDeLicencia {
  driver_name: string;
  driver_phone: string;
}

export const NOMBRE_MINIMO = 2;

const MS_DIA = 86_400_000;

/**
 * Nombre y teléfono que trae la licencia, o null si no corresponde usarlos:
 *  - la licencia no trae nombre (emitida antes de este cambio), o es inválido;
 *  - el WhatsApp no tiene dígitos.
 */
export function identidadDeLicencia(
  licencia: { nombre?: string; whatsapp: string } | null,
): IdentidadDeLicencia | null {
  if (!licencia) return null;
  const nombre = typeof licencia.nombre === 'string' ? licencia.nombre.trim() : '';
  if (nombre.length < NOMBRE_MINIMO) return null;
  const digitos = licencia.whatsapp.replace(/\D/g, '');
  if (!digitos) return null;
  return { driver_name: nombre, driver_phone: `+${digitos}` };
}

/**
 * Qué datos hay que guardar en los ajustes, o null si no hay nada que tocar:
 *  - no hay identidad en la licencia;
 *  - el perfil ya está completo (no se pisa uno ya cargado: además la app no
 *    permite cambiar la identidad después del alta);
 *  - los ajustes ya tienen esos mismos datos (evita reaplicar en bucle).
 */
export function perfilPendiente(
  licencia: { nombre?: string; whatsapp: string } | null,
  perfilCompleto: boolean,
  actual: IdentidadDeLicencia,
): IdentidadDeLicencia | null {
  if (perfilCompleto) return null;
  const identidad = identidadDeLicencia(licencia);
  if (!identidad) return null;
  if (identidad.driver_name === actual.driver_name && identidad.driver_phone === actual.driver_phone) {
    return null;
  }
  return identidad;
}

/** dd/mm/aaaa en la hora local del teléfono. */
export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Leyenda de vigencia para la pantalla de bienvenida, según el plan. Los días de
 * la prueba se calculan con las fechas firmadas (la política vive en el servidor).
 */
export function leyendaLicencia(licencia: { plan: Plan; inicio: string; vence: string | null }): string {
  if (licencia.plan === 'vip' || licencia.vence === null) return 'Licencia VIP: sin vencimiento.';
  const hasta = fechaCorta(licencia.vence);
  switch (licencia.plan) {
    case 'trial': {
      const dias = Math.round((Date.parse(licencia.vence) - Date.parse(licencia.inicio)) / MS_DIA);
      return `Prueba gratuita de ${dias} días: vigente hasta el ${hasta}.`;
    }
    case 'mensual':
      return `Licencia mensual: vigente hasta el ${hasta}.`;
    case 'anual':
      return `Licencia anual: vigente hasta el ${hasta}.`;
  }
}
