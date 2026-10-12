import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Card, StatCard, EmptyState } from '../../src/components/ui';
import { useData } from '../../src/context/DataContext';
import { useSettings } from '../../src/context/SettingsContext';
import { formatCurrency, monthLabel } from '../../src/utils/format';
import { monthlyBalances } from '../../src/utils/calculations';

export default function ReportesScreen() {
  const { trips, fuelLogs, maintenanceLogs, fixedCosts, loading, refresh } =
    useData();
  const { settings } = useSettings();

  const balances = useMemo(
    () =>
      monthlyBalances(
        trips,
        fuelLogs,
        maintenanceLogs,
        fixedCosts,
        settings.wear_cost_per_km,
      ),
    [trips, fuelLogs, maintenanceLogs, fixedCosts, settings.wear_cost_per_km],
  );

  // Totales globales.
  const totals = useMemo(() => {
    const income = balances.reduce((s, b) => s + b.income, 0);
    const fuel = balances.reduce((s, b) => s + b.fuel, 0);
    const maintenance = balances.reduce((s, b) => s + b.maintenance, 0);
    const fixed = balances.reduce((s, b) => s + b.fixed, 0);
    const wearFund = balances.reduce((s, b) => s + b.wearFund, 0);
    const net = balances.reduce((s, b) => s + b.net, 0);
    const netAfterReserve = balances.reduce(
      (s, b) => s + b.netAfterReserve,
      0,
    );
    return { income, fuel, maintenance, fixed, wearFund, net, netAfterReserve };
  }, [balances]);

  // Mayor valor para escalar las barras del gráfico.
  const maxIncome = useMemo(
    () => Math.max(1, ...balances.map((b) => Math.max(b.income, b.expenses + b.fixed))),
    [balances],
  );



  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Reportes Financieros"
        subtitle="Balance neto por mes"
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Resumen global */}
        <View className="flex-row gap-3 mt-4">
          <StatCard
            label="Ingresos"
            value={formatCurrency(totals.income, settings)}
            accent="green"
            icon={<Ionicons name="arrow-down-circle" size={16} color="#059669" />}
          />
          <StatCard
            label="Costos fijos"
            value={formatCurrency(totals.fixed, settings)}
            accent="amber"
            icon={<Ionicons name="calendar-number" size={16} color="#d97706" />}
          />
        </View>

        {/* Balance neto real destacado */}
        <Card className="mt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm text-slate-500">
                Ganancia neta real
              </Text>
              <Text
                className={`text-3xl font-bold mt-1 ${
                  totals.net >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {formatCurrency(totals.net, settings)}
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                Tras descontar fijos, combustible y mantenimiento
              </Text>
            </View>
            <View
              className={`p-3 rounded-2xl ml-3 ${
                totals.net >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            >
              <Ionicons
                name={totals.net >= 0 ? 'trending-up' : 'trending-down'}
                size={28}
                color={totals.net >= 0 ? '#059669' : '#ef4444'}
              />
            </View>
          </View>

          {/* Fondo de reserva para el auto */}
          <View className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="bg-brand-100 p-2 rounded-lg mr-2">
                  <Ionicons name="shield-checkmark" size={18} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-800">
                    Fondo de reserva (auto)
                  </Text>
                  <Text className="text-xs text-slate-400">
                    Ahorro invisible · {settings.wear_cost_per_km}/km
                  </Text>
                </View>
              </View>
              <Text className="text-lg font-bold text-brand-600">
                {formatCurrency(totals.wearFund, settings)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <Text className="text-sm text-slate-600 font-medium">
                Ganancia tras reserva
              </Text>
              <Text
                className={`text-base font-bold ${
                  totals.netAfterReserve >= 0
                    ? 'text-emerald-600'
                    : 'text-red-500'
                }`}
              >
                {formatCurrency(totals.netAfterReserve, settings)}
              </Text>
            </View>
          </View>
        </Card>

        <Text className="text-lg font-bold text-slate-900 mt-6 mb-3">
          Por mes
        </Text>

        {balances.length === 0 ? (
          <Card>
            <EmptyState
              title="Sin datos"
              message="Aún no hay movimientos para mostrar."
              icon={<Ionicons name="bar-chart-outline" size={40} color="#cbd5e1" />}
            />
          </Card>
        ) : (
          balances.map((b) => (
            <Card key={b.key} className="mb-3">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-slate-900 capitalize">
                  {monthLabel(b.key)}
                </Text>
                <Text
                  className={`text-lg font-bold ${
                    b.net >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(b.net, settings)}
                </Text>
              </View>

              <View className="mb-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-slate-500">
                    Ingresos ({b.tripCount} viajes)
                  </Text>
                  <Text className="text-xs font-semibold text-emerald-600">
                    {formatCurrency(b.income, settings)}
                  </Text>
                </View>
                <View className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <View
                    // @ts-ignore
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(b.income / maxIncome) * 100}%` }}
                  />
                </View>
              </View>

              <View className="mb-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-slate-500">Gastos operativos</Text>
                  <Text className="text-xs font-semibold text-amber-600">
                    {formatCurrency(b.expenses, settings)}
                  </Text>
                </View>
                <View className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <View
                    // @ts-ignore
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(b.expenses / maxIncome) * 100}%` }}
                  />
                </View>
              </View>

              {/* Desglose mensual: combustible, mant., fijos y reserva */}
              <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-slate-100">
                <View className="flex-row items-center">
                  <Ionicons name="water-outline" size={14} color="#64748b" />
                  <Text className="text-xs text-slate-500 ml-1">
                    Combustible: {formatCurrency(b.fuel, settings)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="build-outline" size={14} color="#64748b" />
                  <Text className="text-xs text-slate-500 ml-1">
                    Mant.: {formatCurrency(b.maintenance, settings)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="calendar-number" size={14} color="#64748b" />
                  <Text className="text-xs text-slate-500 ml-1">
                    Fijos: {formatCurrency(b.fixed, settings)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={14} color="#64748b" />
                  <Text className="text-xs text-slate-500 ml-1">
                    Reserva: {formatCurrency(b.wearFund, settings)}
                  </Text>
                </View>
              </View>

              {/* Ganancia real tras reserva */}
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-600 font-medium">
                  Ganancia real tras reserva
                </Text>
                <Text
                  className={`text-sm font-bold ${
                    b.netAfterReserve >= 0
                      ? 'text-emerald-600'
                      : 'text-red-500'
                  }`}
                >
                  {formatCurrency(b.netAfterReserve, settings)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
