# Senda

Aplicación móvil para choferes de viajes privados (por recomendación directa):
agenda, tarifas, control del auto y reportes. Construida con **Expo (React
Native)**, **TypeScript** y **NativeWind (Tailwind CSS)**. Los datos viven en el
teléfono hasta que el chofer empieza de verdad; entonces se guardan en la nube,
en el servidor propio de Senda (**Cloudflare Worker + D1**, repo
`~/Desarrollos/senda-api`, `https://senda.api.unitecapplications.com`).

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
6. **Agenda web pública** — un enlace que el chofer comparte por WhatsApp y que
   muestra sus horarios libres y ocupados, sin datos de pasajeros.

## 🧱 Stack y versiones

| Tecnología   | Versión |
|--------------|---------|
| Expo SDK     | 57      |
| React Native | 0.86    |
| React        | 19.2    |
| NativeWind   | 4.2.7   |
| Tailwind     | 3.4.17  |
| TypeScript   | 6.0     |
| Servidor     | Cloudflare Workers + D1 (Hono), repo `senda-api` |

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

> En desarrollo (`__DEV__`) y en la web la **licencia no se exige**: la app abre
> directo con datos de ejemplo guardados en el teléfono (AsyncStorage). Para
> probar el bloqueo en desarrollo: `EXPO_PUBLIC_LICENCIA_FORZAR=1 npx expo start`.
> El APK de release sí exige licencia (ver
> [`docs/licencias-y-acceso.md`](./docs/licencias-y-acceso.md)).

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

### 3. Servidor

La app ya apunta al servidor de producción (`URL_SERVIDOR` en
`src/licencia/config.ts`). **No hay que configurar credenciales**: la app no
lleva ninguna clave secreta, solo la clave pública que verifica las licencias.

Para desarrollar contra otro servidor (por ejemplo `wrangler dev` en el repo
`senda-api`), copiá `.env.example` a `.env` y descomentá:

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8787
```

### 4. Cómo se identifica el chofer

El chofer **nunca crea una cuenta ni escribe una contraseña**. Escribe su número
de WhatsApp al abrir la app; el servidor (que tiene la lista de choferes
autorizados) le entrega una **licencia firmada** y, cuando termina la prueba con
datos de ejemplo («Borrar datos de prueba y empezar»), una **sesión** para
guardar sus datos en la nube. Lo que cargó en el teléfono se sube solo
(`src/services/migrateLocalToCloud.ts`), sin los datos de ejemplo. Si el dueño
lo bloquea, la app muestra «Tu acceso está suspendido». Detalle completo en
[`docs/licencias-y-acceso.md`](./docs/licencias-y-acceso.md).

El enlace público usa `/reservas?driver=<slug>`; el portal expone únicamente
nombre, teléfono, tarifa por km y franjas ocupadas.

## 💳 Tipo de cuenta por chofer

Cada chofer arranca en **modo gratuito** (`VIP_GRATIS`). El paso a **modo pago**
(`VIP_PAGO`) lo hace el dueño desde el **panel de administración**
(`https://senda.api.unitecapplications.com/admin`, requiere token) con la
operación «tipo de cuenta». Mientras `MONETIZACION_ACTIVADA` sea `false` (valor
actual en `app/_layout.tsx`), la app funciona libre sin importar el tipo de
cuenta. El cambio aplica cuando la app vuelve a leer los ajustes.

## 🗂️ Estructura del proyecto

```
app/                     # Navegación (expo-router)
  _layout.tsx            # Providers globales (Licencia + Settings + Data)
  onboarding.tsx         # Alta única de nombre y teléfono del chofer
  tarifas.tsx            # Edición separada de tarifas
  acerca-de.tsx          # Datos de contacto de Unitec Applications
  reservas.tsx           # Agenda web pública
  (tabs)/                # Inicio, Viajes, Tarifas, Auto, Reportes
src/
  components/            # Componentes de dominio (TripCard, Calendar, modales)
    ui/                  # Componentes de UI reutilizables
  context/               # SettingsContext + DataContext (estado global)
  licencia/              # Activación, licencia firmada, sesión, pantallas de bloqueo
  services/              # Capa de datos (API de Senda ↔ AsyncStorage)
  lib/api.ts             # Cliente de la API (sesión, renovación, errores)
  utils/                 # Formato de moneda/fechas + cálculos
  types/                 # Tipos de dominio
scripts/probar-emulador.sh  # Compila e instala en el emulador Android
supabase/schema.sql      # HISTÓRICO: esquema de la base anterior (ya no se usa)
```

## 🧠 Decisiones de arquitectura

- **Capa de datos desacoplada:** cada `service` usa la API de Senda si hay
  sesión; si no, cae a un almacén local (datos de ejemplo o carga sin conexión).
- **Estado global con Context:** `DataContext` centraliza viajes, combustible y
  mantenimientos con funciones de refresco; `SettingsContext` gestiona la
  configuración (costo/km, intervalos de mantenimiento, moneda).
- **Separación por chofer en el servidor:** toda tabla lleva `owner_id` y cada
  consulta filtra por el chofer de la sesión. La sesión es un `access` de 1 hora
  y un `refresh` de 90 días que se rota en cada uso; cada pedido vuelve a mirar
  la licencia, así que **bloquear a un chofer corta el acceso al instante**.
- **Portal público de solo lectura:** `GET /v1/portal/:slug` devuelve datos
  mínimos (horarios ocupados), nunca información de pasajeros.

## 📜 Scripts útiles

```bash
npm run typecheck   # Verifica tipos con tsc
npm run lint        # Lint con ESLint
npm test            # Tests de licencia, contactos y cliente de la API (node --test)
npm run build:web   # Genera dist/ con la agenda web
```

## 🌐 Publicar la web pública de reservas (Cloudflare Pages)

La agenda que compartís por WhatsApp es una web estática (proyecto Pages
`michoferprivado`, `https://michoferprivado.pages.dev`). **No lleva credenciales**:
consulta el servidor de Senda (`URL_SERVIDOR`), cuya ruta pública solo devuelve
horarios ocupados. Si la agenda dice *«No encontramos un chofer con ese
enlace»* o no marca horarios ocupados, casi siempre se publicó un build viejo.

1. Generá el build:

   ```bash
   npm run build:web           # genera dist/ con index.html y assets
   ```

2. Publicalo (requiere `wrangler login`):

   ```bash
   cd dist && npx wrangler pages deploy . --project-name=michoferprivado
   ```

   Alternativa: arrastrar la carpeta `dist/` en **Cloudflare Pages → Upload
   assets**. El build es de una sola página (`index.html`); como no hay
   un `404.html`, Cloudflare Pages la sirve para cualquier ruta (`/reservas`), sin
   necesidad de `_redirects`.

3. **Verificación rápida.** El bundle debe apuntar al servidor nuevo y no a
   Supabase. Desde la raíz del proyecto:

   ```bash
   grep -l 'senda.api.unitecapplications.com' dist/_expo/static/js/web/*.js
   grep -il 'supabase' dist/_expo/static/js/web/*.js   # no debe listar nada
   ```

   Luego abrí `https://michoferprivado.pages.dev/reservas?driver=<slug>`: debe
   mostrar el nombre del chofer y marcar como **Ocupado** los horarios con
   viajes. La agenda se refresca sola cada minuto.

> **Slug del chofer:** lo genera el servidor (`<nombre>-<id aleatorio>`). Copiá
> el enlace exacto que muestra la app en el Dashboard; no inventes un slug a mano
> o el portal dirá *«No encontramos un chofer con ese enlace»*.

---

Hecho con 💙 por Unitec Applications.
