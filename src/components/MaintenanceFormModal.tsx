import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../src/components/ui';
import { useData } from '../../src/context/DataContext';
import { useSettings } from '../../src/context/SettingsContext';
import { localDateString } from '../../src/utils/format';
import type { MaintenanceType } from '../../src/types';

interface MaintenanceFormModalProps {
  visible: boolean;
  onClose: () => void;
  type: MaintenanceType;
}

const TYPE_LABEL: Record<MaintenanceType, string> = {
  oil: 'Cambio de aceite',
  brake_pads: 'Pastillas de freno',
};

/** Modal para registrar un mantenimiento realizado. */
export function MaintenanceFormModal({
  visible,
  onClose,
  type,
}: MaintenanceFormModalProps) {
  const { addMaintenance } = useData();
  const { settings, updateSettings } = useSettings();

  const [date, setDate] = useState(() => localDateString(new Date()));
  const [odometer, setOdometer] = useState(String(settings.current_odometer_km));
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const odometerKm = Number(odometer) || 0;
      await addMaintenance({
        type,
        performed_at: date,
        odometer_km: odometerKm,
        cost: Number(cost) || 0,
        notes: notes.trim() || null,
      });
      // Actualiza el "último cambio" según el tipo.
      await updateSettings({
        ...(type === 'oil'
          ? { last_oil_change_km: odometerKm }
          : { last_brake_change_km: odometerKm }),
        ...(odometerKm > settings.current_odometer_km
          ? { current_odometer_km: odometerKm }
          : {}),
      });
      onClose();
      setCost('');
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
            <Text className="text-xl font-bold text-slate-900">
              {TYPE_LABEL[type]}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close" size={26} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4">
            <Input
              label="Fecha"
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
            />
            <Input
              label="Kilometraje actual"
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="numeric"
            />
            <Input
              label={`Costo (${settings.currency})`}
              value={cost}
              onChangeText={setCost}
              keyboardType="numeric"
              placeholder="Ej. 28000"
            />
            <Input
              label="Notas"
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcional"
            />
          </ScrollView>

          <View className="px-5 pb-6 pt-2 border-t border-slate-100">
            <Button
              title="Registrar mantenimiento"
              onPress={handleSave}
              loading={saving}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
