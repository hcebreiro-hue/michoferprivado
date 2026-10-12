import type { Trip, FuelLog, MaintenanceLog, FixedCost, SavedAddress } from '../types';

/** Helpers para construir fechas relativas a "hoy" en el modo demo. */
function isoAt(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * Datos de ejemplo para el modo demo. Se generan de forma relativa a la fecha
 * actual para que el dashboard siempre muestre viajes próximos y ganancias.
 */
export function seedTrips(): Trip[] {
  return [
    {
      id: 'seed-trip-1',
      client_name: 'María González',
      client_phone: '+5491122334455',
      origin: 'Palermo',
      destination: 'Aeropuerto Ezeiza',
      scheduled_at: isoAt(0, 9, 30),
      price: 15000,
      distance_km: 38,
      status: 'pending',
      notes: 'Vuelo internacional, llegar 1h antes.',
      created_at: isoDaysAgo(3),
    },
    {
      id: 'seed-trip-2',
      client_name: 'Carlos Ramírez',
      client_phone: '+5491155667788',
      origin: 'Recoleta',
      destination: 'Centro',
      scheduled_at: isoAt(0, 14, 0),
      price: 4500,
      distance_km: 12,
      status: 'pending',
      notes: null,
      created_at: isoDaysAgo(2),
    },
    {
      id: 'seed-trip-3',
      client_name: 'Lucía Fernández',
      client_phone: '+5491199887766',
      origin: 'Belgrano',
      destination: 'Puerto Madero',
      scheduled_at: isoAt(1, 18, 30),
      price: 6200,
      distance_km: 15,
      status: 'pending',
      notes: 'Cena de trabajo.',
      created_at: isoDaysAgo(1),
    },
    {
      id: 'seed-trip-4',
      client_name: 'Jorge Molina',
      client_phone: '+5491144556677',
      origin: 'Caballito',
      destination: 'Tribunales',
      scheduled_at: isoAt(2, 8, 0),
      price: 3800,
      distance_km: 10,
      status: 'pending',
      notes: null,
      created_at: isoDaysAgo(4),
    },
    {
      id: 'seed-trip-5',
      client_name: 'Ana Torres',
      client_phone: '+5491177889900',
      origin: 'Villa Urquiza',
      destination: 'Shopping Dot',
      scheduled_at: isoDaysAgo(1, 11),
      price: 5200,
      distance_km: 14,
      status: 'completed',
      notes: null,
      created_at: isoDaysAgo(5),
    },
    {
      id: 'seed-trip-6',
      client_name: 'Pedro Sánchez',
      client_phone: '+5491133221100',
      origin: 'San Telmo',
      destination: 'La Boca',
      scheduled_at: isoDaysAgo(3, 20),
      price: 2900,
      distance_km: 8,
      status: 'completed',
      notes: null,
      created_at: isoDaysAgo(6),
    },
    {
      id: 'seed-trip-7',
      client_name: 'Sofía Lima',
      client_phone: '+5491166554433',
      origin: 'Almagro',
      destination: 'Abasto',
      scheduled_at: isoDaysAgo(8, 13),
      price: 3400,
      distance_km: 11,
      status: 'completed',
      notes: null,
      created_at: isoDaysAgo(10),
    },
    {
      id: 'seed-trip-8',
      client_name: 'Diego Castro',
      client_phone: '+5491188776655',
      origin: 'Núñez',
      destination: 'Retiro',
      scheduled_at: isoDaysAgo(12, 7),
      price: 4100,
      status: 'cancelled',
      notes: 'Cliente canceló.',
      created_at: isoDaysAgo(14),
    },
  ];
}

export function seedFuelLogs(): FuelLog[] {
  return [
    {
      id: 'seed-fuel-1',
      filled_at: isoDaysAgo(2, 9),
      odometer_km: 44800,
      liters: 42,
      cost_per_liter: 950,
      total_cost: 39900,
      created_at: isoDaysAgo(2),
    },
    {
      id: 'seed-fuel-2',
      filled_at: isoDaysAgo(16, 18),
      odometer_km: 43000,
      liters: 45,
      cost_per_liter: 920,
      total_cost: 41400,
      created_at: isoDaysAgo(16),
    },
    {
      id: 'seed-fuel-3',
      filled_at: isoDaysAgo(40, 20),
      odometer_km: 40500,
      liters: 40,
      cost_per_liter: 900,
      total_cost: 36000,
      created_at: isoDaysAgo(40),
    },
  ];
}

export function seedMaintenanceLogs(): MaintenanceLog[] {
  return [
    {
      id: 'seed-maint-1',
      type: 'oil',
      performed_at: isoDaysAgo(20, 10),
      odometer_km: 42000,
      cost: 28000,
      notes: 'Cambio de aceite y filtro.',
      created_at: isoDaysAgo(20),
    },
    {
      id: 'seed-maint-2',
      type: 'brake_pads',
      performed_at: isoDaysAgo(90, 11),
      odometer_km: 25000,
      cost: 65000,
      notes: 'Pastillas delanteras.',
      created_at: isoDaysAgo(90),
    },
  ];
}

export function seedFixedCosts(): FixedCost[] {
  return [
    {
      id: 'seed-fixed-1',
      category: 'insurance',
      label: 'Seguro integral',
      amount: 45000,
      active: true,
      created_at: isoDaysAgo(30),
    },
    {
      id: 'seed-fixed-2',
      category: 'patent',
      label: 'Patente municipal',
      amount: 8000,
      active: true,
      created_at: isoDaysAgo(30),
    },
    {
      id: 'seed-fixed-3',
      category: 'garage',
      label: 'Cochera',
      amount: 30000,
      active: true,
      created_at: isoDaysAgo(30),
    },
    {
      id: 'seed-fixed-4',
      category: 'phone',
      label: 'Abono de celular',
      amount: 12000,
      active: true,
      created_at: isoDaysAgo(30),
    },
  ];
}

/** Excluye únicamente los registros generados para el modo demo. */
export function withoutDemoSeedRecords<T extends { id: string }>(
  records: T[],
): T[] {
  return records.filter((record) => !record.id.startsWith('seed-'));
}

export function seedSavedAddresses(): SavedAddress[] {
  return [
    { id: 'addr-1', label: 'Casa', address: 'Av. Siempreviva 742' },
    { id: 'addr-2', label: 'Trabajo', address: 'Oficina Centro, Ayacucho 1200' },
  ];
}
