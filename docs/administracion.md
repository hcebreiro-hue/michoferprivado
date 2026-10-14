# Senda — Guía de administración

Todo lo que hace el dueño: dar de alta choferes, renovar, bloquear, aprobar teléfonos nuevos y
borrar datos. Hay **dos formas** de hacerlo, con las mismas operaciones: el **panel web** y el
**script de terminal**.

## Qué hay y dónde vive

| Pieza | Dónde | Para qué |
|---|---|---|
| Servidor (Worker + base D1 `senda`) | `https://senda.api.unitecapplications.com` | Licencias, sesión y datos de los choferes |
| Código del servidor | `~/Desarrollos/senda-api` | Se despliega con `npx wrangler deploy` |
| Panel del dueño | `https://senda.api.unitecapplications.com/admin` | Administrar desde el navegador |
| Script de terminal | `~/Desarrollos/senda-api/scripts/admin.mjs` | Lo mismo desde la Mac |
| Agenda web pública | `https://agenda.senda.unitecapplications.com` (la sirve el Worker `senda-api`; se publica con `npm run agenda` + `npx wrangler deploy`) | Lo que ven los pasajeros |
| App (código) | `~/Claudia_app`, GitHub `hcebreiro-hue/michoferprivado` | APK «Senda» |
| Panel de Cloudflare | https://dash.cloudflare.com → Workers y D1 | Ver la base, los logs y los Workers |

## Las claves (qué es cada una)

Están en `~/.senda/claves.txt` (permiso 600). **No van al repo.**

| Clave | Para qué sirve | Si se pierde |
|---|---|---|
| `ADMIN_TOKEN` | Entrar al panel y al script | Se carga uno nuevo como secret del Worker (ver Seguridad) |
| `PRIVATE_KEY` | Firma las licencias | Hay que rotar la clave: todas las apps deben actualizarse |
| `PUBLIC_KEY` | Va dentro de la app (verifica licencias) | Se deriva de la privada |
| `JWT_SECRET` | Firma las sesiones de datos | Los choferes reabren sesión solos al revalidar |
| `claudia-release.jks` (`~/.claudia-keystore/`) | Firma el APK | **No se puede actualizar ninguna app ya instalada** |

Las contraseñas del keystore están en `~/.gradle/gradle.properties`.

**Respaldos (Bitwarden, notas seguras):**

| Nota | Contenido |
|---|---|
| `Senda - claves del servidor` | `~/.senda/claves.txt` (las 4 claves) |
| `Senda - gradle.properties` | `~/.gradle/gradle.properties` (contraseñas del keystore) |
| `Senda - keystore release (base64)` | `claudia-release.jks` en base64, una sola línea |

Para restaurar el keystore: pegar el texto de la nota en un archivo `k.b64` y ejecutar
`base64 -d -i k.b64 > claudia-release.jks`. Si se cambia alguna de estas claves o archivos,
actualizar también la nota correspondiente.

## Opción 1 — Panel web

1. Abrí `https://senda.api.unitecapplications.com/admin`.
2. Pegá el `ADMIN_TOKEN` y tocá **Entrar**. El token vive solo en la memoria de la pestaña: si
   recargás, hay que pegarlo de nuevo. Para copiarlo sin buscarlo: `cd ~/Desarrollos/senda-api &&
   npm run token` (lo deja en el portapapeles y lo borra a los 60 s). Resumen de todo en
   `docs/instructivo-admin.md`.
3. El panel tiene tres pestañas: **Choferes**, **Resumen** y **Actividad**. En **Choferes**, arriba,
   está **Cargar chofer** (nombre, WhatsApp con código de país, mail opcional, plan).
4. En **Choferes**, cada chofer es una tarjeta con sus botones:
   - **WhatsApp**: abre el chat con el chofer (para avisarle del pago o confirmar un equipo nuevo).
   - **Mail** (si lo tiene cargado) y **Cargar mail / Cambiar mail**: el mail es solo un dato de
     contacto (no sirve para activar ni para entrar). Dejándolo vacío se quita.
   - **Renovar**: marca un pago y extiende el vencimiento. El selector de al lado elige el plan
     (por defecto «mismo plan»; para pasar de `trial` a `mensual` o `anual`, elegilo antes de tocar Renovar).
   - **Bloquear / Desbloquear**: corta o devuelve el acceso al instante.
   - **Ver equipo nuevo / Rechazar**: aparecen cuando el chofer abrió la app en otro teléfono.
   - **Borrar datos**: baja definitiva (pide escribir BORRAR).
5. **Tope global del APK** (al final de Choferes): alarga la fecha límite de todas las apps (solo se puede alargar).
6. **Resumen**: choferes en total, cuántos se conectaron en 7 días, cuántos vencen en 7 días, altas
   en 30 días, licencias por estado y por plan, cuentas en la nube, viajes cargados (total y en 30
   días) y viajes por chofer. Son solo números y fechas: no muestra pasajeros ni importes.
7. **Actividad**: altas, activaciones, rechazos, bloqueos (últimos 100). Es el registro de auditoría;
   está en su propia pestaña para no ensuciar la lista de choferes.

### Instalarlo en el teléfono (PWA «Unitec Admin»)

El panel es una app instalable y sirve para todas las apps de Unitec Applications.

- **Android (Chrome):** abrí la dirección del panel, menú ⋮ → **Instalar aplicación** (o el
  botón **Instalar como app** al final de la pantalla). Queda un ícono «Unitec Admin».
- **iPhone (Safari):** botón Compartir → **Agregar a pantalla de inicio**.

Al abrirla pide el token cada vez (no se guarda en el teléfono). Para no tipearlo, guardalo en el
gestor de contraseñas del teléfono o pegalo desde Bitwarden. Sin conexión solo se ve la pantalla
de entrada: los datos siempre vienen del servidor.

## Opción 2 — Script de terminal

```bash
cd ~/Desarrollos/senda-api
node scripts/admin.mjs                      # muestra todos los comandos
node scripts/admin.mjs token                # copia el token al portapapeles (= npm run token)
node scripts/admin.mjs lista                # choferes, plan, estado, vencimiento
node scripts/admin.mjs crear "Ana Pérez" 1155550000 trial ana@correo.com   # el mail es opcional
node scripts/admin.mjs mail 3 ana@correo.com   # carga o cambia el mail (sin mail, lo quita)
node scripts/admin.mjs resumen              # estados, planes y uso de la app
node scripts/admin.mjs renovar 3            # pago del chofer 3
node scripts/admin.mjs renovar 3 anual      # además cambia de plan
node scripts/admin.mjs bloquear 3
node scripts/admin.mjs desbloquear 3
node scripts/admin.mjs pendientes 3         # equipos nuevos esperando
node scripts/admin.mjs aprobar 3
node scripts/admin.mjs tipo 3 VIP_PAGO
node scripts/admin.mjs tope 2027-04-11
node scripts/admin.mjs eventos
node scripts/admin.mjs borrar 3 --si        # irreversible
```

El `id` es el número de la columna `id` de `lista`. El script lee el token de
`~/.senda/claves.txt`. El WhatsApp va **sin espacios** (`1155550000` o `5491155550000`): el
servidor lo normaliza a 549 + 10 dígitos.

## Situaciones de todos los días

**Alta de un chofer nuevo.** Cargarlo (panel o `crear`) con plan `trial` (30 días). Mandarle el APK
por WhatsApp. Al abrirlo escribe su número, acepta el aviso y queda activo. Te llega un aviso por
mail a `hcebreiro@gmail.com` (y queda en `eventos`).

**Cobró un mes / un año.** `Renovar`. Si estaba en trial, pasarlo de plan con
`renovar <id> mensual` o `renovar <id> anual`.

**Cambió de teléfono o reseteó el suyo.** El teléfono nuevo queda «pendiente» y la app le dice que
espere. Hablá con el chofer por WhatsApp para confirmar que es él y recién ahí `aprobar`. Conserva
su fecha de inicio y sus datos.

**Dejó de pagar o hay que cortarlo.** `Bloquear`. Pierde el acceso en el acto y ve «Tu acceso está
suspendido» con un botón para escribirte. Al `Desbloquear`, toca «Ya me habilitaron» y sigue.

**VIP gratis para alguien de confianza.** Plan `vip` (sin vencimiento). Sigue pasando por el
chequeo, así que se puede cortar.

**Pidió que borres sus datos (Ley 25.326).** `borrar <id> --si`. Borra al chofer, sus viajes con
datos de pasajeros, gastos, perfil y sesiones, y su número del registro de actividad. No se puede
deshacer.

**Ver qué pasó con alguien.** `eventos` (los últimos 100) o el panel de Cloudflare → D1 → `senda`.

## Mantenimiento periódico

- **Tope grabado en el APK.** Hoy es el **11/01/2027** (`TOPE_GRABADO` en `src/licencia/config.ts`).
  Un APK sin licencia vigente se bloquea pasada esa fecha. Antes de esa fecha, o se alarga el tope
  desde el panel (llega a las apps con internet), o se compila un APK nuevo con otra fecha.
- **Compilar un APK nuevo:** `cd ~/Claudia_app && bash scripts/probar-emulador.sh` (compila el
  release firmado, lo instala en el emulador y deja el APK en
  `android/app/build/outputs/apk/release/app-release.apk`). Copiarlo a `distribucion/Senda.apk`.
  Se instala **encima** del anterior sin perder datos, porque la firma es la misma.
- **Publicar la agenda web:** `cd ~/Desarrollos/senda-api && npm run agenda && npx wrangler deploy`
  (la sirve el mismo Worker; el proyecto Pages `michoferprivado` ya se borró).
- **Desplegar el servidor:** `cd ~/Desarrollos/senda-api && npm test && npx wrangler deploy`.
- **Cambiar el mail de avisos:** `TO` en `wrangler.jsonc` y volver a desplegar.

## Si algo falla

| Síntoma | Qué mirar |
|---|---|
| El panel dice «Token incorrecto» | Estás pegando otro token. Se ve en `~/.senda/claves.txt`. Cada intento fallido queda como `admin_rechazado` en eventos. |
| Un chofer dice que su número no está cargado | No está en `lista`, o lo cargaste con otro número. Cargarlo de nuevo con el código de país. |
| Un chofer dice «esperando aprobación» | Está en otro teléfono: `pendientes <id>` y `aprobar <id>`. |
| La agenda dice «No encontramos un chofer con ese enlace» | El enlace está mal copiado. Que lo copie de nuevo desde el Inicio de la app. |
| No llegan mails de aviso | La actividad igual queda registrada en `eventos`. Revisar el envío de correo en Cloudflare. |
| Nada responde | Panel de Cloudflare → Workers → `senda-api` → Logs. |

## Seguridad

- El token da control total sobre los choferes: no lo pegues en chats ni mails.
- El panel solo se abre con el token; sin él no devuelve nada.
- Para cambiar el token: generar uno largo y aleatorio (`openssl rand -hex 32`), cargarlo con
  `cd ~/Desarrollos/senda-api && npx wrangler secret put ADMIN_TOKEN` y actualizar la línea
  `ADMIN_TOKEN` de `~/.senda/claves.txt`.
