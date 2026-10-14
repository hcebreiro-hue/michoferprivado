/**
 * Cliente de la API de Senda (Cloudflare Worker + D1). Reemplaza a Supabase.
 *
 * LÓGICA PURA (sin React ni módulos nativos): el almacenamiento y `fetch` se inyectan,
 * así se prueba con `node --test`. En la app se usa a través de `api.ts`.
 *
 *  - El chofer nunca ve una cuenta: la sesión la entrega el servidor al activar la licencia
 *    (`access` de 1 hora + `refresh` de 90 días que se rota en cada uso).
 *  - Si el `access` venció (401) se renueva UNA sola vez aunque haya varios pedidos a la
 *    vez: dos renovaciones simultáneas con el mismo `refresh` parecerían un robo.
 *  - Si el servidor dice que la sesión ya no existe (401/403 al renovar) se borra y la app
 *    vuelve a pedirla al revalidar la licencia. Sin red NO se borra nada.
 */

import { ApiError, type Almacen, type OyenteSesion, type Sesion } from './apiTipos.ts';

export { ApiError, almacenEnMemoria, type Almacen, type Sesion } from './apiTipos.ts';

const K_ACCESS = 'senda.access';
const K_REFRESH = 'senda.refresh';
const K_CHOFER = 'senda.chofer';

export function crearApi(opciones: { base: string; almacen: Almacen; fetchFn?: typeof fetch; timeoutMs?: number }) {
  const { base, almacen } = opciones;
  const fetchFn = opciones.fetchFn ?? fetch;
  const timeoutMs = opciones.timeoutMs ?? 15_000;
  const oyentes = new Set<OyenteSesion>();
  let renovando: Promise<string | null> | null = null;

  const avisar = (s: Sesion | null) => oyentes.forEach((o) => o(s));

  async function leerSesion(): Promise<Sesion | null> {
    const [access, refresh, chofer] = await Promise.all([K_ACCESS, K_REFRESH, K_CHOFER].map((k) => almacen.getItemAsync(k)));
    const id = Number(chofer);
    if (!refresh || !Number.isInteger(id) || id <= 0) return null;
    return { access: access ?? '', refresh, chofer: id };
  }

  async function guardarSesion(s: Sesion): Promise<void> {
    await almacen.setItemAsync(K_ACCESS, s.access);
    await almacen.setItemAsync(K_REFRESH, s.refresh);
    await almacen.setItemAsync(K_CHOFER, String(s.chofer));
    avisar(s);
  }

  async function borrarSesion(): Promise<void> {
    for (const k of [K_ACCESS, K_REFRESH, K_CHOFER]) await almacen.deleteItemAsync(k);
    avisar(null);
  }

  /** true si hay sesión guardada: decide entre la nube y el modo local. */
  async function hayCuenta(): Promise<boolean> {
    return (await leerSesion()) !== null;
  }

  async function pedir(ruta: string, metodo: string, cuerpo: unknown, token: string | null): Promise<Response> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      return await fetchFn(`${base}${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: controlador.signal,
      });
    } catch {
      throw new ApiError(0, 'sin_conexion');
    } finally {
      clearTimeout(temporizador);
    }
  }

  function renovar(): Promise<string | null> {
    renovando ??= (async () => {
      try {
        const actual = await leerSesion();
        if (!actual) return null;
        const r = await pedir('/v1/sesion/renovar', 'POST', { refresh: actual.refresh }, null);
        if (r.status === 401 || r.status === 403) {
          await borrarSesion();
          return null;
        }
        if (!r.ok) throw new ApiError(r.status, 'error_interno');
        const datos = (await r.json()) as { sesion?: Sesion };
        if (!datos.sesion) throw new ApiError(r.status, 'error_interno');
        await guardarSesion(datos.sesion);
        return datos.sesion.access;
      } finally {
        renovando = null;
      }
    })();
    return renovando;
  }

  async function resolver<T>(r: Response): Promise<T> {
    if (r.ok) return (await r.json()) as T;
    const e = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(r.status, e?.error ?? 'error_interno');
  }

  /** Pedido con sesión. Renueva el `access` vencido y reintenta una vez. */
  async function api<T>(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<T> {
    const metodo = opciones.method ?? 'GET';
    let r = await pedir(ruta, metodo, opciones.body, await almacen.getItemAsync(K_ACCESS));
    if (r.status === 401) {
      const nuevo = await renovar();
      if (nuevo) r = await pedir(ruta, metodo, opciones.body, nuevo);
    }
    return resolver<T>(r);
  }

  /** Pedido público, sin sesión (la agenda del chofer que ve el pasajero). */
  async function apiPublica<T>(ruta: string): Promise<T | null> {
    const r = await pedir(ruta, 'GET', undefined, null);
    if (r.status === 404) return null;
    return resolver<T>(r);
  }

  return {
    api,
    apiPublica,
    leerSesion,
    guardarSesion,
    borrarSesion,
    hayCuenta,
    /** Avisa cada vez que la sesión se guarda o se borra. Devuelve la función para dejar de escuchar. */
    suscribir(oyente: OyenteSesion): () => void {
      oyentes.add(oyente);
      return () => void oyentes.delete(oyente);
    },
  };
}
