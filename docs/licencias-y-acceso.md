# Claudia_app — Licencias: lista de choferes autorizados + servidor de activación

> **Solo documentación. No se escribió código.** Aplica a **Claudia_app / Mi Chofer Privado**
> (UNA app para todos los choferes). **No** aplica a las apps futuras "una app por cliente"
> (médicos, veterinaria, etc.): esas usan el Gestor de Usuarios (`prompt-gestor-usuarios.md`).
>
> Reemplaza la versión anterior de este archivo (basada en cuentas e invitaciones de un servicio externo,
> descartada porque **no se puede exigir que el chofer cree una cuenta**). Esa versión sigue
> en el historial de git (commit `de53615`).
>
> Regla del proyecto: lo marcado **"a confirmar"** NO está verificado contra la doc vigente y
> hay que verificarlo antes de implementar (Expo, Cloudflare y WhatsApp cambian seguido).

## 1. Premisas (el escenario real)

- La app es **puramente local**: muchos choferes no se van a registrar en ningún lado.
- Se reinstala **infinitas veces** y se le cambia el nombre. Hay que pensar con malicia.
- El APK se compila en la Mac (Android Studio / Gradle, **sin EAS Build**) y se publica con
  `scripts/publicar-apk.sh` en Cloudflare R2. Se descarga desde
  `https://agenda.senda.unitecapplications.com/descargar` (el QR fijo apunta ahí) o se manda el
  enlace por **WhatsApp**. Es **el mismo APK para todos**.
- La comunicación con el chofer es siempre por WhatsApp: **el dueño tiene su número**.
- Hoy no hay APK repartidos que funcionen, salvo el de **Claudia (amiga, VIP)**.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Control | **Lista de choferes autorizados** que el dueño carga a mano en un sitio propio. |
| Llave de identidad | **Número de WhatsApp** (lo escribe el chofer) + **ID del equipo** (lo lee la app sola). |
| Servidor | Subdominio de `unitecapplications.com` en Cloudflare (ver 5). |
| Prueba (trial) | **30 días**, contados en el servidor desde la primera activación. |
| Tope grabado en el APK | **90 días** (respaldo si el servidor no responde). Ver 7. |
| Tolerancia sin internet | **15 días** desde el último chequeo exitoso. |
| Gracia al vencer | **3 avisos, uno cada 24 hs.** |
| Planes de pago | **Mensual y anual.** |
| VIP perpetuo | Licencia sin vencimiento, atada al equipo; revocable por el dueño. |
| Regla de equipo | **Un número = un equipo.** Cambio de teléfono solo con aprobación del dueño. |
| Reinstalar en el mismo equipo | Se reactiva solo, con la **misma fecha de inicio**. No gana días. |
| Aviso al dueño | Mail (y/o WhatsApp). Ver 9. Para el dueño son equivalentes. |
| Al vencer | El chofer puede **exportar sus datos** (ver 10). |
| Marco legal | **Ley 25.326** (ver 11). |
| Pérdida de datos al reinstalar | **No preocupa** (decisión del dueño). |

## 3. Principio de diseño

Lo único que no se borra al reinstalar es lo que recuerda **el servidor**. Por eso el trial
se cuenta ahí, por número de WhatsApp + equipo, y no en el teléfono. No se intenta impedir
reinstalar el APK (no es posible): se hace que reinstalar no sirva de nada.

Quitar el **modo "sin cuenta"** actual: hoy `AuthGate` (`app/_layout.tsx`) deja usar la app
sin sesión, en modo local, indefinidamente. Con licencia, una app sin número autorizado
**queda en una pantalla de activación**, no arranca.

## 4. Flujo completo

1. El dueño carga en el sitio: **nombre, WhatsApp, plan** (trial / mensual / anual / VIP).
2. El dueño manda el APK por WhatsApp. Es el mismo para todos.
3. Al abrir la app: pantalla de activación con **aviso de privacidad** (ver 11) y un campo
   para el **número de WhatsApp**. El **ID del equipo** (`Application.getAndroidId()`) lo
   manda la app sola. El chofer no tipea nada técnico.
   La activación es **lo primero que se pide**, antes del login opcional, del alta y de
   cualquier pantalla (`GuardiaLicencia` envuelve toda la app).
   **Perfil automático (implementado):** la licencia firmada lleva el `nombre` que cargó el
   dueño. Al activar, la app completa sola `driver_name`, `driver_phone` (el WhatsApp) y
   `profile_complete`, así que el chofer **no pasa por "Completa tu perfil"**, no queda como
   "Conductor" y no ve datos de ejemplo. Lo hace `AplicarIdentidad` (lógica pura en
   `src/licencia/identidad.ts`, con tests). No pisa un perfil ya completo, y una licencia
   vieja sin `nombre` sigue siendo válida (queda el alta manual de siempre).
   Quien no tiene licencia no llega a ninguna pantalla de la app: no se puede evitar el límite
   dejando el nombre vacío ni saltando el alta.
4. La app consulta al servidor. Respuestas posibles:

| Situación en el servidor | Resultado |
|---|---|
| Número cargado, **sin equipo asociado** | Asocia el ID, **inicia el trial** (o el plan cargado), devuelve la **licencia firmada** y **avisa al dueño**. |
| Número cargado, **mismo equipo** (reinstaló) | Devuelve la licencia vigente con la **misma fecha de inicio**. |
| Número cargado, **equipo distinto** | Queda **pendiente**; avisa al dueño con el ID nuevo. El dueño le escribe por WhatsApp y decide. La app muestra "esperando aprobación". |
| Número **no cargado** | La app queda **bloqueada** ("Pedí tu alta"); avisa al dueño. |

5. **Cambio de teléfono o reseteo de fábrica:** el ID cambia → cae en "equipo distinto" →
   decide el dueño. Es la regla única que cubre ambos casos.
6. **Hueco a conocer:** teclear el número no prueba que sea del chofer (alguien que sepa el
   número de otro podría escribirlo). Lo cierra la regla "un número = un equipo": el primer
   equipo que activa queda atado y un segundo equipo queda pendiente. Queda una **carrera**
   (un tercero que active antes que el chofer); se acota porque el dueño manda el APK y el
   chofer lo abre enseguida, y el aviso de "primer arranque" delata uno inesperado.

## 5. Servidor de activación (Cloudflare)

Se arma en un **subdominio de `unitecapplications.com`** (el dominio ya está en Cloudflare con
el catch-all de correo; agregar un subdominio **no debería** afectarlo, pero **a confirmar**).

| Pieza | Para qué | Límite del plan gratis (verificado en doc oficial) |
|---|---|---|
| **Worker** | Endpoint de activación/consulta y firma de licencias | 100.000 pedidos/día, 10 ms de CPU por pedido |
| **D1** (base SQL) | Lista de choferes, equipos, fechas | 5 M lecturas/día, 100.000 escrituras/día, 5 GB |
| **Sitio de carga** (admin) | Donde el dueño carga y aprueba choferes | — |
| **Cloudflare Access** | Proteger el sitio de carga con PIN por mail | **Límite de usuarios del plan gratis: a confirmar** en el panel |

- Para decenas o cientos de choferes sobra. **A medir al implementar:** que firmar con
  Ed25519 entre en los 10 ms de CPU.
- **No hay descarga de APK desde la web** (se reparte por WhatsApp). Si algún día se quisiera,
  el APK (~108 MB) **no entra en los 25 MiB** de assets de Workers; iría en **R2** (10 GB
  gratis, egreso gratis, 5 GiB por objeto).
- **El sitio de carga NO puede quedar abierto**: cualquiera podría autorizar números.

### Datos que guarda el servidor (propuesta)
`choferes`: `whatsapp` (único), `nombre`, `plan`, `inicio`, `vence`, `estado`
(`activo`/`pendiente`/`bloqueado`), `equipo_id`, `creado_en`, `ultimo_chequeo`.
`equipos_pendientes`: `whatsapp`, `equipo_id`, `visto_en`. `eventos`: registro de activaciones,
rechazos y aprobaciones (auditoría y para el aviso).

## 6. Licencia firmada (se verifica sin internet)

- El servidor firma con **Ed25519**. Soporte en Workers confirmado en la doc de Cloudflare
  (Web Crypto). La app lleva solo la **clave pública**; la privada vive **solo** en el
  servidor (secreto del Worker) y una copia en Bitwarden.
- Contenido: `whatsapp`, `equipo_id`, `plan`, `inicio`, `vence` (vacío en VIP), `emitida`.
- La app verifica la firma y el `equipo_id` localmente. Una licencia de otro equipo no sirve.
- **Librería para verificar Ed25519 en la app (Expo SDK 57): NO verificada.** Confirmarla en
  la doc de Expo antes de implementar. Si es módulo nativo, requiere un build nuevo.
- Llave con `kid`, para poder rotarla si se compromete.

## 7. Tope grabado en el APK (respaldo) — 90 días

- Fecha absoluta en **una constante** (un solo archivo). Pasada esa fecha, sin licencia
  vigente, la app se bloquea.
- **No calcularla como "fecha de build + 90"**: `plugins/withBuildStamp.js` calcula el
  `versionCode` en `expo prebuild`, y `android/` está **ignorado por git**; compilar desde
  Android Studio sin repetir el prebuild da una fecha vieja. Una constante absoluta es
  predecible.
- Sirve si el servidor deja de responder: acota cuánto puede durar un APK sin validar.
- Es **respaldo**, no el mecanismo principal. Con licencia vigente emitida por el servidor,
  el tope no aplica.
- **Extensión remota (decidida: sí):** la app consulta, con internet, un archivo estático con
  la fecha tope vigente; **solo puede alargarla, nunca acortarla**. Si no responde, rige la
  grabada. Evita recompilar para extender. Se puede firmar con la misma clave. Dónde se
  aloja (por ejemplo el mismo Worker) es **a confirmar**.
- **Chequeo del reloj:** guardar la "última fecha vista"; si el reloj retrocede, o es anterior
  a la fecha de build, bloquear y pedir corregir la hora. Atrasar el reloj sigue siendo
  posible pero molesto (rompe WhatsApp y notificaciones). Dónde guardarla (`expo-secure-store`
  se borra al reinstalar en Android, según la doc de SDK 57) es **a decidir**.

## 8. Vencimiento y gracia

- Estados: `activa` → `gracia` (3 días) → `vencida`.
- **Gracia: 3 avisos, uno cada 24 hs**, como **notificaciones locales** (`expo-notifications`
  ya está en `package.json`; funcionan sin internet) más un banner dentro de la app.
- **Supuesto a confirmar:** los 3 avisos son **después** de vencer y durante la gracia la app
  se usa normal. Si el dueño los quería *antes* del vencimiento, ajustar.
- Mensual / anual: el dueño marca el pago en el sitio y se renueva (calendario: +1 mes /
  +1 año). La app recibe la licencia nueva en su próximo chequeo.
- **Tolerancia sin internet: 15 días** desde el último chequeo exitoso. Pasados, pide conectarse.
- El chequeo periódico renueva la licencia; si el dueño la revocó, se corta en el siguiente.
- VIP: sin vencimiento. Revocable. **Un VIP sigue pasando por el chequeo**, así el dueño
  puede cortar un VIP que se compartió.


## 9. Aviso al dueño (primer arranque, equipo nuevo, número no cargado)

- **Base:** una lista de **"pendientes y nuevos"** en el sitio de carga. El servidor registra
  siempre el evento, aunque el aviso falle. Es lo que no se negocia.
- **Mail:** el catch-all actual de Cloudflare solo **recibe**. Para que el servidor **envíe**
  hace falta otro mecanismo de envío de Cloudflare. **No verificado: a confirmar en la doc.**
- **WhatsApp automático:** con la API oficial, los mensajes que inicia el negocio fuera de una
  ventana de 24 hs **solo pueden ser plantillas pre-aprobadas y pagas por mensaje**; los
  textos libres son gratis solo dentro de la ventana abierta por el usuario (doc de Meta,
  jul-2025). **Tarifa para Argentina, tiempo de aprobación y requisito de cuenta de empresa
  verificada: no verificados.**
- Recomendación: empezar con **la lista en el sitio + aviso por mail**; sumar WhatsApp después
  si hace falta. Para el dueño mail y WhatsApp son equivalentes.

## 10. Al vencer: exportación de datos

- La licencia vencida **no borra nada** ni impide ver los datos: bloquea **cargar** datos
  nuevos y deja una pantalla "Licencia vencida" con renovación por WhatsApp.
- Botón **"Descargar mis datos"** (CSV y/o JSON: viajes, combustible, mantenimiento, costos)
  que entrega el archivo por el menú de compartir del sistema.
- **Hoy la app no tiene exportación**: hay que construirla. Necesita librerías de archivos y
  compartir que **no están en `package.json`**; instalarlas con `npx expo install` y verificar
  su API en la doc de Expo SDK 57. Si son nativas, requiere un build nuevo.
- Se mantiene aunque la licencia esté vencida: así no hay reclamo por "retención" de datos.
- Si la ley obliga más que esto, **a confirmar con un abogado**.

## 11. Ley 25.326 (Argentina) — Protección de Datos Personales

Ahora el **servidor guarda datos personales**: nombre, número de WhatsApp, ID del equipo,
fechas de uso. *Esto es una guía técnica, no asesoramiento legal.*

- **Aviso de privacidad aceptado** en la pantalla de activación: qué se guarda (número,
  ID de equipo, fechas), para qué (control de licencia) y quién lo trata.
- **Finalidad:** solo gestionar la licencia. Decir que el dueño ve "quién activó y cuándo".
- **Derecho de acceso, rectificación y supresión:** el chofer puede pedir que se corrijan o
  se borren sus datos del servidor. **Falta definir el procedimiento** (por WhatsApp).
- **Seguridad:** acceso al sitio de carga protegido; clave privada de firma solo en el
  servidor. Los datos del chofer viven en la base D1 de Senda (ver 12 bis).
- **Registro de la base de datos ante la AAIP:** la ley lo prevé; **verificar si corresponde**.
- **Ubicación de los datos:** Cloudflare D1 permite elegir la región (doc "Data location");
  **verificar** requisitos de transferencia internacional.
- Datos de **pasajeros** de la web de reservas: son otro tratamiento (no cubierto acá);
  incluir aviso y finalidad en ese formulario.


## 12. Firma del APK (condición crítica para el ID de equipo)

`Application.getAndroidId()` es único por combinación de **clave de firma + usuario +
equipo**, y **cambia si cambia la clave de firma** (doc de Expo SDK 57). Si el APK se firma
con otra clave, **todos los equipos ya activados cambian de ID** y habría que re-aprobar a
todos.

**Hallazgo en el proyecto (verificado):** `android/app/build.gradle` firma el build **release
con `signingConfigs.debug`**, o sea con `android/app/debug.keystore` (huella SHA-256
`FA:C6:17:45:…:3B:9C`). Consecuencias:
- `android/` está **ignorado por git** y se regenera con `expo prebuild`. Un prebuild nuevo
  **puede regenerar ese keystore y cambiar la firma** sin aviso (a confirmar en la práctica).
- No encontré ninguna copia del keystore fuera del proyecto.
- **Acción previa a repartir APK con licencia:** crear un **keystore propio de release**,
  **guardarlo en Bitwarden y en un respaldo**, y configurar la firma para que sobreviva al
  prebuild (config plugin, como ya se hace con `withBuildStamp`). **Si se pierde el keystore,
  no se pueden instalar actualizaciones sobre las existentes y los IDs cambian.**
- **Claudia (VIP):** su APK actual está firmado con el debug.keystore. Si la firma cambia, no
  puede actualizar encima (tiene que desinstalar e instalar) y su ID cambia: re-aprobarla.

## 12 bis. Servidor de Senda: datos y sesión (reemplaza a Supabase)

Desde el 14/10/2026 la app **no usa Supabase**. Un solo Worker de Cloudflare con una base D1
(repo `~/Desarrollos/senda-api`, `https://senda.api.unitecapplications.com`) hace de licencias,
sesión y datos de los choferes. El Worker anterior `claudia-licencias` y el proyecto de Supabase
quedan fuera de uso (ver «Limpieza pendiente» al final de esta sección).

- **Secretos del Worker:** `PRIVATE_KEY` (firma de licencias, Ed25519), `JWT_SECRET` (sesiones) y
  el token del panel `/admin`. Se generan con `npm run claves` (repo `senda-api`) y quedan en
  `~/.senda/claves.txt` (permiso 600). **Respaldarlos en Bitwarden**, igual que
  `claudia-release.jks`. Nunca van al repo ni a la app.
- **La app no lleva ninguna clave secreta**: solo la clave pública que verifica licencias y topes.
- **Base D1 `senda`:** `choferes`, `sesiones`, `trips`, `fuel_logs`, `maintenance_logs`,
  `fixed_costs`, `driver_settings`, `config`, `eventos`. Toda tabla de datos lleva `owner_id`
  (= `choferes.id`) con `ON DELETE CASCADE`: **borrar al chofer borra todo lo suyo**, que es el
  procedimiento de supresión de datos a pedido (Ley 25.326, sección 11).
- **Rutas:** `POST /v1/activar`, `POST /v1/sesion/renovar`, `GET /v1/tope`,
  `GET /v1/portal/:slug` (pública, solo horarios ocupados), `/v1/{trips,fuel,maintenance,fixed-costs}`
  y `/v1/settings` (requieren sesión), `/admin` y `/admin/api/*` (panel del dueño, con token).
- **Etapa 2 (14/10/2026): la cuenta en la nube es automática.** El chofer no ve ni crea ninguna
  cuenta. Cómo funciona:
  1. `POST /v1/activar` acepta `sesion: 'crear' | 'existente'`.
  2. Si la licencia es válida en ese equipo, el servidor entrega una sesión: `access` (JWT de
     1 hora) y `refresh` (valor opaco de 90 días que se **rota en cada uso**; en D1 solo vive su
     SHA-256). No hay mail ni contraseña: la identidad es el WhatsApp + el equipo aprobado.
     Nunca se entrega sesión a un equipo pendiente, a un número no cargado ni a un chofer bloqueado.
  3. **Cuándo se pide** (`src/licencia/sesion.ts`): con el perfil completo (tocó «Borrar datos de
     prueba y empezar») y sin sesión → `crear`. Con datos de prueba → `existente`: solo da sesión si
     el chofer ya tenía datos (reinstaló o cambió de teléfono aprobado), así los recupera; si es
     nuevo **no se crea nada** y sigue con los datos de prueba.
  4. Al abrirse la sesión, `maybeMigrateLocalToCloud` sube a la nube lo que cargó en el teléfono
     (sin los datos de ejemplo `seed-`). Si no hay conexión, se reintenta al abrir la app.
  5. **Cada pedido vuelve a mirar la licencia del chofer**: bloquearlo desde el panel corta el
     acceso a los datos al instante, no hay que esperar a que venza nada.
  6. Si la sesión falla, la licencia se entrega igual y queda un evento `sesion_fallida` en el panel.
- **Estado «suspendida» (app):** si el servidor responde `bloqueado` (el dueño lo bloqueó), la app
  guarda una marca en el teléfono (`leerSuspendida`/`guardarSuspendida` en `src/licencia/almacen.ts`),
  borra la sesión y muestra **«Tu acceso está suspendido»** con dos botones: *Escribir al soporte
  por WhatsApp* y *Ya me habilitaron: volver a revisar*. Esta marca **tiene prioridad sobre una
  licencia local todavía vigente** (`evaluar.ts`, estado `suspendida`): sin ella, el chofer
  bloqueado podría seguir usando la app hasta que venciera la licencia guardada. Se vuelve a
  revisar al abrir la app y al tocar el segundo botón; si el dueño lo habilitó, la marca se borra y
  la app abre normal. En este estado **no se ofrece «Descargar mis datos»**: la nube ya no los
  entrega. El caso «número no cargado» o «equipo distinto» sigue usando la pantalla de activación.
- **Probado en el emulador (14/10/2026):** persistencia al cerrar y reabrir la app (viaje,
  combustible, mantenimiento), migración de lo cargado en el teléfono a la nube (importes
  correctos, sin duplicados y sin datos de ejemplo), bloqueo desde el panel con la app abierta y
  habilitación posterior, y portal público (200 con horarios ocupados, 404 con un slug que no
  existe; la agenda web publicada todavía era la versión anterior).
- **Pendiente / a tener en cuenta:** el aviso de suspensión no aparece solo con la app abierta: se
  ve al reabrirla o en la siguiente revalidación (cada 6 horas); mientras tanto los pedidos de
  datos ya fallan porque el servidor corta la sesión.

### Limpieza (14/10/2026)

Hecho: se dieron de baja los Workers `claudia-licencias` y `claudia-api-prueba` (y sus bases D1),
las carpetas locales `~/Desarrollos/claudia-licencias` y `~/Desarrollos/prueba-cloudflare`, la
carpeta `~/.claudia-licencias` (claves del servidor viejo y `supabase.txt`) y `supabase/schema.sql`.
Antes de borrar se guardó un respaldo en `~/.senda/respaldo-viejos/` (volcado SQL de las dos bases y
código con su historial de git, sin claves).

Pendiente:
- Proyecto de Supabase `michoferprivado` y el usuario de prueba «María López PRUEBA»: se borran
  desde el panel web de Supabase (no se pueden dar de baja desde acá).
- Las secciones de Supabase de `docs/roadmap-proximas-mejoras.md`.


## 13. Puntos abiertos

1. **Aviso por mail:** mecanismo de envío desde el Worker (a confirmar). Hasta entonces,
   lista en el sitio.
2. **Plan gratis de Cloudflare Access:** límite de usuarios (a confirmar en el panel).
3. **Librería de verificación Ed25519** en Expo SDK 57 (a verificar; puede exigir build).
4. **Gracia:** confirmar que los 3 avisos son después de vencer (sección 8).
5. **Dónde guardar la "última fecha vista"** del control de reloj (sección 7).
6. **Keystore de release** (sección 12): crearlo y resguardarlo antes de repartir.
7. **Convivencia con `tipo_cuenta`** (`VIP_GRATIS`/`VIP_PAGO`) y `MONETIZACION_ACTIVADA =
   false` en `app/_layout.tsx` y `driver_settings`. Propuesta: reemplazarlos por esta
   licencia, para una sola fuente de verdad.
8. **Procedimiento de baja y supresión** de datos del servidor (Ley 25.326) y texto del aviso.
9. **Cuenta en la nube:** resuelto en la etapa 2 (ver 12 bis): el login manual se retiró y la
   sesión se entrega sola al activar. Ya no se usa Supabase. Queda pendiente el texto definitivo del aviso de privacidad (hoy está
   en `PantallaActivacion.tsx`) y la inscripción en el registro de bases de datos (AAIP).
10. **Subdominio:** confirmar que no afecta el catch-all de correo.

## 14. Límites honestos

- Alguien técnico puede descompilar el APK y quitar el chequeo. Para este público alcanza,
  pero **no es un blindaje**.
- El servidor es un **punto único de falla**: si cae, nadie nuevo activa ni renueva. Lo
  mitigan la licencia ya emitida (15 días offline) y el tope de 90 días.
- Un **VIP perpetuo** es una licencia firmada: sin revocación en el servidor no se corta
  (por eso el VIP también pasa por el chequeo, ver 8).
- Si el chofer **cambia de teléfono**, depende de que el dueño lo apruebe. Un **reseteo de
  fábrica** cambia el ID y sigue la misma regla.
- No se puede impedir reinstalar ni pasar el APK; se hace que **sin número autorizado y
  equipo asociado no sirva**.
- Google Play Billing no aplica mientras se distribuya por APK y WhatsApp. **Google Play con
  suscripciones** sería la alternativa fuerte, a futuro, si la app crece.

