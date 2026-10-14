import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { isCalendarBlock } from '../types';
import { clientesFrecuentes, filtrarClientes, type ClienteElegible } from '../contactos/logica';
import { useContactos } from '../contactos/useContactos';

export type OrigenCliente = 'contactos' | 'frecuentes';

interface ElegirClienteModalProps {
  visible: boolean;
  origen: OrigenCliente;
  onClose: () => void;
  onElegir: (cliente: { nombre: string; telefono: string }) => void;
}

const LIMITE_FRECUENTES = 15;

/**
 * Lista corta para elegir al cliente de un viaje: o bien los contactos del
 * teléfono (con buscador) o bien los clientes frecuentes (sacados de los viajes
 * ya cargados). De los contactos solo se guarda el que el chofer elige.
 */
export function ElegirClienteModal({ visible, origen, onClose, onElegir }: ElegirClienteModalProps) {
  if (!visible) return null;
  return <Contenido origen={origen} onClose={onClose} onElegir={onElegir} />;
}

function Contenido({ origen, onClose, onElegir }: Omit<ElegirClienteModalProps, 'visible'>) {
  const { trips } = useData();
  const [consulta, setConsulta] = useState('');
  const esContactos = origen === 'contactos';
  const contactos = useContactos(esContactos, consulta);

  const frecuentes = useMemo(() => clientesFrecuentes(trips.filter((t) => !isCalendarBlock(t)), 50), [trips]);

  const hayConsulta = consulta.trim().length > 0;
  const filas: ClienteElegible[] = esContactos
    ? contactos.tipo === 'listo'
      ? contactos.lista
      : []
    : filtrarClientes(frecuentes, consulta).slice(0, hayConsulta ? 50 : LIMITE_FRECUENTES);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="h-[80%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text className="text-xl font-bold text-slate-900">
              {esContactos ? 'Elegir de mis contactos' : 'Clientes frecuentes'}
            </Text>
            <Pressable onPress={onClose} className="p-1" accessibilityRole="button" accessibilityLabel="Cerrar lista">
              <Ionicons name="close" size={26} color="#64748b" />
            </Pressable>
          </View>

          <View className="px-5 pt-3">
            <TextInput
              value={consulta}
              onChangeText={setConsulta}
              placeholder={esContactos ? 'Buscar por nombre' : 'Buscar por nombre o teléfono'}
              placeholderTextColor="#94a3b8"
              autoCorrect={false}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
          </View>

          {esContactos && contactos.tipo === 'sin_permiso' ? (
            <Aviso
              texto="Para elegir de tus contactos, la app necesita permiso para leerlos. Solo se guarda el contacto que elijas."
              boton={contactos.puedePreguntar ? undefined : 'Abrir ajustes'}
              onBoton={() => Linking.openSettings().catch(() => undefined)}
            />
          ) : esContactos && contactos.tipo === 'error' ? (
            <Aviso texto="No se pudieron leer los contactos. Probá de nuevo o escribí el nombre a mano." />
          ) : esContactos && contactos.tipo === 'cargando' ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : filas.length === 0 ? (
            <Aviso texto={textoVacio(esContactos, hayConsulta)} />
          ) : (
            <FlatList
              data={filas}
              keyExtractor={(c, i) => `${c.nombre}|${c.telefono}|${i}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
              renderItem={({ item }) => <Fila cliente={item} onElegir={onElegir} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function textoVacio(esContactos: boolean, hayConsulta: boolean): string {
  if (esContactos) {
    return hayConsulta
      ? 'No hay contactos con ese nombre (o no tienen teléfono).'
      : 'No se encontraron contactos con teléfono.';
  }
  return hayConsulta
    ? 'Ningún cliente frecuente coincide con la búsqueda.'
    : 'Todavía no hay clientes frecuentes. Se arman solos con los viajes que vayas cargando.';
}

function Fila({ cliente, onElegir }: { cliente: ClienteElegible; onElegir: ElegirClienteModalProps['onElegir'] }) {
  return (
    <Pressable
      onPress={() => onElegir({ nombre: cliente.nombre, telefono: cliente.telefono })}
      accessibilityRole="button"
      accessibilityLabel={`Elegir a ${cliente.nombre}`}
      className="flex-row items-center border-b border-slate-100 py-3 active:bg-slate-50"
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <Ionicons name="person" size={20} color="#2563eb" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900">{cliente.nombre}</Text>
        <Text className="text-xs text-slate-500">
          {[cliente.telefono, cliente.detalle].filter(Boolean).join(' · ') || 'Sin teléfono'}
        </Text>
      </View>
    </Pressable>
  );
}

function Aviso({ texto, boton, onBoton }: { texto: string; boton?: string; onBoton?: () => void }) {
  return (
    <View className="items-center px-5 py-8">
      <Text className="text-center text-sm text-slate-500">{texto}</Text>
      {boton && onBoton ? (
        <Pressable onPress={onBoton} className="mt-4 rounded-xl bg-brand-600 px-5 py-3 active:bg-brand-700">
          <Text className="text-sm font-bold text-white">{boton}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

