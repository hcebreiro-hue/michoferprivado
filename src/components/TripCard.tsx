import React, { useState } from 'react';
import { View, Text, Pressable, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isCalendarBlock, tripPaymentStatus, tripPendingAmount, type Trip } from '../types';
import { formatCurrency, formatDate, formatTime, normalizePhone } from '../utils/format';
import { useSettings } from '../context/SettingsContext';
import { Badge } from './ui/Badge';
import { ReceiptModal } from './ReceiptModal';

const STATUS_META: Record<
  Trip['status'],
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  completed: { label: 'Completado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

/** Tarjeta de un viaje con acceso rápido a llamada y WhatsApp. */
export function TripCard({
  trip,
  onPress,
  onComplete,
  onCancel,
  onDelete,
  showActions = true,
}: TripCardProps) {
  const { settings } = useSettings();
  const status = STATUS_META[trip.status];
  const isBlock = isCalendarBlock(trip);
  const [receiptVisible, setReceiptVisible] = useState(false);

  const call = () => {
    const phone = normalizePhone(trip.client_phone);
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('No se pudo abrir el teléfono'),
    );
  };

  const whatsapp = () => {
    const phone = normalizePhone(trip.client_phone);
    if (!phone) return;
    const message = `¡Hola ${trip.client_name}! Te confirmo tu viaje de ${trip.origin} a ${trip.destination} el ${formatDate(
      trip.scheduled_at,
    )} a las ${formatTime(trip.scheduled_at)}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('No se pudo abrir WhatsApp'),
    );
  };

  return (
    <Pressable
      // @ts-ignore
      className={`rounded-2xl p-4 mb-3 border shadow-sm shadow-slate-200 ${
        isBlock ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-100 active:bg-slate-50'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-slate-900">
            {trip.client_name}
          </Text>
          {isBlock ? (
            <View className="flex-row items-center mt-1">
              <Ionicons name="lock-closed-outline" size={14} color="#64748b" />
              <Text className="text-sm text-slate-600 ml-1">
                No disponible · hasta {formatTime(trip.blocked_until)}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text className="text-sm text-slate-600 ml-1 flex-1" numberOfLines={1}>
                {trip.origin} → {trip.destination}
              </Text>
            </View>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text className="text-sm text-slate-500 ml-1">
              {formatDate(trip.scheduled_at)} · {formatTime(trip.scheduled_at)}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text
            className={`text-lg font-bold ${
              isBlock ? 'text-slate-600' : 'text-brand-600'
            }`}
          >
            {isBlock ? 'Bloqueado' : formatCurrency(trip.price, settings)}
          </Text>
          <View className="mt-1">
            <Badge label={status.label} tone={status.tone} />
          </View>
          {!isBlock && trip.status !== 'cancelled' &&
          tripPaymentStatus(trip) !== 'cobrado' ? (
            <Text
              className={`mt-1 text-xs font-semibold ${
                tripPaymentStatus(trip) === 'parcial'
                  ? 'text-amber-600'
                  : 'text-red-500'
              }`}
            >
              {tripPaymentStatus(trip) === 'parcial'
                ? `Parcial · debe ${formatCurrency(
                    tripPendingAmount(trip),
                    settings,
                  )}`
                : `Debe ${formatCurrency(tripPendingAmount(trip), settings)}`}
            </Text>
          ) : null}
        </View>
      </View>

      {showActions && !isBlock ? (
        <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <Pressable
            // @ts-ignore
            className="flex-row items-center px-3 py-2 rounded-lg bg-slate-100 active:bg-slate-200"
            onPress={call}
          >
            <Ionicons name="call" size={16} color="#2563eb" />
            <Text className="text-sm font-semibold text-slate-700 ml-1.5">
              Llamar
            </Text>
          </Pressable>
          <Pressable
            // @ts-ignore
            className="flex-row items-center px-3 py-2 rounded-lg bg-emerald-50 active:bg-emerald-100"
            onPress={whatsapp}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#059669" />
            <Text className="text-sm font-semibold text-emerald-700 ml-1.5">
              WhatsApp
            </Text>
          </Pressable>

          {trip.status === 'completed' ? (
            <Pressable
              // @ts-ignore
              className="flex-row items-center px-3 py-2 rounded-lg bg-brand-50 active:bg-brand-100"
              onPress={() => setReceiptVisible(true)}
            >
              <Ionicons name="receipt-outline" size={16} color="#2563eb" />
              <Text className="text-sm font-semibold text-brand-700 ml-1.5">
                Recibo
              </Text>
            </Pressable>
          ) : null}

          <View className="flex-1" />

          {trip.status === 'pending' && onComplete ? (
            <Pressable
              // @ts-ignore
              className="p-2 rounded-lg active:bg-emerald-50"
              onPress={onComplete}
              accessibilityLabel="Marcar como completado"
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#10b981" />
            </Pressable>
          ) : null}

          {trip.status === 'pending' && onCancel ? (
            <Pressable
              // @ts-ignore
              className="p-2 rounded-lg active:bg-amber-50"
              onPress={onCancel}
              accessibilityLabel="Cancelar viaje"
            >
              <Ionicons name="close-circle-outline" size={22} color="#f59e0b" />
            </Pressable>
          ) : null}

          {onDelete ? (
            <Pressable
              // @ts-ignore
              className="p-2 rounded-lg active:bg-red-50"
              onPress={onDelete}
              accessibilityLabel="Eliminar viaje"
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ReceiptModal
        visible={receiptVisible}
        trip={trip}
        onClose={() => setReceiptVisible(false)}
      />
    </Pressable>
  );
}
