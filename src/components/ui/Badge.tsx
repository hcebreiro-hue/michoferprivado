import React from 'react';
import { View, Text } from 'react-native';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_BG: Record<Tone, string> = {
  neutral: 'bg-slate-100',
  success: 'bg-emerald-100',
  warning: 'bg-amber-100',
  danger: 'bg-red-100',
  info: 'bg-brand-100',
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-slate-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-brand-700',
};

interface BadgeProps {
  label: string;
  tone?: Tone;
}

/** Pequeña etiqueta de estado. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View
      // @ts-ignore
      className={`self-start px-2.5 py-1 rounded-full ${TONE_BG[tone]}`}
    >
      <Text
        // @ts-ignore
        className={`text-xs font-semibold ${TONE_TEXT[tone]}`}
      >
        {label}
      </Text>
    </View>
  );
}
