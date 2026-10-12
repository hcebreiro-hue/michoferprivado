import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import {
  Card,
  Button,
  LabeledProgress,
  SectionHeader,
  EmptyState,
} from '../../src/components/ui';
import { FuelFormModal } from '../../src/components/FuelFormModal';
import { MaintenanceFormModal } from '../../src/components/MaintenanceFormModal';
import { FixedCostFormModal } from '../../src/components/FixedCostFormModal';
import { ExpiryFormModal } from '../../src/components/ExpiryFormModal';
import { useData } from '../../src/context/DataContext';
import { useSettings } from '../../src/context/SettingsContext';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { maintenanceStatus, expiryStatuses } from '../../src/utils/calculations';
import type { MaintenanceType, ExpiryKind, FixedCost } from '../../src/types';

export default function AutoScreen() {
  const { fuelLogs, fixedCosts, loading, refresh, removeFuel, removeFixedCost, updateFixedCost } =
    useData();
  const { settings, updateSettings } = useSettings();
  const [fuelVisible, setFuelVisible] = useState(false);
  const [maintVisible, setMaintVisible] = useState(false);
  const [maintType, setMaintType] = useState<MaintenanceType>('oil');
  const [fixedVisible, setFixedVisible] = useState(false);
  const [editingFixed, setEditingFixed] = useState<FixedCost | null>(null);
  const [expiryVisible, setExpiryVisible] = useState(false);
  const [expiryKind, setExpiryKind] = useState<ExpiryKind>('vtv');

  const expiries = useMemo(() => expiryStatuses(settings), [settings]);

  const oil = maintenanceStatus(
    settings.current_odometer_km,
    settings.last_oil_change_km,
    settings.oil_change_interval_km,
  );
  const brake = maintenanceStatus(
    settings.current_odometer_km,
    settings.last_brake_change_km,
    settings.brake_interval_km,
  );

  const openMaint = (type: MaintenanceType) => {
    setMaintType(type);
    setMaintVisible(true);
  };

  const openExpiry = (kind: ExpiryKind) => {
    setExpiryKind(kind);
    setExpiryVisible(true);
  };

  // Abre el modal para crear un gasto nuevo.
  const openNewFixed = () => {
    setEditingFixed(null);
    setFixedVisible(true);
  };

  // Abre el modal para editar un gasto existente.
  const openEditFixed = (cost: FixedCost) => {
    setEditingFixed(cost);
    setFixedVisible(true);
  };

  // Eficiencia de combustible aproximada del último tanque.
  const efficiency = useMemo(() => {
    if (fuelLogs.length < 2) return null;
    const sorted = [...fuelLogs].sort((a, b) => a.odometer_km - b.odometer_km);
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const km = last.odometer_km - prev.odometer_km;
    if (km <= 0 || last.liters <= 0) return null;
    return km / last.liters;
  }, [fuelLogs]);


  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Control del Auto"
        subtitle={`Odómetro: ${settings.current_odometer_km.toLocaleString('es-AR')} km`}
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Odómetro editable */}
        <View className="mt-4">
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm text-slate-500">
                  Odómetro actual (km)
                </Text>
                <Text className="text-2xl font-bold text-slate-900 mt-1">
                  {settings.current_odometer_km.toLocaleString('es-AR')}
                </Text>
              </View>
              <View className="flex-row gap-2">
                {[-100, 100].map((delta) => (
                  <Pressable
                    key={delta}
                    // @ts-ignore
                    className="bg-slate-100 px-3 py-2 rounded-lg active:bg-slate-200"
                    onPress={() =>
                      updateSettings({
                        current_odometer_km: Math.max(
                          0,
                          settings.current_odometer_km + delta,
                        ),
                      })
                    }
                  >
                    <Text className="text-slate-700 font-semibold">
                      {delta > 0 ? '+100' : '-100'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>
        </View>

        {/* Mantenimiento */}
        <SectionHeader title="Mantenimiento" />
        <Card>
          <LabeledProgress
            label="Cambio de aceite"
            value={oil.progress}
            tone={oil.tone}
            rightLabel={
              oil.due
                ? '¡Realizar ahora!'
                : `faltan ${Math.round(oil.remainingKm).toLocaleString('es-AR')} km`
            }
          />
          <LabeledProgress
            label="Pastillas de freno"
            value={brake.progress}
            tone={brake.tone}
            rightLabel={
              brake.due
                ? '¡Realizar ahora!'
                : `faltan ${Math.round(brake.remainingKm).toLocaleString('es-AR')} km`
            }
          />
          <View className="flex-row gap-2 mt-1">
            <View className="flex-1">
              <Button
                title="Registrar aceite"
                onPress={() => openMaint('oil')}
                variant="secondary"
                size="sm"
              />
            </View>
            <View className="flex-1">
              <Button
                title="Registrar frenos"
                onPress={() => openMaint('brake_pads')}
                variant="secondary"
                size="sm"
              />
            </View>
          </View>
        </Card>

        {/* Próximos Vencimientos */}
        <SectionHeader title="Próximos vencimientos" />
        <Card className="mb-2">
          {expiries.length === 0 ? (
            <Text className="text-sm text-slate-400">
              Sin vencimientos configurados.
            </Text>
          ) : (
            expiries.map((e) => {
              const toneBg =
                e.tone === 'danger'
                  ? 'bg-red-50 border-red-200'
                  : e.tone === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-slate-100';
              const toneText =
                e.tone === 'danger'
                  ? 'text-red-700'
                  : e.tone === 'warning'
                    ? 'text-amber-700'
                    : 'text-slate-700';
              const icon =
                e.kind === 'vtv'
                  ? 'clipboard-outline'
                  : e.kind === 'license'
                    ? 'card-outline'
                    : 'shield-checkmark-outline';
              const daysLabel =
                e.daysLeft < 0
                  ? `Vencido hace ${Math.abs(e.daysLeft)} d`
                  : e.daysLeft === 0
                    ? '¡Vence hoy!'
                    : `${e.daysLeft} días`;

              return (
                <Pressable
                  key={e.kind}
                  // @ts-ignore
                  className={`flex-row items-center p-3 rounded-xl border mb-2 ${toneBg}`}
                  onPress={() => openExpiry(e.kind)}
                >
                  <View className="bg-white p-2 rounded-lg mr-3">
                    <Ionicons name={icon} size={20} color="#475569" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${toneText}`}>
                      {e.label}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {formatDate(e.dueDate)}
                    </Text>
                  </View>
                  {e.alert ? (
                    <View
                      // @ts-ignore
                      className={`px-2.5 py-1 rounded-full ${
                        e.tone === 'danger' ? 'bg-red-100' : 'bg-amber-100'
                      }`}
                    >
                      <Text
                        // @ts-ignore
                        className={`text-xs font-bold ${
                          e.tone === 'danger' ? 'text-red-700' : 'text-amber-700'
                        }`}
                      >
                        {daysLabel}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-xs text-slate-400">{daysLabel}</Text>
                  )}
                </Pressable>
              );
            })
          )}
          <Text className="text-xs text-slate-400 mt-1">
            Tocá un vencimiento para actualizar su fecha.
          </Text>
        </Card>

        {/* Gastos Fijos Mensuales */}
        <View className="mt-4">
          <SectionHeader
            title="Gastos fijos mensuales"
            actionLabel="+ Agregar"
            onAction={openNewFixed}
          />
          {fixedCosts.length === 0 ? (
            <Card>
              <Text className="text-sm text-slate-400">
                Sin gastos fijos. Agregá seguro, patente, cochera o celular.
              </Text>
            </Card>
          ) : (
            <Card>
              {fixedCosts.map((c) => (
                <View
                  key={c.id}
                  className="flex-row items-center py-2.5 border-b border-slate-100"
                >
                  <Pressable
                    // @ts-ignore
                    className="flex-1 flex-row items-center"
                    onPress={() => updateFixedCost(c.id, { active: !c.active })}
                  >
                    <Ionicons
                      name={c.active ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={c.active ? '#2563eb' : '#cbd5e1'}
                    />
                    <View className="flex-1 ml-3">
                      <Text
                        className={`text-sm font-medium ${
                          c.active ? 'text-slate-800' : 'text-slate-400 line-through'
                        }`}
                      >
                        {c.label}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm font-semibold ${
                        c.active ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(c.amount, settings)}
                    </Text>
                  </Pressable>
                  <Pressable
                    // @ts-ignore
                    className="p-2 ml-1 active:bg-red-50 rounded-lg"
                    onPress={() => removeFixedCost(c.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                  <Pressable
                    // @ts-ignore
                    className="p-2 active:bg-slate-100 rounded-lg"
                    onPress={() => openEditFixed(c)}
                  >
                    <Ionicons name="create-outline" size={18} color="#2563eb" />
                  </Pressable>
                </View>
              ))}
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <Text className="text-sm font-semibold text-slate-700">
                  Total mensual
                </Text>
                <Text className="text-base font-bold text-slate-900">
                  {formatCurrency(
                    fixedCosts
                      .filter((c) => c.active)
                      .reduce((s, c) => s + c.amount, 0),
                    settings,
                  )}
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Combustible */}
        <View className="mt-2">
          <SectionHeader
            title="Combustible"
            actionLabel="+ Cargar"
            onAction={() => setFuelVisible(true)}
          />

          {efficiency ? (
            <Card className="mb-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Rendimiento aprox.</Text>
                <Text className="text-base font-bold text-slate-900">
                  {efficiency.toFixed(1)} km/L
                </Text>
              </View>
            </Card>
          ) : null}

          {fuelLogs.length === 0 ? (
            <Card>
              <EmptyState
                title="Sin cargas registradas"
                message="Registra tu primera carga de combustible."
                icon={<Ionicons name="water-outline" size={40} color="#cbd5e1" />}
              />
            </Card>
          ) : (
            fuelLogs.slice(0, 6).map((log) => (
              <View
                key={log.id}
                // @ts-ignore
                className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 flex-row items-center"
              >
                <View className="bg-amber-100 p-2.5 rounded-xl mr-3">
                  <Ionicons name="water" size={20} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900">
                    {log.liters} L · {formatCurrency(log.total_cost, settings)}
                  </Text>
                  <Text className="text-sm text-slate-500">
                    {formatDate(log.filled_at)} ·{' '}
                    {log.odometer_km.toLocaleString('es-AR')} km
                  </Text>
                </View>
                <Pressable
                  // @ts-ignore
                  className="p-2 active:bg-red-50 rounded-lg"
                  onPress={() => removeFuel(log.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <FuelFormModal visible={fuelVisible} onClose={() => setFuelVisible(false)} />
      <MaintenanceFormModal
        visible={maintVisible}
        type={maintType}
        onClose={() => setMaintVisible(false)}
      />
      <FixedCostFormModal
        visible={fixedVisible}
        editing={editingFixed}
        onClose={() => {
          setFixedVisible(false);
          setEditingFixed(null);
        }}
      />
      <ExpiryFormModal
        visible={expiryVisible}
        kind={expiryKind}
        title={
          expiryKind === 'vtv'
            ? 'Revisión técnica (VTV/RTO)'
            : expiryKind === 'license'
              ? 'Registro / Licencia'
              : 'Póliza de seguro'
        }
        onClose={() => setExpiryVisible(false)}
      />
    </SafeAreaView>
  );
}
