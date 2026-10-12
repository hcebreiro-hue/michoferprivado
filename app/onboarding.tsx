import React, { useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card, Input } from '../src/components/ui';
import { useSettings } from '../src/context/SettingsContext';
import { notify } from '../src/utils/notify';

export default function OnboardingScreen() {
  const { settings, loading, updateSettings } = useSettings();
  if (loading) return <LoadingScreen />;
  return (
    <ProfileSetup
      initialName={settings.driver_name === 'Conductor' ? '' : settings.driver_name}
      initialPhone={settings.driver_phone}
      updateSettings={updateSettings}
    />
  );
}

function ProfileSetup({
  initialName,
  initialPhone,
  updateSettings,
}: {
  initialName: string;
  initialPhone: string;
  updateSettings: ReturnType<typeof useSettings>['updateSettings'];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  const completeSetup = async () => {
    if (!name.trim() || !phone.trim()) {
      notify('Datos incompletos', 'Ingresa tu nombre y teléfono para continuar.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        driver_name: name.trim(),
        driver_phone: phone.trim(),
        profile_complete: true,
      });
      router.replace('/(tabs)');
    } catch (cause) {
      notify(
        'No se pudo guardar el perfil',
        cause instanceof Error ? cause.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-slate-50 px-5">
      <Card className="p-5">
        <Text className="mb-2 text-2xl font-bold text-slate-900">
          Completa tu perfil
        </Text>
        <Text className="mb-6 text-sm text-slate-600">
          Estos datos se guardan una sola vez y no se modificarán al cambiar tus tarifas.
        </Text>
        <Input
          label="Nombre del chofer"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Claudia"
          autoCapitalize="words"
        />
        <Input
          label="Teléfono / WhatsApp"
          value={phone}
          onChangeText={setPhone}
          placeholder="Ej. +54 9 11 1234-5678"
          keyboardType="phone-pad"
        />
        <Button
          title="Guardar y continuar"
          onPress={completeSetup}
          loading={saving}
          fullWidth
        />
      </Card>
    </SafeAreaView>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-slate-50">
      <Text className="text-slate-500">Cargando perfil…</Text>
    </SafeAreaView>
  );
}
