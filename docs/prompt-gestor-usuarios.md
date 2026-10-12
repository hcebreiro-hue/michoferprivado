# PROMPT — Nueva App: "Gestor de Usuarios" (panel de altas automatizadas)

Voy a crear una **nueva aplicación móvil** (para mi celular Android) cuyo objetivo es
ser mi **panel central de gestión de futuros usuarios/clientes** de todas las apps
que voy a desarrollar. Quiero que la carga esté **lo más automatizada posible**. Los
datos viven **LOCAL en el teléfono** (SQLite, sin nube). Con los datos de la persona la
app **genera automáticamente** su correo `nombre.apellido@unitecapplications.com` (vía
dominio propio + catch-all, sin captcha) y luego **orquesta** el alta en Supabase abriendo
la web por deep-link; guarda solo metadatos (las contraseñas van a Bitwarden).

## 1. Stack OBLIGATORIO (idéntico al de mi app "Claudia_app" ya en producción)
Respetá estas versiones y convenciones exactas, no inventes otras:

- **Expo** `~57.0.27` (managed workflow, SDK 57)
- **React Native** `0.86.3` + **React** `19.2.3`
- **expo-router** `~57.0.25` (navegación por carpetas en `app/`, NO react-navigation clásico)
- **expo-sqlite** (base de datos LOCAL en el teléfono — fuente de verdad, sin nube)
- **expo-web-browser** + **expo-linking** (abrir por deep-link: proveedor de correo, Supabase, Bitwarden)
- **nativewind** `^4.2.7` + **tailwindcss** `^3.4.17` (estilos con className, utility-first)
- **TypeScript** `~6.0.3` en modo **estricto**
- **react-native-safe-area-context** para notch/bordes seguros
- **expo-clipboard** para copiar credenciales de un toque
- **AsyncStorage** (`~2.2.0`) para settings/config (ej. qué proveedor de correo usás).
- Convención: componentes en `src/components/`, lógica de datos en `src/services/`,
  tipos en `src/types/`, utilidades en `src/utils/`, contexto en `src/context/`.
- ⚠️ **SIN backend, SIN nube.** Esta app NO habla con la API de Supabase ni con ningún
  servidor. No hay `EXPO_PUBLIC_SUPABASE_*`. Supabase se ABRE por deep-link para crear los
  proyectos de los clientes; la app solo guarda metadatos en SQLite local.
- applicationId en formato invertido (ej. `com.horacio.gestorusuarios`).


## 2. Objetivo de la app (qué tiene que hacer)
Es una **agenda/CRM liviano de usuarios finales** que yo administro desde el celu.
Cada "usuario" es una persona a la que en el futuro le voy a crear una cuenta en
alguna de mis apps. Necesito tener, en un solo lugar y organizado:

### 🎯 Visión del modelo (para qué sirve esta base)
Es mi **base maestra de clientes**, local en el celu. El flujo por cliente es:
1. Doy de **alta a la persona** (campos normales; ampliables a futuro).
2. La app **genera sola** su correo `nombre.apellido@unitecapplications.com`.
3. Con ese correo **creo su cuenta en Supabase** (abre supabase.com por deep-link; el mail
   de verificación llega por el catch-all a mi bandeja).
4. Queda todo **registrado localmente** (persona + metadatos de la cuenta).
Así, cuando en el futuro quiera ofrecerle una app a ese cliente, su cuenta y sus metadatos
ya están listos: **no tiene que parametrizar nada**.

### Datos básicos completos de cada usuario
- Nombre y apellido
- Teléfono / WhatsApp (validar formato, linkeable a wa.me)
- Email
- DNI / identificación
- Dirección (opcional)
- Fecha de nacimiento (opcional)
- Notas internas (texto libre)
- Estado: `activo` | `inactivo` | `pendiente` (con badge visual por color)
- Etiquetas / categorías (ej. "chofer", "cliente premium", "beta tester")
- Foto de perfil (opcional, cámara o galería)

### Sección "Cuentas / proyectos" (metadatos — el corazón de la orquestación)
Para cada usuario registro los **metadatos** de lo que le voy creando. OJO: las
contraseñas NO se guardan acá (van a Bitwarden). Lo que se guarda es el rastro:
- **Cuenta de correo (GENERADA AUTOMÁTICAMENTE)** — VÍA PRINCIPAL, sin captcha: con el
  nombre y apellido de la persona la app arma sola `nombre.apellido@unitecapplications.com`.
  Como el dominio tiene **catch-all** (`*@unitecapplications.com`) en Cloudflare Email
  Routing, **no hay que crear ninguna cuenta ni regla por usuario**: cualquier dirección del
  dominio ya recibe y reenvía a tu bandeja real. Recibir es **GRATIS** (límite 200
  reglas/dominio, de sobra). Esa dirección es la identidad que se usará para el alta en
  Supabase. Guardo como metadato: email generado, dominio, y referencia Bitwarden.
  ⚠️ **Alcance honesto:** es una dirección de **recepción** (recibe los mails de
  verificación de Supabase), NO un buzón con login ni envío propio. Para el flujo alcanza.
  Alternativa (manual, con captcha, solo si algún cliente la pide): **Proton Mail**
  (`https://proton.me/es-419/mail`). Otras evaluadas: Tuta (tuta.com), GMX (gmx.com), Zoho
  (zoho.com/mail, con dominio, API de pago), iCloud (icloud.com). Ninguna gratuita de buzón
  propio evita el captcha salvo el dominio+catch-all.
- **Proyecto Supabase** (uno por cliente/app, modelo white-label del bloque H):
  mail titular, URL del proyecto, `anon key`, y referencia a su entrada en Bitwarden.
- App / plataforma asociada (ej. "Claudia_app", futuras).
- Rol asignado (admin / user / driver), estado (`creada` | `pendiente` | `suspendida`),
  fecha de creación y notas de implementación (qué falta, qué se hizo).

Un usuario puede tener **varias cuentas/proyectos** (uno por app). Relación 1-a-muchos.

### Automatizaciones / orquestación (priorizar lo "low-touch")
- **Formulario de alta rápida** con la menor cantidad de campos obligatorios y autocompletado.
- **Generador de contraseñas seguras** con un botón: la genera, la copia, y abre Bitwarden
  (deep-link) para guardarla ahí. La app NUNCA la persiste.
- **Botón "Crear correo" (VÍA PRINCIPAL, automática):** con nombre + apellido la app arma
  `nombre.apellido@unitecapplications.com`, lo **copia al portapapeles** y lo guarda como
  metadato. **No abre ningún sitio ni pide captcha**: el catch-all ya recibe en esa dirección.
- **Asistencia de alta en Proton (ALTERNATIVA manual, opcional):** si en algún caso se
  prefiere un buzón de tercero, la app genera email+password, los copia al portapapeles y
  **abre** el registro de Proton (`proton.me`) con `expo-web-browser`; yo pego y resuelvo el
  **captcha** a mano. ⚠️ **Limitación honesta:** NO se puede autocompletar proton.me desde la
  app (el navegador lo bloquea por seguridad); el precargado real es *copiar-y-pegar +
  captcha manual*. Queda anotado, no se promete de más.
- **Deep-link "Crear proyecto Supabase"**: abre supabase.com (new project) con la sesión ya
  del mail del cliente. Yo creo el proyecto en el sitio; acá guardo URL + anon key.
  (No hay service_role ni automatización real en v1: crear el proyecto requiere sesión web
  humana. Queda anotado, no se promete de más.)
- **Copiar** email/URL/anon key al portapapeles con un toque.
- **Plantilla de WhatsApp**: arma el texto con las credenciales (que salen de Bitwarden) y
  abre el chat de wa.me ya precargado.
- **Buscador + filtros** (por nombre, estado, etiqueta, app) y **dashboard** con contadores.

## 3. Base de datos — SQLite LOCAL (expo-sqlite), sin nube
Toda la data vive en el teléfono con `expo-sqlite`. **No hay migraciones de Supabase ni
RLS**: es una base local de un solo usuario (yo). Tablas:

- `usuarios` (id INTEGER PK AUTOINCREMENT, nombre, apellido, telefono, email, dni,
  direccion, fecha_nacimiento, notas, estado, etiquetas TEXT, foto_uri, created_at, updated_at)
- `cuentas` (id INTEGER PK, usuario_id FK -> usuarios, tipo ['correo'|'supabase'],
  plataforma, email_login, supabase_url, supabase_anon_key, bitwarden_ref,
  rol, estado, notas_impl, fecha_creacion, created_at)
- (Opcional v1) `plataformas` (id, nombre) para autocompletar el campo plataforma.

Notas del schema:
- **NO hay columna de contraseña.** El secreto vive en Bitwarden; acá solo `bitwarden_ref`.
- `tipo` distingue una cuenta de correo de un proyecto Supabase (deep-links distintos).
- `supabase_anon_key` se guarda como metadato de referencia (es pública por diseño); la
  `service_role` NUNCA entra a la app.

## 4. Estructura de carpetas esperada
```
app/
  _layout.tsx
  (tabs)/
    index.tsx        # Dashboard con contadores
    usuarios.tsx     # Lista + buscador + filtros
    nuevo.tsx        # Formulario de alta (usuario + cuenta)
    usuario/[id].tsx # Detalle: cuentas + deep-links (correo/Supabase/Bitwarden/WhatsApp)
src/
  components/        # UserCard, CuentaCard, StatusBadge, PasswordGenerator, etc.
  services/
    db.ts                # init expo-sqlite + schema local
    usuarios.service.ts  # CRUD local (SQLite)
    cuentas.service.ts   # CRUD local (metadatos, sin secretos)
    deep-links.ts        # abre correo/Supabase/Bitwarden/wa.me (expo-linking + web-browser)
    config.service.ts    # proveedor de correo configurable (AsyncStorage)
  context/           # (si hace falta estado global)
  types/             # Usuario, Cuenta, Plataforma
  utils/             # password gen, formatters, wa.me link
```
(Sin carpeta `supabase/`: no hay backend.)

## 5. Plan de trabajo pedido
1. Scaffolding del proyecto Expo (SDK 57) con las deps de arriba (expo-sqlite, linking, etc.).
2. Capa local: `db.ts` con schema SQLite + repos `usuarios` y `cuentas` (sin secretos).
3. Navegación con expo-router (tabs: Inicio/Usuarios/Nuevo) + pantalla de detalle de usuario.
4. Pantallas: Dashboard con contadores, Lista de usuarios (buscador/filtros), Formulario de alta.
5. Detalle de usuario: sus cuentas + deep-links (abrir correo, abrir Supabase, abrir Bitwarden,
   copiar email/URL/anon key, plantilla de WhatsApp por wa.me).
6. Generador de contraseñas que abre Bitwarden (la app no persiste el secreto).
7. Asistencia de alta: botón "Crear correo" → genera email+pass, copia al portapapeles y
   abre Proton. Proveedor principal = Proton (fijo); dejar Tuta/GMX/Zoho/iCloud como
   alternativas en Ajustes, documentadas. El captcha lo resuelvo yo a mano.
8. Estilos con NativeWind, UI limpia y consistente, en español.
9. Verificar que compile (`tsc --noEmit`) y que corra en el emulador Android (Regla 6.6).

Arrancá por el punto 1 y avanzá en orden. Ante decisiones de diseño de UI, priorizá velocidad de carga (que yo registre un usuario en segundos) y claridad. Todo en español.

---

## 6. Overlay obligatorio: requerimientos del ARCHIVO-MAESTRO

Esta app se rige además por `~/Documents/Inteligencia_Artificial/ARCHIVO-MAESTRO.md`.
Las secciones 1–5 de arriba se mantienen SALVO donde esta sección lo sobreescribe.

### 6.1 ✅ STACK DEFINIDO — Expo 57 + React Native + Supabase (decisión tomada)
El maestro (bloques D/E) manda por defecto **Kotlin + Compose nativo, local-first**, pero
para ESTA app se resuelve a favor de **Expo** con razón de peso (el maestro lo permite):
- **No es producto white-label vendible** — es una herramienta de *ops interna* de 1 solo
  usuario (yo). El modelo local-first + APK-por-WhatsApp del maestro es para apps que se le
  venden a un cliente; esta no se distribuye.
- **Su razón de ser ES la nube.** Existe para orquestar proyectos Supabase remotos (crear
  cuentas, trackear URL/keys, keep-alive). El "local-first" no aplica: sin Supabase, la app
  no tiene sentido.
- **Supabase ya está integrado y andando** en el stack Expo de Claudia_app (cliente,
  migraciones, RLS). Rehacerlo en Kotlin = empezar de cero sin ganar nada para un panel
  de un solo usuario.
**Queda registrado como excepción justificada en el ARCHIVO-MAESTRO. No se re-discute.**

### 6.2 🔒 DATOS SENSIBLES — Ley 25.326 (advertencia, conversar ANTES de codear)
La app guarda **datos personales de terceros** (nombre, DNI, mail, teléfono) y
**credenciales/accesos**. En Argentina aplica la **Ley 25.326** de datos personales.
Definir antes de codear: dónde se alojan, quién accede, consentimiento, respaldos y plan
ante filtración. (No es asesoramiento legal; si va en serio, consultar abogado.)

### 6.3 🗝️ MODELO DE CREDENCIALES — la app ORQUESTA, no custodia (sobreescribe 2)
El maestro (bloque H) es tajante: el almacén cifrado de cuentas/contraseñas es
**Bitwarden**, y *"una app de ops propia puede orquestar el alta (deep-links, generar
contraseñas) pero el almacén cifrado es Bitwarden"*. → **NO** guardar contraseñas en
claro ni como fuente de verdad en la BD de esta app. La app: genera contraseñas seguras
(orquesta), manda a Bitwarden (deep-link/import), y en SU BD guarda solo **metadatos**
(a qué app, a qué usuario, estado) + referencia. La `service_role` key de Supabase
**nunca** va en el cliente.

### 6.4 🧩 MODELO WHITE-LABEL de fondo (contexto, bloque H)
Esta app existe para operar el modelo **1 cliente = 1 mail + 1 proyecto Supabase + 1
build**. A trackear por cliente: mail titular, proyecto Supabase, URL+anon key (inyectadas
al build), keep-alive anti-pausa (el free pausa a los 7 días sin actividad; cron cada
2–3 días; recuperable hasta 1 año), y migraciones de esquema ×N.

### 6.5 📋 INTAKE — las 12 preguntas a responder antes de codear
Usuario(s) · dónde viven los datos · internet · datos sensibles · plataformas ·
notificaciones · cuentas · compartir · números · pantallas · volumen · monetización.
Las que ya responde Claudia_app se cierran ahora; el resto, en la fase 1.

### 6.6 ✅ REGLA DE CIERRE (aplica a CADA entrega) — flujo Expo/Metro
*"Terminado"* = compiló (`tsc --noEmit` en verde) + Metro sirvió el bundle + la app
**abrió en el emulador y se vio la pantalla** (NO alcanza con que Metro no tire error).
Flujo de verificación propio de este stack:
- Metro corriendo en **8081** + `adb reverse tcp:8081 tcp:8081`.
- App relanzada con `am start -n <applicationId>/.MainActivity` (no `monkey`).
- Confirmar que levantó con `adb shell dumpsys activity activities | grep mResumedActivity`.
- Ver `Android Bundled …ms` en el log de Metro y **screenshot** de la pantalla tocada.
- Recorrer lo modificado + pasada de humo. Lo que no se puede probar en emulador
  (WhatsApp real, cámara, push remoto, firma, consumo de datos) se declara
  *"pendiente de teléfono físico"*.

### 6.8 📧 ESTRATEGIA DE CORREO — dominio propio + catch-all (automatización real)
Investigación (Oct 2026). El cuello de botella del modelo white-label es crear muchos mails
(1 por cliente, porque **Supabase free = 2 proyectos por identidad/cuenta**, confirmado).

- **Ningún buzón gratuito de tercero evita el CAPTCHA de alta** (Proton, Tuta, GMX, iCloud).
  Los "mass creators" de Gmail son scrapers que violan ToS y se rompen. Zoho tiene API real
  (`Add user to Organization`) pero exige **plan pago + dominio propio**.
- **Solución elegida: dominio propio + Cloudflare Email Routing con catch-all.**
  - Recibir email (routing) = **GRATIS** en cualquier plan (confirmado en doc oficial).
  - Regla catch-all `*@unitecapplications.com` atrapa cualquier dirección y la reenvía a tu bandeja real.
  - **No hace falta crear cuenta ni regla por usuario**: el catch-all ya cubre todo el dominio.
  - Límites: 200 reglas/dominio, 200 direcciones destino por cuenta (de sobra).
  - La app genera `nombre.apellido@unitecapplications.com` desde los datos de la persona;
    cada una es identidad nueva para Supabase (Supabase free = 2 proyectos por cuenta).
- **Setup único (una vez):** comprar dominio (~$10/año) + activar Email Routing + definir el
  destino (tu mail real verificado) + el catch-all. Después, crear clientes es trivial.
- **Fase 2 (si se requiere buzón real, no solo recibir):** Migadu (API de mailboxes/aliases,
  plan pago barato) o Google Workspace (Admin SDK crea usuarios por API, de pago). No es MVP.
- **Nota:** los mails de verificación de Supabase llegan por el catch-all a tu bandeja; desde
  ahí activás cada cuenta. La app solo orquesta y registra metadatos.
- ✅ **VERIFICADO Y OPERATIVO (2026):** el catch-all de `*@unitecapplications.com` reenvía
  correctamente a la bandeja destino real; confirmado con pruebas desde otro Gmail y desde
  otro dominio del usuario. **Truco de prueba:** al testear, enviar SIEMPRE desde una dirección
  distinta a la de destino. Si enviás desde la misma cuenta destino (ej. `hcebreiro@gmail.com`
  → `algo@unitecapplications.com` → `hcebreiro@gmail.com`), Gmail *deduplica* el correo y no
  lo muestra como nuevo (Cloudflare avisa de esto en el Activity log: "Are you missing an
  email…"). No es una falla: es el mismo mensaje ya presente en Enviados. Diagnóstico
  alternativo: el **Activity log** de Email Routing muestra el estado (Forwarded/Entregado)
  sin depender de la bandeja.

### 6.7 🧹 Sin código muerto · entregas chicas y verificables · sectorizar en fases
Nada de "terminé todo el backend" sin verlo andar. Cada fase corre y se mira en pantalla.
