import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Encabezado de sección con acción opcional a la derecha. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-3 mt-1">
      <Text className="text-lg font-bold text-slate-900">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          {/* @ts-ignore */}
          <Text className="text-sm font-semibold text-brand-600">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
