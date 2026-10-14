import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components/ui';
import { useData } from '../context/DataContext';
import { WHATSAPP_DUENO } from './config';
import { exportarDatos } from './compartir';
import { useLicencia } from './LicenciaContext';

type Motivo = 'vencida' | 'apk_vencido' | 'reloj';

const TEXTOS: Record<Motivo, { titulo: string; cuerpo: string }> = {
  vencida: {
    titulo: 'Tu licencia venció',
    cuerpo: 'Ya no se pueden cargar datos nuevos. Para seguir usando Claudia, pedí la renovación por WhatsApp. Mientras tanto podés descargar todos tus datos.',
  },
  apk_vencido: {
    titulo: 'Esta versión de la app venció',
    cuerpo: 'Pedí la versión nueva por WhatsApp. Si ya tenías una licencia en este teléfono, se conserva al instalarla.',
  },
  reloj: {
    titulo: 'Revisá la fecha y hora del teléfono',
    cuerpo: 'La fecha de tu teléfono parece incorrecta (está atrasada). Activá la fecha y hora automáticas en Ajustes y volvé a abrir la app.',
  },
};

/**
 * Pantalla fija cuando el acceso está cortado. Siempre ofrece "Descargar mis
 * datos": exportar no depende de la licencia.
 */
export function PantallaBloqueo({ motivo }: { motivo: Motivo }) {
  const { equipoId, licencia, refrescar } = useLicencia();
  const { trips, fuelLogs, maintenanceLogs, fixedCosts } = useData();
  const [exportando, setExportando] = useState(false);
  const t = TEXTOS[motivo];

  const renovar = () => {
    const texto = `Hola, quiero renovar mi licencia de Claudia. Mi número: ${licencia?.whatsapp ?? '(completar)'}. Mi equipo: ${equipoId ?? '-'}.`;
    Linking.openURL(`https://wa.me/${WHATSAPP_DUENO}?text=${encodeURIComponent(texto)}`).catch(() => undefined);
  };

  const descargar = async () => {
    setExportando(true);
    try {
      const ok = await exportarDatos({ trips, fuelLogs, maintenanceLogs, fixedCosts });
      if (!ok) Alert.alert('No disponible', 'Este teléfono no permite compartir archivos.');
    } catch {
      Alert.alert('No se pudo descargar', 'Probá de nuevo en un momento.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-5 gap-4">
        <Text className="text-2xl font-bold text-slate-900 mt-6">{t.titulo}</Text>
        <Text className="text-base text-slate-600">{t.cuerpo}</Text>
        <Card className="gap-3">
          {motivo === 'vencida' ? <Button title="Pedir renovación por WhatsApp" onPress={renovar} fullWidth /> : null}
          {motivo === 'apk_vencido' ? <Button title="Pedir la versión nueva" onPress={renovar} fullWidth /> : null}
          <Button title="Descargar mis datos" variant="ghost" onPress={descargar} loading={exportando} fullWidth />
          {motivo === 'vencida' ? <Button title="Ya renové: volver a revisar" variant="ghost" onPress={() => void refrescar()} fullWidth /> : null}
        </Card>
        {equipoId ? <Text className="text-xs text-slate-400">ID del equipo: {equipoId}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
