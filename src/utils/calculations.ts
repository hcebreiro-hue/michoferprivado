import {
  isCalendarBlock,
  type Trip,
  type FuelLog,
  type MaintenanceLog,
  type FixedCost,
  type Settings,
  type ExpiryKind,
} from '../types';
import { monthKey, startOfToday, startOfWeek, daysUntil } from './format';

/** Ganancias acumuladas de la semana actual (viajes completados o pendientes). */
export function weeklyEarnings(
  trips: Trip[],
  settings: Pick<Settings, 'currency'>,
  now = Date.now(),
): number {
  const weekStart = startOfWeek();
  return trips
    .filter(
      (t) =>
        !isCalendarBlock(t) &&
        t.status !== 'cancelled' &&
        new Date(t.scheduled_at).getTime() >= weekStart &&
        new Date(t.scheduled_at).getTime() <= now + 7 * 24 * 3600 * 1000,
    )
    .reduce((sum, t) => sum + t.price, 0);
}

/** Ganancias del día de hoy. */
export function todayEarnings(trips: Trip[]): number {
  const todayStart = startOfToday();
  const todayEnd = todayStart + 24 * 3600 * 1000;
  return trips
    .filter((t) => {
      const time = new Date(t.scheduled_at).getTime();
      return (
        !isCalendarBlock(t) &&
        t.status !== 'cancelled' && time >= todayStart && time < todayEnd
      );
    })
    .reduce((sum, t) => sum + t.price, 0);
}

export interface MonthBalance {
  key: string;
  income: number;
  fuel: number;
  maintenance: number;
  /** Costos fijos mensuales (seguro, patente, cochera, celular). */
  fixed: number;
  /** Fondo de amortización / reserva para el auto (desgaste por km). */
  wearFund: number;
  /** Gastos operativos directos (combustible + mantenimiento). */
  expenses: number;
  /** Balance neto real = ingresos - fijos - operativos. */
  net: number;
  /** Ganancia "disponible" tras separar también el fondo de reserva. */
  netAfterReserve: number;
  tripCount: number;
}

/**
 * Balance agrupado por mes. Calcula:
 *  - ingresos por viajes (no cancelados),
 *  - gastos operativos (combustible + mantenimiento),
 *  - costos fijos mensuales (se aplican a cada mes con actividad),
 *  - fondo de amortización (wear_cost_per_km × km de viajes completados).
 */
export function monthlyBalances(
  trips: Trip[],
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[],
  fixedCosts: FixedCost[] = [],
  wearCostPerKm = 0,
): MonthBalance[] {
  const map = new Map<string, MonthBalance>();

  const ensure = (key: string): MonthBalance => {
    let entry = map.get(key);
    if (!entry) {
      entry = {
        key,
        income: 0,
        fuel: 0,
        maintenance: 0,
        fixed: 0,
        wearFund: 0,
        expenses: 0,
        net: 0,
        netAfterReserve: 0,
        tripCount: 0,
      };
      map.set(key, entry);
    }
    return entry;
  };

  // Suma mensual de costos fijos activos.
  const monthlyFixed = fixedCosts
    .filter((c) => c.active)
    .reduce((s, c) => s + c.amount, 0);

  for (const t of trips) {
    if (t.status === 'cancelled' || isCalendarBlock(t)) continue;
    const entry = ensure(monthKey(t.scheduled_at));
    entry.income += t.price;
    entry.tripCount += 1;
    // El fondo de reserva se calcula sobre viajes efectivamente completados.
    if (t.status === 'completed') {
      entry.wearFund += (t.distance_km ?? 0) * wearCostPerKm;
    }
  }

  for (const f of fuelLogs) {
    ensure(monthKey(f.filled_at)).fuel += f.total_cost;
  }

  for (const m of maintenanceLogs) {
    ensure(monthKey(m.performed_at)).maintenance += m.cost;
  }

  const result = [...map.values()];
  for (const entry of result) {
    entry.expenses = entry.fuel + entry.maintenance;
    entry.fixed = monthlyFixed;
    entry.net = entry.income - entry.expenses - entry.fixed;
    // Ganancia real tras guardar el fondo de reserva para el auto.
    entry.netAfterReserve = entry.net - entry.wearFund;
  }

  return result.sort((a, b) => b.key.localeCompare(a.key));
}

export interface MaintenanceStatus {
  /** 0..1 — proporción consumida del intervalo. */
  progress: number;
  /** Kilómetros restantes hasta el próximo servicio. */
  remainingKm: number;
  /** true si ya se alcanzó o superó el kilometraje del servicio. */
  due: boolean;
  tone: 'ok' | 'warning' | 'danger';
}

/** Calcula el estado de un mantenimiento a partir de ajustes. */
export function maintenanceStatus(
  currentKm: number,
  lastServiceKm: number,
  intervalKm: number,
): MaintenanceStatus {
  const consumed = Math.max(0, currentKm - lastServiceKm);
  const progress = intervalKm > 0 ? consumed / intervalKm : 1;
  const remainingKm = Math.max(0, lastServiceKm + intervalKm - currentKm);
  let tone: 'ok' | 'warning' | 'danger' = 'ok';
  if (remainingKm <= 0 || progress >= 1) tone = 'danger';
  else if (progress >= 0.8) tone = 'warning';
  return { progress, remainingKm, due: remainingKm <= 0, tone };
}

/** Determina si algún mantenimiento requiere atención pronto (para alertas). */
export function needsMaintenanceAlert(
  settings: Settings,
): { show: boolean; message: string } {
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

  const items: { name: string; s: MaintenanceStatus }[] = [
    { name: 'cambio de aceite', s: oil },
    { name: 'pastillas de freno', s: brake },
  ];

  const urgent = items.find((i) => i.s.progress >= 0.8);
  if (urgent) {
    const km = Math.round(urgent.s.remainingKm);
    return {
      show: true,
      message: urgent.s.due
        ? `¡Es hora del ${urgent.name}! Ya alcanzaste el kilometraje.`
        : `El ${urgent.name} está próximo (faltan ${km.toLocaleString('es-AR')} km).`,
    };
  }
  return { show: false, message: '' };
}

/** Umbral de días para alertar sobre un vencimiento próximo. */
export const EXPIRY_ALERT_DAYS = 15;

export interface ExpiryStatus {
  kind: ExpiryKind;
  label: string;
  dueDate: string;
  /** Días restantes (negativo si ya venció). */
  daysLeft: number;
  /** true si vence dentro del umbral o ya venció. */
  alert: boolean;
  tone: 'ok' | 'warning' | 'danger';
}

/** Construye la lista de vencimientos a partir de los ajustes. */
export function expiryStatuses(settings: Settings): ExpiryStatus[] {
  const defs: { kind: ExpiryKind; label: string; due: string }[] = [
    { kind: 'vtv', label: 'Revisión técnica (VTV/RTO)', due: settings.vtv_expiry },
    { kind: 'license', label: 'Registro / Licencia', due: settings.license_expiry },
    { kind: 'insurance', label: 'Póliza de seguro', due: settings.insurance_expiry },
  ];

  return defs
    .filter((d) => d.due)
    .map((d) => {
      const daysLeft = daysUntil(d.due);
      let tone: 'ok' | 'warning' | 'danger' = 'ok';
      if (daysLeft < 0) tone = 'danger';
      else if (daysLeft <= EXPIRY_ALERT_DAYS) tone = 'warning';
      return {
        kind: d.kind,
        label: d.label,
        dueDate: d.due,
        daysLeft,
        alert: daysLeft <= EXPIRY_ALERT_DAYS,
        tone,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
