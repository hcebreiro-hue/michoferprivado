import assert from 'node:assert/strict';
import { test } from 'node:test';
import { perfilPendiente } from '../identidad.ts';

const lic = { nombre: 'María López', whatsapp: '5491155550000' };

test('con licencia que trae nombre y perfil sin completar: aplica nombre, teléfono y completa el perfil', () => {
  assert.deepEqual(perfilPendiente(lic, false), {
    driver_name: 'María López',
    driver_phone: '+5491155550000',
    profile_complete: true,
  });
});

test('recorta espacios del nombre', () => {
  assert.equal(perfilPendiente({ ...lic, nombre: '  Juan Pérez  ' }, false)?.driver_name, 'Juan Pérez');
});

test('perfil ya completo: no se toca (la app no permite cambiar la identidad)', () => {
  assert.equal(perfilPendiente(lic, true), null);
});

test('sin licencia: nada que aplicar', () => {
  assert.equal(perfilPendiente(null, false), null);
});

test('licencia vieja sin nombre, nombre vacío o demasiado corto: nada que aplicar', () => {
  assert.equal(perfilPendiente({ whatsapp: '5491155550000' }, false), null);
  assert.equal(perfilPendiente({ nombre: '', whatsapp: '5491155550000' }, false), null);
  assert.equal(perfilPendiente({ nombre: '   ', whatsapp: '5491155550000' }, false), null);
  assert.equal(perfilPendiente({ nombre: 'A', whatsapp: '5491155550000' }, false), null);
});

test('WhatsApp sin dígitos: nada que aplicar', () => {
  assert.equal(perfilPendiente({ nombre: 'Ana Gómez', whatsapp: '---' }, false), null);
});
