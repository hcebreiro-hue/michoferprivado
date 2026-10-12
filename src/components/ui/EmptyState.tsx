import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

/** Mensaje vacío para listas sin datos. */
export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-12 px-6">
      {icon ? <View className="mb-3">{icon}</View> : null}
      <Text className="text-base font-semibold text-slate-700 text-center">
        {title}
      </Text>
      {message ? (
        <Text className="text-sm text-slate-400 text-center mt-1">{message}</Text>
      ) : null}
    </View>
  );
}
