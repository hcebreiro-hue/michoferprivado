# Mi chofer privado Viajes 🚗

Aplicación móvil híbrida para la gestión de una conductora de viajes privados
(estilo Uber, pero por recomendación directa). Construida con **Expo (React
Native)**, **TypeScript**, **NativeWind (Tailwind CSS)** y **Supabase**.

## ✨ Funcionalidades

1. **Inicio / Dashboard** — próximos viajes, ganancias de la semana y del día,
   y una alerta cuando el auto necesita mantenimiento.
2. **Viajes y Clientes** — calendario mensual interactivo + lista filtrable.
   Cada viaje permite **llamar por teléfono** o **enviar WhatsApp** con un toque.
3. **Calculadora y Tarifas** — calcula el precio de un viaje según los
   kilómetros y el costo por km configurable.
4. **Control del Auto** — registro de cargas de combustible (km, litros, costo),
   cálculo de rendimiento (km/L) y **barras de progreso** de mantenimiento
   (aceite y pastillas de freno).
5. **Reportes Financieros** — balance neto (ingresos − combustible −
   mantenimiento) agrupado por mes, con desglose visual.

## 🧱 Stack y versiones

| Tecnología | Versión |
|------------|---------|
| Expo SDK   | 57      |
| React Native | 0.86  |
| React      | 19.2    |
| NativeWind | 4.2.7   |
| Tailwind   | 3.4.17  |
| Supabase   | JS 2.117|
| TypeScript | 6.0     |

## 🚀 Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Ejecutar la app

```bash
npm start        # abre el panel de Expo
npm run android  # o npm run ios / npm run web
```

> La app funciona de inmediato en **modo demo** con datos de ejemplo
> almacenados localmente (AsyncStorage), sin necesidad de configurar Supabase.

> ⚠️ **Si cambias versiones de dependencias nativas** (reanimated, worklets,
> screens, etc.), recarga el proyecto **limpiando la caché de Metro** para
> evitar el pantallazo azul:
>
> ```bash
> npx expo start -c
> ```
>
> Y si usas un **development build** (no Expo Go), recuerda reconstruir la app
> nativa (`npx expo run:android` / `run:ios`) para que tome el nuevo código
> nativo. En **Expo Go**, cerrar y reabrir la app tras el `-c` suele bastar.


### 3. (Opcional) Conectar Supabase — capa gratuita

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecuta el archivo [`supabase/schema.sql`](./supabase/schema.sql).
   Si ya habías configurado Supabase, vuelve a ejecutarlo para agregar el indicador
   de perfil completo que usa el onboarding.
   La migración también protege nombre, teléfono y slug con un trigger de base
   de datos una vez que el perfil queda completo.
3. Copia `.env.example` a `.env` y completa tus credenciales:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

4. Habilita Email/Password en Authentication > Providers de Supabase.
5. Reinicia el servidor (`npm start`). La app solicitará iniciar sesión o
   crear una cuenta antes de abrir las pantallas privadas.
6. Al iniciar sesión por primera vez, completa el nombre y teléfono del chofer.
   Estos datos quedan fijos después del alta. Las tarifas por kilómetro y el
   costo de desgaste se editan por separado desde **Tarifas** y no reinician el
   historial. El enlace público usa `/reservas?driver=<slug>`; el portal expone
   únicamente nombre, teléfono, tarifa por km y franjas ocupadas.

Las tablas privadas aplican RLS por `auth.uid()`. Los datos históricos que
existían antes de activar esta migración conservan `owner_id = NULL` y no se
asignan automáticamente a ninguna cuenta. Así se evita que otra cuenta se
adjudique datos preexistentes. Si necesitas conservarlos, reemplaza el UUID y
el slug en el siguiente SQL y ejecútalo desde el SQL Editor después de crear la
cuenta propietaria:

```sql
update public.trips set owner_id = 'UUID-DEL-PROPIETARIO'
where owner_id is null;
update public.fuel_logs set owner_id = 'UUID-DEL-PROPIETARIO'
where owner_id is null;
update public.maintenance_logs set owner_id = 'UUID-DEL-PROPIETARIO'
where owner_id is null;
update public.fixed_costs set owner_id = 'UUID-DEL-PROPIETARIO'
where owner_id is null;

insert into public.driver_settings (
  owner_id, driver_slug, driver_name, driver_phone, cost_per_km, currency,
  current_odometer_km, oil_change_interval_km, last_oil_change_km,
  brake_interval_km, last_brake_change_km, wear_cost_per_km, vtv_expiry,
  license_expiry, insurance_expiry
)
select
  'UUID-DEL-PROPIETARIO', 'slug-publico', driver_name, driver_phone,
  cost_per_km, currency, current_odometer_km, oil_change_interval_km,
  last_oil_change_km, brake_interval_km, last_brake_change_km,
  wear_cost_per_km, vtv_expiry, license_expiry, insurance_expiry
from public.settings
where id = 1;
```

## 💳 Suscripción por chofer

Cada cuenta de chofer arranca automáticamente en **modo gratuito**
(`VIP_GRATIS`). El paso a **modo pago** (`VIP_PAGO`) se hace de forma manual
cambiando la columna `tipo_cuenta` en la tabla `driver_settings` de Supabase.
Mientras `MONETIZACION_ACTIVADA` sea `false` (valor actual en `app/_layout.tsx`),
la app funciona libre sin importar el tipo de cuenta.

Para activar el modo pago de un chofer:

1. Entrá a tu proyecto en [supabase.com](https://supabase.com) → **Table
   Editor** → tabla **`driver_settings`**.
2. Localizá la fila del chofer (columna `driver_slug` o `driver_name`).
3. Editá la columna **`tipo_cuenta`** y cambiala de `VIP_GRATIS` a `VIP_PAGO`.
4. Guardá. El cambio aplica al recargar la app.

> La columna `tipo_cuenta` se crea ejecutando [`supabase/schema.sql`](./supabase/schema.sql).
> Si tu base ya existía, el `ALTER ... ADD COLUMN IF NOT EXISTS` de la migración
> la agrega sin borrar datos y deja las cuentas actuales en `VIP_GRATIS`.

## 🗂️ Estructura del proyecto

```
app/                     # Navegación (expo-router)
  _layout.tsx            # Providers globales (Settings + Data)
  onboarding.tsx         # Alta única de nombre y teléfono del chofer
  tarifas.tsx            # Edición separada de tarifas
  (tabs)/
    index.tsx            # 1. Dashboard
    viajes.tsx           # 2. Viajes y Clientes
    calculadora.tsx      # 3. Calculadora y Tarifas
    auto.tsx             # 4. Control del Auto
    reportes.tsx         # 5. Reportes Financieros
src/
  components/            # Componentes de dominio (TripCard, Calendar, modales)
    ui/                  # Componentes de UI reutilizables
  context/               # SettingsContext + DataContext (estado global)
  services/              # Capa de datos (Supabase ↔ AsyncStorage)
  lib/supabase.ts        # Cliente Supabase + detección de configuración
  utils/                 # Formato de moneda/fechas + cálculos
  types/                 # Tipos de dominio
supabase/schema.sql      # DDL + RLS para Supabase
```

## 🧠 Decisiones de arquitectura

- **Capa de datos desacoplada:** cada `service` usa Supabase si hay
  credenciales; si no, cae a un almacén local (modo demo). Esto permite
  desarrollar y testear sin backend.
- **Estado global con Context:** `DataContext` centraliza viajes, combustible y
  mantenimientos con funciones de refresco; `SettingsContext` gestiona la
  configuración (costo/km, intervalos de mantenimiento, moneda).
- **Autenticación y separación por chofer:** Supabase Auth administra las
  sesiones; viajes, gastos y ajustes se limitan mediante RLS al usuario
  autenticado. El calendario público usa una función SQL de solo lectura que
  devuelve datos mínimos de reservas, nunca información de pasajeros.

## 📜 Scripts útiles

```bash
npm run typecheck   # Verifica tipos con tsc
npm run lint        # Lint con ESLint
```

## 🌐 Publicar la web pública de reservas (Cloudflare Pages)

La agenda que compartís por WhatsApp es una web estática. Para que muestre la
**disponibilidad real** de cada chofer, el build que subas debe incluir el
código del portal **y** las credenciales de Supabase. Si la web muestra el
error *"El portal público requiere conexión con Supabase"* o no marca ningún
horario ocupado, casi siempre es porque se desplegó un build viejo o sin las
credenciales.

Las credenciales viajan en **dos lugares** (redundancia a propósito): `app.json
→ extra` y `netlify.toml → [build.environment]`. La `anon key` es pública por
diseño (protegida por RLS), así que es seguro tenerla en el repo.

### Opción A — Subida directa del ZIP (recomendada, sin build)

Ideal para compartir el portal ya mismo, sin conectar Git:

1. Generá el build:

   ```bash
   npm run build:web           # genera dist/ con index.html y assets
   ```

2. El `dist/` resultante se sube tal cual a **Cloudflare Pages → Workers &
   Pages → Create → Pages → Upload assets**. Arrastrá la carpeta (o un `.zip`).

3. Netlify/Cloudflare leen el archivo `_redirects` / `_headers` si van dentro de
   la carpeta subida. Para SPA routing incluí un `_redirects` con
   `/*  /index.html  200` (Cloudflare Pages usa la misma sintaxis que Netlify).

   Alternativa por CLI (requiere `wrangler login`):

   ```bash
   cd dist && npx wrangler pages deploy . --project-name=michoferprivado
   ```

### Opción B — Deploy automático desde GitHub

Conectá el repo a **Cloudflare Pages → Create → Pages → Connect to Git** con:

- **Build command:** `npm run build:web`
- **Build output directory:** `dist`
- **Variables de entorno:** `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (o dejalas en `netlify.toml`).

### Verificación rápida

En el bundle generado debe aparecer el RPC. Desde la raíz del proyecto:

```bash
grep -rl get_public_driver_portal dist/_expo/static/js/web/
```

Si no aparece nada, el build salió sin el código del portal (revisá los pasos de
arriba). Cuando abras el enlace
`https://tu-dominio/reservas?driver=<slug>`, la página debe leer los viajes del
chofer desde Supabase y marcar como **Ocupado** los horarios ya cargados; la
agenda se refresca sola cada minuto.

> **Slug del chofer:** el enlace usa `settings.driver_slug`, que se genera como
> `<nombre>-<uuid-sin-guiones>` (ver `driverSlugFromName` en
> `src/services/settings.ts`). Copiá el enlace exacto que muestra la app en el
> Dashboard; no inventes un slug a mano o el portal dirá *"No encontramos un
> chofer con ese enlace"*.

---

Hecho con 💙 para Mi chofer privado.
