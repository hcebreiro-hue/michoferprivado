import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
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
    case 'gracia':
      return (
        <View className="flex-1">
          <Banner
            tono="rojo"
            texto={`Tu licencia venció. Te quedan ${acceso.diasDeGracia} ${acceso.diasDeGracia === 1 ? 'día' : 'días'} de gracia: renová por WhatsApp.`}
          />
          {children}
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
          {children}
        </View>
      );
  }
}

function Banner({ texto, tono }: { texto: string; tono: 'ambar' | 'rojo' }) {
  const abrir = () =>
    Linking.openURL(`https://wa.me/${WHATSAPP_DUENO}?text=${encodeURIComponent('Hola, quiero renovar mi licencia de Claudia.')}`).catch(() => undefined);
  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="alert"
      className={`${tono === 'rojo' ? 'bg-red-600' : 'bg-amber-500'} px-4 py-2.5 items-center justify-center`}
    >
      <Text className="text-white text-xs font-bold text-center">{texto}</Text>
    </Pressable>
  );
}
