import React from 'react';
import { View, Text } from 'react-native';

interface ProgressBarProps {
  /** Progreso entre 0 y 1. */
  value: number;
  /** Color de la barra cuando está en buen estado. */
  tone?: 'ok' | 'warning' | 'danger';
}

const TONE_BG: Record<'ok' | 'warning' | 'danger', string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

/** Barra de progreso horizontal. */
export function ProgressBar({ value, tone = 'ok' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
      <View
        // @ts-ignore
        className={`h-full rounded-full ${TONE_BG[tone]}`}
        style={{ width: `${pct * 100}%` }}
      />
    </View>
  );
}

interface LabeledProgressProps extends ProgressBarProps {
  label: string;
  /** Texto a la derecha (ej. "faltan 1.200 km"). */
  rightLabel?: string;
}

/** Barra de progreso con etiqueta superior y texto a la derecha. */
export function LabeledProgress({
  label,
  rightLabel,
  ...props
}: LabeledProgressProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-sm font-medium text-slate-700">{label}</Text>
        {rightLabel ? (
          <Text className="text-xs text-slate-500">{rightLabel}</Text>
        ) : null}
      </View>
      <ProgressBar {...props} />
    </View>
  );
}
