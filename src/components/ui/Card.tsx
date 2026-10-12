import React from 'react';
import { View, type ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

/** Contenedor tipo tarjeta con sombra suave y esquinas redondeadas. */
export function Card({ children, className = '', style }: CardProps) {
  return (
    <View
      // @ts-ignore
      className={`bg-white rounded-2xl p-4 shadow-sm shadow-slate-200 border border-slate-100 ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}
