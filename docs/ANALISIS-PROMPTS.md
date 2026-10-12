# Análisis de los prompts sugeridos (borrador de trabajo)

Notas de análisis, prompt por prompt. Sobrevive al cambio de chat: al arrancar
un chat nuevo, alcanza con decir *"leé docs/ANALISIS-PROMPTS.md"*.

**Regla de trabajo acordada:** el usuario pasa los 4 prompts primero; el
análisis completo se hace sobre el conjunto, no de a uno. Motivo: analizar de a
uno arriesga dar consejos sobre un prompt que un prompt posterior deja obsoleto.

**Pendiente de recibir:** Prompts 2, 3 y 4.

---

## Análisis del PROMPT 1 — "Kickoff y arquitectura base"

### Veredicto

Está **mejor armado que el Prompt 1 que yo escribí** en `ARCHIVO-MAESTRO.md`.
Tiene concreción técnica real; el mío es más genérico. Las mejoras se adoptan.

### Conflicto de fondo (el bloqueante)

Este prompt define el stack como **Kotlin + Jetpack Compose nativo**. El
`ARCHIVO-MAESTRO.md` ya commiteado define **Expo + React Native**, y lo cierra
con "no se reabre este debate". Son incompatibles: no pueden convivir como
plantilla. No es detalle de redacción — cambia las trampas, los comandos, el
build, la firma y la distribución.

Consecuencias de cada camino:

- **Kotlin/Compose:** stack más profesional y transferible, sin cuotas de ningún
  tipo, cero costo. Pero se reescribe casi todo el archivo maestro y se pierde
  lo construido en Michofer (expo-router, NativeWind, AsyncStorage, el script
  `probar-emulador.sh`).
- **Expo:** ya funciona, ya hay conocimiento acumulado, las apps ya hechas
  siguen ese camino.

**Decisión del usuario: pendiente.** Es el bloqueante: de esto depende qué
archivo sobrevive. No se avanza con el archivo maestro hasta resolverlo.

### Requisito verificado que NO se sostiene: JUnit 5

El prompt pide `JUnit 5, MockK, Turbine`. Verificado contra las fuentes (octubre
2026), no de memoria:

- JUnit 5 **no tiene soporte oficial de Google**. Exige un plugin de terceros
  (`mannodermaus/android-junit5`, basicamente un solo desarrollador, 926 stars).
- El issue oficial de `android/android-test#224` pidiendo JUnit 5 está **abierto
  desde marzo de 2019** y seguía abierto en 2026.
- Un colaborador de AGP escribió que el soporte para tests **instrumentados**
  "probablemente no va a pasar por mucho tiempo". En 2026 se confirmó que
  `AndroidJUnitRunner` sigue atado a JUnit 4.
- El README del plugin lo dice textual: Google no tiene planes inmediatos de
  soportar nada más allá de JUnit 4.
- JUnit 5 sobre dispositivo requiere **minSdk 26**.

No es que esté mal usarlo: es que hay que decidirlo a consciencia. Las dos
salidas honestas:

- **(a)** JUnit 5 en tests locales (JVM) + JUnit 4 en instrumentados, aceptando
  la mezcla.
- **(b)** JUnit 4 en todo, sin plugin de terceros.

**Decisión del usuario: pendiente.**

### Lo que el prompt del usuario tiene y el mío NO — se adopta

1. **"Sin código muerto, sin TODOs sin resolver, sin dependencias
   innecesarias."** No lo tenía; previene basura acumulada.
2. **Comentarios y nombres en español; clases, funciones y paquetes en inglés.**
   Convención clara, evita spanglish inconsistente.
3. **"Después de cada cambio, indicá qué archivos creaste o modificaste y por
   qué."** Trazabilidad que hace revisable el trabajo.
4. **"Esperá mi aprobación" antes de escribir código.** Es la misma idea de
   sectorizar que acordamos, pero como regla dura. Mejor redactada que la mía.

### Lo que le falta al prompt del usuario — y es lo más caro

Asume un proyecto ya definido: no pregunta nada antes de arrancar. Eso es
exactamente el riesgo de que un `{{CASOS_DE_USO}}` de una línea produzca
requisitos inventados. Y tres cosas que en Kotlin/Compose **nativo** pesan más
que en Expo:

- **El keystore.** En build nativo la firma es totalmente propia y manual. Si
  se pierde, no se puede actualizar nunca una app ya instalada: hay que
  desinstalar y el usuario pierde sus datos. Merece advertencia en el prompt,
  no un apéndice.
- **Datos sensibles.** Si la app toca datos de terceros aplica la Ley 25.326.
  Definirlo antes de codear.
- **"Terminado" = corre y se ve en pantalla.** Build en verde no alcanza.

### Objeción al tamaño del stack

Hilt + Room + Retrofit + KSP + Clean Architecture de 3 capas para una app de un
solo usuario, local-first y distribuida por APK es mucha ceremonia para el
problema. No está mal —es un stack correcto— pero Hilt y las 3 capas se pagan
solas con equipo y muchos features. Sugerencia dada: arrancar **sin Hilt**
(inyección manual por constructor) y sin forzar las 3 capas hasta que duela.
Agregar Hilt el día que haga falta.
