import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../src/components/ui';
import { useData } from '../../src/context/DataContext';
import { useSettings } from '../../src/context/SettingsContext';
import type { FixedCostCategory, FixedCost } from '../../src/types';
import { FIXED_COST_LABELS } from '../../src/types';

const CATEGORIES: FixedCostCategory[] = [
  'insurance',
  'patent',
  'garage',
  'phone',
  'other',
];

/** Modal para registrar o editar un gasto fijo mensual. */
export function FixedCostFormModal({
  visible,
  onClose,
  editing = null,
}: {
  visible: boolean;
  onClose: () => void;
  /** Gasto existente a editar. Si es null, el modal crea uno nuevo. */
  editing?: FixedCost | null;
}) {
  if (!visible) return null;
  return (
    <FixedCostFormModalContent
      key={editing?.id ?? 'new'}
      visible={visible}
      onClose={onClose}
      editing={editing}
    />
  );
}

function FixedCostFormModalContent({
  visible,
  onClose,
  editing,
}: {
  visible: boolean;
  onClose: () => void;
  editing: FixedCost | null;
}) {
  const { addFixedCost, updateFixedCost } = useData();
  const { settings } = useSettings();
  const [category, setCategory] = useState<FixedCostCategory>(
    editing?.category ?? 'insurance',
  );
  const [label, setLabel] = useState(editing?.label ?? '');
  const [amount, setAmount] = useState(
    editing != null ? String(editing.amount) : '',
  );
  const [saving, setSaving] = useState(false);

  const isEditing = editing != null;

  const handleSave = async () => {
    const value = Number(amount.replace(',', '.')) || 0;
    if (value <= 0) return;
    setSaving(true);
    try {
      const payload = {
        category,
        label: label.trim() || FIXED_COST_LABELS[category],
        amount: value,
      };
      if (editing) {
        await updateFixedCost(editing.id, payload);
      } else {
        await addFixedCost({ ...payload, active: true });
      }
      onClose();
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
              {isEditing ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close" size={26} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4">
            <Text className="text-sm font-medium text-slate-600 mb-1.5">Categoría</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  // @ts-ignore
                  className={`px-4 py-2 rounded-full border ${
                    category === c
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white border-slate-200'
                  }`}
                  onPress={() => setCategory(c)}
                >
                  <Text
                    // @ts-ignore
                    className={`text-sm font-semibold ${
                      category === c ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {FIXED_COST_LABELS[c]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Descripción (opcional)"
              placeholder={FIXED_COST_LABELS[category]}
              value={label}
              onChangeText={setLabel}
            />
            <Input
              label={`Monto mensual (${settings.currency})`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Ej. 45000"
            />
          </ScrollView>

          <View className="px-5 pb-6 pt-2 border-t border-slate-100">
            <Button
              title={isEditing ? 'Guardar cambios' : 'Guardar gasto fijo'}
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
