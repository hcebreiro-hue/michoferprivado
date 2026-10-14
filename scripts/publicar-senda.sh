#!/bin/bash
# Publicar Senda de punta a punta, con un solo comando (o doble clic en "Publicar Senda.command").
#
#   1. Revisa que todo esté listo (internet, herramientas, firma, sesión de Cloudflare;
#      si la sesión venció, abre el navegador para volver a entrar).
#   2. Corre las pruebas (tipos, tests, lint). Si algo falla, no sigue.
#   3. Propone la versión nueva y la graba en app.json.
#   4. Compila el APK de release y comprueba que sea el correcto: versión, paquete,
#      versionCode mayor que el publicado y MISMA FIRMA de siempre (si cambiara, los
#      teléfonos no podrían actualizar).
#   5. Pide una confirmación y lo publica en /descargar (R2).
#   6. Verifica que lo que baja producción sea idéntico al compilado.
#   Al final guarda la versión en git, la sube a GitHub y copia el APK al SSD si está conectado.
#
# Opciones (para pruebas o uso sin preguntas):
#   --chequear        solo revisa y corre las pruebas; no cambia nada
#   --sin-publicar    compila y verifica, pero NO publica
#   --version=X.Y.Z   usa esa versión sin preguntar
#   --si              no pide confirmaciones
set -eEo pipefail

# Doble clic no carga ~/.zshrc: se define todo acá.
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

APP="$HOME/Desarrollos/Claudia_app"
API="$HOME/Desarrollos/senda-api"
BT="$ANDROID_HOME/build-tools/36.0.0"
APK="$APP/android/app/build/outputs/apk/release/app-release.apk"
URL="https://agenda.senda.unitecapplications.com"
PAQUETE="com.michoferprivado.app"
# Huella SHA-256 del certificado con que se firmó TODA versión publicada (no es secreta).
CERT_ESPERADO="11056efddb237dc5ab866809d9c37d42dac022a82b88f0676fd9be197c1c29ac"

SOLO_CHEQUEAR=0
SIN_PUBLICAR=0
SIN_PREGUNTAR=0
VERSION_FIJA=""
for a in "$@"; do
  case "$a" in
    --chequear) SOLO_CHEQUEAR=1 ;;
    --sin-publicar) SIN_PUBLICAR=1 ;;
    --si) SIN_PREGUNTAR=1 ;;
    --version=*) VERSION_FIJA="${a#--version=}" ;;
    *) echo "Opción desconocida: $a"; exit 2 ;;
  esac
done

VERDE=$'\033[0;32m'; ROJO=$'\033[0;31m'; AMARILLO=$'\033[1;33m'; GRIS=$'\033[0;90m'; NADA=$'\033[0m'
LOGS="$(mktemp -d /tmp/publicar-senda.XXXXXX)"
INICIO=$(date +%s)

paso() { echo; echo "${VERDE}==>${NADA} $*"; }
aviso() { echo "${AMARILLO}!${NADA} $*"; }
ok() { echo "   ${VERDE}✔${NADA} $*"; }
minutos() { local s=$(( $(date +%s) - INICIO )); printf '%dm%02ds' $((s / 60)) $((s % 60)); }

notificar() {
  osascript -e 'on run argv' -e 'display notification (item 2 of argv) with title (item 1 of argv)' -e 'end run' "$1" "$2" >/dev/null 2>&1 || true
}
esperar() {
  if [ -t 0 ] && [ "$SIN_PREGUNTAR" = 0 ]; then
    echo; read -r -p "Presioná Enter para cerrar... " _ || true
  fi
}
fallar() {
  trap - ERR
  echo; echo "${ROJO}✘ $*${NADA}" >&2
  echo "${GRIS}Detalle completo en: $LOGS${NADA}" >&2
  notificar "Senda: no se publicó" "$*"
  esperar
  exit 1
}
trap 'fallar "Algo salió mal (línea $LINENO). Mirá el mensaje de arriba."' ERR

preguntar() { # $1 = texto, $2 = valor por defecto -> imprime la respuesta
  local r=""
  if [ -t 0 ] && [ "$SIN_PREGUNTAR" = 0 ]; then read -r -p "$1" r || true; fi
  echo "${r:-$2}"
}

# Corre un comando largo mostrando puntos; el detalle va a un archivo.
con_puntos() { # $1 = archivo de log, resto = comando
  local log="$1"; shift
  "$@" >"$log" 2>&1 &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do sleep 10; printf '.'; done
  echo
  wait "$pid" || { echo "${GRIS}$(tail -n 12 "$log")${NADA}"; return 1; }
}

mayor() { printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | tail -n 1; }
siguiente() { local a b c; IFS=. read -r a b c <<<"$1"; echo "$a.$b.$((c + 1))"; }
cloudflare_ok() { (cd "$API" && npx wrangler r2 object get senda-apk/version.json --remote --pipe >"$LOGS/version.json" 2>"$LOGS/cf.err"); }

echo "${VERDE}Publicar Senda${NADA}  $(date '+%d/%m/%Y %H:%M')"
# ---------------------------------------------------------------- 1. Revisión
paso "1/6 Revisando que todo esté listo"
curl -s -m 10 -o /dev/null -w '%{http_code}' "$URL/descargar" | grep -q 200 || fallar "No hay internet, o el servidor de descargas no responde."
ok "internet y servidor de descargas"

for h in node npm npx java; do command -v "$h" >/dev/null || fallar "Falta la herramienta: $h"; done
[ -x "$BT/aapt" ] && [ -x "$BT/apksigner" ] || fallar "Faltan aapt/apksigner en $BT"
java -version 2>&1 | grep -q 'version "17' || fallar "Hace falta Java 17 (JAVA_HOME=$JAVA_HOME)."
ok "node, java 17 y herramientas de Android"

PROPS="$HOME/.gradle/gradle.properties"
grep -q '^CLAUDIA_STORE_FILE' "$PROPS" 2>/dev/null || fallar "Falta la configuración de firma en $PROPS."
KS="$(grep '^CLAUDIA_STORE_FILE' "$PROPS" | head -1 | cut -d= -f2-)"
[ -f "$KS" ] || fallar "No existe el keystore de firma: $KS"
ok "clave de firma encontrada"

if ! cloudflare_ok; then
  aviso "La sesión de Cloudflare venció. Se abre el navegador: tocá «Allow» y volvé acá."
  (cd "$API" && npx wrangler login) || true
  cloudflare_ok || fallar "No pude entrar a Cloudflare: $(head -c 300 "$LOGS/cf.err")"
fi
PUBLICADA="$(node -p "JSON.parse(require('fs').readFileSync('$LOGS/version.json','utf8')).version")"
ok "sesión de Cloudflare (versión publicada hoy: $PUBLICADA)"

cd "$APP"
CAMBIOS="$(git status --short | grep -v -E 'senda_demo|^\?\? ' || true)"
if [ -n "$CAMBIOS" ]; then
  aviso "Hay cambios sin guardar en git; entran en el APK:"
  echo "$CAMBIOS" | sed 's/^/     /'
  r="$(preguntar '   ¿Seguir igual? (Enter = sí, n = cancelar): ' s)"
  [ "$r" = n ] && { echo "Cancelado."; exit 0; }
fi

# ------------------------------------------------------------------ 2. Pruebas
paso "2/6 Corriendo las pruebas (tipos, tests y lint)"
con_puntos "$LOGS/tsc.log" npx tsc --noEmit || fallar "Error de tipos. No se publica."
ok "tipos"
con_puntos "$LOGS/test.log" npm test || fallar "Fallaron las pruebas. No se publica."
ok "$(grep -E '^ℹ pass' "$LOGS/test.log" | head -1 | sed 's/ℹ //') pruebas"
con_puntos "$LOGS/lint.log" npx expo lint || fallar "El lint encontró errores. No se publica."
ok "lint"

LOCAL="$(node -p "require('$APP/app.json').expo.version")"
BASE="$(mayor "$LOCAL" "$PUBLICADA")"
if [ "$LOCAL" != "$PUBLICADA" ] && [ "$BASE" = "$LOCAL" ]; then SUGERIDA="$LOCAL"; else SUGERIDA="$(siguiente "$BASE")"; fi

if [ "$SOLO_CHEQUEAR" = 1 ]; then
  echo; echo "${VERDE}Todo en orden.${NADA} Versión local $LOCAL, publicada $PUBLICADA, la próxima sería $SUGERIDA."
  echo "(Modo --chequear: no se cambió nada.)"; esperar; exit 0
fi

# ------------------------------------------------------------------ 3. Versión
paso "3/6 Versión"
if [ -n "$VERSION_FIJA" ]; then NUEVA="$VERSION_FIJA"; else NUEVA="$(preguntar "   Versión a publicar [$SUGERIDA] (Enter = aceptar): " "$SUGERIDA")"; fi
[[ "$NUEVA" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fallar "La versión «$NUEVA» no es válida (usá algo como 2.0.4)."
[ "$(mayor "$NUEVA" "$PUBLICADA")" = "$NUEVA" ] || fallar "La versión $NUEVA es MENOR que la publicada ($PUBLICADA)."
if [ "$NUEVA" != "$LOCAL" ]; then
  V="$NUEVA" perl -0pi -e 's/("version"\s*:\s*")[^"]*(")/$1.$ENV{V}.$2/e' "$APP/app.json"
  [ "$(node -p "require('$APP/app.json').expo.version")" = "$NUEVA" ] || fallar "No pude actualizar la versión en app.json."
fi
ok "versión $NUEVA"

# ------------------------------------------------------------------ 4. Compilar
paso "4/6 Compilando el APK (tarda unos 5 minutos)"
cp "$APP/package.json" "$LOGS/package.json.bak"   # prebuild reescribe los scripts: se restauran
con_puntos "$LOGS/prebuild.log" npx expo prebuild --platform android --no-install --clean || { cp "$LOGS/package.json.bak" "$APP/package.json"; fallar "Falló la preparación (prebuild)."; }
cp "$LOGS/package.json.bak" "$APP/package.json"
ok "proyecto Android regenerado"
cd "$APP/android"
con_puntos "$LOGS/gradle.log" ./gradlew assembleRelease --console=plain || fallar "Falló la compilación."
cd "$APP"
[ -f "$APK" ] || fallar "No encuentro el APK compilado."

INFO="$("$BT/aapt" dump badging "$APK" 2>/dev/null || true)"
VN="$(echo "$INFO" | grep -o "versionName='[^']*'" | head -1 | sed "s/versionName='//;s/'//" || true)"
VC="$(echo "$INFO" | grep -o "versionCode='[0-9]*'" | head -1 | grep -o '[0-9]*' || true)"
PK="$(echo "$INFO" | grep -o "package: name='[^']*'" | head -1 | sed "s/package: name='//;s/'//" || true)"
CERT="$("$BT/apksigner" verify --print-certs "$APK" 2>/dev/null | grep 'certificate SHA-256' | head -1 | awk '{print $NF}' || true)"

[ "$VN" = "$NUEVA" ] || fallar "El APK dice versión «$VN», no $NUEVA."
[ "$PK" = "$PAQUETE" ] || fallar "El APK tiene otro paquete: «$PK»."
[ -n "$VC" ] || fallar "No pude leer el versionCode del APK."
[ "$CERT" = "$CERT_ESPERADO" ] || fallar "¡La FIRMA del APK no es la de siempre! Los teléfonos no podrían actualizar. No se publica."
ok "versión $VN, paquete correcto, firma de siempre"

PREVIO="$APP/distribucion/Senda.apk"
if [ -f "$PREVIO" ]; then
  VC_PREVIO="$("$BT/aapt" dump badging "$PREVIO" 2>/dev/null | grep -o "versionCode='[0-9]*'" | head -1 | grep -o '[0-9]*' || true)"
  if [ -n "$VC_PREVIO" ]; then
    [ "$VC" -ge "$VC_PREVIO" ] || fallar "El versionCode ($VC) es MENOR que el anterior ($VC_PREVIO): Android no deja actualizar hacia atrás."
    [ "$VC" -gt "$VC_PREVIO" ] || aviso "El versionCode es igual al anterior ($VC); algunos teléfonos podrían no actualizar."
  fi
fi
ok "versionCode $VC, $(du -h "$APK" | cut -f1)"

if [ "$SIN_PUBLICAR" = 1 ]; then
  echo; echo "${VERDE}Compilado y verificado en $(minutos).${NADA} (Modo --sin-publicar: no se subió nada.)"
  echo "APK: $APK"; notificar "Senda $VN" "Compilada y verificada. No se publicó."; esperar; exit 0
fi

# ---------------------------------------------------------------- 5. Publicar
paso "5/6 Publicar en $URL/descargar"
r="$(preguntar "   Esto REEMPLAZA la app que descarga la gente: pasa de $PUBLICADA a $VN. ¿Publicar? (Enter = sí, n = no): " s)"
[ "$r" = n ] && { echo "No se publicó. El APK quedó compilado en: $APK"; esperar; exit 0; }
con_puntos "$LOGS/publicar.log" bash "$API/scripts/publicar-apk.sh" --no-build || fallar "Falló la subida a Cloudflare."
ok "subido"

# ------------------------------------------------------------ 6. Verificación
paso "6/6 Verificando lo que baja producción"
# Se pide desde el byte 1: así NO suma una descarga falsa al contador (solo cuenta desde el byte 0).
curl -s -f -r 1- -o "$LOGS/prod.cola" "$URL/descargar/Senda.apk" || fallar "No pude bajar el APK publicado."
H_LOCAL="$(tail -c +2 "$APK" | shasum -a 256 | cut -d' ' -f1)"
H_PROD="$(shasum -a 256 "$LOGS/prod.cola" | cut -d' ' -f1)"
[ "$H_LOCAL" = "$H_PROD" ] || fallar "¡Lo publicado NO coincide con lo compilado! Revisá antes de avisar a nadie."
ok "el archivo publicado es idéntico al compilado"
cloudflare_ok || fallar "No pude leer la versión publicada."
[ "$(node -p "JSON.parse(require('fs').readFileSync('$LOGS/version.json','utf8')).version")" = "$VN" ] || fallar "La versión publicada no es $VN."
ok "la página de descargas muestra la versión $VN"

# ------------------------------------------------------------------ Cierre
if [ "$NUEVA" != "$LOCAL" ] && ! git diff --quiet -- app.json; then
  git add app.json && git commit -q -m "Senda $VN" && ok "versión guardada en git ($(git rev-parse --short HEAD))"
fi
if git remote get-url origin 2>/dev/null | grep -q '/Senda\.git$'; then
  git push -q origin HEAD && ok "subido a GitHub" || aviso "No pude subir a GitHub (la app ya está publicada)."
else
  aviso "El remoto de git no es el repositorio Senda: no se subió a GitHub."
fi
SSD="$(ls -d "/Volumes/SSD Horacio/Desarrollos/Respaldo_"* 2>/dev/null | tail -n 1 || true)"
if [ -n "$SSD" ] && [ -d "$SSD/Claudia_app/distribucion" ]; then
  cp -p "$APP/distribucion/Senda_$VN.apk" "$APP/distribucion/Senda.apk" "$SSD/Claudia_app/distribucion/" 2>/dev/null && ok "copia del APK en el SSD" || aviso "No pude copiar al SSD."
else
  aviso "El SSD no está conectado: sin copia de respaldo."
fi

echo; echo "${VERDE}✔ Senda $VN publicada en $(minutos).${NADA}"
echo "  Descarga: $URL/descargar"
notificar "Senda $VN publicada" "Ya se puede descargar desde /descargar."
esperar
