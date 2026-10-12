import React from 'react';
import { Redirect } from 'expo-router';

// La edición de tarifas ahora vive dentro del panel unificado de
// configuración (identidad + tarifas en una sola pantalla). Esta ruta se
// conserva como redirección por compatibilidad con enlaces previos.
export default function RatesRedirect() {
  return <Redirect href="/configuracion" />;
}
