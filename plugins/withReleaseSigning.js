const {
  createRunOncePlugin,
  withAppBuildGradle,
} = require('@expo/config-plugins');

/**
 * Firma del build RELEASE con el keystore propio (no con debug.keystore).
 *
 * Por qué importa: el ID de equipo que usa la licencia (`Application.getAndroidId()`)
 * es único por combinación de clave de firma + usuario + equipo. Si la firma
 * cambia, TODOS los equipos activados cambian de ID y hay que re-aprobarlos.
 * `android/` se regenera con `expo prebuild`, por eso la firma se configura acá
 * y no a mano en build.gradle.
 *
 * Las credenciales NO están en el repo: se leen de ~/.gradle/gradle.properties
 * (o de variables de entorno) con estos nombres:
 *   CLAUDIA_STORE_FILE, CLAUDIA_STORE_PASSWORD, CLAUDIA_KEY_ALIAS, CLAUDIA_KEY_PASSWORD
 *
 * Si faltan y se compila un release, el build FALLA: nunca cae en silencio a la
 * firma de debug (eso cambiaría el ID de equipo de todos los choferes).
 */
const MARKER = '// claudia-release-signing';

const SIGNING_RELEASE = `
        release {
            ${MARKER}
            def claudiaProp = { String n -> (findProperty(n) ?: System.getenv(n)) as String }
            if (claudiaProp('CLAUDIA_STORE_FILE')) {
                storeFile file(claudiaProp('CLAUDIA_STORE_FILE'))
                storePassword claudiaProp('CLAUDIA_STORE_PASSWORD')
                keyAlias claudiaProp('CLAUDIA_KEY_ALIAS')
                keyPassword claudiaProp('CLAUDIA_KEY_PASSWORD')
            }
        }`;

const GUARD = `
// ${MARKER}-guard
gradle.taskGraph.whenReady { graph ->
    def claudiaRelease = graph.allTasks.any { it.name.toLowerCase().contains('release') }
    def claudiaFile = (findProperty('CLAUDIA_STORE_FILE') ?: System.getenv('CLAUDIA_STORE_FILE'))
    if (claudiaRelease && !claudiaFile) {
        throw new GradleException('Falta CLAUDIA_STORE_FILE (keystore de release). Ver ~/.gradle/gradle.properties. No se firma un release con la clave de debug.')
    }
    if (claudiaRelease && !file(claudiaFile).exists()) {
        throw new GradleException("No existe el keystore de release: \${claudiaFile}")
    }
}
`;

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    let contents = mod.modResults.contents;
    if (contents.includes(MARKER)) return mod; // ya aplicado: idempotente

    // 1) El buildType release deja de usar la firma de debug. Se hace PRIMERO,
    //    antes de insertar el bloque signingConfigs.release.
    const antes = contents;
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );
    if (contents === antes) {
      throw new Error(
        'withReleaseSigning: no encontré "signingConfig signingConfigs.debug" en el buildType release. El template de Expo cambió; revisar el plugin.',
      );
    }

    // 2) Se agrega signingConfigs.release justo antes del bloque debug.
    const conRelease = contents.replace(
      /signingConfigs\s*\{(\s*)debug\s*\{/,
      (m, ws) => `signingConfigs {${SIGNING_RELEASE}${ws}debug {`,
    );
    if (conRelease === contents) {
      throw new Error('withReleaseSigning: no encontré el bloque signingConfigs { debug { ... } }.');
    }

    mod.modResults.contents = conRelease + GUARD;
    return mod;
  });

module.exports = createRunOncePlugin(withReleaseSigning, 'claudia.release-signing', '1.0.0');
