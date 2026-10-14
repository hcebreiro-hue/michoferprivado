/** Tipos y errores del cliente de la API de Senda. Lógica pura (se prueba con `node --test`). */

export interface Sesion {
  access: string;
  refresh: string;
  /** Id del chofer en el servidor. */
  chofer: number;
}

/** Misma forma que `expo-secure-store`. */
export interface Almacen {
  getItemAsync(clave: string): Promise<string | null>;
  setItemAsync(clave: string, valor: string): Promise<void>;
  deleteItemAsync(clave: string): Promise<void>;
}

export type OyenteSesion = (sesion: Sesion | null) => void;

const MENSAJES: Record<string, string> = {
  sin_conexion: 'No hay conexión con el servidor. Revisá tu internet.',
  licencia: 'Tu licencia no está vigente. Escribile al soporte.',
  no_autorizado: 'La sesión venció. Cerrá y volvé a abrir la app.',
  sesion_invalida: 'La sesión venció. Cerrá y volvé a abrir la app.',
  demasiados_intentos: 'Demasiados intentos. Esperá un rato y probá de nuevo.',
  identidad_inmutable: 'Los datos identificatorios del perfil no se pueden cambiar después del alta.',
  error_interno: 'El servidor tuvo un problema. Probá de nuevo en un rato.',
};

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(MENSAJES[code] ?? `No se pudo completar la operación (${code}).`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Almacén en memoria con la misma interfaz (web, donde no hay SecureStore, y pruebas). */
export function almacenEnMemoria(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItemAsync: async (k) => datos.get(k) ?? null,
    setItemAsync: async (k, v) => void datos.set(k, v),
    deleteItemAsync: async (k) => void datos.delete(k),
  };
}
