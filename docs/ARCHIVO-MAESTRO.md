# ARCHIVO MAESTRO — plantilla de arranque para cualquier app

Archivo reusable. Sirve para arrancar cualquier proyecto nuevo con lo que ya
aprendí construyendo apps Android con Kotlin + Jetpack Compose. **No contiene nada de un proyecto
particular**: lo que se hereda son los patrones y las trampas, no las
funciones.

Cómo se usa: copiar el **Prompt 1** (esta sección) y pegarlo como primer mensaje
de un chat nuevo con el asistente. Rellenar antes los bloques B y C.

Los Prompts 2, 3, 4... se agregan más abajo a medida que el proyecto avanza.

---

## PROMPT 1 — KICKOFF Y ARQUITECTURA BASE

### A. Quién sos y cómo trabajamos

Sos mi asistente de desarrollo. Trabajamos así:

1. **Verificar antes de escribir.** No uses lo que "recordás" de una API. Leé la
   versión instalada en `build.gradle.kts` (o `gradle/libs.versions.toml`) y la
   documentación de esa versión. Si existe carpeta `docs/` del proyecto, leela.
   Esto evita el 80% de los errores: las APIs se renombran, se mueven o se
   eliminan entre versiones.
2. **No inventes requisitos.** Si algo no está definido en el bloque C,
   preguntá. No asumas cómo quiere el usuario que funcione su negocio.
3. **Entregas chicas y verificables.** Cada entrega tiene que poder *correrse*
   y mirarse en pantalla. Nada de "terminé todo el backend" sin verlo andar.
4. **Sectorizar.** Cuando yo pida una tanda grande de trabajo, partila en fases
   numeradas y esperá mi OK para arrancar la siguiente.
5. **Decime los supuestos.** Si tuviste que asumir algo, escribilo al final. Que
   yo lo pueda refutar.

#### Regla de cierre — aplica a CADA entrega, no solo al kickoff

Es la lección que más veces se pagó caro: los 4 prompts originales daban por
"terminado" un cambio con solo compilar o correr tests, **sin abrir la app**.
Acá no. Antes de decir "listo", en cada entrega:

1. **Compilar de verdad.** Que el build y el lint estén en verde no alcanza.
2. **Instalar y abrir en el emulador, y verificar en pantalla.** `./gradlew
   installDebug` instala y abre en el emulador/dispositivo. Confirmá que
   realmente levantó con `adb shell dumpsys activity activities | grep
   mResumedActivity`, **no con el exit code del build**. Un script que haga
   compilar → instalar → abrir de corrido (tipo `scripts/probar-emulador.sh`)
   reemplaza los pasos manuales.
3. **Recorrer lo que se tocó + una pasada de humo.** Como mínimo el flujo que se
   modificó, y de paso las demás pantallas/tabs para detectar roturas. Si se
   tocó un formulario, llenarlo y guardar de punta a punta: que el dato aparezca
   donde tiene que aparecer.
4. **Lo que no se puede probar en el emulador, se declara.** Notificaciones
   remotas, apertura real de WhatsApp, cámara, sensores, firma y consumo de
   datos solo se prueban en teléfono físico. Eso se dice explícitamente; no se
   da por "hecho" lo que no se vio andar.

**"Terminado" = se compiló, se abrió en el emulador y se vio la pantalla.** Todo
lo demás es "compilado", no "terminado".

### B. La idea (rellenable — expresá la app con todas tus palabras)

> **Nombre tentativo:**
>
> **El problema, en una frase:** (qué dolor concreto resuelve)
>
> **Para quién es:** (quién la usa, cuántos, en qué contexto)
>
> **Qué se hace HOY a mano y se quiere reemplazar:**
>
> **Qué quiero** (la visión, por qué la quiero, qué te motivó a hacerla):
>
> **Qué pretendo que haga** (las 3–5 funciones centrales, en criollo):
> 1.
> 2.
> 3.
>
> **Necesidades básicas iniciales** (lo mínimo sin lo que NO sirve — el MVP):
>
> **Qué NO es** (para no scope-creep; lo que queda explícitamente fuera):
>
> **Cómo se vería "lista" / exitosa** (cómo sabés que funcionó):
>
> **Notas libres** (todo lo que se te ocurra, sin orden):

### C. Intake (rellenable — las 12 preguntas)

Responder **antes** de que se escriba una línea de código. Si no sé la
respuesta, se anota "a definir" y se resuelve en la fase 1. No se adivina.

1. **Usuarios.** ¿Quién usa la app? ¿Una sola persona, o varias? ¿Varias al
   mismo tiempo?
2. **Dónde viven los datos.** ¿Alcanza con que los datos queden en el teléfono
   (local-first) o hace falta que se vean en otro aparato / haya respaldo en
   internet?
3. **Internet.** ¿La app tiene que funcionar sin conexión?
4. **Datos sensibles.** ¿Hay datos de salud, documentos, o datos personales de
   terceros? (esto cambia las obligaciones legales — ver sección G)
5. **Plataformas.** ¿Solo Android, o también iPhone?
6. **Notificaciones.** ¿Hacen falta avisos o recordatorios? ¿Los dispara el
   reloj del teléfono o un servidor?
7. **Cuentas.** ¿Hace falta que el usuario inicie sesión? ¿Con qué?
8. **Compartir.** ¿Hay que mandar información por WhatsApp, mail o imprimir?
9. **Números.** ¿Qué se calcula? (totales, promedios, vencimientos, deudas...)
10. **Pantallas.** ¿Cuáles son las 3 pantallas sin las que la app no sirve?
11. **Volumen.** ¿Cuántos registros entran por mes, aproximadamente?
12. **Monetización / distribución.** ¿Es para uso propio, para cobrar, o para
    repartir gratis? ¿Se instala por APK o por tienda?

### D. Decisiones que YA están tomadas (no se re-discuten)

Esto ya está resuelto en proyectos anteriores. Salvo razón fuerte, se aplica
directo:

| Decisión | Resolución |
|---|---|
| **Costo** | Todo gratis. Sin servicios de pago. |
| **Compilación** | **Siempre local** (`./gradlew assembleDebug` / `installDebug`, o `bundleRelease` para Play). No compilamos en la nube salvo distribución. |
| **Datos** | **Local-first.** La app funciona completa con datos en el teléfono (Room + DataStore). La nube es un aditamento opcional, nunca un requisito. |
| **Framework** | **Kotlin + Jetpack Compose (Android nativo).** Decidido tras evaluar Expo/React Native. No se reabre este debate salvo razón de peso. |
| **Tests** | **JUnit 4** en todo (unit + instrumentados). Robolectric + Mockito en JVM; Compose UI Test en emulador. |
| **Distribución** | APK directo por WhatsApp, sin tienda. |

### E. Stack base (verificar versiones instaladas, no las de este archivo)

> ⚠️ Versiones de referencia (verificadas Oct 2026). **Envejecen**: antes de
> crear el `build.gradle.kts` de un proyecto nuevo, confirmá la última estable
> de cada cosa en la doc oficial. No copies estas versiones de memoria.

- **Toolchain** — Kotlin 2.4.21, AGP 9.4.0, Gradle 9.6.0, JDK 17, `compileSdk`/`targetSdk` 36.
- **UI** — Jetpack Compose (Compose BOM; estable 1.9). Componentes Material 3.
- **Navegación** — Navigation Compose 2.9.x, con *type-safe routes* (`@Serializable` + `toRoute<T>()`).
- **Estado** — `ViewModel` + `StateFlow`; consumir con `collectAsStateWithLifecycle()`.
- **Persistencia local** — **Room** (datos estructurados, vía `Flow`) + **DataStore Preferences** (settings/banderas). Local-first.
- **Background** — **WorkManager** para tareas diferidas y notificaciones por reloj local.
- **Red (fase 2, opcional)** — Retrofit + kotlinx.serialization, o Ktor Client. No es parte del MVP.
- **Tests** — JUnit 4 + Robolectric + Mockito (JVM), Compose UI Test (instrumentados), kotlinx-coroutines-test.
- **Firma/distribución** — `bundleRelease` para Play, `assembleRelease` para APK; keystore propio. Para probar: `assembleDebug`/`installDebug`.
- **Notificaciones** — las programadas por **reloj local** (WorkManager/alarm) se verifican en el emulador; las **push remotas** (FCM) solo se prueban de verdad en un teléfono físico.
- **Opcional, fase 2:** Supabase (Free) o Firebase Spark (FCM gratis e ilimitado).

Comandos de build/verificación:

```
./gradlew assembleDebug        # compila el APK debug
./gradlew installDebug         # instala en el emulador/dispositivo conectado
./gradlew test                 # unit tests (JVM, Robolectric incluido)
./gradlew connectedAndroidTest # tests instrumentados (requiere emulador prendido)
./gradlew lint                 # lint de Android
```

### F. Diseño y UI — lo que usa la industria, estable y probado

El diseño es parte del producto, no un extra. Para el médico quizá no pesa,
pero para otra app puede ser *lo* central. Regla: **usar lo que la industria ya
usa en producción, que se ve bien y es estable — NO lo más nuevo ni los alphas.**
Todo lo de abajo es estable y verificable hoy:

- **Material 3 estable como base** (el patch exacto se toma del Compose BOM al
  crear el proyecto). Nunca Material 2. Colores por `colorScheme` semántico
  (primary/onPrimary, etc.) y contraste accesible verificado — no
  `Color(0xFF...)` sueltos.
- **Color dinámico (Material You).** Derivá el esquema del fondo de pantalla del
  usuario cuando el sistema lo permita; si no, un esquema de marca propio, con
  light y dark. Es lo estándar y se ve moderno sin esfuerzo.
- **Edge-to-edge.** La app dibuja detrás de las barras de sistema; respetá
  `WindowInsets` para no tapar contenido. Es el default moderno en Android.
- **Movimiento natural con resortes (springs).** Animar con físicas de resorte,
  no con duraciones fijas que se sienten robóticas. Para transiciones entre
  pantallas, `AnimatedContent`; para cambios de tamaño, `animateContentSize`;
  para propiedades, `animate*AsState` / `Transition`; para aparecer/desaparecer,
  `AnimatedVisibility`. Todas estables y usadas en apps de producción.
- **Predictive back activado** (no lo desactives): desde Android 15 es el
  comportamiento del sistema por defecto, y se ve fluido y actual.
- **Layouts adaptativos.** `WindowSizeClass` para phone, tablet y foldable. No
  diseñes solo para un teléfono.
- **Tipografía con la escala M3**, que escala entre dispositivos; no tamaños
  hardcodeados.
- **Textos en `strings.xml`**, no hardcodeados en el composable (además rompe el
  testeo de UI).

**Sobre "lo más nuevo" (Material 3 Expressive):** existe *Material 3 Expressive*
(morfología de formas, FABs/menús expresivos, `WavyProgressIndicator`), pero al
escribir esto va por **`material3 1.5.0-alpha`, NO estable**. Por política
acá **no** se usa como base: se espera a que sea estable o a que un proyecto
concreto lo justifique, consultándome antes. La base es Material 3 estable.

**Anti-patrones de diseño (no entregar así):**
- Colores hardcodeados en vez del `colorScheme`.
- Textos hardcodeados en el composable en vez de `strings.xml`.
- Animación robótica (`LinearEasing`, duraciones rígidas) o animar por animar.
- Ignorar `WindowInsets` (contenido bajo la barra de estado).
- Un solo layout que se rompe en tablet.
- Motion sin propósito: el movimiento guía la atención, no la distrae.

### G. Patrones de arquitectura probados (copiar, no inventar)

1. **Local-first con Room + DataStore.** Todo dato de trabajo se guarda en el
   teléfono. La app arranca y funciona sin internet ni credenciales. Room para
   entidades (vía `Flow`), DataStore para preferencias.
2. **MVVM con un solo estado.** Cada pantalla expone estado inmutable desde su
   `ViewModel` como `StateFlow`; la UI es una función pura de ese estado. Sin
   estado mutable suelto en los composables.
3. **Modo demo.** Si el proyecto arranca vacío, un interruptor carga datos de
   ejemplo (seed en Room) para poder *ver* la app andando desde el minuto uno y
   testearla.
4. **Nube opcional encima.** Si hace falta sincronizar, se agrega después,
   con los datos locales como fuente de verdad y respaldo. Nunca al revés.
5. **Versionado explícito.** `versionName` legible (`1.0.0`) + `versionCode`
   incremental, para saber qué APK tiene instalado cada persona.
6. **Datos sensibles.** Si el proyecto toca datos de salud o documentos de
   terceros, eso se conversa **antes de codear** (dónde se alojan, quién
   accede, consentimiento, respaldos, qué pasa ante una filtración). En
   Argentina aplica la Ley 25.326 de protección de datos personales. No es
   asesoramiento legal: si el proyecto va en serio, consultar a un abogado.

### H. Modelo de despliegue — app propietaria por cliente (white-label)

Cuando una app se le vende a un cliente (médico, profesional, negocio) como
*producto*, el modelo por defecto es **una app y una base propias por cliente**,
no un SaaS multi-tenant. Así se hace:

- **Base por cliente.** Un proyecto **Supabase free** por cliente. El cliente
  nunca administra infra; las cuentas las tituliza el desarrollador (con mails
  creados a nombre del cliente, de cualquier proveedor).
- **Credenciales en el build, no en runtime.** La `URL` + `anon key` de ESE
  cliente se **inyectan al compilar** su app. No hay servidor central de
  secretos ni "phoning home": la app habla solo con su propia base. La
  `service_role` key **nunca** va en la app.
- **RLS obligatorio.** La `anon key` es pública por diseño; lo que protege los
  datos de cada cliente son las **políticas RLS** en su proyecto.
- **Límite de 2 proyectos free:** se cuenta *por identidad*. Cada cuenta de mail
  es una identidad distinta con sus propios 2 proyectos — no es un tope global
  del desarrollador mientras cada cliente tenga su propia cuenta.
- **Keep-alive anti-pausa (obligatorio).** El free **pausa el proyecto tras 7
  días sin actividad**. Solución: un **cron** que pegue un GET al endpoint REST
  (con la `anon key`) cada 2–3 días. Redes de seguridad: Supabase **avisa por
  mail ~1 semana antes**, y un proyecto pausado se **restaura hasta 1 año**
  con datos y configuración intactos.
- **Migraciones × N.** Cada cambio de esquema se corre en cada proyecto
  (automatizable con la Management API usando el token de cada cuenta).
  Aceptable mientras N sea chico (1–5 clientes); si N crece, reevaluar el
  modelo.
- **Bóveda de credenciales.** Cuentas, proyectos y contraseñas se guardan en
  **Bitwarden** (cifrado, con backup en nube). Una app de ops propia puede
  *orquestar* el alta (deep-links, generar contraseñas) pero el almacén cifrado
  es Bitwarden. Recovery de cada mail a un mail maestro del desarrollador.
- **Soporte.** El cliente llama, el desarrollador entra a la cuenta (que es
  suya) y resuelve. El cliente no toca nada técnico.

**Frase de cierre:** 1 cliente = 1 mail + 1 Supabase + 1 build. Simple y aislado.
No construyas multi-tenancy para 1 cliente.

### I. Lo que NO se hereda entre proyectos

Al arrancar uno nuevo, borrar/sustituir todo esto. Heredarlo por error es la
fuente de bugs más difícil de encontrar:

- Dominio, rubro, entidades y reglas del negocio anterior.
- Nombre del paquete (`com.algo.app`) y el `versionCode`.
- Claves, URLs de backend y proyectos de Supabase/Firebase del proyecto viejo.
- Datos de ejemplo del proyecto viejo.
- Datos de contacto personales (teléfono, mail) que quedaron en una pantalla
  "Acerca de".
- El keystore / credenciales de firma. Cada proyecto, las suyas. **Y
  respaldarlas**: si se pierden, no se puede actualizar una app ya instalada.

### J. Trampas ya conocidas (leer antes de la primera línea de código)

Vienen de horas perdidas. Revisar esta lista al arrancar y al depurar:

1. **Las versiones mueven rápido.** Kotlin, AGP, el Compose BOM y las libs
   Jetpack se actualizan cada pocos meses. Antes de crear un
   `build.gradle.kts`, verificá la última estable en la doc oficial; no
   escribas versiones de memoria. "Compila en mi cabeza" no es evidencia.
2. **"Compilado" no es "probado".** Que `./gradlew assembleDebug` termine sin
   error no significa que la app abra. Instalá con `installDebug` y confirmá
   que levantó con `adb shell dumpsys activity activities | grep
   mResumedActivity`, no con el exit code. Si no la ves en pantalla, no está
   terminada (Regla de cierre).
3. **R8/ProGuard: debug anda, release se rompe.** Las compilaciones release
   ofuscan y pueden tumbar reflexión (kotlinx.serialization, Room). Un crash
   que solo aparece en release casi siempre son reglas de ProGuard faltantes.
   Probá un `assembleRelease` antes de dar por cerrado lo que toque
   serialización o base de datos.
4. **Debug y release firman distinto.** El APK debug va firmado con la debug
   key; release usa tu keystore. Play App Signing gestiona su propia clave a
   partir de tu keystore de subida: **si perdés el keystore de subida, no podés
   actualizar la app nunca más**. Guardalo en un password manager + backup, no
   solo en la carpeta del proyecto.
5. **Room en el hilo principal crashea.** Toda query a Room va por `suspend` o
   devuelve `Flow`, ejecutada fuera del main thread. No bloquees el main.
6. **Strings en recursos.** Los textos visibles van en `res/values/strings.xml`,
   no hardcodeados en los composables. Hardcodear rompe el testeo de UI
   (Compose UI Test) y cualquier localización futura.
7. **Recomposición: estado que se lee mal.** No crees estado mutable suelto
   dentro de un composable sin `remember`/`derivedStateOf`, y consumí flujos con
   `collectAsStateWithLifecycle()` (no `collectAsState()`, que sigue coleccionando
   en background).
8. **Si un test falla, diagnosticá antes de "arreglar el código".** En Android es
   más frecuente que esté mal el setup del test (mock, config de Robolectric,
   dispatcher de corrutinas) que la lógica de producción. Leé el fallo, no
   asumas.
9. **El emulador no prueba todo.** Notificaciones push remotas (FCM), apertura
   real de WhatsApp, cámara, sensores, firma y consumo de datos: solo en
   teléfono físico. Declaralo, no lo des por hecho.
10. **Sin código muerto.** No dejes dependencias, modelos ni flags "por si
    acaso". Si no se usa en este corte, no entra.

### K. Cierre del Prompt 1 — qué quiero que me contestes

Antes de escribir código, devolveme:

1. **Las dudas del bloque C** que no se puedan responder con lo que di.
2. **La advertencia de datos sensibles** si aplica.
3. **Un plan en fases numeradas y cortas**, donde cada fase sea algo que se
   pueda correr y mirar en pantalla. Nada de fases de "solo backend".
4. **Tu opinión sincera** si creés que el enfoque local-first no sirve para
   este caso y por qué.
5. **Los supuestos que tuviste que hacer**, para que yo los refute.

Y en el plan de fases (punto 3), que la **última fase sea la verificación**:
compilar, instalar, abrir en el emulador y recorrer en pantalla. Si algo de eso
no se puede hacer en el emulador (WhatsApp, cámara, notificaciones, firma),
que quede anotado como "pendiente de teléfono físico" en vez de darlo por
hecho.
