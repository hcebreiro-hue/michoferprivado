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
  } catch {
    // Comportamiento esperado en Expo Go: Observe no está disponible y la app
    // sigue funcionando sin él. No logueamos para no ensuciar la consola.
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
