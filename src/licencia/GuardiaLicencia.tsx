import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantallaActivacion } from './PantallaActivacion';
import { PantallaBloqueo } from './PantallaBloqueo';
import { WHATSAPP_DUENO } from './config';
import { useLicencia } from './LicenciaContext';

/**
 * Decide qué se ve según el estado de la licencia. Va por ENCIMA del resto de la
 * app: sin licencia vigente no se llega a ninguna pantalla.
 *
 * Los estados 'activa' y 'gracia' dejan pasar (con un banner si corresponde).
 */
export function GuardiaLicencia({ children }: { children: React.ReactNode }) {
  const { acceso } = useLicencia();

  if (acceso === null) return null; // leyendo el estado guardado

  switch (acceso.tipo) {
    case 'sin_licencia':
      return <PantallaActivacion />;
    case 'requiere_conexion':
      return <PantallaActivacion pendienteDeConexion />;
    case 'vencida':
      return <PantallaBloqueo motivo="vencida" />;
    case 'apk_vencido':
      return <PantallaBloqueo motivo="apk_vencido" />;
    case 'reloj':
      return <PantallaBloqueo motivo="reloj" />;
    case 'suspendida':
      return <PantallaBloqueo motivo="suspendida" />;
    case 'gracia':
      return (
        <View className="flex-1">
          <Banner
            tono="rojo"
            texto={`Tu licencia venció. Te quedan ${acceso.diasDeGracia} ${acceso.diasDeGracia === 1 ? 'día' : 'días'} de gracia: renová por WhatsApp.`}
          />
          <BajoElBanner>{children}</BajoElBanner>
        </View>
      );
    case 'activa':
      if (!acceso.porVencer) return <>{children}</>;
      return (
        <View className="flex-1">
          <Banner
            tono="ambar"
            texto={`Tu licencia vence en ${acceso.diasRestantes} ${acceso.diasRestantes === 1 ? 'día' : 'días'}. Pedí la renovación por WhatsApp.`}
          />
          <BajoElBanner>{children}</BajoElBanner>
        </View>
      );
  }
}

/**
 * El banner ya cubre la barra de estado. Un SafeAreaProvider anidado mide su
 * posición real en pantalla, así que las pantallas de abajo ven un margen
 * superior de 0 y no lo suman otra vez (si no, queda un hueco en blanco).
 */
function BajoElBanner({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider style={{ flex: 1 }}>{children}</SafeAreaProvider>;
}

function Banner({ texto, tono }: { texto: string; tono: 'ambar' | 'rojo' }) {
  const insets = useSafeAreaInsets();
  const abrir = () =>
    Linking.openURL(`https://wa.me/${WHATSAPP_DUENO}?text=${encodeURIComponent('Hola, quiero renovar mi licencia de Senda.')}`).catch(() => undefined);
  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="alert"
      style={{ paddingTop: insets.top + 10 }}
      className={`${tono === 'rojo' ? 'bg-red-600' : 'bg-amber-500'} px-4 pb-2.5 items-center justify-center`}
    >
      <Text className="text-white text-xs font-bold text-center">{texto}</Text>
    </Pressable>
  );
}
