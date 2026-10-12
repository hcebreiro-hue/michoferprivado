import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentStatus } from '../types';
import { Button, Input } from './ui';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/format';

interface PaymentSummary {
  destination: string;
  /** Fecha/hora programada en ISO. */
  scheduledAt: string;
  clientName: string;
  price: number;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  summary: PaymentSummary;
  initialStatus: PaymentStatus;
  initialAmountPaid: number;
  saving?: boolean;
  /** Se llama al confirmar con el estado elegido y el monto ya cobrado. */
  onConfirm: (status: PaymentStatus, amountPaid: number) => void;
}

interface OptionSpec {
  value: PaymentStatus;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const OPTIONS: OptionSpec[] = [
  {
    value: 'pendiente',
    label: 'Pendiente',
    description: 'Todavía no cobraste nada.',
    icon: 'hourglass-outline',
    color: '#d97706',
    bg: 'bg-amber-50',
  },
  {
    value: 'cobrado',
    label: 'Cobrado',
    description: 'Se pagó el monto total.',
    icon: 'checkmark-circle',
    color: '#059669',
    bg: 'bg-emerald-50',
  },
  {
    value: 'parcial',
    label: 'Parcial',
    description: 'Se pagó solo una parte.',
    icon: 'pie-chart-outline',
    color: '#2563eb',
    bg: 'bg-brand-50',
  },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR', { dateStyle: 'medium' });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('es-AR', { timeStyle: 'short' });
}

/**
 * Pantalla completa dedicada a registrar el cobro de un viaje.
 * Evita que el teclado numérico tape el formulario y deja ver todas
 * las opciones con espacio.
 */
export function PaymentModal({
  visible,
  onClose,
  summary,
  initialStatus,
  initialAmountPaid,
  saving = false,
  onConfirm,
}: PaymentModalProps) {
  const { settings } = useSettings();
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [amountPaid, setAmountPaid] = useState(
    initialAmountPaid > 0 ? String(initialAmountPaid) : '',
  );

  const price = summary.price;
  const paidNumber = Number(amountPaid.replace(',', '.')) || 0;
  const pending =
    status === 'cobrado'
      ? 0
      : status === 'parcial'
        ? Math.max(0, price - paidNumber)
        : price;
  const overpaid = status === 'parcial' && paidNumber > price;

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView
        className="flex-1 bg-slate-50"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <Text className="text-xl font-bold text-slate-900">Registrar cobro</Text>
          <Pressable
            onPress={onClose}
            className="p-1"
            accessibilityRole="button"
            accessibilityLabel="Cancelar cobro"
          >
            <Ionicons name="close" size={26} color="#64748b" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5 py-5">
          {/* Resumen del viaje */}
          <View className="mb-6 rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Viaje
            </Text>
            <Text className="mt-1 text-lg font-bold text-slate-900">
              {summary.destination || 'Sin destino'}
            </Text>
            <Text className="text-sm text-slate-500">
              {summary.clientName ? `${summary.clientName} · ` : ''}
              {formatDate(summary.scheduledAt)} ·{' '}
              {formatTime(summary.scheduledAt)}
            </Text>
            <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
              <Text className="text-sm font-medium text-slate-600">
                Total del viaje
              </Text>
              <Text className="text-2xl font-bold text-brand-600">
                {formatCurrency(price, settings)}
              </Text>
            </View>
          </View>
          <Text className="mb-3 text-base font-bold text-slate-900">
            ¿Cómo se cobró este viaje?
          </Text>

          {/* Opciones de cobro (tarjetas grandes) */}
          <View className="gap-3">
            {OPTIONS.map((option) => {
              const selected = status === option.value;
              const borderSelected =
                option.value === 'pendiente'
                  ? 'border-amber-500 bg-amber-50'
                  : option.value === 'cobrado'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-brand-600 bg-brand-50';
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setStatus(option.value)}
                  className={`flex-row items-center rounded-2xl border-2 p-4 ${
                    selected ? borderSelected : 'border-slate-200 bg-white'
                  }`}
                >
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-full ${
                      selected ? option.bg : 'bg-slate-100'
                    }`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={selected ? option.color : '#64748b'}
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-bold text-slate-900">
                      {option.label}
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {option.description}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={option.color}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Monto parcial + falta cobrar */}
          {status === 'parcial' ? (
            <View className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
              <Input
                label="Monto ya cobrado"
                placeholder="0"
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="numeric"
              />
              {overpaid ? (
                <Text className="mt-1 text-xs font-medium text-rose-600">
                  El monto supera el total del viaje.
                </Text>
              ) : null}
              <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
                <Text className="text-sm font-medium text-slate-600">
                  Falta cobrar
                </Text>
                <Text className="text-2xl font-bold text-rose-600">
                  {formatCurrency(pending, settings)}
                </Text>
              </View>
            </View>
          ) : null}

          {status === 'pendiente' ? (
            <View className="mt-5 flex-row items-center rounded-2xl bg-amber-50 p-4">
              <Ionicons name="information-circle" size={20} color="#d97706" />
              <Text className="ml-2 flex-1 text-sm text-amber-800">
                El viaje quedará como pendiente de cobro por{' '}
                {formatCurrency(price, settings)}.
              </Text>
            </View>
          ) : null}

          {status === 'cobrado' ? (
            <View className="mt-5 flex-row items-center rounded-2xl bg-emerald-50 p-4">
              <Ionicons name="checkmark-done" size={20} color="#059669" />
              <Text className="ml-2 flex-1 text-sm text-emerald-800">
                Se registrará el cobro completo de{' '}
                {formatCurrency(price, settings)}.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View className="border-t border-slate-100 bg-white px-5 pb-6 pt-3">
          <Button
            title={saving ? 'Guardando...' : 'Confirmar y guardar viaje'}
            onPress={() =>
              onConfirm(
                status,
                status === 'cobrado'
                  ? price
                  : status === 'parcial'
                    ? paidNumber
                    : 0,
              )
            }
            loading={saving}
            disabled={overpaid}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
