import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enlaceAgenda, esSlugDelServidor } from '../agenda.ts';

const BASE = 'https://agenda.senda.unitecapplications.com';
const REAL = 'horacio-0123456789abcdef0123456789abcdef';

test('el identificador que genera el servidor arma el enlace', () => {
  assert.equal(esSlugDelServidor(REAL), true);
  assert.equal(enlaceAgenda(BASE, REAL), `${BASE}/reservas?driver=${REAL}`);
});

test('nombres con guiones o números también valen', () => {
  assert.equal(esSlugDelServidor('maria-del-carmen-2-0123456789abcdef0123456789abcdef'), true);
});

test('el identificador provisorio (solo el nombre) NO arma enlace: el servidor no lo conoce', () => {
  assert.equal(esSlugDelServidor('horacio'), false);
  assert.equal(enlaceAgenda(BASE, 'horacio'), null);
  assert.equal(enlaceAgenda(BASE, 'conductor'), null);
});

test('vacío, nulo o con código incompleto no arman enlace', () => {
  assert.equal(enlaceAgenda(BASE, ''), null);
  assert.equal(enlaceAgenda(BASE, undefined), null);
  assert.equal(enlaceAgenda(BASE, null), null);
  assert.equal(enlaceAgenda(BASE, 'horacio-0123456789abcdef'), null);
  assert.equal(enlaceAgenda(BASE, 'horacio-0123456789abcdef0123456789abcdeg'), null);
});

test('no distingue mayúsculas ni espacios alrededor, como el servidor', () => {
  assert.equal(enlaceAgenda(BASE, `  ${REAL.toUpperCase()} `), `${BASE}/reservas?driver=${REAL}`);
});
