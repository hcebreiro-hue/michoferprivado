import { useEffect, useState } from 'react';
import { Contact, ContactField, ContactsSortOrder, requestPermissionsAsync } from 'expo-contacts';
import { telefonoDeContacto, type ClienteElegible } from './logica';

const CAMPOS = [ContactField.FULL_NAME, ContactField.PHONES] as const;

/** Cuántos contactos se piden por búsqueda: lista corta, se afina escribiendo. */
const LIMITE_CONTACTOS = 40;

export type EstadoContactos =
  | { tipo: 'cargando' }
  | { tipo: 'sin_permiso'; puedePreguntar: boolean }
  | { tipo: 'error' }
  | { tipo: 'listo'; lista: ClienteElegible[] };

/**
 * Lee los contactos del teléfono para elegir al cliente de un viaje.
 *
 *  - Pide el permiso de lectura recién cuando `activo` pasa a true (el chofer
 *    tocó "Contactos"); nunca al abrir la app.
 *  - Busca por nombre con una pausa corta mientras escribe y trae pocos
 *    resultados: no se carga la agenda entera.
 *  - Devuelve una fila por cada teléfono (un contacto con 2 números aparece 2
 *    veces, con la etiqueta "móvil", "casa", etc.).
 *  - No copia ni guarda nada: el llamador se queda solo con el que se elige.
 */
export function useContactos(activo: boolean, consulta: string): EstadoContactos {
  const [estado, setEstado] = useState<EstadoContactos>({ tipo: 'cargando' });
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    requestPermissionsAsync()
      .then((r) => {
        if (!vigente) return;
        if (r.granted) setPermitido(true);
        else setEstado({ tipo: 'sin_permiso', puedePreguntar: r.canAskAgain });
      })
      .catch(() => vigente && setEstado({ tipo: 'error' }));
    return () => {
      vigente = false;
    };
  }, [activo]);

  useEffect(() => {
    if (!activo || !permitido) return;
    let vigente = true;
    const espera = setTimeout(() => {
      Contact.getAllDetails(CAMPOS, {
        name: consulta.trim() || undefined,
        limit: LIMITE_CONTACTOS,
        sortOrder: ContactsSortOrder.GivenName,
      })
        .then((detalles) => {
          if (!vigente) return;
          const lista: ClienteElegible[] = [];
          for (const d of detalles) {
            const nombre = d.fullName?.trim();
            if (!nombre) continue;
            for (const tel of d.phones) {
              const numero = tel.number?.trim();
              if (!numero) continue;
              lista.push({ nombre, telefono: telefonoDeContacto(numero), detalle: tel.label || undefined });
            }
          }
          setEstado({ tipo: 'listo', lista });
        })
        .catch(() => vigente && setEstado({ tipo: 'error' }));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [activo, permitido, consulta]);

  return estado;
}
