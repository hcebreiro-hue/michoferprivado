import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components/ui';
import { leyendaLicencia } from './identidad';
import type { LicenciaPayload } from './verificar';
import { useEmpezar } from './useEmpezar';

/**
 * Se muestra UNA vez, justo después de activar. Saluda, confirma los datos con
 * los que el dueño dio de alta al chofer y dice hasta cuándo vale su licencia.
 * Después entra a la app con datos de prueba, que quedan hasta que él los borre.
 */
export function PantallaBienvenida({
  licencia,
  nombre,
  telefono,
  onEntrar,
}: {
  licencia: LicenciaPayload;
  nombre: string;
  telefono: string;
  onEntrar: () => void;
}) {
  const empezar = useEmpezar();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-5 gap-4">
        <Text className="text-3xl font-bold text-slate-900 mt-6">Hola, {nombre} 👋</Text>
        <Text className="text-base text-slate-600">Tu app ya está activada.</Text>

        <Card>
          <Text className="text-xs font-semibold text-slate-400 uppercase">Tus datos</Text>
          <Text className="text-base font-semibold text-slate-900 mt-1">{nombre}</Text>
          <Text className="text-sm text-slate-600">WhatsApp: {telefono}</Text>
          <View className="h-px bg-slate-100 my-3" />
          <Text className="text-xs font-semibold text-slate-400 uppercase">Tu licencia</Text>
          <Text className="text-base text-slate-900 mt-1">{leyendaLicencia(licencia)}</Text>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <Text className="text-sm font-bold text-amber-800">Datos de prueba</Text>
          <Text className="text-sm text-amber-800 mt-1">
            Lo que vas a ver al entrar son datos de ejemplo, para que explores la app sin miedo. Se quedan hasta que vos
            los borres. Cuando quieras empezar con tus viajes reales, tocá «Borrar datos de prueba y empezar»: desde
            Configuración, o desde el aviso en la pantalla de inicio.
          </Text>
        </Card>

        <Button title="Entrar a la app" onPress={onEntrar} fullWidth size="lg" />
        <Button title="Borrar datos de prueba y empezar" variant="ghost" onPress={empezar} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}
