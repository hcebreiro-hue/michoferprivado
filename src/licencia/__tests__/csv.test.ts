import assert from 'node:assert/strict';
import { test } from 'node:test';
import { armarCsv, celdaCsv } from '../csv.ts';

test('celdaCsv: comillas, comas y saltos de línea', () => {
  assert.equal(celdaCsv('simple'), 'simple');
  assert.equal(celdaCsv('con, coma'), '"con, coma"');
  assert.equal(celdaCsv('dice "hola"'), '"dice ""hola"""');
  assert.equal(celdaCsv('dos\nlíneas'), '"dos\nlíneas"');
  assert.equal(celdaCsv(null), '');
  assert.equal(celdaCsv(undefined), '');
  assert.equal(celdaCsv(0), '0');
});

test('celdaCsv: neutraliza fórmulas de Excel pero respeta los números negativos', () => {
  assert.equal(celdaCsv('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(celdaCsv('+54911'), '+54911', 'un teléfono con + es numérico: no es una fórmula');
  assert.equal(celdaCsv('+1+1'), "'+1+1", 'pero una suma sí es una fórmula');
  assert.equal(celdaCsv('@SUMA(A1)'), "'@SUMA(A1)");
  assert.equal(celdaCsv('-cmd'), "'-cmd");
  assert.equal(celdaCsv(-500), '-500');
  assert.equal(celdaCsv('-500'), '-500');
});

const vacio = { trips: [], fuelLogs: [], maintenanceLogs: [], fixedCosts: [] };

test('armarCsv: las 4 secciones con encabezados, BOM y línea final', () => {
  const csv = armarCsv(vacio);
  assert.ok(csv.startsWith('\uFEFF# Viajes\n'));
  for (const t of ['# Viajes', '# Combustible', '# Mantenimiento', '# Gastos fijos']) assert.ok(csv.includes(t), t);
  assert.ok(csv.endsWith('\n'));
});

test('armarCsv: exporta los datos reales y OMITE los de ejemplo (seed-)', () => {
  const csv = armarCsv({
    trips: [
      { id: 'seed-1', client_name: 'EJEMPLO', client_phone: '', origin: 'a', destination: 'b', scheduled_at: '2026-10-14T09:00:00', price: 1, status: 'pending', created_at: '' },
      { id: 'abc', client_name: 'María, "la jefa"', client_phone: '1155', origin: 'Palermo', destination: 'Ezeiza', scheduled_at: '2026-10-14T09:30:00', price: 15000, status: 'pending', notes: '=1+1', created_at: '' },
    ] as never,
    fuelLogs: [{ id: 'f1', filled_at: '2026-10-10', odometer_km: 45100, liters: 30, cost_per_liter: 1200, total_cost: 36000, created_at: '' }] as never,
    maintenanceLogs: [],
    fixedCosts: [{ id: 'c1', category: 'seguro', label: 'Seguro', amount: 50000, active: true, created_at: '' }] as never,
  });
  assert.ok(!csv.includes('EJEMPLO'), 'el viaje de ejemplo no debe salir');
  assert.ok(csv.includes('"María, ""la jefa"""'), 'escapa comillas y comas');
  assert.ok(csv.includes("'=1+1"), 'neutraliza la fórmula de las notas');
  assert.ok(csv.includes('15000'));
  assert.ok(csv.includes('2026-10-10,45100,30,1200,36000'));
  assert.ok(csv.includes('seguro,Seguro,50000,si'));
});
