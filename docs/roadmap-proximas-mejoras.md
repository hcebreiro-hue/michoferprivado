# Roadmap — Próximas mejoras

> Contexto: **Expo SDK 57** (`expo ~57.0.27`), React Native 0.86.3, plan **Free** de EAS.
> Verificado contra la doc oficial de Expo (septiembre 2026).

## ⚡ Optimización clave: UN solo build para los 3 puntos nativos

Los puntos **1 (EAS Update)**, **2 (EAS Observe)** y **4 (Notificaciones)** agregan
código **nativo** → cada uno requeriría recompilar el APK. Para no gastar builds
(15/mes gratis), se instalan las 3 librerías juntas y se compila **un único APK**
con todo incluido. Después, los cambios de JS/pantallas (punto 3, fixes) se
reparten por **EAS Update sin recompilar**.

**Librerías nativas a instalar juntas el día 1:**
```
npx expo install expo-updates expo-observe expo-notifications
```

---

## 1. Auto-actualización (EAS Update) — gratis hasta 1.000 MAU

- [ ] `npx expo install expo-updates`
- [ ] `eas update:configure` (crea los canales en `eas.json`; en SDK 57 guía la config)
- [ ] Runtime version: policy recomendado **`fingerprint`** (recalcula solo cuando
      cambia lo nativo). *Confirmar el JSON exacto que genera el comando.*
- [ ] **Build inicial** del APK con las 3 librerías nativas → rama `preview`
- [ ] Probar un update de prueba:
      `eas update --channel <canal> --message "prueba"`
- [ ] Documentar el flujo: build = cambios nativos; update = cambios JS/assets

**Notas:**
- El APK de los amigos arranca con el build base; los updates bajan solos al abrir.
- Cambios nativos futuros (ej. nueva lib) → rebuild. El resto → update.

---

## 2. Reporte de errores (EAS Observe) — incluido gratis, NO hace falta Sentry

En SDK 57 Observe registra **errores JS + crashes nativos** (está en preview, sep-2026).

- [ ] `npx expo install expo-observe`
- [ ] En `app/_layout.tsx`: envolver con `ObserveRoot.wrap(RootLayout)`
- [ ] Llamar `markInteractive()` cuando termina la carga inicial
      (hoy: cuando `settingsLoading` deja de ser true / se oculta el splash)
- [ ] `eas.json`: `"uploadSourceMaps": true` en el build profile (stack traces legibles)
- [ ] Build y revisar **Observe → Errors** en el dashboard
      (crash-free sessions, errores distintos, sesiones afectadas)

**Limitaciones honestas (al sep-2026):**
- Symbolication de crashes nativos: pendiente.
- Source maps para updates OTA: pendiente (los errores de un update muestran el
  stack del bundle minificado). Los de builds normales sí se simbolizan.

**Decisión:** usar **Observe** en lugar de Sentry → incluido en el plan Free y
suficiente para escala de amigos. (Sentry queda descartado salvo que se necesite
source mapping de updates más adelante.)

---

## 3. Control de cobranza — feature interna (no requiere rebuild nativo)

El más valioso para los choferes. No toca APIs nativas → llega por EAS Update.

- [ ] Tipo `Trip`: agregar estado de cobro
      (`payment_status: 'pendiente' | 'cobrado' | 'parcial'`) y monto
      (`amount_paid`, opcional)
- [ ] `TripFormModal` + `TripCard`: marcar/ver el cobro
- [ ] UI "cuánto me deben" en Inicio/Reportes (suma de pendientes/parciales del mes)
- [ ] Persistencia:
  - Local (`trips`): campo nuevo (compatible con datos viejos)
  - Supabase: `ALTER TABLE trips ADD COLUMN ...` (migración idempotente en schema.sql)
- [ ] Migración de datos existentes: los viajes completados sin campo → `pendiente`

---

## 4. Recordatorios de viajes (expo-notifications) — requiere rebuild nativo

Notificaciones **locales** (no push). Funcionan en el APK.

- [ ] `npx expo install expo-notifications`
- [ ] Config plugin en `app.json` (permiso, color, icono de notificación)
- [ ] Al crear/editar un viaje: `scheduleNotificationAsync` X tiempo antes
      (ej. 1 h antes de `scheduled_at`)
- [ ] Al eliminar/reprogramar/cancelar un viaje: cancelar su notificación
- [ ] Pedir permiso con `requestPermissionsAsync` (con explicación amable)

**Notas:**
- Notificaciones locales SÍ funcionan en Expo Go; push remoto NO (no lo necesitamos).
- Es nativa → va en el build inicial junto con puntos 1 y 2.

---

## Orden recomendado (día 1)

1. Instalar las 3 libs nativas juntas: `expo-updates expo-observe expo-notifications`
2. Configurar `eas.json` (canales + `uploadSourceMaps`) y `app.json` (notifications)
3. Implementar Observe en `_layout.tsx` y el scheduling de notificaciones
4. **Compilar UN APK** con todo → probar en un celular
5. A partir de ahí: cobranza + fixes por **EAS Update** (sin rebuild)

## Costos

| Servicio | Plan Free | ¿Alcanza? |
|---|---|---|
| EAS Update | Gratis hasta 1.000 MAU | ✅ |
| EAS Observe (errores+performance) | Gratis (7 días logs) | ✅ |
| EAS Build | 15 builds/mes | ✅ |

> Todo esto sale **$0** para el caso de distribución entre amigos.
