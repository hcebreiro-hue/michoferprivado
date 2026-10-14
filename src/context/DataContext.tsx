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
import { loadCollection, saveCollection } from '../services/localStore';
import {
  cancelTripReminder,
  scheduleTripReminder,
} from '../services/notifications';
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

/**
 * Modo demo (primera experiencia): mientras el chofer no completa su perfil, la
 * app muestra datos de ejemplo guardados en el dispositivo (AsyncStorage). Se
 * usa SIEMPRE que el perfil no está completo —incluso con una sesión de la nube
 * abierta— para que la primera impresión sea comprensible y los viajes que el
 * usuario agregue explorando no se pierdan al reiniciar la app.
 */
async function loadLocalDemoCollection<T>(
  key: string,
  seed: () => T[],
): Promise<T[]> {
  const stored = await loadCollection<T>(key);
  if (stored == null) {
    const seeded = seed();
    await saveCollection(key, seeded);
    return seeded;
  }
  return stored;
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
      // Perfil sin completar → modo demo con datos de ejemplo en el dispositivo.
      // Aplica también con sesión de la nube para garantizar la primera
      // experiencia (nombre genérico "Conductor" + viajes de ejemplo).
      if (!settings.profile_complete) {
        const [demoTrips, demoFuel, demoMaintenance, demoCosts] =
          await Promise.all([
            loadLocalDemoCollection<Trip>('trips', seedTrips),
            loadLocalDemoCollection<FuelLog>('fuel_logs', seedFuelLogs),
            loadLocalDemoCollection<MaintenanceLog>(
              'maintenance_logs',
              seedMaintenanceLogs,
            ),
            loadLocalDemoCollection<FixedCost>('fixed_costs', seedFixedCosts),
          ]);

        setTrips(
          [...demoTrips].sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          ),
        );
        setFuelLogs(
          [...demoFuel].sort(
            (a, b) =>
              new Date(b.filled_at).getTime() -
              new Date(a.filled_at).getTime(),
          ),
        );
        setMaintenanceLogs(
          [...demoMaintenance].sort(
            (a, b) =>
              new Date(b.performed_at).getTime() -
              new Date(a.performed_at).getTime(),
          ),
        );
        setFixedCosts(demoCosts);
        setCurrentMonthKey(monthKey(new Date().toISOString()));
        setError(null);
        return;
      }

      // Perfil completo → datos reales (de la nube si hay sesión, si no locales).
      const [loadedTrips, loadedFuelLogs, loadedMaintenanceLogs, loadedCosts] =
        await Promise.all([
          tripsService.listTrips(false),
          fuelService.listFuelLogs(false),
          maintenanceService.listMaintenanceLogs(false),
          fixedCostsService.listFixedCosts(false),
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
  }, [settings.profile_complete, settingsLoading]);

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
      const created = await tripsService.createTrip(trip);
      // El recordatorio es complementario: si falla (p. ej. notificaciones no
      // disponibles en Expo Go) el viaje igual debe guardarse.
      await scheduleTripReminder(created).catch(() => undefined);
      await refresh();
    },
    [refresh],
  );

  const updateTrip = useCallback(
    async (id: string, patch: Partial<Trip>) => {
      const updated = await tripsService.updateTrip(id, patch);
      await scheduleTripReminder(updated).catch(() => undefined);
      await refresh();
    },
    [refresh],
  );

  const removeTrip = useCallback(
    async (id: string) => {
      await tripsService.deleteTrip(id);
      await cancelTripReminder(id).catch(() => undefined);
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
