import React, { useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, Card, Input } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useSettings } from '../src/context/SettingsContext';
import { notify } from '../src/utils/notify';
import { resetToDemo } from '../src/services/settings';

export default function SettingsScreen() {
  const { settings, loading, updateSettings } = useSettings();
  const router = useRouter();

  const identityLocked = settings.profile_complete;

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

        <View className="h-4" />

        <AccountSection />

        <View className="h-4" />

        <DemoSection />

        <View className="h-4" />

        {/* Acceso a la pantalla Acerca de */}
        <Card className="overflow-hidden p-0">
          <Pressable
            onPress={() => router.push('/acerca-de')}
            accessibilityRole="button"
            accessibilityLabel="Abrir Acerca de"
            className="active:bg-slate-50 flex-row items-center justify-between p-5"
          >
            <View className="flex-row items-center">
              <Ionicons name="information-circle-outline" size={22} color="#2563eb" />
              <View className="ml-3">
                <Text className="text-base font-semibold text-slate-900">Acerca de</Text>
                <Text className="text-xs text-slate-400">
                  Información de la app y créditos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </Pressable>
        </Card>
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

/**
 * Sección de cuenta. La app funciona en modo local (en el dispositivo) con el
 * nombre "Conductor" y datos de ejemplo. Desde acá el chofer puede, cuando
 * quiera, iniciar sesión o crear su cuenta real para activar el modo
 * multi-chofer (Supabase) y su web pública de reservas.
 */
function AccountSection() {
  const router = useRouter();
  const { session, enabled, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const closeSession = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (cause) {
      notify(
        'Error',
        cause instanceof Error ? cause.message : 'No se pudo cerrar sesión.',
      );
    } finally {
      setSigningOut(false);
    }
  };

  const hasSession = Boolean(session);

  return (
    <Card className="p-5">
      <Text className="text-base font-bold text-slate-900">Cuenta</Text>

      {hasSession ? (
        <>
          <Text className="mt-1 mb-4 text-xs text-slate-400">
            Sesión activa: tus datos se guardan en tu cuenta y tu web de reservas
            está en línea.
          </Text>
          {session?.user?.email ? (
            <Text className="mb-4 text-sm font-medium text-slate-700">
              {session.user.email}
            </Text>
          ) : null}
          <Button
            title="Cerrar sesión"
            onPress={closeSession}
            variant="ghost"
            loading={signingOut}
            fullWidth
          />
        </>
      ) : (
        <>
          <Text className="mt-1 mb-4 text-xs text-slate-400">
            Estás usando la app en modo local: tus datos se guardan solo en este
            dispositivo con el nombre “Conductor”. Si querés activar tu cuenta
            real, con web de reservas y respaldo en la nube, iniciá sesión o
            creá tu cuenta.
          </Text>
          <Button
            title="Iniciar sesión o crear cuenta"
            onPress={() => router.push('/auth')}
            fullWidth
          />
          {!enabled ? (
            <Text className="mt-3 text-xs text-amber-600">
              El modo cuenta requiere conexión configurada con la base de datos.
            </Text>
          ) : null}
        </>
      )}
    </Card>
  );
}

/**
 * Sección para volver al estado de demostración. Cierra la sesión (si la hay) y
 * restablece el perfil genérico "Conductor" con datos de ejemplo en el
 * dispositivo. Útil para volver a explorar la app o reiniciarla desde cero.
 */
function DemoSection() {
  const { signOut } = useAuth();
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    Alert.alert(
      '¿Volver a datos de ejemplo?',
      'Se cerrará tu sesión y la app volverá al estado inicial: nombre "Conductor" y viajes de demostración. Se perderán los datos guardados en este dispositivo (los de tu cuenta en la nube no se modifican).',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, restablecer',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetToDemo();
              await signOut();
              notify('Listo', 'La app volvió a los datos de ejemplo.');
            } catch (cause) {
              notify(
                'Error',
                cause instanceof Error
                  ? cause.message
                  : 'No se pudo restablecer la app.',
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Card className="p-5">
      <Text className="text-base font-bold text-slate-900">Datos de ejemplo</Text>
      <Text className="mt-0.5 mb-4 text-xs text-slate-400">
        Volvé la app a su estado inicial con el nombre “Conductor” y viajes de
        demostración. Útil para reiniciar o volver a explorar.
      </Text>
      <Button
        title="Volver a datos de ejemplo"
        onPress={handleReset}
        variant="ghost"
        loading={resetting}
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
