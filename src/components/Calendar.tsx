import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Trip } from '../../src/types';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface CalendarProps {
  trips: Trip[];
  selectedDate: string | null; // "YYYY-MM-DD"
  onSelectDate: (date: string | null) => void;
}

/** Convierte un Date a clave "YYYY-MM-DD" en horario local. */
function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Cuenta viajes por día (excluyendo cancelados). */
function tripsByDay(trips: Trip[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of trips) {
    if (t.status === 'cancelled') continue;
    const key = toDateKey(new Date(t.scheduled_at));
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

/** Calendario mensual simple con puntos indicadores de viajes. */
export function Calendar({ trips, selectedDate, onSelectDate }: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const counts = useMemo(() => tripsByDay(trips), [trips]);
  const todayKey = toDateKey(today);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  // Construye la grilla del mes (con espacios iniciales para el primer día).
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=dom
  const leadingBlanks = (firstDay + 6) % 7; // queremos que la semana empiece lunes
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthKeyStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100">
      {/* Cabecera mes */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          // @ts-ignore
          className="p-2 rounded-lg active:bg-slate-100"
          onPress={() => changeMonth(-1)}
        >
          <Text className="text-lg text-slate-600">‹</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <Pressable
          // @ts-ignore
          className="p-2 rounded-lg active:bg-slate-100"
          onPress={() => changeMonth(1)}
        >
          <Text className="text-lg text-slate-600">›</Text>
        </Pressable>
      </View>

      {/* Días de la semana */}
      <View className="flex-row mb-2">
        {WEEKDAYS.map((d, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-xs font-semibold text-slate-400">{d}</Text>
          </View>
        ))}
      </View>

      {/* Grilla de días */}
      <View className="flex-row flex-wrap">
        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`b-${idx}`} className="w-[14.28%] h-11" />;
          }
          const key = `${monthKeyStr}-${String(day).padStart(2, '0')}`;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const count = counts[key] ?? 0;

          return (
            <View key={key} className="w-[14.28%] h-11 items-center justify-center">
              <Pressable
                // @ts-ignore
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  isSelected
                    ? 'bg-brand-600'
                    : isToday
                      ? 'bg-brand-50'
                      : ''
                }`}
                onPress={() => onSelectDate(isSelected ? null : key)}
              >
                <Text
                  // @ts-ignore
                  className={`text-sm font-medium ${
                    isSelected
                      ? 'text-white'
                      : isToday
                        ? 'text-brand-700'
                        : 'text-slate-700'
                  }`}
                >
                  {day}
                </Text>
                {count > 0 ? (
                  <View
                    // @ts-ignore
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-brand-500'
                    }`}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {selectedDate ? (
        <Pressable
          // @ts-ignore
          className="mt-3 self-start"
          onPress={() => onSelectDate(null)}
        >
          <Text className="text-sm font-semibold text-brand-600">
            Ver todos los viajes
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
