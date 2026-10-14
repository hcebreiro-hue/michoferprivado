import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input } from '../components/ui';
import { WHATSAPP_DUENO } from './config';
import { useLicencia } from './LicenciaContext';

/**
 * Se muestra mientras no hay licencia vigente para este equipo. El chofer solo
 * escribe su número de WhatsApp: el ID del equipo viaja solo.
 */
export function PantallaActivacion({ pendienteDeConexion = false }: { pendienteDeConexion?: boolean }) {
  const { activar, equipoId } = useLicencia();
  const [whatsapp, setWhatsapp] = useState('');
  const [aceptoPrivacidad, setAceptoPrivacidad] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (whatsapp.replace(/\D/g, '').length < 8) {
      setError('Escribí tu número de WhatsApp con código de área.');
      return;
    }
    if (!aceptoPrivacidad) {
      setError('Tenés que aceptar el aviso de privacidad para continuar.');
      return;
    }
    setError(null);
    setEnviando(true);
    const r = await activar(whatsapp);
    setEnviando(false);
    if (!r.ok) setError(r.mensaje);
  };

  const pedirAlta = () => {
    const texto = `Hola, quiero activar Claudia. Mi número es ${whatsapp || '(completar)'}.`;
    Linking.openURL(`https://wa.me/${WHATSAPP_DUENO}?text=${encodeURIComponent(texto)}`).catch(() => undefined);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-5 gap-4" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-slate-900 mt-6">Activar la app</Text>
        <Text className="text-base text-slate-600">
          {pendienteDeConexion
            ? 'Hace varios días que la app no se conecta. Conectate a internet y tocá Activar para renovar la validación.'
            : 'Para empezar, escribí el número de WhatsApp con el que te dieron de alta.'}
        </Text>

        <Card>
          <Input
            label="Tu número de WhatsApp"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            placeholder="11 5555 0000"
            autoComplete="tel"
            maxLength={20}
          />
          <Text className="text-xs text-slate-500 mb-3">
            Se guarda en el servidor de licencias junto con el identificador de este teléfono y la fecha de inicio. Se usa
            solo para controlar tu licencia (Ley 25.326). Podés pedir que corrijan o borren tus datos por WhatsApp.
          </Text>
          <View className="flex-row items-center gap-3 mb-4">
            <Button
              title={aceptoPrivacidad ? '✓ Acepto el aviso' : 'Acepto el aviso de privacidad'}
              variant={aceptoPrivacidad ? 'success' : 'ghost'}
              size="sm"
              onPress={() => setAceptoPrivacidad((v) => !v)}
            />
          </View>
          {error ? <Text className="text-sm text-red-600 mb-3">{error}</Text> : null}
          <Button title="Activar" onPress={enviar} loading={enviando} fullWidth />
        </Card>

        <Button title="Pedir mi alta por WhatsApp" variant="ghost" onPress={pedirAlta} fullWidth />
        {equipoId === null ? (
          <Text className="text-xs text-red-600">No se pudo identificar este teléfono. Reinstalá la app.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
