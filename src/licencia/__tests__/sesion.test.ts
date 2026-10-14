import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modoDeSesion } from '../sesion.ts';

const base = { habilitado: true, cargando: false, tieneSesion: false, perfilCompleto: false };

test('perfil sin completar (datos de prueba): prueba si ya tiene cuenta (reinstalación)', () => {
  assert.equal(modoDeSesion(base), 'existente');
});

test('empezó de verdad (perfil completo) y no tiene sesión: crea la cuenta', () => {
  assert.equal(modoDeSesion({ ...base, perfilCompleto: true }), 'crear');
});

test('con sesión no pide nada', () => {
  assert.equal(modoDeSesion({ ...base, tieneSesion: true }), null);
  assert.equal(modoDeSesion({ ...base, tieneSesion: true, perfilCompleto: true }), null);
});

test('con la nube deshabilitada, o mientras carga, no pide nada', () => {
  assert.equal(modoDeSesion({ ...base, habilitado: false, perfilCompleto: true }), null);
  assert.equal(modoDeSesion({ ...base, cargando: true, perfilCompleto: true }), null);
  assert.equal(modoDeSesion({ ...base, cargando: true }), null);
});
