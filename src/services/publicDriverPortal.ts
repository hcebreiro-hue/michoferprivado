import { apiPublica } from '../lib/api';

export interface PublicBusyInterval {
  start_at: string;
  end_at: string;
}

export interface PublicDriverPortal {
  driver_name: string;
  driver_phone: string;
  currency: string;
  cost_per_km: number;
  busy_intervals: PublicBusyInterval[];
}

function isPublicDriverPortal(value: unknown): value is PublicDriverPortal {
  if (!value || typeof value !== 'object') return false;
  const portal = value as Partial<PublicDriverPortal>;
  return (
    typeof portal.driver_name === 'string' &&
    typeof portal.driver_phone === 'string' &&
    typeof portal.currency === 'string' &&
    typeof portal.cost_per_km === 'number' &&
    Array.isArray(portal.busy_intervals) &&
    portal.busy_intervals.every(
      (interval) =>
        interval !== null &&
        typeof interval === 'object' &&
        typeof interval.start_at === 'string' &&
        typeof interval.end_at === 'string',
    )
  );
}

export async function getPublicDriverPortal(
  driverSlug: string,
): Promise<PublicDriverPortal | null> {
  // Solo horarios ocupados y contacto comercial: el servidor nunca devuelve datos del pasajero.
  const data = await apiPublica<unknown>(
    `/v1/portal/${encodeURIComponent(driverSlug.trim().toLowerCase())}`,
  );
  if (data === null) return null;
  if (!isPublicDriverPortal(data)) {
    throw new Error('La respuesta del portal público tiene un formato inválido.');
  }
  return data;
}
