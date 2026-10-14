import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientesFrecuentes, filtrarClientes, normalizarTexto, telefonoDeContacto } from '../logica.ts';

test('normalizarTexto: sin tildes ni mayúsculas', () => {
  assert.equal(normalizarTexto('  María Pérez '), 'maria perez');
});

test('telefonoDeContacto: formatos argentinos comunes llevan a +549', () => {
  assert.equal(telefonoDeContacto('11 2345-6789'), '+5491123456789');
  assert.equal(telefonoDeContacto('011 2345-6789'), '+5491123456789');
  assert.equal(telefonoDeContacto('+54 9 11 2345-6789'), '+5491123456789');
  assert.equal(telefonoDeContacto('+54 11 2345-6789'), '+5491123456789');
  assert.equal(telefonoDeContacto('541123456789'), '+5491123456789');
  assert.equal(telefonoDeContacto('0054 9 11 2345 6789'), '+5491123456789');
});

test('telefonoDeContacto: un número con + de otro país se respeta', () => {
  assert.equal(telefonoDeContacto('+598 99 123 456'), '+59899123456');
  assert.equal(telefonoDeContacto('+1 (212) 555-0100'), '+12125550100');
});

test('telefonoDeContacto: vacío o sin dígitos devuelve vacío; lo no reconocible queda en dígitos', () => {
  assert.equal(telefonoDeContacto(''), '');
  assert.equal(telefonoDeContacto('---'), '');
  assert.equal(telefonoDeContacto('4321-5678'), '43215678');
});

const v = (id: string, nombre: string, tel: string, fecha: string) => ({
  id,
  client_name: nombre,
  client_phone: tel,
  scheduled_at: fecha,
});

test('frecuentes: ordena por cantidad de viajes y luego por el más reciente', () => {
  const lista = clientesFrecuentes([
    v('1', 'Ana', '+5491111111111', '2026-10-01T10:00:00Z'),
    v('2', 'Beto', '+5491122222222', '2026-10-05T10:00:00Z'),
    v('3', 'Ana', '+5491111111111', '2026-10-02T10:00:00Z'),
    v('4', 'Carla', '+5491133333333', '2026-10-09T10:00:00Z'),
  ]);
  assert.deepEqual(
    lista.map((c) => [c.nombre, c.detalle]),
    [
      ['Ana', '2 viajes'],
      ['Carla', '1 viaje'],
      ['Beto', '1 viaje'],
    ],
  );
});

test('frecuentes: ignora los viajes de ejemplo y los sin nombre', () => {
  const lista = clientesFrecuentes([
    v('seed-trip-1', 'María González', '+5491122334455', '2026-10-01T10:00:00Z'),
    v('9', '   ', '+5491100000000', '2026-10-01T10:00:00Z'),
    v('10', 'Real', '', '2026-10-02T10:00:00Z'),
  ]);
  assert.deepEqual(lista.map((c) => c.nombre), ['Real']);
});

test('frecuentes: el mismo teléfono escrito distinto es el mismo cliente, y vale el dato más reciente', () => {
  const lista = clientesFrecuentes([
    v('1', 'Ana', '11 5555-0000', '2026-10-01T10:00:00Z'),
    v('2', 'Ana Gómez', '+54 9 11 5555-0000', '2026-10-03T10:00:00Z'),
  ]);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nombre, 'Ana Gómez');
  assert.equal(lista[0].telefono, '+54 9 11 5555-0000');
  assert.equal(lista[0].detalle, '2 viajes');
});

test('frecuentes: sin teléfono agrupa por nombre y respeta el límite', () => {
  const muchos = Array.from({ length: 12 }, (_, i) => v(String(i), `Cliente ${i}`, '', '2026-10-01T10:00:00Z'));
  assert.equal(clientesFrecuentes(muchos).length, 8);
  assert.equal(clientesFrecuentes(muchos, 3).length, 3);
  const mismos = clientesFrecuentes([v('1', 'Luis', '', '2026-10-01T10:00:00Z'), v('2', 'luis', '', '2026-10-02T10:00:00Z')]);
  assert.equal(mismos.length, 1);
});

test('frecuentes: sin viajes, lista vacía', () => {
  assert.deepEqual(clientesFrecuentes([]), []);
});

test('filtrarClientes: por nombre sin tildes, por teléfono y sin consulta', () => {
  const lista = [
    { nombre: 'María Pérez', telefono: '+5491155550000' },
    { nombre: 'José Díaz', telefono: '+5491166660000' },
  ];
  assert.equal(filtrarClientes(lista, '').length, 2);
  assert.deepEqual(filtrarClientes(lista, 'maria').map((c) => c.nombre), ['María Pérez']);
  assert.deepEqual(filtrarClientes(lista, '6666').map((c) => c.nombre), ['José Díaz']);
  assert.equal(filtrarClientes(lista, 'zzz').length, 0);
});
