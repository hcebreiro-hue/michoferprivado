import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Card, StatCard, SectionHeader, EmptyState } from '../../src/components/ui';
import { TripCard } from '../../src/components/TripCard';
import { useData } from '../../src/context/DataContext';
import { useSettings } from '../../src/context/SettingsContext';
import { formatCurrency, isUpcoming, monthLabel } from '../../src/utils/format';
import { needsMaintenanceAlert } from '../../src/utils/calculations';
import { isCalendarBlock } from '../../src/types';
import { driverSlugFromName } from '../../src/services/settings';

function createDriverPortalUrl(driverSlug: string): string {
  return `https://michoferprivado.pages.dev/reservas?driver=${encodeURIComponent(driverSlug)}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const {
    currentMonthTrips,
    currentMonthBalance,
    loading,
    error,
    refresh,
    updateTrip,
  } = useData();
  const { settings } = useSettings();
  const portalUrl = createDriverPortalUrl(
    settings.driver_slug || driverSlugFromName(settings.driver_name || 'Conductor'),
  );

  const openBookingPortal = () => {
    Linking.openURL(portalUrl).catch(() => {
      Alert.alert('No se pudo abrir la agenda web.');
    });
  };

  const copyBookingPortalLink = async () => {
    try {
      await Clipboard.setStringAsync(portalUrl);
      Alert.alert('¡Enlace copiado con éxito para enviar por WhatsApp!');
    } catch {
      Alert.alert('No se pudo copiar el enlace.');
    }
  };

  const upcoming = useMemo(
    () =>
      currentMonthTrips
        .filter((trip) => !isCalendarBlock(trip))
        .filter(isUpcoming)
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        )
        .slice(0, 4),
    [currentMonthTrips],
  );

  const alert = useMemo(() => needsMaintenanceAlert(settings), [settings]);
  const monthTripCount = currentMonthTrips.filter(
    (trip) => trip.status !== 'cancelled',
  ).length;
  const monthExpenses =
    currentMonthBalance.expenses + currentMonthBalance.fixed;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScreenHeader
        title={`Hola, ${settings.profile_complete && settings.driver_name ? settings.driver_name : 'Conductor'} 👋`}
        subtitle="Resumen del mes"
        right={
          <Pressable
            // @ts-ignore
            className="p-2 rounded-full bg-slate-100 active:bg-slate-200"
            onPress={() => router.push('/configuracion')}
            accessibilityRole="button"
            accessibilityLabel="Abrir configuración"
          >
            <Ionicons name="settings-outline" size={22} color="#475569" />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Métricas */}
        <View className="flex-row gap-3 mt-4">
          <StatCard
            label="Ingresos del mes"
            value={formatCurrency(currentMonthBalance.income, settings)}
            accent="green"
            hint={`${monthTripCount} viajes este mes`}
            icon={<Ionicons name="trending-up" size={16} color="#059669" />}
          />
          <StatCard
            label="Gastos del mes"
            value={formatCurrency(monthExpenses, settings)}
            accent="amber"
            hint={`Neto: ${formatCurrency(currentMonthBalance.net, settings)}`}
            icon={<Ionicons name="trending-down" size={16} color="#d97706" />}
          />
        </View>

        {/* Accesos al portal de reservas */}
        <View className="mt-4 flex-row gap-3">
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-brand-600 p-4 active:bg-brand-700"
            onPress={openBookingPortal}
            accessibilityRole="button"
            accessibilityLabel="Ver Agenda Web"
          >
            <Ionicons name="earth" size={20} color="#ffffff" />
            <Text className="ml-2 text-center text-sm font-bold text-white">
              Ver Agenda Web
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-2xl border border-brand-600 bg-white p-4 active:bg-slate-50"
            onPress={copyBookingPortalLink}
            accessibilityRole="button"
            accessibilityLabel="Copiar Link WhatsApp"
          >
            <Ionicons name="copy" size={20} color="#2563eb" />
            <Text className="ml-2 text-center text-sm font-bold text-brand-700">
              Copiar Link WhatsApp
            </Text>
          </Pressable>
        </View>

        {/* Alerta de mantenimiento */}
        {alert.show ? (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
            <View className="bg-amber-100 p-2 rounded-xl mr-3">
              <Ionicons name="warning" size={22} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-amber-800 font-bold text-sm">
                Mantenimiento del auto
              </Text>
              <Text className="text-amber-700 text-sm mt-0.5">
                {alert.message}
              </Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Próximos viajes */}
        <SectionHeader title={`Próximos viajes · ${monthLabel(currentMonthBalance.key)}`} />
        {loading && currentMonthTrips.length === 0 ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : upcoming.length === 0 ? (
          <Card>
            <EmptyState
              title="No hay viajes agendados"
              message="Agenda un viaje desde la pestaña Viajes."
              icon={<Ionicons name="calendar-outline" size={40} color="#cbd5e1" />}
            />
          </Card>
        ) : (
          upcoming.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onComplete={() => updateTrip(trip.id, { status: 'completed' })}
              onCancel={() => updateTrip(trip.id, { status: 'cancelled' })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
