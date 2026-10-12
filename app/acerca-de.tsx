import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  appVersion,
  buildNumber,
  formatBuildDate,
  formatBuildTime,
} from '../src/lib/appVersion';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      {/* Encabezado con botón de volver */}
      <View className="flex-row items-center px-5 pt-2 pb-4 bg-white border-b border-slate-100">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
        >
          <Ionicons name="arrow-back" size={20} color="#475569" />
        </Pressable>
        <Text className="text-2xl font-bold text-slate-900">Acerca de</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}
      >
        {/* Logo de la app */}
        <View className="mt-10 mb-5 h-24 w-24 items-center justify-center rounded-3xl bg-brand-600">
          <Ionicons name="car-sport" size={52} color="#ffffff" />
        </View>

        <Text className="text-2xl font-bold text-slate-900">Mi Chofer Privado</Text>
        <Text className="mt-1 text-sm text-slate-400">
          Versión {appVersion}
          {buildNumber !== null ? ` (build ${buildNumber})` : ''}
        </Text>
        {formatBuildDate() ? (
          <Text className="mt-1 text-xs text-slate-400">
            Compilado el {formatBuildDate()}
            {formatBuildTime() ? ` · ${formatBuildTime()}` : ''}
          </Text>
        ) : (
          <Text className="mt-1 text-xs text-slate-400">Versión de desarrollo</Text>
        )}

        <Text className="mt-6 text-center text-base leading-6 text-slate-500">
          Tu compañero para gestionar viajes, clientes, finanzas y el mantenimiento de tu auto.
        </Text>

        {/* Crédito de autoría destacado */}
        <View className="mt-9 w-full rounded-2xl border border-slate-100 bg-white p-6">
          <Text className="text-center text-xs text-slate-400">Aplicación realizada por</Text>
          <Text className="mt-1.5 text-center text-xl font-bold text-brand-700">
            Horacio Cebreiro
          </Text>
        </View>

        <Text className="mt-8 text-center text-xs leading-5 text-slate-400">
          © 2026 Mi Chofer Privado.{'\n'}Todos los derechos reservados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
