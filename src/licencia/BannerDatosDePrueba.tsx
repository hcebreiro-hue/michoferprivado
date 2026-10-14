import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { identidadDeLicencia } from './identidad';
import { useLicencia } from './LicenciaContext';
import { useEmpezar } from './useEmpezar';

/**
 * Recordatorio en el inicio mientras el chofer sigue con los datos de prueba.
 * Solo aparece para choferes dados de alta con nombre (los que pasaron por la
 * bienvenida) y desaparece al tocar "Borrar datos de prueba y empezar".
 */
export function BannerDatosDePrueba() {
  const { licencia } = useLicencia();
  const { settings } = useSettings();
  const empezar = useEmpezar();

  if (settings.profile_complete || !identidadDeLicencia(licencia)) return null;

  return (
    <Pressable
      onPress={empezar}
      accessibilityRole="button"
      accessibilityLabel="Borrar datos de prueba y empezar"
      className="mt-4 flex-row items-center rounded-2xl border border-amber-200 bg-amber-50 p-4 active:bg-amber-100"
    >
      <Ionicons name="flask-outline" size={22} color="#d97706" />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-amber-800">Estás viendo datos de prueba</Text>
        <Text className="text-xs text-amber-700 mt-0.5">Tocá acá para borrarlos y empezar con tus viajes reales.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d97706" />
    </Pressable>
  );
}
