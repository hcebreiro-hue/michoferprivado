// Tipos de dominio de la aplicación "Mi chofer privado Viajes".

export type TripStatus = 'pending' | 'completed' | 'cancelled';

export const CALENDAR_BLOCK_CLIENT_NAME =
  'BLOQUEADO - VACACIONES/DESCANSO';

/** Un viaje agendado con un cliente. */
export interface Trip {
  id: string;
  client_name: string;
  client_phone: string;
  origin: string;
  destination: string;
  /** Fecha y hora programada en formato ISO (ej. 2026-10-10T14:30:00). */
  scheduled_at: string;
  /** Fin del bloqueo de agenda; null para viajes normales. */
  blocked_until?: string | null;
  price: number;
  /** Kilómetros del recorrido (para calcular el fondo de amortización). */
  distance_km?: number | null;
  status: TripStatus;
  notes?: string | null;
  created_at: string;
}

export function isCalendarBlock<T extends Pick<Trip, 'client_name' | 'blocked_until'>>(
  trip: T,
): trip is T & { blocked_until: string } {
  return (
    trip.client_name === CALENDAR_BLOCK_CLIENT_NAME &&
    typeof trip.blocked_until === 'string' &&
    Number.isFinite(new Date(trip.blocked_until).getTime())
  );
}

/** Registro de una carga de combustible. */
export interface FuelLog {
  id: string;
  /** Fecha y hora de la carga en formato ISO. */
  filled_at: string;
  odometer_km: number;
  liters: number;
  cost_per_liter: number;
  total_cost: number;
  created_at: string;
}

export type MaintenanceType = 'oil' | 'brake_pads';

/** Registro de un mantenimiento realizado (cambio de aceite o pastillas). */
export interface MaintenanceLog {
  id: string;
  type: MaintenanceType;
  /** Fecha en que se realizó el mantenimiento (ISO date). */
  performed_at: string;
  odometer_km: number;
  cost: number;
  notes?: string | null;
  created_at: string;
}

/** Ajustes globales de la aplicación. */
export interface Settings {
  /** Costo por kilómetro para la calculadora de tarifas. */
  cost_per_km: number;
  /** Símbolo o código de moneda (ej. ARS, MXN, USD, €). */
  currency: string;
  /** Odómetro actual del vehículo. */
  current_odometer_km: number;
  /** Intervalo recomendado entre cambios de aceite (km). */
  oil_change_interval_km: number;
  /** Odómetro en el que se hizo el último cambio de aceite. */
  last_oil_change_km: number;
  /** Intervalo recomendado entre cambios de pastillas de freno (km). */
  brake_interval_km: number;
  /** Odómetro en el que se hizo el último cambio de pastillas. */
  last_brake_change_km: number;
  /** Costo de desgaste por kilómetro (fondo de amortización / ahorro invisible). */
  wear_cost_per_km: number;
  /** Nombre de la conductora (para el recibo). */
  driver_name: string;
  /** Teléfono de la conductora (para que el pasajero la contacte). */
  driver_phone: string;
  /** Slug público estable y único del portal del chofer. */
  driver_slug: string;
  /** Se completa una sola vez durante el alta del perfil. */
  profile_complete: boolean;
  /** Vencimiento de la revisión técnica (VTV/RTO) en ISO date. */
  vtv_expiry: string;
  /** Vencimiento de la renovación de registro/licencia en ISO date. */
  license_expiry: string;
  /** Vencimiento de la póliza de seguro en ISO date. */
  insurance_expiry: string;
  /**
   * Tipo de cuenta del chofer para la suscripción. `VIP_GRATIS` es el valor
   * por defecto al crear la cuenta; `VIP_PAGO` se activa manualmente cambiando
   * la columna `tipo_cuenta` en la tabla `driver_settings`.
   */
  tipo_cuenta: AccountType;
}

/** Tipos de cuenta disponibles para la suscripción por chofer. */
export type AccountType = 'VIP_GRATIS' | 'VIP_PAGO';

/** Valores por defecto de los ajustes (modo demo / inicial). */
export const DEFAULT_SETTINGS: Settings = {
  cost_per_km: 120,
  currency: 'ARS',
  current_odometer_km: 45000,
  oil_change_interval_km: 10000,
  last_oil_change_km: 42000,
  brake_interval_km: 30000,
  last_brake_change_km: 25000,
  wear_cost_per_km: 20,
  driver_name: 'Conductor',
  driver_phone: '',
  driver_slug: '',
  profile_complete: false,
  // Vencimientos de ejemplo (relativos a "hoy" para demo).
  vtv_expiry: isoDaysFromNow(40),
  license_expiry: isoDaysFromNow(75),
  insurance_expiry: isoDaysFromNow(12),
  // Toda cuenta nueva arranca en modo gratuito.
  tipo_cuenta: 'VIP_GRATIS',
};

/** Helper: fecha ISO (YYYY-MM-DD) a N días desde hoy. */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Categorías de gastos fijos mensuales. */
export type FixedCostCategory =
  | 'insurance'
  | 'patent'
  | 'garage'
  | 'phone'
  | 'other';

/** Un gasto fijo mensual (seguro, patente, cochera, celular, etc.). */
export interface FixedCost {
  id: string;
  category: FixedCostCategory;
  /** Etiqueta personalizada (ej. "Seguro integral"). */
  label: string;
  /** Monto mensual. */
  amount: number;
  /** true si el gasto está activo (se descuenta del balance). */
  active: boolean;
  created_at: string;
}

export const FIXED_COST_LABELS: Record<FixedCostCategory, string> = {
  insurance: 'Seguro',
  patent: 'Patente',
  garage: 'Cochera',
  phone: 'Celular',
  other: 'Otro',
};

/** Tipos de vencimientos documentales del vehículo/conductora. */
export type ExpiryKind = 'vtv' | 'license' | 'insurance';

/** Un vencimiento con fecha límite. */
export interface DocumentExpiry {
  id: string;
  kind: ExpiryKind;
  /** Fecha límite en ISO date (YYYY-MM-DD). */
  due_date: string;
  notes?: string | null;
}

export const EXPIRY_LABELS: Record<ExpiryKind, string> = {
  vtv: 'Revisión técnica (VTV/RTO)',
  license: 'Registro / Licencia',
  insurance: 'Póliza de seguro',
};

/** Dirección frecuente guardada por un pasajero (portal de reservas). */
export interface SavedAddress {
  id: string;
  /** Etiqueta: Casa, Trabajo, Otro. */
  label: string;
  address: string;
}
