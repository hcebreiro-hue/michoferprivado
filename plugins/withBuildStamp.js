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
    //    Formato AAMMDDNNN: año(2) mes(2) día(2) + tramo de 2 minutos del día (3).
    //    Android exige que sea un entero creciente; así nunca hay que acordarse
    //    de subirlo a mano. tomo la fecha real del sistema en tiempo de build.
    //
    //    El cálculo se escribe como expresión Groovy y se evalúa cuando corre
    //    Gradle (no solo en `expo prebuild`). Así, compilar con
    //    `./gradlew assembleRelease` ya da un número nuevo sin repetir el
    //    prebuild, y la fecha nunca queda vieja.
    //
    //    El sufijo del día (NNN) es el tramo de 2 minutos transcurrido, de 000 a
    //    719: sube cada 2 minutos y no se satura. Son 9 dígitos (AAMMDDNNN), así
    //    que siempre supera a los códigos viejos de 8 dígitos ya instalados.
    //    Dos compilaciones dentro del mismo tramo de 2 minutos darían el mismo
    //    número. Cabe en un entero de 32 bits hasta el año 2099.
    const versionCodeExpr =
      "Integer.parseInt(java.time.LocalDate.now().format(" +
      "java.time.format.DateTimeFormatter.ofPattern('yyMMdd')) + " +
      "String.format('%03d', java.time.LocalTime.now().toSecondOfDay().intdiv(120)))";

    contents = contents.replace(
      /versionCode\s+(\d+|Integer\.parseInt\(.*\))/,
      () => `versionCode ${versionCodeExpr}`,
    );

    mod.modResults.contents = contents;
    return mod;
  });
};

module.exports = createRunOncePlugin(withBuildStamp, 'michoferprivado.build-stamp', '1.0.0');
