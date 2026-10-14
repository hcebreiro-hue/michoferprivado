# Claudia_app — Licencias: lista de choferes autorizados + servidor de activación

> **Solo documentación. No se escribió código.** Aplica a **Claudia_app / Mi Chofer Privado**
> (UNA app para todos los choferes). **No** aplica a las apps futuras "una app por cliente"
> (médicos, veterinaria, etc.): esas usan el Gestor de Usuarios (`prompt-gestor-usuarios.md`).
>
> Reemplaza la versión anterior de este archivo (basada en cuentas e invitaciones de Supabase,
> descartada porque **no se puede exigir que el chofer cree una cuenta**). Esa versión sigue
> en el historial de git (commit `de53615`).
>
> Regla del proyecto: lo marcado **"a confirmar"** NO está verificado contra la doc vigente y
> hay que verificarlo antes de implementar (Expo, Cloudflare y WhatsApp cambian seguido).

## 1. Premisas (el escenario real)

- La app es **puramente local**: muchos choferes no se van a registrar en ningún lado.
- Se reinstala **infinitas veces** y se le cambia el nombre. Hay que pensar con malicia.
- El APK se compila en la Mac (Android Studio / Gradle, **sin EAS Build**) y se reparte por
  **WhatsApp**. Es **el mismo APK para todos**. No hay descarga desde una web.
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
  servidor. Esta licencia no usa Supabase.
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
9. **Supabase:** Claudia_app usa Supabase para datos y login opcionales. Esta licencia NO lo
   usa. Definir si el login Supabase sigue siendo opcional o se retira del flujo.
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

