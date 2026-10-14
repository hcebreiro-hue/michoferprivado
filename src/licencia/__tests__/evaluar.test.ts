import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluarAcceso, nuevaUltimaVista, type EntradaEvaluar } from '../evaluar.ts';
import type { LicenciaPayload } from '../verificar.ts';

const D = 86_400_000;
const T0 = Date.parse('2026-10-13T12:00:00.000Z');
const EQ = 'aaaaaaaaaaaaaaaa';

const lic = (over: Partial<LicenciaPayload> = {}): LicenciaPayload => ({
  v: 1,
  kid: 'k1',
  whatsapp: '5491155550000',
  equipo: EQ,
  plan: 'trial',
  inicio: new Date(T0).toISOString(),
  vence: new Date(T0 + 30 * D).toISOString(),
  gracia_hasta: new Date(T0 + 33 * D).toISOString(),
  emitida: new Date(T0).toISOString(),
  offline_hasta: new Date(T0 + 15 * D).toISOString(),
  ...over,
});

const base = (over: Partial<EntradaEvaluar> = {}): EntradaEvaluar => ({
  licencia: lic(),
  equipoId: EQ,
  ahora: T0 + 1 * D,
  ultimaVista: T0,
  tope: T0 + 90 * D,
  fechaMinima: Date.parse('2026-10-13T00:00:00Z'),
  ...over,
});

test('trial vigente: activa con días restantes', () => {
  assert.deepEqual(evaluarAcceso(base()), { tipo: 'activa', diasRestantes: 29, porVencer: false });
});

test('bloqueado por el dueño: suspendida, aunque la licencia local siga vigente', () => {
  assert.deepEqual(evaluarAcceso(base({ suspendida: true })), { tipo: 'suspendida' });
  assert.deepEqual(evaluarAcceso(base({ suspendida: true, licencia: null })), { tipo: 'suspendida' });
});

test('suspendida en false o ausente no cambia nada', () => {
  assert.deepEqual(evaluarAcceso(base({ suspendida: false })), { tipo: 'activa', diasRestantes: 29, porVencer: false });
});

test('a 7 días o menos del vencimiento: activa pero por vencer', () => {
  const r = evaluarAcceso(base({ ahora: T0 + 24 * D, licencia: lic({ offline_hasta: new Date(T0 + 40 * D).toISOString() }) }));
  assert.deepEqual(r, { tipo: 'activa', diasRestantes: 6, porVencer: true });
});

test('vencida pero dentro de los 3 días: gracia, contando los días que quedan', () => {
  const l = lic({ offline_hasta: new Date(T0 + 60 * D).toISOString() });
  assert.deepEqual(evaluarAcceso(base({ licencia: l, ahora: T0 + 30 * D })), { tipo: 'gracia', diasDeGracia: 3 });
  assert.deepEqual(evaluarAcceso(base({ licencia: l, ahora: T0 + 31 * D + 1000 })), { tipo: 'gracia', diasDeGracia: 2 });
  assert.deepEqual(evaluarAcceso(base({ licencia: l, ahora: T0 + 32 * D + 1000 })), { tipo: 'gracia', diasDeGracia: 1 });
});

test('pasada la gracia: vencida (aunque todavía haya ventana offline)', () => {
  const l = lic({ offline_hasta: new Date(T0 + 90 * D).toISOString() });
  assert.deepEqual(evaluarAcceso(base({ licencia: l, ahora: T0 + 33 * D })), { tipo: 'vencida' });
  assert.deepEqual(evaluarAcceso(base({ licencia: l, ahora: T0 + 80 * D })), { tipo: 'vencida' });
});

test('VIP: activa sin vencimiento; solo la ventana offline lo frena', () => {
  const vip = lic({ plan: 'vip', vence: null, gracia_hasta: null, offline_hasta: new Date(T0 + 15 * D).toISOString() });
  assert.deepEqual(evaluarAcceso(base({ licencia: vip, ahora: T0 + 10 * D })), { tipo: 'activa', diasRestantes: null, porVencer: false });
  assert.deepEqual(evaluarAcceso(base({ licencia: vip, ahora: T0 + 16 * D })), { tipo: 'requiere_conexion' });
});

test('15 días sin validar: pide conexión', () => {
  assert.deepEqual(evaluarAcceso(base({ ahora: T0 + 16 * D })), { tipo: 'requiere_conexion' });
});

test('licencia de OTRO equipo no sirve', () => {
  assert.deepEqual(evaluarAcceso(base({ equipoId: 'bbbbbbbbbbbbbbbb' })), { tipo: 'sin_licencia' });
  assert.deepEqual(evaluarAcceso(base({ equipoId: null })), { tipo: 'sin_licencia' });
});

test('sin licencia: puede activar mientras el APK esté dentro del tope; pasado el tope, no', () => {
  assert.deepEqual(evaluarAcceso(base({ licencia: null })), { tipo: 'sin_licencia' });
  assert.deepEqual(evaluarAcceso(base({ licencia: null, ahora: T0 + 90 * D })), { tipo: 'apk_vencido' });
});

test('el tope NO afecta a quien ya tiene licencia vigente', () => {
  const l = lic({ plan: 'anual', vence: new Date(T0 + 365 * D).toISOString(), gracia_hasta: new Date(T0 + 368 * D).toISOString(), offline_hasta: new Date(T0 + 100 * D).toISOString() });
  assert.equal(evaluarAcceso(base({ licencia: l, ahora: T0 + 95 * D, tope: T0 + 90 * D })).tipo, 'activa');
});

test('reloj atrasado respecto de lo ya visto: bloquea; pequeños desvíos se toleran', () => {
  assert.deepEqual(evaluarAcceso(base({ ultimaVista: T0 + 20 * D, ahora: T0 + 5 * D })), { tipo: 'reloj' });
  assert.equal(evaluarAcceso(base({ ultimaVista: T0 + 1 * D, ahora: T0 + 1 * D - 60_000 })).tipo, 'activa', '1 minuto de desvío');
});

test('reloj anterior a la fecha mínima de la app: bloquea', () => {
  assert.deepEqual(evaluarAcceso(base({ ahora: Date.parse('2020-01-01T00:00:00Z') })), { tipo: 'reloj' });
});

test('el reloj atrasado se detecta ANTES que la licencia (no se vuelve a ganar tiempo)', () => {
  const vencida = lic({ vence: new Date(T0 - 40 * D).toISOString(), gracia_hasta: new Date(T0 - 37 * D).toISOString() });
  assert.deepEqual(evaluarAcceso(base({ licencia: vencida, ultimaVista: T0 + 5 * D, ahora: T0 - 39 * D, fechaMinima: 0 })), { tipo: 'reloj' });
});

test('nuevaUltimaVista: solo avanza', () => {
  assert.equal(nuevaUltimaVista(null, 100), 100);
  assert.equal(nuevaUltimaVista(500, 100), 500);
  assert.equal(nuevaUltimaVista(100, 500), 500);
});
