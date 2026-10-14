import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { armarCsv, type DatosExportables } from './csv';

/**
 * "Descargar mis datos": guarda el CSV en la caché y abre el menú de compartir
 * del sistema (WhatsApp, mail, Drive). Funciona SIEMPRE, también con la licencia
 * vencida. Devuelve false si el teléfono no permite compartir archivos.
 */
export async function exportarDatos(datos: DatosExportables, ahora = new Date()): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const nombre = `senda-mis-datos-${ahora.toISOString().slice(0, 10)}.csv`;
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  archivo.write(armarCsv(datos));
  await Sharing.shareAsync(archivo.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Descargar mis datos',
    UTI: 'public.comma-separated-values-text',
  });
  return true;
}
