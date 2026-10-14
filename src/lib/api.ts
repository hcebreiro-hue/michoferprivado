import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { URL_SERVIDOR } from '../licencia/config';
import { crearApi } from './apiCore';
import { almacenEnMemoria, type Almacen } from './apiTipos';

export { ApiError, type Sesion } from './apiTipos';

/**
 * La sesión vive en el almacén seguro del teléfono (Keystore de Android). En la web
 * (solo la agenda pública del pasajero) no hay sesión de chofer: se usa memoria.
 * Si el almacén seguro falla al leer (por ejemplo tras restaurar un backup, donde las
 * claves no se pueden descifrar) se lo trata como "sin sesión": la app la vuelve a pedir.
 */
const seguro: Almacen = {
  getItemAsync: async (clave) => {
    try {
      return await SecureStore.getItemAsync(clave);
    } catch {
      return null;
    }
  },
  setItemAsync: (clave, valor) => SecureStore.setItemAsync(clave, valor),
  deleteItemAsync: async (clave) => {
    try {
      await SecureStore.deleteItemAsync(clave);
    } catch {
      /* ya no estaba */
    }
  },
};

/** Servidor de datos (en desarrollo se puede apuntar a otro con EXPO_PUBLIC_API_URL). */
export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? URL_SERVIDOR;

export const { api, apiPublica, leerSesion, guardarSesion, borrarSesion, hayCuenta, suscribir } = crearApi({
  base: URL_API,
  almacen: Platform.OS === 'web' ? almacenEnMemoria() : seguro,
});
