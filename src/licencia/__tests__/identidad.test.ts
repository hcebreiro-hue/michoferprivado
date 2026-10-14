import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fechaCorta, identidadDeLicencia, leyendaLicencia, perfilPendiente } from '../identidad.ts';

const lic = { nombre: 'María López', whatsapp: '5491155550000' };
const vacio = { driver_name: 'Conductor', driver_phone: '' };

test('con licencia que trae nombre y perfil sin completar: aplica nombre y teléfono, SIN completar el perfil', () => {
  const p = perfilPendiente(lic, false, vacio);
  assert.deepEqual(p, { driver_name: 'María López', driver_phone: '+5491155550000' });
  assert.ok(p && !('profile_complete' in p), 'no debe tocar profile_complete: los datos de prueba siguen hasta que el chofer los borre');
});

test('recorta espacios del nombre', () => {
  assert.equal(perfilPendiente({ ...lic, nombre: '  Juan Pérez  ' }, false, vacio)?.driver_name, 'Juan Pérez');
});

test('si los ajustes ya tienen esa identidad no hay nada que aplicar (evita el bucle)', () => {
  assert.equal(perfilPendiente(lic, false, { driver_name: 'María López', driver_phone: '+5491155550000' }), null);
});

test('si cambió solo uno de los dos datos, vuelve a aplicar', () => {
  assert.notEqual(perfilPendiente(lic, false, { driver_name: 'María López', driver_phone: '' }), null);
  assert.notEqual(perfilPendiente(lic, false, { driver_name: 'Conductor', driver_phone: '+5491155550000' }), null);
});

test('perfil ya completo: no se toca (la app no permite cambiar la identidad)', () => {
  assert.equal(perfilPendiente(lic, true, vacio), null);
});

test('sin licencia: nada que aplicar', () => {
  assert.equal(perfilPendiente(null, false, vacio), null);
  assert.equal(identidadDeLicencia(null), null);
});

test('licencia vieja sin nombre, nombre vacío o demasiado corto: nada que aplicar', () => {
  assert.equal(perfilPendiente({ whatsapp: '5491155550000' }, false, vacio), null);
  assert.equal(perfilPendiente({ nombre: '', whatsapp: '5491155550000' }, false, vacio), null);
  assert.equal(perfilPendiente({ nombre: '   ', whatsapp: '5491155550000' }, false, vacio), null);
  assert.equal(perfilPendiente({ nombre: 'A', whatsapp: '5491155550000' }, false, vacio), null);
});

test('WhatsApp sin dígitos: nada que aplicar', () => {
  assert.equal(perfilPendiente({ nombre: 'Ana Gómez', whatsapp: '---' }, false, vacio), null);
});

// Horas a media tarde UTC: la fecha local es la misma en cualquier huso razonable.
const inicio = '2026-10-13T15:00:00.000Z';

test('fechaCorta: dd/mm/aaaa con ceros', () => {
  assert.equal(fechaCorta('2026-11-05T15:00:00.000Z'), '05/11/2026');
});

test('leyenda trial: días calculados con las fechas firmadas y fecha de vencimiento', () => {
  assert.equal(
    leyendaLicencia({ plan: 'trial', inicio, vence: '2026-11-12T15:00:00.000Z' }),
    'Prueba gratuita de 30 días: vigente hasta el 12/11/2026.',
  );
});

test('leyenda mensual y anual: vigente hasta la fecha', () => {
  assert.equal(
    leyendaLicencia({ plan: 'mensual', inicio, vence: '2026-11-13T15:00:00.000Z' }),
    'Licencia mensual: vigente hasta el 13/11/2026.',
  );
  assert.equal(
    leyendaLicencia({ plan: 'anual', inicio, vence: '2027-10-13T15:00:00.000Z' }),
    'Licencia anual: vigente hasta el 13/10/2027.',
  );
});

test('leyenda vip: sin vencimiento', () => {
  assert.equal(leyendaLicencia({ plan: 'vip', inicio, vence: null }), 'Licencia VIP: sin vencimiento.');
});
