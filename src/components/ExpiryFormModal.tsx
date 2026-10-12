import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../src/components/ui';
import { useSettings } from '../../src/context/SettingsContext';
import type { ExpiryKind } from '../../src/types';

interface ExpiryFormModalProps {
  visible: boolean;
  onClose: () => void;
  kind: ExpiryKind;
  title: string;
}

/** Modal para actualizar la fecha de un vencimiento (VTV, licencia o seguro). */
export function ExpiryFormModal({
  visible,
  onClose,
  kind,
  title,
}: ExpiryFormModalProps) {
  const { settings, updateSettings } = useSettings();

  const currentValue =
    kind === 'vtv'
      ? settings.vtv_expiry
      : kind === 'license'
        ? settings.license_expiry
        : settings.insurance_expiry;

  if (!visible) return null;
  return (
    <ExpiryFormModalContent
      key={kind}
      currentValue={currentValue}
      kind={kind}
      title={title}
      visible={visible}
      onClose={onClose}
      updateSettings={updateSettings}
    />
  );
}

function ExpiryFormModalContent({
  currentValue,
  kind,
  title,
  visible,
  onClose,
  updateSettings,
}: {
  currentValue: string;
  kind: ExpiryKind;
  title: string;
  visible: boolean;
  onClose: () => void;
  updateSettings: ReturnType<typeof useSettings>['updateSettings'];
}) {
  const [date, setDate] = useState(currentValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date.trim()) return;
    setSaving(true);
    try {
      if (kind === 'vtv') await updateSettings({ vtv_expiry: date.trim() });
      else if (kind === 'license') await updateSettings({ license_expiry: date.trim() });
      else await updateSettings({ insurance_expiry: date.trim() });
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
            <Text className="text-xl font-bold text-slate-900">{title}</Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close" size={26} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4">
            <Input
              label="Fecha de vencimiento"
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
            />
            <Text className="text-xs text-slate-400 -mt-2 mb-2">
              Formato: AAAA-MM-DD (ej. 2027-03-15)
            </Text>
          </ScrollView>

          <View className="px-5 pb-6 pt-2 border-t border-slate-100">
            <Button
              title="Guardar fecha"
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
