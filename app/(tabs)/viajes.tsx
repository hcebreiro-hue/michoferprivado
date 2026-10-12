import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Calendar } from '../../src/components/Calendar';
import { TripCard } from '../../src/components/TripCard';
import { TripFormModal } from '../../src/components/TripFormModal';
import { EmptyState, Button } from '../../src/components/ui';
import { useData } from '../../src/context/DataContext';
import type { Trip } from '../../src/types';

type Filter = 'all' | 'pending' | 'completed' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'completed', label: 'Completados' },
  { key: 'cancelled', label: 'Cancelados' },
];

/** Convierte "YYYY-MM-DD" a clave local comparable. */
function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ViajesScreen() {
  const { trips, loading, refresh, updateTrip, removeTrip } = useData();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);

  const filtered = useMemo(() => {
    let list = [...trips].sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime(),
    );
    if (filter !== 'all') list = list.filter((t) => t.status === filter);
    if (selectedDate)
      list = list.filter((t) => dateKeyOf(t.scheduled_at) === selectedDate);
    return list;
  }, [trips, filter, selectedDate]);

  const openNew = () => {
    setEditing(null);
    setFormVisible(true);
  };
  const openEdit = (trip: Trip) => {
    setEditing(trip);
    setFormVisible(true);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Viajes y Clientes"
        subtitle={`${trips.length} viajes registrados`}
        right={
          <Pressable
            // @ts-ignore
            className="bg-brand-600 w-10 h-10 rounded-full items-center justify-center active:bg-brand-700"
            onPress={openNew}
            accessibilityLabel="Nuevo viaje"
          >
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Calendario */}
        <View className="mt-4">
          <Calendar
            trips={trips}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          <View className="flex-row gap-2">
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                // @ts-ignore
                className={`px-4 py-2 rounded-full border ${
                  filter === f.key
                    ? 'bg-brand-600 border-brand-600'
                    : 'bg-white border-slate-200'
                }`}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  // @ts-ignore
                  className={`text-sm font-semibold ${
                    filter === f.key ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Lista de viajes */}
        <View className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              title="Sin viajes"
              message="No hay viajes que coincidan con el filtro seleccionado."
              icon={<Ionicons name="calendar-outline" size={40} color="#cbd5e1" />}
            />
          ) : (
            filtered.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => openEdit(trip)}
                onComplete={() => updateTrip(trip.id, { status: 'completed' })}
                onCancel={() => updateTrip(trip.id, { status: 'cancelled' })}
                onDelete={() => removeTrip(trip.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Botón flotante para nuevo viaje */}
      <View className="absolute bottom-5 right-5">
        <Button
          title="Nuevo"
          onPress={openNew}
          icon={<Ionicons name="add" size={20} color="#fff" />}
          size="lg"
        />
      </View>

      <TripFormModal
        visible={formVisible}
        trip={editing}
        onClose={() => setFormVisible(false)}
      />
    </SafeAreaView>
  );
}
