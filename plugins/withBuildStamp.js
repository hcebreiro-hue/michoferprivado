const {
  createRunOncePlugin,
  withAppBuildGradle,
} = require('@expo/config-plugins');

/**
 * Sello de compilación + versionCode automático.
 *
 * Problema que resuelve: `android/` es generado por `expo prebuild`, así que
 * cualquier edición a mano en `android/app/build.gradle` se pierde. Este plugin
 * reescribe el gradle en cada prebuild y deja dos cosas automáticas:
 *
 *  1. `versionCode` derivado de la fecha (AAMMDDNN): SIEMPRE sube entre builds,
 *     que es lo que Android exige para poder instalar una actualización encima.
 *     Antes estaba fijo en 1, por lo que una segunda APK no se podía instalar
 *     sobre la primera.
 *
 * Sobre `BUILD_STAMP`: ya NO se inyecta. Se intentó con `buildConfigField`, pero
 * eso solo genera una constante JAVA dentro de `BuildConfig.java`, que no es un
 * módulo de React Native y por ende es inalcanzable desde JS. La app lo detectó
 * en el emulador: "Acerca de" mostraba "Versión de desarrollo" dentro del APK.
 * La fecha ahora se DECODIFICA del `versionCode` (ver `src/lib/appVersion.ts`),
 * que sí llega a JavaScript vía `Application.nativeBuildVersion`.
 *
 * La versión visible (1.2.0, etc.) sigue saliendo de `app.json` -> `version`,
 * que es la única fuente de verdad que se edita a mano.
 */
const withBuildStamp = (config) => {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.language === 'groovy' && mod.modResults.language !== 'groovy') {
      return mod;
    }

    let contents = mod.modResults.contents;

    // 1) versionCode automático basado en la fecha de compilación.
    //    Formato AAMMDDNN: año(2) mes(2) día(2) + contador de build del día (2).
    //    Android exige que sea un entero creciente; así nunca hay que acordarse
    //    de subirlo a mano. tomo la fecha real del sistema en tiempo de build.
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    // Contador diario: segundos transcurridos del día / 60, limitado a 99.
    const secondsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const nn = String(Math.min(99, Math.floor(secondsOfDay / 60))).padStart(2, '0');
    // 2) Limpieza defensiva: si un build anterior dejó el BUILD_STAMP inyectado
    //    en el android/ regenerado, no hace falta borrarlo a mano (prebuild
    //    reescribe el archivo completo), pero nunca se vuelve a agregar.
    const versionCode = `${yy}${mm}${dd}${nn}`;

    contents = contents.replace(
      /versionCode\s+\d+/,
      `versionCode ${versionCode}`,
    );

    mod.modResults.contents = contents;
    return mod;
  });
};

module.exports = createRunOncePlugin(withBuildStamp, 'michoferprivado.build-stamp', '1.0.0');
