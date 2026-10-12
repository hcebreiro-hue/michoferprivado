import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../src/components/ui';
import { useData } from '../../src/context/DataContext';
import { useSettings } from '../../src/context/SettingsContext';
import { formatCurrency } from '../../src/utils/format';

interface FuelFormModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Modal para registrar una carga de combustible. */
export function FuelFormModal({ visible, onClose }: FuelFormModalProps) {
  const { addFuel } = useData();
  const { settings, updateSettings } = useSettings();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState(String(settings.current_odometer_km));
  const [liters, setLiters] = useState('');
  const [costPerLiter, setCostPerLiter] = useState('');
  const [saving, setSaving] = useState(false);

  const litersNum = Number(liters.replace(',', '.')) || 0;
  const costNum = Number(costPerLiter.replace(',', '.')) || 0;
  const total = litersNum * costNum;

  const handleSave = async () => {
    if (litersNum <= 0) return;
    setSaving(true);
    try {
      const odometerKm = Number(odometer) || 0;
      await addFuel({
        filled_at: new Date(`${date}T10:00:00`).toISOString(),
        odometer_km: odometerKm,
        liters: litersNum,
        cost_per_liter: costNum,
        total_cost: total,
      });
      // Si el odómetro avanzó, actualizamos el odómetro global.
      if (odometerKm > settings.current_odometer_km) {
        await updateSettings({ current_odometer_km: odometerKm });
      }
      onClose();
      setLiters('');
      setCostPerLiter('');
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
              Cargar combustible
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
              label="Kilometraje (odómetro)"
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="numeric"
              placeholder="Ej. 45000"
            />
            <Input
              label="Litros cargados"
              value={liters}
              onChangeText={setLiters}
              keyboardType="numeric"
              placeholder="Ej. 42"
            />
            <Input
              label={`Costo por litro (${settings.currency})`}
              value={costPerLiter}
              onChangeText={setCostPerLiter}
              keyboardType="numeric"
              placeholder="Ej. 950"
            />

            <View className="bg-slate-50 rounded-xl p-4 flex-row items-center justify-between">
              <Text className="text-sm text-slate-600">Total de la carga</Text>
              <Text className="text-lg font-bold text-slate-900">
                {formatCurrency(total, settings)}
              </Text>
            </View>
          </ScrollView>

          <View className="px-5 pb-6 pt-2 border-t border-slate-100">
            <Button
              title="Registrar carga"
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
