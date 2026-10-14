/**
 * Cuándo la app tiene que pedirle al servidor la sesión de la nube.
 * El chofer nunca crea ni usa una cuenta: la app entra sola.
 *
 *  - Con sesión (o mientras se lee el estado)
 *    no hay nada que pedir.
 *  - Con el perfil completo (el chofer ya tocó «Borrar datos de prueba y empezar»)
 *    y sin sesión: 'crear'. Es el alta de la cuenta, o el reintento si falló por
 *    falta de conexión.
 *  - Con el perfil sin completar: 'existente'. Si es un chofer que reinstaló o
 *    cambió de teléfono, entra a su cuenta y recupera sus datos; si es nuevo, el
 *    servidor no crea nada y la app sigue con los datos de prueba.
 *
 * Lógica PURA (sin React ni módulos nativos) para probarla con `node --test`.
 */

import type { ModoSesion } from './servidor';

export function modoDeSesion(e: {
  /** La nube está habilitada. */
  habilitado: boolean;
  /** La sesión o los ajustes todavía se están leyendo. */
  cargando: boolean;
  tieneSesion: boolean;
  perfilCompleto: boolean;
}): ModoSesion | null {
  if (!e.habilitado || e.cargando || e.tieneSesion) return null;
  return e.perfilCompleto ? 'crear' : 'existente';
}
