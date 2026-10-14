import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { FixedCost, FuelLog, MaintenanceLog, Trip } from '../types';

/**
 * "Descargar mis datos": un CSV por categoría, todo junto en un solo archivo de
 * texto con secciones, que se entrega por el menú de compartir del sistema
 * (WhatsApp, mail, Drive). Funciona SIEMPRE, también con la licencia vencida.
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
 * campos (notas, nombres, direcciones) los escribe el usuario.
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

export function armarCsv(d: DatosExportables): string {
  const secciones = [
    tabla(
      'Viajes',
      ['fecha', 'cliente', 'telefono', 'origen', 'destino', 'precio', 'km', 'estado', 'cobro', 'cobrado', 'notas'],
      d.trips
        .filter((t) => !t.id.startsWith('seed-'))
        .map((t) => [t.scheduled_at, t.client_name, t.client_phone, t.origin, t.destination, t.price, t.distance_km, t.status, t.payment_status, t.amount_paid, t.notes]),
    ),
    tabla(
      'Combustible',
      ['fecha', 'km', 'litros', 'precio_litro', 'total'],
      d.fuelLogs.filter((f) => !f.id.startsWith('seed-')).map((f) => [f.filled_at, f.odometer_km, f.liters, f.cost_per_liter, f.total_cost]),
    ),
    tabla(
      'Mantenimiento',
      ['fecha', 'tipo', 'km', 'costo', 'notas'],
      d.maintenanceLogs.filter((m) => !m.id.startsWith('seed-')).map((m) => [m.performed_at, m.type, m.odometer_km, m.cost, m.notes]),
    ),
    tabla(
      'Gastos fijos',
      ['categoria', 'detalle', 'monto_mensual', 'activo'],
      d.fixedCosts.filter((c) => !c.id.startsWith('seed-')).map((c) => [c.category, c.label, c.amount, c.active ? 'si' : 'no']),
    ),
  ];
  // BOM para que Excel abra bien los acentos.
  return `\uFEFF${secciones.join('\n\n')}\n`;
}

/** Guarda el CSV en la caché y abre el menú de compartir. Devuelve false si no se puede compartir. */
export async function exportarDatos(d: DatosExportables, ahora = new Date()): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const nombre = `claudia-mis-datos-${ahora.toISOString().slice(0, 10)}.csv`;
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  archivo.write(armarCsv(d));
  await Sharing.shareAsync(archivo.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Descargar mis datos',
    UTI: 'public.comma-separated-values-text',
  });
  return true;
}
