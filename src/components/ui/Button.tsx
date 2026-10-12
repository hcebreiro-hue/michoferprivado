import React from 'react';
import { Text, Pressable, ActivityIndicator, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-500 active:bg-red-600',
  ghost: 'bg-transparent border border-slate-200 active:bg-slate-50',
  success: 'bg-emerald-500 active:bg-emerald-600',
};

const TEXT_VARIANT: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-slate-800',
  danger: 'text-white',
  ghost: 'text-slate-700',
  success: 'text-white',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-5 py-4 rounded-2xl',
};

const TEXT_SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      // @ts-ignore - className soportado por NativeWind
      className={`flex-row items-center justify-center gap-2 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-50' : ''}`}
      style={style}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? '#334155' : '#ffffff'}
        />
      ) : (
        icon
      )}
      <Text
        // @ts-ignore
        className={`font-semibold ${TEXT_SIZE[size]} ${TEXT_VARIANT[variant]}`}
      >
        {title}
      </Text>
    </Pressable>
  );
}

