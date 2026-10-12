import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { FixedCost, FuelLog, MaintenanceLog, Trip } from '../types';
import { useSettings } from './SettingsContext';
import * as tripsService from '../services/trips';
import * as fuelService from '../services/fuel';
import * as maintenanceService from '../services/maintenance';
import * as fixedCostsService from '../services/fixedCosts';
import { isSupabaseConfigured } from '../lib/supabase';
import { localId } from '../services/localStore';
import {
  seedTrips,
  seedFuelLogs,
  seedMaintenanceLogs,
  seedFixedCosts,
} from '../services/seed';
import { monthlyBalances, type MonthBalance } from '../utils/calculations';
import { monthKey } from '../utils/format';

interface DataContextValue {
  trips: Trip[];
  currentMonthTrips: Trip[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  fixedCosts: FixedCost[];
  currentMonthBalance: MonthBalance;
  monthlyHistory: MonthBalance[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTrip: (trip: tripsService.NewTrip) => Promise<void>;
  updateTrip: (id: string, patch: Partial<Trip>) => Promise<void>;
  removeTrip: (id: string) => Promise<void>;
  addFuel: (fuel: fuelService.NewFuelLog) => Promise<void>;
  removeFuel: (id: string) => Promise<void>;
  addMaintenance: (
    maintenance: maintenanceService.NewMaintenanceLog,
  ) => Promise<void>;
  removeMaintenance: (id: string) => Promise<void>;
  addFixedCost: (cost: fixedCostsService.NewFixedCost) => Promise<void>;
  updateFixedCost: (id: string, patch: Partial<FixedCost>) => Promise<void>;
  removeFixedCost: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function normalizeDriverName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [currentMonthKey, setCurrentMonthKey] = useState(() =>
    monthKey(new Date().toISOString()),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modo exploración: con Supabase configurado pero perfil aún incompleto, el
  // chofer ve datos de ejemplo (en memoria) para investigar la app antes de dar
  // de alta su perfil. Nada se escribe en la base hasta que complete el perfil.
  const exploration =
    isSupabaseConfigured && !settings.profile_complete;

  const refresh = useCallback(async () => {
    if (settingsLoading) return;

    try {
      if (exploration) {
        setTrips(seedTrips());
        setFuelLogs(seedFuelLogs());
        setMaintenanceLogs(seedMaintenanceLogs());
        setFixedCosts(seedFixedCosts());
        setCurrentMonthKey(monthKey(new Date().toISOString()));
        setError(null);
        return;
      }

      const driverName = normalizeDriverName(settings.driver_name);
      const seedDemoData = driverName === 'conductor' && !settings.profile_complete;
      const [loadedTrips, loadedFuelLogs, loadedMaintenanceLogs, loadedCosts] =
        await Promise.all([
          tripsService.listTrips(seedDemoData),
          fuelService.listFuelLogs(seedDemoData),
          maintenanceService.listMaintenanceLogs(seedDemoData),
          fixedCostsService.listFixedCosts(seedDemoData),
        ]);

      setTrips(loadedTrips);
      setFuelLogs(loadedFuelLogs);
      setMaintenanceLogs(loadedMaintenanceLogs);
      setFixedCosts(loadedCosts);
      setCurrentMonthKey(monthKey(new Date().toISOString()));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Error al cargar los datos',
      );
    } finally {
      setLoading(false);
    }
  }, [settings.driver_name, settings.profile_complete, settingsLoading, exploration]);

  useEffect(() => {
    if (settingsLoading) return;
    void Promise.resolve().then(refresh);
  }, [refresh, settingsLoading]);

  const currentMonthTrips = trips.filter(
    (trip) => monthKey(trip.scheduled_at) === currentMonthKey,
  );
  const monthlyHistory = monthlyBalances(
    trips,
    fuelLogs,
    maintenanceLogs,
    fixedCosts,
    settings.wear_cost_per_km,
  );
  const currentMonthFixedCosts = fixedCosts
    .filter((cost) => cost.active)
    .reduce((total, cost) => total + cost.amount, 0);
  const currentMonthBalance =
    monthlyHistory.find((balance) => balance.key === currentMonthKey) ??
    ({
      key: currentMonthKey,
      income: 0,
      fuel: 0,
      maintenance: 0,
      fixed: currentMonthFixedCosts,
      wearFund: 0,
      expenses: 0,
      net: -currentMonthFixedCosts,
      netAfterReserve: -currentMonthFixedCosts,
      tripCount: 0,
    } satisfies MonthBalance);

  const addTrip = useCallback(
    async (trip: tripsService.NewTrip) => {
      if (exploration) {
        setTrips((prev) => [
          ...prev,
          { ...trip, id: localId(), created_at: new Date().toISOString() },
        ]);
        return;
      }
      await tripsService.createTrip(trip);
      await refresh();
    },
    [refresh, exploration],
  );

  const updateTrip = useCallback(
    async (id: string, patch: Partial<Trip>) => {
      if (exploration) {
        setTrips((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
        return;
      }
      await tripsService.updateTrip(id, patch);
      await refresh();
    },
    [refresh, exploration],
  );

  const removeTrip = useCallback(
    async (id: string) => {
      if (exploration) {
        setTrips((prev) => prev.filter((t) => t.id !== id));
        return;
      }
      await tripsService.deleteTrip(id);
      await refresh();
    },
    [refresh, exploration],
  );

  const addFuel = useCallback(
    async (fuel: fuelService.NewFuelLog) => {
      if (exploration) {
        setFuelLogs((prev) => [
          ...prev,
          { ...fuel, id: localId(), created_at: new Date().toISOString() },
        ]);
        return;
      }
      await fuelService.createFuelLog(fuel);
      await refresh();
    },
    [refresh, exploration],
  );

  const removeFuel = useCallback(
    async (id: string) => {
      if (exploration) {
        setFuelLogs((prev) => prev.filter((l) => l.id !== id));
        return;
      }
      await fuelService.deleteFuelLog(id);
      await refresh();
    },
    [refresh, exploration],
  );

  const addMaintenance = useCallback(
    async (maintenance: maintenanceService.NewMaintenanceLog) => {
      if (exploration) {
        setMaintenanceLogs((prev) => [
          ...prev,
          { ...maintenance, id: localId(), created_at: new Date().toISOString() },
        ]);
        return;
      }
      await maintenanceService.createMaintenanceLog(maintenance);
      await refresh();
    },
    [refresh, exploration],
  );

  const removeMaintenance = useCallback(
    async (id: string) => {
      if (exploration) {
        setMaintenanceLogs((prev) => prev.filter((l) => l.id !== id));
        return;
      }
      await maintenanceService.deleteMaintenanceLog(id);
      await refresh();
    },
    [refresh, exploration],
  );

  const addFixedCost = useCallback(
    async (cost: fixedCostsService.NewFixedCost) => {
      if (exploration) {
        setFixedCosts((prev) => [
          ...prev,
          { ...cost, id: localId(), created_at: new Date().toISOString() },
        ]);
        return;
      }
      await fixedCostsService.createFixedCost(cost);
      await refresh();
    },
    [refresh, exploration],
  );

  const updateFixedCost = useCallback(
    async (id: string, patch: Partial<FixedCost>) => {
      if (exploration) {
        setFixedCosts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        );
        return;
      }
      await fixedCostsService.updateFixedCost(id, patch);
      await refresh();
    },
    [refresh, exploration],
  );

  const removeFixedCost = useCallback(
    async (id: string) => {
      if (exploration) {
        setFixedCosts((prev) => prev.filter((c) => c.id !== id));
        return;
      }
      await fixedCostsService.deleteFixedCost(id);
      await refresh();
    },
    [refresh, exploration],
  );

  return (
    <DataContext.Provider
      value={{
        trips,
        currentMonthTrips,
        fuelLogs,
        maintenanceLogs,
        fixedCosts,
        currentMonthBalance,
        monthlyHistory,
        loading,
        error,
        refresh,
        addTrip,
        updateTrip,
        removeTrip,
        addFuel,
        removeFuel,
        addMaintenance,
        removeMaintenance,
        addFixedCost,
        updateFixedCost,
        removeFixedCost,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe usarse dentro de DataProvider');
  }
  return context;
}
