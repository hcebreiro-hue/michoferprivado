import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Trip } from '../types';
import { Button } from './ui/Button';
import { useSettings } from '../context/SettingsContext';
import {
  formatCurrency,
  formatDate,
  formatTime,
  normalizePhone,
} from '../utils/format';

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip | null;
}

/** Texto plano y ordenado del recibo para enviar por WhatsApp. */
export function buildReceiptText(
  trip: Trip,
  driverName: string,
  currency: string,
): string {
  return [
    '🧾 *RECIBO DE VIAJE*',
    `Conductora: ${driverName}`,
    `Fecha: ${formatDate(trip.scheduled_at)}`,
    `Hora: ${formatTime(trip.scheduled_at)}`,
    `Desde: ${trip.origin || '—'}`,
    `Hasta: ${trip.destination}`,
    `Total abonado: ${formatCurrency(trip.price, { currency })}`,
    '',
    '¡Gracias por viajar conmigo! 🙌',
  ].join('\n');
}

/** Modal con el diseño de "ticket" y acción para enviarlo por WhatsApp. */
export function ReceiptModal({ visible, onClose, trip }: ReceiptModalProps) {
  const { settings } = useSettings();

  if (!trip) return null;

  const sendWhatsApp = () => {
    const phone = normalizePhone(trip.client_phone);
    if (!phone) {
      Alert.alert('Sin teléfono', 'El cliente no tiene teléfono cargado.');
      return;
    }
    const text = buildReceiptText(trip, settings.driver_name, settings.currency);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('No se pudo abrir WhatsApp'),
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-white rounded-3xl overflow-hidden">
          {/* Cabecera del recibo */}
          <View className="bg-brand-600 px-6 pt-6 pb-8 items-center">
            <View className="bg-white/20 p-3 rounded-full mb-3">
              <Ionicons name="car-sport" size={30} color="#ffffff" />
            </View>
            <Text className="text-white text-xl font-bold">
              {settings.driver_name}
            </Text>
            <Text className="text-brand-100 text-sm mt-0.5">
              Recibo de viaje
            </Text>
          </View>

          {/* Cuerpo del ticket */}
          <ScrollView className="px-6 py-5" style={{ maxHeight: 360 }}>
            <ReceiptRow label="Cliente" value={trip.client_name} />
            <ReceiptRow label="Fecha" value={formatDate(trip.scheduled_at)} />
            <ReceiptRow label="Hora" value={formatTime(trip.scheduled_at)} />
            <ReceiptRow
              label="Origen"
              value={trip.origin || '—'}
              icon="location-outline"
            />
            <ReceiptRow
              label="Destino"
              value={trip.destination}
              icon="flag-outline"
            />

            {/* Total destacado con líneas punteadas */}
            <View className="mt-4 pt-4 border-t border-dashed border-slate-300">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-slate-700">
                  Total
                </Text>
                <Text className="text-2xl font-bold text-brand-600">
                  {formatCurrency(trip.price, settings)}
                </Text>
              </View>
            </View>

            <Text className="text-center text-xs text-slate-400 mt-5">
              ¡Gracias por viajar con {settings.driver_name}! 🙌
            </Text>
          </ScrollView>

          {/* Acciones */}
          <View className="px-6 pb-6 pt-2 gap-2">
            <Button
              title="Enviar por WhatsApp"
              onPress={sendWhatsApp}
              variant="success"
              size="lg"
              fullWidth
              icon={<Ionicons name="logo-whatsapp" size={20} color="#fff" />}
            />
            <Button
              title="Cerrar"
              onPress={onClose}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Fila de detalle dentro del recibo. */
function ReceiptRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
      <View className="flex-row items-center">
        {icon ? (
          <Ionicons name={icon} size={16} color="#64748b" />
        ) : null}
        <Text className="text-sm text-slate-500 ml-1.5">{label}</Text>
      </View>
      <Text className="text-base font-semibold text-slate-900 flex-1 text-right ml-3" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
