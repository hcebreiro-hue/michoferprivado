/**
 * Enlace de la agenda web del chofer.
 *
 * El servidor decide el identificador público al crear el perfil en la nube:
 * `<nombre>-<32 caracteres hexadecimales>`. Mientras el chofer usa datos de
 * prueba el perfil solo existe en el teléfono, y la app guarda ahí un
 * identificador provisorio (solo el nombre, por ejemplo «horacio») que el
 * servidor no conoce. Un enlace armado con ese valor da «No encontramos un
 * chofer con ese enlace», así que no se ofrece.
 *
 * Lógica PURA (sin React ni módulos nativos) para probarla con `node --test`.
 */

const SLUG_DEL_SERVIDOR = /^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{32}$/;

/** true si el identificador es el que generó el servidor (la agenda existe). */
export function esSlugDelServidor(slug: string | null | undefined): boolean {
  return typeof slug === 'string' && SLUG_DEL_SERVIDOR.test(slug.trim().toLowerCase());
}

/** Enlace listo para compartir, o null si la agenda todavía no está habilitada. */
export function enlaceAgenda(base: string, slug: string | null | undefined): string | null {
  if (!esSlugDelServidor(slug)) return null;
  return `${base}/reservas?driver=${encodeURIComponent((slug as string).trim().toLowerCase())}`;
}

export const AVISO_AGENDA_TITULO = 'Tu agenda web todavía no está lista';
export const AVISO_AGENDA_TEXTO =
  'Se habilita cuando empezás con tus viajes reales. Entrá a Configuración, tocá «Borrar datos de prueba y empezar» y volvé a esta pantalla: ahí vas a poder abrirla y copiar el enlace.';
