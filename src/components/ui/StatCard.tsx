import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  /** Color de fondo del icono/contenedor decorativo. */
  accent?: 'blue' | 'green' | 'amber' | 'slate';
  icon?: React.ReactNode;
  hint?: string;
}

const ACCENT_BG: Record<string, string> = {
  blue: 'bg-brand-100',
  green: 'bg-emerald-100',
  amber: 'bg-amber-100',
  slate: 'bg-slate-100',
};

/** Tarjeta de métrica con etiqueta, valor grande e icono opcional. */
export function StatCard({
  label,
  value,
  accent = 'blue',
  icon,
  hint,
}: StatCardProps) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm shadow-slate-200">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </Text>
        {icon ? (
          <View className={`p-1.5 rounded-lg ${ACCENT_BG[accent]}`}>{icon}</View>
        ) : null}
      </View>
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      {hint ? (
        <Text className="text-xs text-slate-400 mt-0.5">{hint}</Text>
      ) : null}
    </View>
  );
}
