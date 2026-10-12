# ARCHIVO MAESTRO — plantilla de arranque para cualquier app

Archivo reusable. Sirve para arrancar cualquier proyecto nuevo con lo que ya
aprendí construyendo apps con Expo. **No contiene nada de un proyecto
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
   versión instalada en `package.json` y la documentación de esa versión. Si
   existe carpeta `docs/` del proyecto, leela. Esto evita el 80% de los
   errores: las APIs se renombran, se mueven o se eliminan entre versiones.
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

1. **Compilar de verdad.** Que el typecheck y el lint estén en verde no alcanza.
2. **Instalar y abrir en el emulador, y verificar en pantalla.** Para abrir de
   forma confiable: `adb shell am start -n <paquete>/<Actividad>` y confirmar
   con `mResumedActivity`, **no con el exit code**. Un script que haga
   compilar → instalar → abrir de corrido (tipo `scripts/probar-emulador.sh`)
   reemplaza los 5 pasos manuales.
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

### B. La idea (rellenable — 3 a 5 líneas)

> Nombre tentativo:
> Problema que resuelve, en una frase:
> Para quién es:
> Lo que HOY se hace a mano y se quiere reemplazar:

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
   terceros? (esto cambia las obligaciones legales — ver sección F)
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
| **Compilación** | **Siempre local** (`expo prebuild` + Gradle, o `eas build --local`). El plan Free de EAS (15 builds/mes) no es un límite real para nosotros porque no compilamos en la nube. |
| **Datos** | **Local-first.** La app funciona completa con datos en el teléfono. La nube es un aditamento opcional, nunca un requisito. |
| **Framework** | Expo + React Native + TypeScript. Ya hay experiencia acumulada acá. Flutter y Kotlin/Compose se evaluaron y se descartaron: implican reescribir todo lo aprendido. No se reabre este debate salvo razón de peso. |
| **Distribución** | APK directo por WhatsApp, sin tienda. |

### E. Stack base (verificar versiones instaladas, no las de este archivo)

- **Expo** — versión según `package.json`. Nunca asumir la API de memoria.
- **Expo Router** — rutas en `app/`, `_layout.tsx` define navegadores.
- **NativeWind** — estilos con clases tipo Tailwind.
- **AsyncStorage** — persistencia local (local-first).
- **TypeScript** — siempre. `npx tsc --noEmit` antes de dar algo por bueno.
- **Notificaciones** — `expo-notifications`. Ojo: las notificaciones por
  **reloj local** (fecha/hora programada) se verifican en el emulador; las
  **push remotas** (FCM) solo se prueban de verdad en un teléfono físico.
- **Opcional, fase 2:** Supabase (Free: 2 proyectos, 500 MB base, 1 GB
  archivos — **se pausa tras 1 semana sin actividad**) o Firebase Spark
  (sin tarjeta; **FCM gratis e ilimitado**).

### F. Patrones de arquitectura probados (copiar, no inventar)

1. **Local-first con AsyncStorage.** Todo dato de trabajo se guarda en el
   teléfono. La app arranca y funciona sin internet ni credenciales.
2. **Modo demo.** Si el proyecto arranca vacío, un interruptor carga datos de
   ejemplo para poder *ver* la app andando desde el minuto uno y testearla.
3. **Nube opcional encima.** Si hace falta sincronizar, se agrega después,
   con los datos locales como fuente de verdad y respaldo. Nunca al revés.
4. **Versionado explícito.** `version` legible (`1.0.0`) + `versionCode`
   incremental, para saber qué APK tiene instalado cada persona.
5. **Datos sensibles.** Si el proyecto toca datos de salud o documentos de
   terceros, eso se conversa **antes de codear** (dónde se alojan, quién
   accede, consentimiento, respaldos, qué pasa ante una filtración). En
   Argentina aplica la Ley 25.326 de protección de datos personales. No es
   asesoramiento legal: si el proyecto va en serio, consultar a un abogado.

### G. Lo que NO se hereda entre proyectos

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

### H. Trampas ya conocidas (leer antes de la primera línea de código)

Vienen de horas perdidas. Revisar esta lista al arrancar y al depurar:

1. **Las APIs se mueven entre versiones.** Leer la doc de *la versión
   instalada*. No de memoria.
2. **No alcanza con compilar: hay que correrlo.** "Terminado" = corre en el
   emulador o en un teléfono y se vio la pantalla. Typecheck en verde no
   alcanza.
3. **El emulador no prueba todo.** Notificaciones remotas, apertura real de
   WhatsApp, cámara, sensores, firma y consumo de datos: solo en teléfono
   físico.
4. **`adb shell monkey` no abre la app.** Para arrancarla:
   `adb shell am start -n <paquete>/<Actividad>`. Verificar con
   `mResumedActivity`, no con el exit code.
5. **El plan Free de Supabase pausa el proyecto a la semana de inactividad** y
   el mail de aviso se pierde. Si se usa cloud, registrar la fecha de último
   uso o usar `Firebase`/local.
6. **El heredoc inline cuelga la terminal** (`cat <<'EOF' >> f` dentro de un
   comando largo, sobre todo con `&&` encadenados). Se colgó **tres veces**. El
   síntoma es que la shell queda en `> heredoc>` esperando más entrada y el
   archivo puede quedar a medias. Workaround: para escribir archivos usar la
   herramienta de edición de archivos, o el heredoc como **única** operación del
   comando (sin `&&` ni `wc` detrás). Y siempre verificar el resultado después.
7. **Firmar distinto rompe las actualizaciones.** Un APK firmado con otro
   keystore no se puede instalar encima de uno existente: hay que desinstalar,
   y el usuario pierde sus datos.

### I. Cierre del Prompt 1 — qué quiero que me contestes

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
