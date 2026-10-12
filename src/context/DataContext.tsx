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

  const refresh = useCallback(async () => {
    if (settingsLoading) return;

    try {
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
  }, [settings.driver_name, settings.profile_complete, settingsLoading]);

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
      await tripsService.createTrip(trip);
      await refresh();
    },
    [refresh],
  );

  const updateTrip = useCallback(
    async (id: string, patch: Partial<Trip>) => {
      await tripsService.updateTrip(id, patch);
      await refresh();
    },
    [refresh],
  );

  const removeTrip = useCallback(
    async (id: string) => {
      await tripsService.deleteTrip(id);
      await refresh();
    },
    [refresh],
  );

  const addFuel = useCallback(
    async (fuel: fuelService.NewFuelLog) => {
      await fuelService.createFuelLog(fuel);
      await refresh();
    },
    [refresh],
  );

  const removeFuel = useCallback(
    async (id: string) => {
      await fuelService.deleteFuelLog(id);
      await refresh();
    },
    [refresh],
  );

  const addMaintenance = useCallback(
    async (maintenance: maintenanceService.NewMaintenanceLog) => {
      await maintenanceService.createMaintenanceLog(maintenance);
      await refresh();
    },
    [refresh],
  );

  const removeMaintenance = useCallback(
    async (id: string) => {
      await maintenanceService.deleteMaintenanceLog(id);
      await refresh();
    },
    [refresh],
  );

  const addFixedCost = useCallback(
    async (cost: fixedCostsService.NewFixedCost) => {
      await fixedCostsService.createFixedCost(cost);
      await refresh();
    },
    [refresh],
  );

  const updateFixedCost = useCallback(
    async (id: string, patch: Partial<FixedCost>) => {
      await fixedCostsService.updateFixedCost(id, patch);
      await refresh();
    },
    [refresh],
  );

  const removeFixedCost = useCallback(
    async (id: string) => {
      await fixedCostsService.deleteFixedCost(id);
      await refresh();
    },
    [refresh],
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
