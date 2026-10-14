/** Servidor falso para probar el cliente de la API: cuenta pedidos y responde según el token. */
import { almacenEnMemoria, crearApi, type Sesion } from '../apiCore.ts';

export const SESION: Sesion = { access: 'acceso-1', refresh: 'refresh-1', chofer: 7 };

export interface Reglas {
  /** Token que el servidor acepta (por defecto 'acceso-1'). */
  accesoValido?: string;
  /** Qué responde al renovar. */
  refresh?: 'ok' | '401' | '403' | '500' | 'red';
}

export function servidor(reglas: Reglas = {}) {
  const llamadas: { ruta: string; token: string | null }[] = [];
  let n = 1;
  const json = (status: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchFn = (async (url: string, init: RequestInit) => {
    const ruta = new URL(url).pathname;
    const auth = (init.headers as Record<string, string>).Authorization ?? null;
    llamadas.push({ ruta, token: auth });
    if (ruta === '/v1/sesion/renovar') {
      await new Promise((r) => setTimeout(r, 5)); // da tiempo a que se junten varios pedidos
      if (reglas.refresh === 'red') throw new TypeError('network');
      if (reglas.refresh === '401') return json(401, { ok: false, error: 'sesion_invalida' });
      if (reglas.refresh === '403') return json(403, { ok: false, error: 'licencia' });
      if (reglas.refresh === '500') return json(500, { ok: false, error: 'error_interno' });
      n++;
      reglas.accesoValido = `acceso-${n}`;
      return json(200, { ok: true, sesion: { access: `acceso-${n}`, refresh: `refresh-${n}`, chofer: 7 } });
    }
    if (ruta.startsWith('/v1/portal/')) {
      return ruta.endsWith('/nadie') ? json(404, { ok: false, error: 'no_existe' }) : json(200, { driver_name: 'Ana' });
    }
    if (auth !== `Bearer ${reglas.accesoValido ?? 'acceso-1'}`) return json(401, { ok: false, error: 'no_autorizado' });
    if (ruta === '/v1/prohibido') return json(403, { ok: false, error: 'licencia' });
    return json(200, [{ id: 'a' }]);
  }) as unknown as typeof fetch;

  return { fetchFn, llamadas };
}

/** Cliente con una sesión ya guardada, apuntando al servidor falso. */
export async function armar(reglas: Reglas = {}) {
  const almacen = almacenEnMemoria();
  const s = servidor(reglas);
  const cliente = crearApi({ base: 'https://senda.test', almacen, fetchFn: s.fetchFn });
  await cliente.guardarSesion(SESION);
  return { almacen, cliente, ...s };
}
