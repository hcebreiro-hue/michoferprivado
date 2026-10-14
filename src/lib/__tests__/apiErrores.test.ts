import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, almacenEnMemoria, crearApi } from '../apiCore.ts';
import { SESION, armar } from './servidorFalso.ts';

test('un 403 de licencia llega como error con mensaje en español', async () => {
  const { cliente } = await armar();
  await assert.rejects(cliente.api('/v1/prohibido'), (e: ApiError) => e.code === 'licencia' && /licencia/i.test(e.message));
});

test('sin conexión en un pedido normal: error claro y la sesión sigue', async () => {
  const almacen = almacenEnMemoria();
  const cliente = crearApi({
    base: 'https://senda.test',
    almacen,
    fetchFn: (async () => {
      throw new TypeError('network');
    }) as unknown as typeof fetch,
  });
  await cliente.guardarSesion(SESION);
  await assert.rejects(cliente.api('/v1/trips'), (e: ApiError) => e.code === 'sin_conexion' && /conexión/.test(e.message));
  assert.equal(await cliente.hayCuenta(), true);
});

test('pedido que tarda demasiado: se corta por tiempo', async () => {
  const cliente = crearApi({
    base: 'https://senda.test',
    almacen: almacenEnMemoria(),
    timeoutMs: 20,
    fetchFn: ((_u: string, init: RequestInit) =>
      new Promise((_r, rechazar) => init.signal?.addEventListener('abort', () => rechazar(new Error('abortado'))))) as unknown as typeof fetch,
  });
  await assert.rejects(cliente.api('/v1/trips'), (e: ApiError) => e.code === 'sin_conexion');
});

test('un código de error desconocido igual da un mensaje legible', () => {
  const e = new ApiError(400, 'falta_destination_2');
  assert.match(e.message, /falta_destination_2/);
  assert.equal(e.status, 400);
});

test('agenda pública: no manda sesión y un 404 vuelve como null', async () => {
  const { cliente, llamadas } = await armar();
  assert.deepEqual(await cliente.apiPublica('/v1/portal/ana-123'), { driver_name: 'Ana' });
  assert.equal(llamadas[0].token, null);
  assert.equal(await cliente.apiPublica('/v1/portal/nadie'), null);
});

test('el cuerpo se manda como JSON y el método respeta lo pedido', async () => {
  let visto: { metodo?: string; cuerpo?: string } = {};
  const cliente = crearApi({
    base: 'https://senda.test',
    almacen: almacenEnMemoria(),
    fetchFn: (async (_u: string, init: RequestInit) => {
      visto = { metodo: init.method, cuerpo: init.body as string };
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch,
  });
  await cliente.api('/v1/trips', { method: 'POST', body: { client_name: 'X' } });
  assert.deepEqual(visto, { metodo: 'POST', cuerpo: '{"client_name":"X"}' });
});
