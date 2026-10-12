import type { Trip, Settings } from '../types';

/** Formatea un número como moneda usando el símbolo/código configurado. */
export function formatCurrency(value: number, settings: Pick<Settings, 'currency'>): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings.currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback si el código de moneda no es reconocido por Intl.
    return `${settings.currency} ${Math.round(value).toLocaleString('es-AR')}`;
  }
}

/** Formatea solo el número sin símbolo de moneda. */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('es-AR');
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEKDAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function parseLocalDate(iso: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!dateOnly) return new Date(iso);
  return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
}

/** Convierte una fecha al formato local AAAA-MM-DD sin desplazar el día por UTC. */
export function localDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Formatea una fecha ISO como "10 oct 2026". */
export function formatDate(iso: string): string {
  const d = parseLocalDate(iso);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** Formatea una fecha ISO como "14:30". */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Inicial del día de la semana (dom, lun, ...) para calendarios. */
export function weekdayInitial(iso: string): string {
  return WEEKDAYS_ES[parseLocalDate(iso).getDay()];
}

/** Día del mes (número) de una fecha ISO. */
export function dayOfMonth(iso: string): number {
  return parseLocalDate(iso).getDate();
}

/** Clave de mes "YYYY-MM" para agrupar reportes. */
export function monthKey(iso: string): string {
  const d = parseLocalDate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Etiqueta legible de un mes a partir de su clave "YYYY-MM". */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTHS_ES[Number(month) - 1]} ${year}`;
}

/** Devuelve true si el viaje está agendado para hoy o en el futuro. */
export function isUpcoming(trip: Trip): boolean {
  return trip.status !== 'cancelled' && new Date(trip.scheduled_at).getTime() >= startOfToday();
}

/** Timestamp del inicio del día de hoy (00:00). */
export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Timestamp del inicio de la semana actual (lunes 00:00). */
export function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day; // queremos que la semana empiece el lunes
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

/** Limpia un número de teléfono dejando solo dígitos y un + inicial opcional. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/** Días restantes hasta una fecha "YYYY-MM-DD" (negativo si ya pasó). */
export function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dateIso);
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 3600 * 1000));
}
