import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Button, Input } from '../src/components/ui';
import { useData } from '../src/context/DataContext';
import { useSettings } from '../src/context/SettingsContext';
import { formatDate, normalizePhone } from '../src/utils/format';
import * as savedAddressesService from '../src/services/savedAddresses';
import { driverSlugFromName } from '../src/services/settings';
import {
  getPublicDriverPortal,
  type PublicBusyInterval,
  type PublicDriverPortal,
} from '../src/services/publicDriverPortal';
import { isCalendarBlock, type SavedAddress, type Trip } from '../src/types';
import { notify } from '../src/utils/notify';

/** Horario laboral de la conductora (para calcular disponibilidad). */
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;
/** Duración de cada turno en horas. */
const SLOT_HOURS = 2;

interface Slot {
  dateKey: string; // YYYY-MM-DD
  hour: number;
  date: Date;
  occupied: boolean;
}

type PublicPortalLoadState =
  | { driverSlug: string; status: 'loaded'; portal: PublicDriverPortal | null }
  | { driverSlug: string; status: 'error'; message: string };

/** Genera la clave YYYY-MM-DD de una fecha (local). */
function dateKeyOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Indica si un turno se solapa con un viaje o un bloqueo de agenda. */
function slotOccupied(
  date: Date,
  hour: number,
  trips: Trip[],
  busyIntervals?: PublicBusyInterval[],
): boolean {
  const slotStart = new Date(date);
  slotStart.setHours(hour, 0, 0, 0);
  const slotEnd = new Date(date);
  slotEnd.setHours(hour + SLOT_HOURS, 0, 0, 0);
  if (slotEnd.getTime() <= Date.now()) return true;
  if (busyIntervals) {
    return busyIntervals.some((interval) => {
      const intervalStart = new Date(interval.start_at).getTime();
      const intervalEnd = new Date(interval.end_at).getTime();
      return (
        intervalStart < slotEnd.getTime() && intervalEnd > slotStart.getTime()
      );
    });
  }

  return trips.some((trip) => {
    if (isCalendarBlock(trip)) {
      const blockStart = new Date(trip.scheduled_at).getTime();
      const blockEnd = new Date(trip.blocked_until).getTime();
      return blockStart < slotEnd.getTime() && blockEnd > slotStart.getTime();
    }
    const tripStart = new Date(trip.scheduled_at).getTime();
    return tripStart >= slotStart.getTime() && tripStart < slotEnd.getTime();
  });
}

/** Portal de reservas: vista simulada del pasajero. */
export default function ReservasScreen() {
  const router = useRouter();
  const { driver } = useLocalSearchParams<{ driver?: string }>();
  const { trips, loading, refresh } = useData();
  const { settings } = useSettings();
  const driverParam = Array.isArray(driver) ? driver[0] : driver;
  const hasDriverParam = Boolean(driverParam?.trim());
  const driverSlug = hasDriverParam
    ? driverSlugFromName(driverParam ?? '')
    : driverSlugFromName(settings.driver_name || 'Conductor');

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [newLabel, setNewLabel] = useState('Casa');
  const [newAddress, setNewAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [portalLoadState, setPortalLoadState] =
    useState<PublicPortalLoadState | null>(null);

  // Recarga la agenda pública del chofer desde el servidor. Se reutiliza en la
  // carga inicial, en el "refrescar" del usuario y en el auto-refresh. Usa
  // promesas para que el setState ocurra dentro de callbacks asincrónicos.
  const loadPortal = useCallback((): Promise<void> => {
    if (!hasDriverParam) return Promise.resolve();
    return getPublicDriverPortal(driverSlug)
      .then((portal) => {
        setPortalLoadState({ driverSlug, status: 'loaded', portal });
      })
      .catch((cause: unknown) => {
        setPortalLoadState({
          driverSlug,
          status: 'error',
          message:
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar la agenda de este chofer.',
        });
      });
  }, [driverSlug, hasDriverParam]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  // Auto-refresh: mantiene la disponibilidad actualizada sin que el pasajero
  // tenga que recargar, de modo que vea la agenda real del chofer.
  useEffect(() => {
    if (!hasDriverParam) return;
    const interval = setInterval(() => {
      void loadPortal();
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadPortal, hasDriverParam]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadPortal(), refresh()]);
  }, [loadPortal, refresh]);

  const currentPortalState =
    portalLoadState?.driverSlug === driverSlug ? portalLoadState : null;
  const publicPortal =
    hasDriverParam && currentPortalState?.status === 'loaded'
      ? currentPortalState.portal
      : null;
  const portalLoading =
    hasDriverParam && currentPortalState === null;
  const portalError = !hasDriverParam
    ? null
    : currentPortalState?.status === 'error'
      ? currentPortalState.message
      : currentPortalState?.status === 'loaded' && !currentPortalState.portal
        ? 'No encontramos un chofer con ese enlace.'
        : null;

  useEffect(() => {
    let active = true;
    void savedAddressesService
      .listSavedAddresses()
      .then((savedAddresses) => {
        if (active) setAddresses(savedAddresses);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const message =
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar las direcciones guardadas.';
        setAddressError(message);
        console.error('No se pudieron cargar las direcciones guardadas.', cause);
      });
    return () => {
      active = false;
    };
  }, []);

  // Horarios (ocupados/libres) de hoy y los próximos 6 días.
  const days = useMemo(() => {
    const activeTrips = trips.filter((trip) => trip.status !== 'cancelled');
    const busyIntervals = hasDriverParam
      ? (publicPortal?.busy_intervals ?? [])
      : undefined;

    const result: { date: Date; slots: Slot[] }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let d = 0; d < 7; d++) {
      const date = new Date(base);
      date.setDate(base.getDate() + d);
      const slots: Slot[] = [];
      for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h += SLOT_HOURS) {
        slots.push({
          dateKey: dateKeyOf(date),
          hour: h,
          date,
          occupied: slotOccupied(date, h, activeTrips, busyIntervals),
        });
      }
      result.push({ date, slots });
    }
    return result;
  }, [hasDriverParam, publicPortal, trips]);

  const addAddress = async () => {
    if (!newAddress.trim()) return;
    setAddressSaving(true);
    setAddressError(null);
    try {
      const created = await savedAddressesService.addSavedAddress(
        newLabel.trim() || 'Otro',
        newAddress.trim(),
      );
      setAddresses((prev) => [...prev, created]);
      setNewAddress('');
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar la dirección.';
      setAddressError(message);
      console.error('No se pudo guardar la dirección.', cause);
    } finally {
      setAddressSaving(false);
    }
  };

  const removeAddress = async (id: string) => {
    setAddressError(null);
    try {
      await savedAddressesService.removeSavedAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : 'No se pudo eliminar la dirección.';
      setAddressError(message);
      console.error('No se pudo eliminar la dirección.', cause);
    }
  };

  const requestBooking = (slot: Slot) => {
    const driverName = publicPortal?.driver_name ?? settings.driver_name;
    const phone = normalizePhone(
      publicPortal?.driver_phone ?? settings.driver_phone,
    );
    const hh = String(slot.hour).padStart(2, '0');
    const msg = `Hola ${driverName}, quiero reservar el turno del ${formatDate(
      slot.date.toISOString(),
    )} a las ${hh}:00 hs`;
    if (!phone) {
      notify('Sin contacto', 'La conductora no tiene teléfono cargado.');
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch((cause: unknown) => {
      console.error('No se pudo abrir WhatsApp.', cause);
      notify('Error', 'No se pudo abrir WhatsApp.');
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      {portalLoading || portalError ? (
        <View
          className={`px-5 py-3 ${
            portalError ? 'bg-red-50' : 'bg-blue-50'
          }`}
          accessibilityRole={portalError ? 'alert' : undefined}
        >
          <Text className={portalError ? 'text-red-700' : 'text-blue-700'}>
            {portalError ?? 'Cargando la agenda del chofer...'}
          </Text>
        </View>
      ) : null}
      {/* Cabecera del portal */}
      <View className="bg-white px-5 pt-2 pb-4 border-b border-slate-100 flex-row items-center">
        <Pressable
          // @ts-ignore
          className="p-2 -ml-2 mr-2 rounded-full active:bg-slate-100"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900">
            Reservar con {publicPortal?.driver_name ?? settings.driver_name}
          </Text>
          <Text className="text-sm text-slate-500">
            Elegí un horario disponible
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading || portalLoading}
            onRefresh={() => void handleRefresh()}
          />
        }
      >
        {/* Leyenda */}
        <View className="flex-row items-center justify-center gap-6 mt-4 mb-2">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-xs text-slate-600">Disponible</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-slate-300 mr-2" />
            <Text className="text-xs text-slate-600">Ocupado</Text>
          </View>
        </View>

        {/* Agenda por día */}
        {days.map((day) => (
          <View key={day.date.toISOString()} className="mt-4">
            <Text className="text-base font-bold text-slate-900 mb-2 capitalize">
              {formatDate(day.date.toISOString())}
            </Text>
            <Card>
              <View className="flex-row flex-wrap gap-2">
                {day.slots.map((slot) => {
                  const hh = String(slot.hour).padStart(2, '0');
                  return (
                    <Pressable
                      key={slot.hour}
                      // @ts-ignore
                      disabled={
                        slot.occupied ||
                        portalLoading ||
                        (hasDriverParam && !publicPortal)
                      }
                      className={`w-[30%] py-3 rounded-xl items-center border ${
                        slot.occupied
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-emerald-50 border-emerald-200 active:bg-emerald-100'
                      }`}
                      onPress={() => requestBooking(slot)}
                    >
                      <Text
                        // @ts-ignore
                        className={`text-base font-bold ${
                          slot.occupied ? 'text-slate-400' : 'text-emerald-700'
                        }`}
                      >
                        {hh}:00
                      </Text>
                      <Text
                        // @ts-ignore
                        className={`text-[10px] mt-0.5 ${
                          slot.occupied ? 'text-slate-400' : 'text-emerald-600'
                        }`}
                      >
                        {slot.occupied ? 'Ocupado' : 'Libre'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </View>
        ))}

        {/* Direcciones frecuentes del pasajero */}
        <View className="mt-6">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            Mis direcciones frecuentes
          </Text>
          <Card>
            {addressError ? (
              <Text
                className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                accessibilityRole="alert"
              >
                {addressError}
              </Text>
            ) : null}
            {addresses.length === 0 ? (
              <Text className="text-sm text-slate-400 p-2">
                Todavía no guardaste direcciones.
              </Text>
            ) : (
              addresses.map((a) => (
                <View
                  key={a.id}
                  className="flex-row items-center py-2.5 border-b border-slate-100 justify-between"
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="bg-blue-100 p-2 rounded-lg mr-3">
                      <Ionicons name="location" size={16} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800">
                        {a.label}
                      </Text>
                      <Text className="text-xs text-slate-500">{a.address}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void removeAddress(a.id)}
                    className="p-2"
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar dirección ${a.label}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))
            )}
            
            {/* Formulario rápido para añadir dirección */}
            <View className="mt-4 pt-4 border-t border-slate-100">
              <Input
                label="Etiqueta (ej: Trabajo, Gimnasio)"
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Nombre del lugar"
              />
              <Input
                label="Dirección completa"
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="Calle, Altura, Localidad"
              />
              <Button
                title="Guardar Dirección"
                onPress={() => void addAddress()}
                variant="secondary"
                loading={addressSaving}
                fullWidth
                style={{ marginTop: 8 }}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
