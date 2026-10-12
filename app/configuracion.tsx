import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useSettings } from '../src/context/SettingsContext';
import { notify } from '../src/utils/notify';

export default function SettingsScreen() {
  const { settings, loading, updateSettings } = useSettings();
  const { enabled: authEnabled, signOut } = useAuth();

  const identityLocked = settings.profile_complete;

  const closeSession = async () => {
    try {
      await signOut();
    } catch (cause) {
      notify(
        'Error',
        cause instanceof Error ? cause.message : 'No se pudo cerrar sesión.',
      );
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="mt-5 mb-1 text-2xl font-bold text-slate-900">
          Configuración
        </Text>
        <Text className="mb-4 text-sm text-slate-500">
          Tu identidad queda protegida después del alta. Las tarifas se editan
          cuando quieras.
        </Text>

        <IdentitySection
          driverName={settings.driver_name}
          driverPhone={settings.driver_phone}
          locked={identityLocked}
          updateSettings={updateSettings}
        />

        <View className="h-4" />

        <RatesSection
          pricePerKm={settings.cost_per_km}
          wearPerKm={settings.wear_cost_per_km}
          updateSettings={updateSettings}
        />

        {authEnabled ? (
          <View className="mt-6">
            <Button
              title="Cerrar sesión"
              onPress={closeSession}
              variant="ghost"
              fullWidth
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function IdentitySection({
  driverName,
  driverPhone,
  locked,
  updateSettings,
}: {
  driverName: string;
  driverPhone: string;
  locked: boolean;
  updateSettings: ReturnType<typeof useSettings>['updateSettings'];
}) {
  const [name, setName] = useState(driverName);
  const [phone, setPhone] = useState(driverPhone);
  const [saving, setSaving] = useState(false);

  const saveIdentity = async () => {
    if (!name.trim() || !phone.trim()) {
      notify('Datos incompletos', 'Ingresa el nombre y el teléfono del chofer.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        driver_name: name.trim(),
        driver_phone: phone.trim(),
        profile_complete: true,
      });
      notify('Perfil guardado', 'El nombre y teléfono quedaron definidos.');
    } catch (cause) {
      notify(
        'Error',
        cause instanceof Error ? cause.message : 'No se pudo guardar el perfil.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-base font-bold text-slate-900">Identidad</Text>
        {locked ? (
          <View className="flex-row items-center">
            <Ionicons name="lock-closed" size={14} color="#94a3b8" />
            <Text className="ml-1 text-xs font-medium text-slate-400">
              Protegido
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="mb-4 text-xs text-slate-400">
        {locked
          ? 'Estos datos se definen una sola vez y ya no se pueden cambiar.'
          : 'Se guardan una sola vez; después no se podrán modificar.'}
      </Text>
      <Input
        label="Nombre del chofer"
        value={name}
        onChangeText={setName}
        editable={!locked}
        autoCapitalize="words"
      />
      <Input
        label="Teléfono / WhatsApp"
        value={phone}
        onChangeText={setPhone}
        editable={!locked}
        keyboardType="phone-pad"
      />
      {!locked ? (
        <Button
          title="Guardar perfil"
          onPress={saveIdentity}
          loading={saving}
          fullWidth
        />
      ) : null}
    </Card>
  );
}

function RatesSection({
  pricePerKm,
  wearPerKm,
  updateSettings,
}: {
  pricePerKm: number;
  wearPerKm: number;
  updateSettings: ReturnType<typeof useSettings>['updateSettings'];
}) {
  const [price, setPrice] = useState(String(pricePerKm));
  const [wear, setWear] = useState(String(wearPerKm));
  const [saving, setSaving] = useState(false);

  const saveRates = async () => {
    const nextPrice = Number(price.replace(',', '.'));
    const nextWear = Number(wear.replace(',', '.'));
    if (
      !Number.isFinite(nextPrice) ||
      !Number.isFinite(nextWear) ||
      nextPrice < 0 ||
      nextWear < 0
    ) {
      notify(
        'Tarifas inválidas',
        'Ingresa importes válidos iguales o mayores a cero.',
      );
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        cost_per_km: nextPrice,
        wear_cost_per_km: nextWear,
      });
      notify(
        'Tarifas guardadas',
        'Se actualizaron sin modificar tu perfil ni tu historial.',
      );
    } catch (cause) {
      notify(
        'No se pudieron guardar las tarifas',
        cause instanceof Error ? cause.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <Text className="text-base font-bold text-slate-900">Tarifas</Text>
      <Text className="mt-0.5 mb-4 text-xs text-slate-400">
        Puedes actualizarlas cuando quieras; tu perfil y tus registros no cambian.
      </Text>
      <Input
        label="Tarifa por kilómetro"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      <Input
        label="Costo de desgaste por kilómetro"
        value={wear}
        onChangeText={setWear}
        keyboardType="decimal-pad"
      />
      <Button
        title="Guardar tarifas"
        onPress={saveRates}
        loading={saving}
        fullWidth
      />
    </Card>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-slate-50">
      <Text className="text-slate-500">Cargando configuración…</Text>
    </SafeAreaView>
  );
}
