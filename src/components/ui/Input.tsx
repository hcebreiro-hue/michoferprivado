import React from 'react';
import { View, Text, TextInput, type TextInputProps, type ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  containerStyle?: ViewStyle;
}

/** Campo de texto con etiqueta, usable en formularios. */
export function Input({
  label,
  error,
  containerClassName = '',
  containerStyle,
  className = '',
  ...props
}: InputProps) {
  return (
    <View className={`mb-4 ${containerClassName}`} style={containerStyle}>
      {label ? (
        <Text className="text-sm font-medium text-slate-600 mb-1.5">{label}</Text>
      ) : null}
      <TextInput
        // @ts-ignore
        className={`bg-slate-50 border rounded-xl px-4 py-3 text-base text-slate-900 ${
          error ? 'border-red-400' : 'border-slate-200'
        } ${className}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-500 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
