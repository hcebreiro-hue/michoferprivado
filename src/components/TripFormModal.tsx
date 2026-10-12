import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {
  CALENDAR_BLOCK_CLIENT_NAME,
  isCalendarBlock,
  type PaymentStatus,
  type Trip,
  type TripStatus,
} from '../types';
import { Button, Input } from './ui';
import { PaymentModal } from './PaymentModal';
import { useData } from '../context/DataContext';

interface TripFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Si se pasa, el modal edita ese viaje; si no, crea uno nuevo. */
  trip?: Trip | null;
}

type FormMode = 'trip' | 'block';
type PickerTarget =
  | 'trip-date'
  | 'trip-time'
  | 'block-date'
  | 'block-start'
  | 'block-end';

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addHours(value: string, hours: number): string {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return toLocalInputValue(date);
}

function mergeDate(current: string, selected: Date): string {
  const date = new Date(current);
  date.setFullYear(
    selected.getFullYear(),
    selected.getMonth(),
    selected.getDate(),
  );
  return toLocalInputValue(date);
}

function mergeTime(current: string, selected: Date): string {
  const date = new Date(current);
  date.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return toLocalInputValue(date);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR', { dateStyle: 'medium' });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('es-AR', { timeStyle: 'short' });
}

function defaultStartValue(): string {
  return toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));
}

export function TripFormModal({
  visible,
  onClose,
  trip,
}: TripFormModalProps) {
  if (!visible) return null;
  return (
    <TripFormModalContent
      key={trip?.id ?? 'new'}
      visible={visible}
      onClose={onClose}
      trip={trip}
    />
  );
}

function TripFormModalContent({
  visible,
  onClose,
  trip,
}: TripFormModalProps) {
  const { addTrip, updateTrip } = useData();
  const isEdit = Boolean(trip);
  const initialStart = trip?.scheduled_at
    ? toLocalInputValue(new Date(trip.scheduled_at))
    : defaultStartValue();

  const [mode, setMode] = useState<FormMode>(
    trip && isCalendarBlock(trip) ? 'block' : 'trip',
  );
  const [clientName, setClientName] = useState(trip?.client_name ?? '');
  const [clientPhone, setClientPhone] = useState(trip?.client_phone ?? '');
  const [origin, setOrigin] = useState(trip?.origin ?? '');
  const [destination, setDestination] = useState(trip?.destination ?? '');
  const [scheduledAt, setScheduledAt] = useState(initialStart);
  const [blockedUntil, setBlockedUntil] = useState(
    trip?.blocked_until
      ? toLocalInputValue(new Date(trip.blocked_until))
      : addHours(initialStart, 2),
  );
  const [price, setPrice] = useState(trip ? String(trip.price) : '');
  const [distanceKm, setDistanceKm] = useState(
    trip?.distance_km != null ? String(trip.distance_km) : '',
  );
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? 'pending');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Parameters<
    typeof addTrip
  >[0] | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const pickerValue = (target: PickerTarget): Date => {
    switch (target) {
      case 'block-end':
        return new Date(blockedUntil);
      case 'trip-time':
      case 'block-start':
        return new Date(scheduledAt);
      case 'trip-date':
      case 'block-date':
        return new Date(scheduledAt);
    }
  };

  const applyPickerValue = (target: PickerTarget, selected: Date) => {
    switch (target) {
      case 'trip-date':
      case 'trip-time':
        setScheduledAt((current) =>
          target === 'trip-date'
            ? mergeDate(current, selected)
            : mergeTime(current, selected),
        );
        break;
      case 'block-date':
        setScheduledAt((current) => mergeDate(current, selected));
        setBlockedUntil((current) => mergeDate(current, selected));
        break;
      case 'block-start':
        setScheduledAt((current) => mergeTime(current, selected));
        break;
      case 'block-end':
        setBlockedUntil((current) => mergeTime(current, selected));
        break;
    }
  };

  const openPicker = (target: PickerTarget) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue(target),
        mode: target.endsWith('date') ? 'date' : 'time',
        display: 'default',
        is24Hour: true,
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) applyPickerValue(target, selectedDate);
        },
      });
      return;
    }

    setPickerTarget(target);
  };

  const saveTrip = async (payload: Parameters<typeof addTrip>[0]) => {
    setSaving(true);
    try {
      if (isEdit && trip) {
        await updateTrip(trip.id, payload);
      } else {
        await addTrip(payload);
      }
      onClose();
    } catch (cause) {
      Alert.alert(
        'No se pudo guardar',
        cause instanceof Error
          ? cause.message
          : 'Ocurrió un error al guardar los datos.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const startDate = new Date(scheduledAt);
    const endDate = new Date(blockedUntil);

    if (mode === 'block' && endDate.getTime() <= startDate.getTime()) {
      Alert.alert(
        'Horario inválido',
        'La hora de fin debe ser posterior a la hora de inicio.',
      );
      return;
    }

    if (mode === 'trip' && (!clientName.trim() || !destination.trim())) {
      Alert.alert(
        'Datos incompletos',
        'Completa el nombre del pasajero y el destino.',
      );
      return;
    }

    const tripPrice = mode === 'block' ? 0 : Number(price) || 0;
    const basePayload = {
      client_name:
        mode === 'block' ? CALENDAR_BLOCK_CLIENT_NAME : clientName.trim(),
      client_phone: mode === 'block' ? '' : clientPhone.trim(),
      origin: mode === 'block' ? '' : origin.trim(),
      destination: mode === 'block' ? '' : destination.trim(),
      scheduled_at: startDate.toISOString(),
      blocked_until: mode === 'block' ? endDate.toISOString() : null,
      price: tripPrice,
      distance_km:
        mode === 'block' ? null : Number(distanceKm.replace(',', '.')) || null,
      status: mode === 'block' ? 'pending' : status,
      notes: mode === 'block' ? null : notes.trim() || null,
    };

    // Los bloqueos se guardan directo (no tienen cobro). Los viajes pasan
    // primero por la pantalla completa de cobro.
    if (mode === 'block') {
      void saveTrip(basePayload);
      return;
    }

    setPendingPayload(basePayload);
    setPaymentVisible(true);
  };

  const handleConfirmPayment = (paymentStatus: PaymentStatus, amountPaid: number) => {
    if (!pendingPayload) return;
    void saveTrip({
      ...pendingPayload,
      payment_status: paymentStatus,
      amount_paid: amountPaid,
    });
  };

  const iosPickerMode =
    pickerTarget?.endsWith('date') === true ? 'date' : 'time';

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text className="text-xl font-bold text-slate-900">
              {isEdit
                ? mode === 'block'
                  ? 'Editar bloqueo'
                  : 'Editar viaje'
                : 'Nueva actividad'}
            </Text>
            <Pressable
              onPress={onClose}
              className="p-1"
              accessibilityRole="button"
              accessibilityLabel="Cerrar formulario"
            >
              <Ionicons name="close" size={26} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4">
            <View className="mb-5 rounded-2xl bg-slate-100 p-1">
              {(['trip', 'block'] as const).map((option) => {
                const selected = mode === option;
                const label =
                  option === 'trip' ? 'Registrar Viaje' : 'Bloquear Horario';

                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                      disabled: isEdit,
                    }}
                    disabled={isEdit}
                    onPress={() => setMode(option)}
                    className={`mb-1 flex-row items-center justify-center rounded-xl px-4 py-3 ${
                      selected ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    <Ionicons
                      name={option === 'trip' ? 'car-outline' : 'lock-closed-outline'}
                      size={18}
                      color={selected ? '#2563eb' : '#64748b'}
                    />
                    <Text
                      className={`ml-2 text-sm font-bold ${
                        selected ? 'text-brand-700' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'trip' ? (
              <>
                <Input
                  label="Nombre del cliente *"
                  placeholder="Ej. María González"
                  value={clientName}
                  onChangeText={setClientName}
                />
                <Input
                  label="Teléfono / WhatsApp"
                  placeholder="+54 9 11 2345-6789"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Origen"
                  placeholder="Ej. Palermo"
                  value={origin}
                  onChangeText={setOrigin}
                />
                <Input
                  label="Destino *"
                  placeholder="Ej. Aeropuerto"
                  value={destination}
                  onChangeText={setDestination}
                />
              </>
            ) : null}

            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-medium text-slate-600">
                Fecha
              </Text>
              <Pressable
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                onPress={() =>
                  openPicker(mode === 'block' ? 'block-date' : 'trip-date')
                }
              >
                <Text className="text-base text-slate-900">
                  {formatDate(scheduledAt)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              </Pressable>
            </View>

            {mode === 'block' ? (
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-medium text-slate-600">
                    Hora de inicio
                  </Text>
                  <Pressable
                    className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    onPress={() => openPicker('block-start')}
                  >
                    <Text className="text-base text-slate-900">
                      {formatTime(scheduledAt)}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#2563eb" />
                  </Pressable>
                </View>
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-medium text-slate-600">
                    Hora de fin
                  </Text>
                  <Pressable
                    className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    onPress={() => openPicker('block-end')}
                  >
                    <Text className="text-base text-slate-900">
                      {formatTime(blockedUntil)}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#2563eb" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="mb-4">
                <Text className="mb-1.5 text-sm font-medium text-slate-600">
                  Hora
                </Text>
                <Pressable
                  className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  onPress={() => openPicker('trip-time')}
                >
                  <Text className="text-base text-slate-900">
                    {formatTime(scheduledAt)}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#2563eb" />
                </Pressable>
              </View>
            )}

            {Platform.OS !== 'android' && pickerTarget ? (
              <View className="mb-4 overflow-hidden rounded-xl bg-slate-50">
                <DateTimePicker
                  value={pickerValue(pickerTarget)}
                  mode={iosPickerMode}
                  display="spinner"
                  onValueChange={(_event, selectedDate) =>
                    applyPickerValue(pickerTarget, selectedDate)
                  }
                  onDismiss={() => setPickerTarget(null)}
                />
                <Pressable
                  className="items-center border-t border-slate-200 py-3"
                  onPress={() => setPickerTarget(null)}
                >
                  <Text className="font-semibold text-brand-600">Listo</Text>
                </Pressable>
              </View>
            ) : null}

            {mode === 'trip' ? (
              <>
                <Input
                  label="Precio"
                  placeholder="0"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
                <Input
                  label="Kilómetros del recorrido"
                  placeholder="Ej. 35"
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  keyboardType="numeric"
                />
                <Input
                  label="Notas"
                  placeholder="Opcional"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />
              </>
            ) : (
              <View className="mb-4 flex-row items-center rounded-xl bg-slate-100 p-3">
                <Ionicons name="lock-closed" size={18} color="#64748b" />
                <Text className="ml-2 flex-1 text-sm text-slate-600">
                  Este horario aparecerá como no disponible para las reservas.
                </Text>
              </View>
            )}

            {isEdit && mode === 'trip' ? (
              <View className="mb-4">
                <Text className="mb-1.5 text-sm font-medium text-slate-600">
                  Estado
                </Text>
                <View className="flex-row gap-2">
                  {(['pending', 'completed', 'cancelled'] as TripStatus[]).map(
                    (nextStatus) => (
                      <Pressable
                        key={nextStatus}
                        className={`flex-1 rounded-lg border py-2 ${
                          status === nextStatus
                            ? 'border-brand-600 bg-brand-600'
                            : 'border-slate-200 bg-white'
                        }`}
                        onPress={() => setStatus(nextStatus)}
                      >
                        <Text
                          className={`text-center text-sm font-semibold ${
                            status === nextStatus
                              ? 'text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          {nextStatus === 'pending'
                            ? 'Pendiente'
                            : nextStatus === 'completed'
                              ? 'Completado'
                              : 'Cancelado'}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ) : null}

            {/* El cobro se define en la pantalla completa al guardar el viaje. */}
          </ScrollView>

          <View className="border-t border-slate-100 px-5 pb-6 pt-2">
            <Button
              title={
                saving
                  ? 'Guardando...'
                  : mode === 'block'
                    ? 'Guardar bloqueo'
                    : isEdit
                      ? 'Guardar cambios'
                      : 'Agendar viaje'
              }
              onPress={handleSave}
              loading={saving}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </View>
    </Modal>

      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        summary={{
          destination,
          scheduledAt,
          clientName,
          price: Number(price) || 0,
        }}
        initialStatus={trip?.payment_status ?? 'pendiente'}
        initialAmountPaid={trip?.amount_paid ?? 0}
        saving={saving}
        onConfirm={handleConfirmPayment}
      />
    </>
  );
}
