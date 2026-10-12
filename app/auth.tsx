import React, { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      globalThis.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const submit = async () => {
    if (!email.trim() || password.length < 8) {
      notify('Datos incompletos', 'Ingresa un correo y una contraseña de al menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (isCreatingAccount) {
        const hasSession = await signUp(email, password);
        if (!hasSession) {
          notify(
            'Revisa tu correo',
            'Confirma tu dirección de correo y luego inicia sesión.',
          );
        }
      } else {
        await signIn(email, password);
      }
    } catch (cause) {
      notify(
        'No se pudo autenticar',
        cause instanceof Error ? cause.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-slate-50 px-5">
      <Card className="p-5">
        <Text className="mb-2 text-2xl font-bold text-slate-900">
          Mi Chofer Privado
        </Text>
        <Text className="mb-6 text-sm text-slate-600">
          {isCreatingAccount
            ? 'Crea una cuenta para guardar tus datos de forma privada.'
            : 'Inicia sesión para acceder a tus viajes y configuración.'}
        </Text>
        <Input
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
        />
        <Button
          title={isCreatingAccount ? 'Crear cuenta' : 'Iniciar sesión'}
          onPress={submit}
          loading={submitting}
          fullWidth
        />
        <View className="mt-4 items-center">
          <Text
            className="py-2 text-sm font-semibold text-brand-700"
            onPress={() => setIsCreatingAccount((current) => !current)}
          >
            {isCreatingAccount
              ? 'Ya tengo cuenta · Iniciar sesión'
              : 'Crear una cuenta nueva'}
          </Text>
        </View>
      </Card>
    </SafeAreaView>
  );
}
