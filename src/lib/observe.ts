import React from 'react';

type ObserveModule = typeof import('expo-observe');

let cached: ObserveModule | null = null;
let attempted = false;

/**
 * Carga expo-observe de forma tolerante. En Expo Go el módulo nativo
 * (ExpoAppMetrics) no existe y su import lanza un error que tiraría la app;
 * aquí lo aislamos. Devuelve null si no está disponible.
 */
function getObserve(): ObserveModule | null {
  if (attempted) return cached;
  attempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-observe');
  } catch (cause) {
    console.warn(
      'expo-observe no está disponible en este entorno (p. ej. Expo Go).',
      cause,
    );
    cached = null;
  }
  return cached;
}

/**
 * Envuelve un componente con ObserveRoot cuando está disponible (build/APK).
 * En Expo Go devuelve el componente sin envolver, para no romper la app.
 */
export function ObserveRootSafe<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  const Root = getObserve()?.ObserveRoot;
  if (Root && typeof Root.wrap === 'function') {
    const wrap = Root.wrap as unknown as (
      component: React.ComponentType<P>,
    ) => React.ComponentType<P>;
    return wrap(Component);
  }
  return Component;
}
