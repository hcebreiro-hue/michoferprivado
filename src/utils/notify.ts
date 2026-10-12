import { Alert, Platform } from 'react-native';

/**
 * Muestra un aviso al usuario de forma consistente en web y nativo.
 * En web usa `alert` global (Alert.alert no está disponible); en iOS/Android
 * usa el diálogo nativo del sistema.
 */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}