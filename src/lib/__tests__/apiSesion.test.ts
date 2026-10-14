import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, almacenEnMemoria, crearApi, type Sesion } from '../apiCore.ts';
import { SESION, armar, servidor } from './servidorFalso.ts';

test('sin sesión guardada no hay cuenta (modo local)', async () => {
  const cliente = crearApi({ base: 'https://senda.test', almacen: almacenEnMemoria(), fetchFn: servidor().fetchFn });
  assert.equal(await cliente.hayCuenta(), false);
  assert.equal(await cliente.leerSesion(), null);
});

test('guardar y leer la sesión; el id del chofer vuelve como número', async () => {
  const { cliente } = await armar();
  assert.equal(await cliente.hayCuenta(), true);
  assert.deepEqual(await cliente.leerSesion(), SESION);
});

test('una sesión dañada (id que no es número) se trata como inexistente', async () => {
  const { cliente, almacen } = await armar();
  almacen.datos.set('senda.chofer', 'abc');
  assert.equal(await cliente.hayCuenta(), false);
});

test('un pedido con sesión vigente manda el token y no renueva', async () => {
  const { cliente, llamadas } = await armar();
  assert.deepEqual(await cliente.api('/v1/trips'), [{ id: 'a' }]);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].token, 'Bearer acceso-1');
});

test('access vencido: renueva UNA sola vez aunque haya 6 pedidos simultáneos', async () => {
  const { cliente, almacen, llamadas } = await armar({ accesoValido: 'otro-distinto' });
  const todos = await Promise.all(Array.from({ length: 6 }, () => cliente.api('/v1/trips')));
  assert.ok(todos.every((r) => Array.isArray(r)));
  assert.equal(llamadas.filter((l) => l.ruta === '/v1/sesion/renovar').length, 1);
  assert.equal(almacen.datos.get('senda.refresh'), 'refresh-2', 'el refresh nuevo quedó guardado');
});

test('refresh rechazado (401): borra la sesión y avisa a quien escucha', async () => {
  const { cliente, almacen } = await armar({ accesoValido: 'x', refresh: '401' });
  const avisos: (Sesion | null)[] = [];
  cliente.suscribir((s) => avisos.push(s));
  await assert.rejects(cliente.api('/v1/trips'), (e: ApiError) => e.status === 401);
  assert.equal(await cliente.hayCuenta(), false);
  assert.equal(almacen.datos.size, 0);
  assert.deepEqual(avisos, [null]);
});

test('licencia cortada (403 al renovar): también borra la sesión', async () => {
  const { cliente } = await armar({ accesoValido: 'x', refresh: '403' });
  await assert.rejects(cliente.api('/v1/trips'));
  assert.equal(await cliente.hayCuenta(), false);
});

test('SIN RED al renovar: NO se borra la sesión (el chofer en un túnel no pierde su cuenta)', async () => {
  const { cliente } = await armar({ accesoValido: 'x', refresh: 'red' });
  await assert.rejects(cliente.api('/v1/trips'), (e: ApiError) => e.code === 'sin_conexion');
  assert.equal(await cliente.hayCuenta(), true);
});

test('error 500 del servidor al renovar: NO se borra la sesión', async () => {
  const { cliente } = await armar({ accesoValido: 'x', refresh: '500' });
  await assert.rejects(cliente.api('/v1/trips'));
  assert.equal(await cliente.hayCuenta(), true);
});

test('el que deja de escuchar no recibe más avisos', async () => {
  const { cliente } = await armar();
  const avisos: (Sesion | null)[] = [];
  const dejar = cliente.suscribir((s) => avisos.push(s));
  await cliente.guardarSesion({ ...SESION, access: 'nuevo' });
  dejar();
  await cliente.borrarSesion();
  assert.equal(avisos.length, 1);
});
