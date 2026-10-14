# Senda — Instructivo rápido de administración

Una página para el día a día. El detalle completo está en `administracion.md`.

## 1. Cómo conseguir el token (la «llave» del panel)

El token es el valor `ADMIN_TOKEN`. Es largo (43 caracteres) y no se memoriza: se copia.

| Desde dónde | Cómo |
|---|---|
| **La Mac (lo más fácil)** | En Terminal: `cd ~/Desarrollos/senda-api && npm run token`. Copia el token al portapapeles sin mostrarlo y lo borra solo a los 60 s. Después `Cmd+V` en el panel. |
| **Bitwarden** | Nota segura «Senda - claves del servidor» → copiar **solo el valor** de la línea `ADMIN_TOKEN` (sin `ADMIN_TOKEN =`). |
| **El archivo** | `~/.senda/claves.txt`, línea `ADMIN_TOKEN = ...` |
| **El teléfono** | Guardarlo una vez en el gestor de contraseñas del teléfono (usuario `admin`, contraseña = token). Desde ahí se autocompleta. |

**Truco para no copiar nada:** en Bitwarden creá un **Login** nuevo con
- Nombre: `Unitec Admin`
- Usuario: `admin`
- Contraseña: el token
- URI: `https://senda.api.unitecapplications.com/admin/`

El panel tiene un campo de usuario oculto (`admin`), así que Bitwarden y el gestor del teléfono
ofrecen autocompletar al abrirlo. (Una nota segura no se autocompleta: tiene que ser un Login.)

El token **no se guarda** en el navegador: si cerrás o recargás la pestaña, hay que ingresarlo de nuevo.

## 2. Entrar al panel

1. Abrí `https://senda.api.unitecapplications.com/admin/`.
2. Pegá el token y tocá **Entrar**. «Token incorrecto» = estás pegando otro valor.

**Instalarlo como app:** Chrome en Android → menú ⋮ → *Instalar aplicación*; en PC, botón
**Instalar** de la barra de direcciones; iPhone → Safari → Compartir → *Agregar a pantalla de inicio*.

## 3. Tareas de todos los días

| Quiero… | En el panel |
|---|---|
| Dar de alta un chofer | **Cargar chofer**: nombre, WhatsApp **con código de país**, plan `trial` (30 días). Pasale el APK por WhatsApp. |
| Registrar un pago | **Renovar** en su tarjeta. Si estaba en `trial`, elegí `mensual` o `anual` en el selector **antes** de tocar Renovar. |
| Cortarle el acceso | **Bloquear** (efecto inmediato). **Desbloquear** lo devuelve. |
| Aprobar un teléfono nuevo | **Ver equipo nuevo** → hablá con el chofer por WhatsApp para confirmar que es él → aprobar. **Rechazar** si no. |
| Escribirle al chofer | **WhatsApp** (abre el chat). |
| Borrar sus datos (Ley 25.326) | **Borrar datos** → escribir `BORRAR`. No se puede deshacer. |
| Cargar o cambiar el mail de un chofer | **Cargar mail / Cambiar mail** en su tarjeta (opcional; vacío lo quita). |
| Ver cuántos choferes hay y cuánto usan la app | Pestaña **Resumen**. |
| Ver qué pasó | Pestaña **Actividad** (altas, activaciones, rechazos, bloqueos). |
| Alargar la fecha límite del APK | **Tope global del APK** (solo se puede alargar, nunca acortar). |

Planes: `trial` (30 días) · `mensual` · `anual` · `vip` (sin vencimiento, igual se puede bloquear).

## 4. Lo mismo desde la Terminal (opcional)

```bash
cd ~/Desarrollos/senda-api
node scripts/admin.mjs lista               # choferes y sus id
node scripts/admin.mjs resumen             # estados, planes y uso de la app
node scripts/admin.mjs renovar 3           # pago del chofer 3
node scripts/admin.mjs bloquear 3
node scripts/admin.mjs eventos
node scripts/admin.mjs                     # todos los comandos
```

El script lee el token solo, de `~/.senda/claves.txt`.

## 5. Mantenimiento

| Qué | Cuándo | Cómo |
|---|---|---|
| **Tope del APK** | Antes del **11/01/2027** | Panel → *Tope global*, o compilar un APK nuevo. Si se pasa la fecha, los APK sin licencia vigente se bloquean. |
| **Desplegar el servidor** | Si cambia el código | `cd ~/Desarrollos/senda-api && npm test && npx wrangler deploy` |
| **APK nuevo** | Si cambia la app | `bash ~/Desarrollos/senda-api/scripts/publicar-apk.sh`: compila y lo publica en `/descargar` (el QR no cambia). Se instala encima sin perder datos. |
| **Ver descargas del APK** | Cuando quieras | Panel → *Resumen* → *Descargas del APK*, o `node scripts/admin.mjs resumen`. Cada descarga también llega por mail. |
| **Agenda web** | Si cambia la app | `cd ~/Desarrollos/senda-api && npm run agenda && npx wrangler deploy` |
| **Cambiar el token** | Si se filtró | `openssl rand -hex 32`, luego `cd ~/Desarrollos/senda-api && npx wrangler secret put ADMIN_TOKEN`, y actualizar `~/.senda/claves.txt`, la nota de Bitwarden y el Login `Unitec Admin`. |

## 6. Respaldos (no perder nunca)

Tres notas seguras en Bitwarden: **claves del servidor**, **gradle.properties** y
**keystore release (base64)**. Sin el keystore no se puede actualizar ninguna app ya instalada.

## 7. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| «Token incorrecto» | Copiá de nuevo con `npm run token`. Los intentos fallidos quedan en la actividad. |
| Un chofer dice que su número no está cargado | Cargarlo de nuevo con código de país. |
| Un chofer dice «esperando aprobación» | Está en otro teléfono: aprobarlo desde su tarjeta. |
| Nada responde | Panel de Cloudflare → Workers → `senda-api` → Logs. |

## 8. Seguridad

- El token da control total: **no lo pegues en chats ni mails**.
- Nunca va al repositorio.
- Si sospechás que se filtró, cambialo (sección 5).
