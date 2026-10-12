import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Card, Button, Input, SectionHeader } from '../../src/components/ui';
import { useSettings } from '../../src/context/SettingsContext';
import { formatCurrency, formatNumber } from '../../src/utils/format';

export default function CalculadoraScreen() {
  const { settings } = useSettings();
  const router = useRouter();
  const [km, setKm] = useState('');

  const kmValue = Number(km.replace(',', '.')) || 0;
  const rate = settings.cost_per_km;
  const wearRate = settings.wear_cost_per_km;

  const total = useMemo(() => kmValue * rate, [kmValue, rate]);
  // Fondo de reserva que debería guardarse para el auto en este viaje.
  const reserve = useMemo(() => kmValue * wearRate, [kmValue, wearRate]);
  // Ganancia estimada tras separar la reserva.
  const netEstimate = useMemo(() => total - reserve, [total, reserve]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Calculadora"
        subtitle="Estima el precio de un viaje"
        right={
          <Pressable
            onPress={() => router.push('/configuracion')}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Editar configuración"
          >
            <Ionicons name="settings-outline" size={22} color="#2563eb" />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Tarifas guardadas del perfil */}
        <View className="mt-4">
          <SectionHeader title="Tus tarifas actuales" />
          <Card>
            <Button
              title="Editar tarifas"
              onPress={() => router.push('/configuracion')}
              variant="secondary"
              fullWidth
            />
            <Text className="text-xs text-slate-400 mt-2">
              El costo de desgaste se guarda como fondo de reserva para el auto
              (neumáticos y reparaciones).
            </Text>
          </Card>
        </View>

        {/* Calculadora */}
        <View className="mt-2">
          <SectionHeader title="Calcular viaje" />
          <Card>
            <Input
              label="Kilómetros del recorrido"
              value={km}
              onChangeText={setKm}
              keyboardType="numeric"
              placeholder="Ej. 35"
            />

            <View className="flex-row items-center justify-between py-2 border-t border-slate-100 mt-1">
              <Text className="text-sm text-slate-500">Kilómetros</Text>
              <Text className="text-base font-semibold text-slate-800">
                {formatNumber(kmValue)} km
              </Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-t border-slate-100">
              <Text className="text-sm text-slate-500">Precio por km</Text>
              <Text className="text-base font-semibold text-slate-800">
                {formatCurrency(rate, settings)}
              </Text>
            </View>

            {/* Resultado destacado */}
            <View className="mt-4 bg-brand-600 rounded-2xl p-5 items-center">
              <Text className="text-brand-100 text-sm font-medium">
                Precio estimado
              </Text>
              <Text className="text-white text-4xl font-bold mt-1">
                {formatCurrency(total, settings)}
              </Text>
            </View>

            {/* Desglose de reserva y ganancia neta */}
            <View className="mt-3 bg-slate-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={16} color="#2563eb" />
                  <Text className="text-sm text-slate-600 ml-1.5">
                    Fondo de reserva (auto)
                  </Text>
                </View>
                <Text className="text-sm font-bold text-brand-600">
                  {formatCurrency(reserve, settings)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between pt-2 border-t border-slate-200">
                <Text className="text-sm font-semibold text-slate-700">
                  Ganancia neta estimada
                </Text>
                <Text
                  className={`text-base font-bold ${
                    netEstimate >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(netEstimate, settings)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Accesos rápidos de distancia */}
        <View className="mt-2">
          <SectionHeader title="Distancias rápidas" />
          <View className="flex-row gap-2">
            {[10, 25, 50, 100].map((v) => (
              <QuickKm key={v} value={v} onPress={() => setKm(String(v))} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Botón de distancia rápida. */
function QuickKm({ value, onPress }: { value: number; onPress: () => void }) {
  return (
    <View className="flex-1">
      <Button
        title={`${value} km`}
        onPress={onPress}
        variant="ghost"
        size="sm"
      />
    </View>
  );
}
