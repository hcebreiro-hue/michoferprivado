import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** Encabezado superior de cada pantalla. */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-5 pt-2 pb-4 bg-white border-b border-slate-100">
      <View className="flex-1">
        <Text className="text-2xl font-bold text-slate-900">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-slate-500 mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Icono decorativo dentro de un contenedor redondeado. */
export function IconBubble({
  name,
  color = '#2563eb',
  bg = 'bg-brand-100',
}: {
  name: keyof typeof Ionicons.glyphMap;
  color?: string;
  bg?: string;
}) {
  return (
    <View className={`p-2 rounded-xl ${bg}`}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}
