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
 *  2. `BUILD_STAMP` (fecha/hora ISO de la compilación) como `buildConfigField`,
 *     para que "Acerca de" pueda mostrar cuándo se compiló el APK.
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
    const versionCode = `${yy}${mm}${dd}${nn}`;

    contents = contents.replace(
      /versionCode\s+\d+/,
      `versionCode ${versionCode}`,
    );

    // 2) Sello de compilación legible, para mostrarlo en "Acerca de".
    //    Se expone como BuildConfig.BUILD_STAMP (String).
    const stamp = now.toISOString();
    const buildConfigLine = `buildConfigField "String", "BUILD_STAMP", "\\"${stamp}\\""`;

    // Se inserta dentro de defaultConfig, después de la última línea que ya
    // exista ahí (o al final del bloque si no reconocemos nada).
    if (contents.includes('buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"')) {
      contents = contents.replace(
        /(\s*)buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"[^\n]*/,
        (match) => `${match}\n        ${buildConfigLine}`,
      );
    } else {
      contents = contents.replace(
        /(\s*)(versionName\s+"[^"]*")/,
        (_match, indent, versionName) =>
          `${indent}${versionName}\n\n        ${buildConfigLine}`,
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });
};

module.exports = createRunOncePlugin(withBuildStamp, 'michoferprivado.build-stamp', '1.0.0');
