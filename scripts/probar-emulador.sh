#!/bin/bash
# Compila el APK de release y lo instala en el emulador (o en un celu conectado).
#
# Uso:
#   ./scripts/probar-emulador.sh              # compila e instala
#   ./scripts/probar-emulador.sh --no-build   # solo instala el ultimo APK
#
# Hace todo de corrido: prebuild (para recalcular el versionCode y el sello de
# compilacion), compilacion nativa, instalacion y arranque. Lo que antes eran
# 5 pasos manuales + copiar el APK a mano.
set -euo pipefail

cd "$(dirname "$0")/.."

SDK="/opt/homebrew/share/android-commandlinetools"
ADB="$SDK/platform-tools/adb"
AVD="Pixel8"
APK="android/app/build/outputs/apk/release/app-release.apk"

VERDE=$'\033[0;32m'
AMARILLO=$'\033[1;33m'
GRIS=$'\033[0;90m'
NADA=$'\033[0m'
paso() { echo; echo "${VERDE}==>${NADA} $*"; }
aviso() { echo "${AMARILLO}!${NADA} $*"; }

# --- 1. Emulador arriba -----------------------------------------------------
# Sin esto, `adb install` falla con "no devices/emulators found" y uno se queda
# sin saber si el problema es el build o el emulador.
paso "Verificando emulador..."
if ! "$ADB" get-state >/dev/null 2>&1; then
  aviso "El emulador no esta corriendo; lo arranco (puede tardar ~1 min)."
  cat > /tmp/.start-avd.sh <<EOF
#!/bin/bash
cd "$SDK/emulator"
exec ./emulator -avd "$AVD" -no-snapshot-save -no-boot-anim -gpu auto -no-audio
EOF
  chmod +x /tmp/.start-avd.sh
  nohup /tmp/.start-avd.sh > /tmp/emulador.log 2>&1 &
fi

"$ADB" wait-for-device
# `sys.boot_completed` es la unica forma confiable de saber que termino de
# bootear; `wait-for-device` vuelve antes, con el sistema todavia cargando.
for _ in $(seq 1 60); do
  [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
  sleep 2
done
echo "   Dispositivo: $("$ADB" devices | grep -w device | head -1)"

# --- 2. Compilar ------------------------------------------------------------
if [ "${1:-}" != "--no-build" ]; then
  # OJO: `expo prebuild` REESCRIBE los scripts de package.json a
  # `expo run:android`, perdidos para siempre si no se restaturan.
  paso "Regenerando android/ (recalcula versionCode con la fecha de hoy)..."
  npx expo prebuild --platform android --no-install --clean
  git checkout package.json 2>/dev/null || aviso "No pude restaurar package.json; revisalo."

  paso "Compilando APK de release (esto tarda varios minutos)..."
  cd android
  ./gradlew assembleRelease
  cd ..
fi

if [ ! -f "$APK" ]; then
  echo "No encuentro el APK en $APK. Compilalo sin --no-build." >&2
  exit 1
fi

# --- 3. Que version estamos instalando --------------------------------------
# Es lo que distingue un build de otro: si esto no cambia entre dos compilaciones,
# el APK es el mismo aunque el reloj diga lo contrario.
paso "Identidad del APK:"
VC=$("$SDK/build-tools/36.0.0/aapt" dump badging "$APK" 2>/dev/null \
  | grep -o "versionCode='[0-9]*'" | head -1 | grep -o '[0-9]*' || echo "?")
VN=$("$SDK/build-tools/36.0.0/aapt" dump badging "$APK" 2>/dev/null \
  | grep -o "versionName='[^']*'" | head -1 | sed "s/versionName='//;s/'//" || echo "?")
echo "   versionName = $VN"
echo "   versionCode = $VC"
[ "$VC" != "?" ] && echo "   fecha        = ${VC:4:2}/${VC:2:2}/${VC:0:2}  (decodificada del versionCode)"

# --- 4. Instalar y abrir ----------------------------------------------------
paso "Instalando..."
"$ADB" install -r "$APK"

paso "Abriendo la app..."
"$ADB" shell monkey -p com.michoferprivado.app \
  -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1

echo
echo "${VERDE}Listo.${NADA} Para ver los logs mientras probas, en otra terminal:"
echo "${GRIS}  $ADB logcat -s ReactNativeJS:V AndroidRuntime:E${NADA}"
echo
echo "Atajo util (guardalo):"
echo "${GRIS}  $ADB exec-out screencap -p > /tmp/pantalla.png${NADA}"
