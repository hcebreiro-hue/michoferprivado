import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CLAVES_PUBLICAS, FECHA_MINIMA, LICENCIA_EXIGIDA } from './config';
import {
  ESTADOS_QUE_CORTAN,
  falloDeRespuesta,
  leerEquipoId,
  topeVigente,
  type ResultadoActivacion,
} from './acciones';
import * as almacen from './almacen';
import { programarAvisosGracia } from './avisos';
import { evaluarAcceso, type EstadoAcceso } from './evaluar';
import * as servidor from './servidor';
import { verificarLicencia, verificarTope, type LicenciaPayload } from './verificar';

export type { ResultadoActivacion } from './acciones';

/** Cada cuánto se revalida contra el servidor mientras la app está abierta con internet. */
const REVALIDAR_CADA_MS = 6 * 3_600_000;

interface LicenciaContextValue {
  /** null mientras se lee el estado inicial. */
  acceso: EstadoAcceso | null;
  licencia: LicenciaPayload | null;
  equipoId: string | null;
  /** Pide licencia al servidor con el WhatsApp que escribió el chofer. */
  activar: (whatsapp: string) => Promise<ResultadoActivacion>;
  /** Revalida en silencio con el WhatsApp guardado (si hay conexión). */
  refrescar: () => Promise<void>;
}

const LicenciaContext = createContext<LicenciaContextValue | undefined>(undefined);

export function LicenciaProvider({ children }: { children: React.ReactNode }) {
  const [acceso, setAcceso] = useState<EstadoAcceso | null>(null);
  const [licencia, setLicencia] = useState<LicenciaPayload | null>(null);
  // El ID del equipo no cambia mientras la app vive: se lee una sola vez.
  const [equipoId] = useState<string | null>(leerEquipoId);
  const ultimoRefresco = useRef(0);

  /** Recalcula el acceso con lo que hay guardado. No toca la red. */
  const recalcular = useCallback(async () => {
    const ahora = Date.now();
    const token = await almacen.leerToken();
    const verificada = token ? verificarLicencia(token, CLAVES_PUBLICAS) : null;
    const resultado = evaluarAcceso({
      licencia: verificada,
      equipoId,
      ahora,
      ultimaVista: await almacen.leerUltimaVista(),
      tope: await topeVigente(),
      fechaMinima: FECHA_MINIMA,
    });
    // Solo se avanza la "última vista" si el reloj es creíble: si no, un reloj
    // adelantado por error dejaría al chofer bloqueado para siempre.
    if (resultado.tipo !== 'reloj') await almacen.guardarUltimaVista(ahora);
    if (verificada && (resultado.tipo === 'activa' || resultado.tipo === 'gracia')) {
      void programarAvisosGracia(verificada, ahora);
    }
    setLicencia(verificada);
    setAcceso(resultado);
  }, [equipoId]);

  /** Guarda el tope remoto firmado (opcional: sin red rige el grabado). */
  const traerTope = useCallback(async () => {
    try {
      const t = await servidor.pedirTope();
      if (t && verificarTope(t, CLAVES_PUBLICAS)) await almacen.guardarTope(t);
    } catch {
      /* sin red */
    }
  }, []);

  const procesarRespuesta = useCallback(
    async (r: servidor.RespuestaActivar): Promise<ResultadoActivacion> => {
      if (r.tope_hasta) await traerTope();
      if (r.estado !== 'ok' || !r.licencia) return falloDeRespuesta(r);

      const verificada = verificarLicencia(r.licencia, CLAVES_PUBLICAS);
      if (!verificada) {
        return { ok: false, motivo: 'firma', mensaje: 'La licencia recibida no es válida. Avisale al soporte.' };
      }
      if (verificada.equipo !== equipoId) {
        return { ok: false, motivo: 'equipo', mensaje: 'La licencia recibida es de otro equipo.' };
      }
      await almacen.guardarToken(r.licencia);
      await recalcular();
      return { ok: true };
    },
    [recalcular, traerTope, equipoId],
  );

  const activar = useCallback(
    async (whatsapp: string): Promise<ResultadoActivacion> => {
      if (!equipoId) return { ok: false, motivo: 'equipo', mensaje: 'No se pudo identificar este teléfono.' };
      try {
        const r = await servidor.activar(whatsapp, equipoId);
        if (r.estado === 'ok') await almacen.guardarWhatsapp(whatsapp);
        return await procesarRespuesta(r);
      } catch (causa) {
        return { ok: false, motivo: 'red', mensaje: causa instanceof Error ? causa.message : 'No hay conexión.' };
      }
    },
    [procesarRespuesta, equipoId],
  );

  const refrescar = useCallback(async () => {
    const whatsapp = await almacen.leerWhatsapp();
    if (!whatsapp || !equipoId) return;
    ultimoRefresco.current = Date.now();
    try {
      const r = await servidor.activar(whatsapp, equipoId);
      await procesarRespuesta(r);
      // Bloqueado, dado de baja o reemplazado por otro teléfono: se corta en este chequeo.
      if (ESTADOS_QUE_CORTAN.includes(r.estado)) {
        await almacen.borrarToken();
        await recalcular();
      }
    } catch {
      /* sin conexión: rige lo guardado hasta que se agote la ventana offline */
    }
  }, [procesarRespuesta, recalcular, equipoId]);

  useEffect(() => {
    if (!LICENCIA_EXIGIDA) return;
    let activo = true;
    // Carga inicial: leer lo guardado y, si hay conexión, revalidar con el servidor.
    (async () => {
      await recalcular();
      if (activo) await refrescar();
    })();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active' || !activo) return;
      void recalcular();
      if (Date.now() - ultimoRefresco.current > REVALIDAR_CADA_MS) void refrescar();
    });
    return () => {
      activo = false;
      sub.remove();
    };
  }, [recalcular, refrescar]);

  const libre: EstadoAcceso = { tipo: 'activa', diasRestantes: null, porVencer: false };
  const valor: LicenciaContextValue = {
    acceso: LICENCIA_EXIGIDA ? acceso : libre,
    licencia,
    equipoId,
    activar,
    refrescar,
  };

  return <LicenciaContext.Provider value={valor}>{children}</LicenciaContext.Provider>;
}

export function useLicencia(): LicenciaContextValue {
  const ctx = useContext(LicenciaContext);
  if (!ctx) throw new Error('useLicencia debe usarse dentro de LicenciaProvider');
  return ctx;
}
