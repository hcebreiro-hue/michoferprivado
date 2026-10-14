import '../global.css';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SettingsProvider, useSettings } from '../src/context/SettingsContext';
import { DataProvider } from '../src/context/DataContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ObserveRootSafe } from '../src/lib/observe';
import { LicenciaProvider } from '../src/licencia/LicenciaContext';
import { GuardiaLicencia } from '../src/licencia/GuardiaLicencia';

const MONETIZACION_ACTIVADA = false;

function SuscripcionGuard({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const tipoCuenta = settings.tipo_cuenta;

  if (tipoCuenta !== 'VIP_PAGO' || !MONETIZACION_ACTIVADA) {
    return <View className="flex-1">{children}</View>;
  }

  return (
    <View className="flex-1">
      <View
        className="bg-orange-500 px-4 py-2.5 items-center justify-center"
        accessibilityRole="alert"
      >
        <Text className="text-white text-xs font-bold text-center">
          Consulta con soporte las opciones de suscripción disponibles.
        </Text>
      </View>
      {children}
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const segments = useSegments();
  const currentRoute = segments[0];

  if (loading) return null;
  if (currentRoute === 'reservas') return children;
  if (settingsLoading) return null;
  // La app es funcional SIN cuenta: sin sesión funciona en modo local en el
  // dispositivo con el nombre "Conductor" y datos de ejemplo. El login es
  // opcional y se inicia desde Configuración cuando el chofer quiere activar
  // su cuenta real (multi-chofer + web de reservas). Por eso no se fuerza ni
  // el login ni el onboarding al abrir la app.
  if (
    session &&
    !settingsLoading &&
    settings.profile_complete &&
    (currentRoute === 'auth' || currentRoute === 'onboarding')
  ) {
    return <Redirect href="/(tabs)" />;
  }

  return children;
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <StatusBar style="dark" />
            <LicenciaProvider>
            <GuardiaLicencia>
            <AuthGate>
              <SuscripcionGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="reservas"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="configuracion"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="onboarding"
                    options={{ headerShown: false, gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="tarifas"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="auth"
                    options={{ headerShown: false }}
                  />
                </Stack>
              </SuscripcionGuard>
            </AuthGate>
            </GuardiaLicencia>
            </LicenciaProvider>
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default ObserveRootSafe(RootLayout);
