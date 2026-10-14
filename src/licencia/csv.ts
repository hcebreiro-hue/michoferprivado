import type { FixedCost, FuelLog, MaintenanceLog, Trip } from '../types/index.ts';

/**
 * Armado del CSV de "Descargar mis datos". Es lógica PURA (sin archivos ni
 * módulos nativos) para poder probarla con `node --test`.
 */

export interface DatosExportables {
  trips: Trip[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  fixedCosts: FixedCost[];
}

/**
 * Escapa un valor para CSV. Además neutraliza las "fórmulas": un texto que
 * empiece con = + - @ se interpretaría como fórmula en Excel/Sheets, y estos
 * campos (notas, nombres, direcciones) los escribe el usuario. Los números
 * negativos legítimos (-500) no se tocan.
 */
export function celdaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto) && Number.isNaN(Number(texto))) texto = `'${texto}`;
  return /[",\n\r;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function tabla(titulo: string, columnas: string[], filas: unknown[][]): string {
  const lineas = [columnas.map(celdaCsv).join(','), ...filas.map((f) => f.map(celdaCsv).join(','))];
  return `# ${titulo}\n${lineas.join('\n')}`;
}

const esDeEjemplo = (r: { id: string }) => r.id.startsWith('seed-');

export function armarCsv(d: DatosExportables): string {
  const secciones = [
    tabla(
      'Viajes',
      ['fecha', 'cliente', 'telefono', 'origen', 'destino', 'precio', 'km', 'estado', 'cobro', 'cobrado', 'notas'],
      d.trips
        .filter((t) => !esDeEjemplo(t))
        .map((t) => [t.scheduled_at, t.client_name, t.client_phone, t.origin, t.destination, t.price, t.distance_km, t.status, t.payment_status, t.amount_paid, t.notes]),
    ),
    tabla(
      'Combustible',
      ['fecha', 'km', 'litros', 'precio_litro', 'total'],
      d.fuelLogs.filter((f) => !esDeEjemplo(f)).map((f) => [f.filled_at, f.odometer_km, f.liters, f.cost_per_liter, f.total_cost]),
    ),
    tabla(
      'Mantenimiento',
      ['fecha', 'tipo', 'km', 'costo', 'notas'],
      d.maintenanceLogs.filter((m) => !esDeEjemplo(m)).map((m) => [m.performed_at, m.type, m.odometer_km, m.cost, m.notes]),
    ),
    tabla(
      'Gastos fijos',
      ['categoria', 'detalle', 'monto_mensual', 'activo'],
      d.fixedCosts.filter((c) => !esDeEjemplo(c)).map((c) => [c.category, c.label, c.amount, c.active ? 'si' : 'no']),
    ),
  ];
  // BOM para que Excel abra bien los acentos.
  return `\uFEFF${secciones.join('\n\n')}\n`;
}
