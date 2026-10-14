/**
 * Lógica pura para elegir al cliente de un viaje (sin React ni módulos
 * nativos, para probarla con `node --test`).
 */

export interface ClienteElegible {
  nombre: string;
  telefono: string;
  /** Detalle opcional para la lista (ej. "3 viajes" o "móvil"). */
  detalle?: string;
}

/** Lo mínimo que se necesita de un viaje para armar la lista de frecuentes. */
export interface ViajeParaFrecuentes {
  id: string;
  client_name: string;
  client_phone: string;
  scheduled_at: string;
}

/** Minúsculas y sin tildes, para buscar sin preocuparse por cómo se escribió. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Deja el teléfono de un contacto listo para WhatsApp (que la app abre con
 * wa.me, que exige código de país). Los contactos vienen como "11 2345-6789",
 * "011 2345-6789" o "+54 9 11 2345-6789"; los argentinos se llevan a +549...
 * Un número con "+" de otro país se respeta tal cual. Si no se reconoce, se
 * devuelve solo con dígitos (el chofer lo puede corregir en el formulario).
 */
export function telefonoDeContacto(crudo: string): string {
  const recortado = crudo.trim();
  let digitos = recortado.replace(/\D/g, '');
  if (!digitos) return '';
  let conMas = recortado.startsWith('+');
  if (digitos.startsWith('00')) {
    digitos = digitos.slice(2);
    conMas = true;
  }
  if (conMas) {
    // +54 sin el 9 de móvil (54 + 10 dígitos): se agrega, como hace el servidor de licencias.
    if (/^54(?!9)\d{10}$/.test(digitos)) digitos = `549${digitos.slice(2)}`;
    return `+${digitos}`;
  }
  const sinCero = digitos.startsWith('0') ? digitos.slice(1) : digitos;
  if (/^\d{10}$/.test(sinCero)) return `+549${sinCero}`;
  if (/^54\d{10,11}$/.test(sinCero)) {
    return `+${/^54(?!9)\d{10}$/.test(sinCero) ? `549${sinCero.slice(2)}` : sinCero}`;
  }
  return digitos;
}

/** Clave para considerar "el mismo cliente": el teléfono si hay, si no el nombre. */
function claveDeCliente(nombre: string, telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.length >= 8 ? `t:${digitos.slice(-10)}` : `n:${normalizarTexto(nombre)}`;
}

/**
 * Clientes frecuentes: los que más viajes tienen cargados, y a igualdad, los
 * más recientes. Ignora los viajes de ejemplo ("seed-") y los sin nombre. Quien
 * llama debe quitar antes los bloqueos de calendario. De cada cliente se toman
 * el nombre y el teléfono de su viaje más reciente.
 */
export function clientesFrecuentes(viajes: ViajeParaFrecuentes[], limite = 8): ClienteElegible[] {
  const grupos = new Map<string, { nombre: string; telefono: string; cantidad: number; ultimo: number }>();
  for (const v of viajes) {
    const nombre = v.client_name.trim();
    if (!nombre || v.id.startsWith('seed-')) continue;
    const fecha = Date.parse(v.scheduled_at);
    const ultimo = Number.isFinite(fecha) ? fecha : 0;
    const clave = claveDeCliente(nombre, v.client_phone);
    const previo = grupos.get(clave);
    if (!previo) {
      grupos.set(clave, { nombre, telefono: v.client_phone.trim(), cantidad: 1, ultimo });
    } else {
      previo.cantidad += 1;
      if (ultimo >= previo.ultimo) {
        previo.ultimo = ultimo;
        previo.nombre = nombre;
        if (v.client_phone.trim()) previo.telefono = v.client_phone.trim();
      }
    }
  }
  return [...grupos.values()]
    .sort((a, b) => b.cantidad - a.cantidad || b.ultimo - a.ultimo)
    .slice(0, limite)
    .map((g) => ({
      nombre: g.nombre,
      telefono: g.telefono,
      detalle: `${g.cantidad} ${g.cantidad === 1 ? 'viaje' : 'viajes'}`,
    }));
}

/** Filtra por nombre o por teléfono (ignora tildes y mayúsculas). */
export function filtrarClientes(lista: ClienteElegible[], consulta: string): ClienteElegible[] {
  const q = normalizarTexto(consulta);
  if (!q) return lista;
  const qDigitos = q.replace(/\D/g, '');
  return lista.filter(
    (c) =>
      normalizarTexto(c.nombre).includes(q) ||
      (qDigitos.length >= 3 && c.telefono.replace(/\D/g, '').includes(qDigitos)),
  );
}
