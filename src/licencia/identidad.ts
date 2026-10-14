/**
 * Perfil del chofer a partir de la licencia firmada.
 *
 * El dueño carga nombre y WhatsApp en el panel; la licencia los trae firmados.
 * Con eso la app completa el perfil sola: el chofer no pasa por el alta, no
 * puede quedarse como "Conductor" y no puede escribir otro nombre.
 *
 * Lógica PURA (sin React ni módulos nativos) para probarla con `node --test`.
 */

export interface PerfilDeLicencia {
  driver_name: string;
  driver_phone: string;
  profile_complete: true;
}

export const NOMBRE_MINIMO = 2;

/**
 * Qué perfil hay que aplicar, o null si no corresponde tocar nada:
 *  - la licencia no trae nombre (emitida antes de este cambio), o es inválido;
 *  - el perfil ya está completo (no se pisa uno ya cargado: además la app no
 *    permite cambiar la identidad después del alta).
 */
export function perfilPendiente(
  licencia: { nombre?: string; whatsapp: string } | null,
  perfilCompleto: boolean,
): PerfilDeLicencia | null {
  if (!licencia || perfilCompleto) return null;
  const nombre = typeof licencia.nombre === 'string' ? licencia.nombre.trim() : '';
  if (nombre.length < NOMBRE_MINIMO) return null;
  const digitos = licencia.whatsapp.replace(/\D/g, '');
  if (!digitos) return null;
  return { driver_name: nombre, driver_phone: `+${digitos}`, profile_complete: true };
}
