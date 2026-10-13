# Claudia_app — Licencias, acceso por invitación y datos personales

> **Solo documentación. No se escribió código.** Aplica a **Claudia_app / Mi Chofer Privado**
> (UNA app para todos los choferes, UN proyecto Supabase compartido). **No** aplica a las
> apps futuras de "una app por cliente" (médicos, veterinaria, etc.): esas se resuelven con
> el Gestor de Usuarios y otro modelo (ver `prompt-gestor-usuarios.md`).
>
> Estado: decisiones de negocio tomadas por Horacio (sección 1). Puntos abiertos en la
> sección 7. Lo técnico marcado "a confirmar" NO está verificado contra la doc vigente de
> Supabase/Expo y hay que verificarlo antes de implementar (regla del proyecto: no confiar
> en la memoria para APIs de Expo/Supabase).

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Registro | **Por invitación.** Sin registro abierto. |
| Antifraude | Cada código de invitación se emite **atado al WhatsApp del chofer** (la comunicación siempre es por WhatsApp, así que ese dato lo tiene el dueño). |
| Prueba (trial) | **30 días**, contados desde el alta de la cuenta, **en el servidor**. |
| Gracia | **3 avisos, uno cada 24 hs**, al vencer (ver 4). |
| Planes de pago | **Mensual y anual.** |
| VIP perpetuo | Choferes gratis de por vida: plan `vip`, sin vencimiento, revocable por el dueño. |
| Al vencer | El chofer **puede bajar sus datos** (ver 5). |
| Marco legal | **Ley 25.326** de Protección de Datos Personales (ver 6). |

## 2. Principio de diseño: la licencia es de la CUENTA, no del teléfono

Reinstalar el APK o cambiar el nombre no da otro trial, porque el trial se cuenta en el
servidor desde que se crea la cuenta, y las cuentas solo se crean con un código que emite el
dueño. **No se intenta impedir reinstalar el APK** (no es posible); se hace que reinstalar no
sirva de nada.

## 3. Registro por invitación

- La pantalla `app/auth.tsx` ya tiene "Crear cuenta" (`signUp`). Pasa a **exigir un código**.
- Tabla `invitaciones` (propuesta): `codigo` (único), `whatsapp`, `plan`
  (`trial`/`vip`/`pago_mensual`/`pago_anual`), `dias` (si aplica), `creada_en`,
  `usada_por` (uuid), `usada_en`. **Cada código sirve una sola vez.**
- Flujo: el dueño emite el código → lo manda por WhatsApp → el chofer se registra y lo
  pega → el servidor valida que exista y no esté usado, lo consume y crea la licencia.
- **La validación tiene que ser del lado del servidor.** La app usa la anon key pública; si
  el control estuviera solo en la pantalla, se saltearía llamando a la API directo. Hay dos
  caminos, **a confirmar en la doc vigente de Supabase**:
  1. Desactivar el registro público y crear cuentas solo desde una función de servidor
     (Edge Function) que valide el código.
  2. Mantener `signUp` y rechazar en el servidor si el código no es válido (hook/trigger
     previo a la creación del usuario).
- Antifraude humano: antes de emitir un código, el dueño busca el WhatsApp en `invitaciones`.
  Si ya tuvo uno, lo ve. (Verificación del dueño, no barrera técnica; alcanza a esta escala.)

## 4. Licencia, vencimiento y gracia

- Tabla `app_licencias` (propuesta; **no** `license_expiry`, que ya existe en el schema y es
  el **vencimiento del carnet del chofer**): `owner_id` (= `auth.uid()`), `plan`, `inicio`,
  `vence`, `estado`.
- Trial: al consumirse la invitación, `vence = alta + 30 días`.
- Mensual / anual: se renueva cambiando `vence` (calendario: +1 mes / +1 año, no 30/365 fijos).
  Al pagar por WhatsApp, el dueño actualiza la licencia y se activa en el acto.
- VIP: `vence` vacío. Revocable.
- **Gracia: 3 días, un aviso cada 24 hs (3 avisos)** → en la app (banner) y con notificación
  local (`expo-notifications` ya está instalado). Pasados los 3 días, la licencia queda
  **vencida**.
- **Supuesto a confirmar:** los 3 avisos son **después** del vencimiento y durante la gracia
  el chofer usa la app normal. Si Horacio los quería *antes* de vencer, o con escritura
  limitada en la gracia, hay que ajustarlo.
- Estados: `activa` → `gracia` (3 d) → `vencida` (solo lectura + descarga).

## 5. Al vencer: el chofer puede bajar sus datos

- **Lectura permitida siempre; escritura solo con licencia activa o en gracia.** Se aplica en
  el RLS de `trips`, `fuel_logs`, `maintenance_logs`, `fixed_costs`, etc. (el control está en
  el servidor, no se saltea modificando el APK).
- **Cómo baja los datos:** un botón **"Descargar mis datos"** que arma un archivo (CSV y/o
  JSON) con sus viajes, combustible, mantenimiento y costos, y lo entrega por el menú de
  compartir del sistema (WhatsApp, mail, Drive). Hoy la app **no tiene** exportación: hay que
  agregarla. Necesita librerías de archivos/compartir que **no están en `package.json`**;
  hay que instalarlas con `npx expo install` y verificar su API en la doc de Expo SDK 57. Si
  es código nativo, requiere un build nuevo.
- Se permite también con la licencia vencida (es el derecho de acceso, ver 6).

## 6. Ley 25.326 (Argentina) — Protección de Datos Personales

La app guarda **datos personales** (nombre, mail, teléfono, vencimientos de carnet y seguros,
viajes, direcciones guardadas) y datos de pasajeros en reservas. Puntos a resolver antes de
salir. *Esto es una guía técnica, no asesoramiento legal; con clientes reales, consultar a un
abogado.*

- **Consentimiento informado:** aceptación explícita de términos y política de privacidad al
  registrarse, que diga qué datos se guardan, para qué y quién los trata.
- **Finalidad:** usarlos solo para prestar el servicio. Si el dueño va a ver "quién usa la
  app" (actividad, vencimientos), **debe estar dicho en los términos.**
- **Derecho de acceso:** el chofer puede pedir y bajar sus datos (cubierto por la sección 5).
- **Rectificación y supresión:** poder corregir y **pedir la baja de la cuenta y sus datos**.
  Falta definir el procedimiento (ver 7).
- **Seguridad:** RLS por dueño ya existe; la `service_role` nunca va en el cliente.
- **Registro de la base de datos:** la ley prevé inscribir las bases de datos personales ante
  la autoridad (AAIP). **Verificar si corresponde** en este caso.
- **Transferencia internacional:** Supabase aloja los datos en una región elegida (puede ser
  fuera de Argentina). **Verificar región y requisitos.**
- **Datos de terceros (pasajeros):** la web de reservas recoge datos de personas que no son
  clientes de la app; incluir aviso y finalidad en ese formulario.

## 7. Puntos abiertos (necesitan decisión de Horacio)

1. **¿Se exige cuenta para usar la app?** Hoy NO: la app funciona sin cuenta, en modo local
   (ver 8). Si no se exige, el trial y el vencimiento no se pueden hacer cumplir.
2. **Convivencia con `tipo_cuenta` (`VIP_GRATIS` / `VIP_PAGO`)** y `MONETIZACION_ACTIVADA =
   false` ya existentes en `app/_layout.tsx` y `driver_settings`. ¿Se reemplazan por
   `app_licencias` o conviven? Propuesta: reemplazar, para tener una sola fuente de verdad.
3. **Choferes ya existentes** (amigos que ya la usan): ¿qué plan y fecha reciben? Todas las
   cuentas actuales nacieron como `VIP_GRATIS`.
4. **Cuántos días se conservan los datos** de una cuenta vencida o dada de baja antes de
   borrarlos.
5. **Procedimiento de baja y supresión** (Ley 25.326) y texto de términos y privacidad.
6. **Panel de administración:** al principio, desde el panel de Supabase; más adelante,
   pantalla propia.
7. Confirmar el supuesto de los 3 avisos (sección 4).

## 8. Qué pasa si el chofer nunca crea cuenta (hallazgo del código actual)

Hoy `AuthGate` (`app/_layout.tsx`) dice que **la app es funcional SIN cuenta**: sin sesión
trabaja en modo local con el nombre "Conductor", guardando en AsyncStorage del teléfono. El
login es opcional y se inicia desde Configuración.

Consecuencia: **un chofer que nunca se registra usa la app gratis e indefinidamente**, sin
trial, sin vencimiento y sin que el dueño lo sepa, porque ese modo no habla con el servidor y
la licencia vive en el servidor.

Si se elige exigir cuenta (punto 7.1), el cambio es de producto: sin sesión, la app muestra
solo la pantalla de login/invitación. Lo que ya existe ayuda:
`maybeMigrateLocalToCloud` (`src/services/migrateLocalToCloud.ts`) **sube a la nube lo cargado
en modo local** la primera vez que el chofer inicia sesión (sin duplicar ni pisar). Un chofer
que ya probó la app sin cuenta **no pierde sus datos** al darse de alta con una invitación.

Contras: pierde la ventaja de "probar sin registrarse", y requiere internet para el alta. El
modo demo local podría quedar limitado a datos de ejemplo, o eliminarse del build de
producción.

## 9. Límites honestos

- Alguien técnico puede modificar un APK, pero **no** puede cambiar lo que decide el
  servidor (RLS y licencia). Por eso el control vive ahí.
- Si el chofer no tiene internet, no puede validar la licencia: definir cuánto tiempo sin
  conexión se tolera (la gracia offline no está decidida).
- No se puede impedir reinstalar el APK ni que se pase por WhatsApp; se hace que no sirva
  sin una cuenta con licencia vigente.

