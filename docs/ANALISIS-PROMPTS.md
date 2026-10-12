# Análisis de los prompts sugeridos (borrador de trabajo)

Notas de análisis, prompt por prompt. Sobrevive al cambio de chat: al arrancar
un chat nuevo, alcanza con decir *"leé docs/ANALISIS-PROMPTS.md"*.

**Regla de trabajo acordada:** el usuario pasa los 4 prompts primero; el
análisis completo se hace sobre el conjunto, no de a uno. Motivo: analizar de a
uno arriesga dar consejos sobre un prompt que un prompt posterior deja obsoleto.

**Estado:** los 4 prompts recibidos y analizados. El análisis completo está más
abajo.

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

---

## Análisis del PROMPT 2 — Implementación por feature

### Veredicto

Buen prompt. Estructura clara (objetivo → criterios → flujo → restricciones),
pide listar archivos antes de tocar código y respetar las capas. Lo único
realmente flojo es el cierre.

### Problema principal: "verificá que compile" no es verificar

Termina con *"verificá que el proyecto compile (`./gradlew assembleDebug`)"*.
**`assembleDebug` solo compila el APK. No instala ni abre la app** (verificado en
la doc de Android: la tarea que instala en emulador o dispositivo es
`installDebug`). O sea que el prompt se cierra en verde con la app nunca vista
en pantalla.

Esto contradice de lleno la regla central que ya acordamos: *terminado = corre y
se ve en pantalla*. Y es la trampa más probable de todo el conjunto, porque
`assembleDebug` en verde da una sensación de "listo" que es falsa: una feature
puede compilar perfecto y no mostrar nada, o caerse al rotar el teléfono.

Corrección a proponer:

```
Al final, instalá y abrí la app en el emulador (./gradlew installDebug) y
verificá que la feature se vea y funcione en pantalla. Si no podés correrla,
decímelo explícitamente en vez de dar la feature por terminada.
```

### Lo que está bien y se mantiene

- Criterios de aceptación como checklist: da una definición de "listo" por
  feature.
- Respetar capas, no lógica en Composables, ViewModels que hablan con casos de
  uso: correcto.
- Manejar carga / error / vacío: coincide con lo que ya teníamos.
- Strings en recursos para todo texto visible: **mejor que mi archivo**, que no
  lo pedía. Se adopta (facilita traducción y accesibilidad).
- Pedir tests del ViewModel y de los casos de uso: correcto, es lo que
  efectivamente tiene lógica.

### Lo que le falta

- **No pide probar en pantalla** (el problema de arriba).
- No dice **qué hacer si un criterio de aceptación no se puede cumplir**. Debe
  pedirse: frenar y avisar, no inventar ni marcar el casillero.
- No menciona **rotación de pantalla ni muerte del proceso**: en Compose el
  estado se pierde si no se usa `rememberSaveable` / `SavedStateHandle`, y eso
  no aparece en ningún prompt. Es un bug clásico que ningún test unitario atrapa.
- No pide **accesibilidad** al construir (solo aparece en la revisión del Prompt
  3, o sea demasiado tarde). `contentDescription` es barato de agregar mientras
  se escribe y caro de recuperar después.
- No indica **commit por feature**. Conviene que cada feature quede commiteada
  para poder volver atrás.



---

## Análisis del PROMPT 3 — Revisión de calidad

### Veredicto

**El mejor de los cuatro.** Está muy bien pensado: pide reportar *sin modificar
nada todavía*, y las 5 áreas que cubre (arquitectura, fugas, estados,
accesibilidad, seguridad) son exactamente las correctas. Separar "revisar" de
"arreglar" es la decisión de diseño más acertada del conjunto.

### Puntos técnicos a precisar

- **"collect sin lifecycle"**: el revisor debe pedir `collectAsStateWithLifecycle`
  (del artefacto `androidx.lifecycle:lifecycle-runtime-compose`) y no
  `collectAsState`, que sigue colectando con la app en segundo plano.
- **Fugas de coroutines**: alcanza con mirar `viewModelScope` (bien) vs. scopes
  creados a mano o `GlobalScope` (mal). Vale nombrarlos explícitamente.
- **Seguridad**: el prompt ya nombra logs, almacenamiento sin cifrar y tokens.
  Agregar **el keystore y las contraseñas de firma**, que en build nativo quedan
  en `build.gradle.kts` si no se las saca de ahí (la doc de Android lo advierte
  textualmente). Es la fuga más fácil de cometer y la más cara.

### Lo que le falta

- **No incluye rendimiento ni recomposiciones.** En Compose es una fuente
  enorme de bugs silenciosos: estado inestable, listas sin `key`, recomposición
  de toda la pantalla al escribir un carácter. Ningún test lo detecta.
- **No pide probar en pantalla.** Una revisión a conciencia puede aprobar una
  feature que no se ve. Debería cerrar con "después instalá y mirá".
- **No define qué es bloqueante.** "En orden de prioridad" está bien, pero sin
  etiquetar *bloqueante / importante / menor* pueden llegar 40 observaciones
  planas y no se sabe por dónde arrancar.


---

## Análisis del PROMPT 4 — Tests y build

### Veredicto

Es el más débil de los cuatro, y tiene una regla que me preocupa de verdad.

> **Nota sobre cómo se armó este archivo:** las primeras versiones de estas
> secciones se insertaron por número de línea y quedaron desordenadas, con
> bloques duplicados y huérfanos. Se reconstruyó completo y en orden. Queda
> anotado porque la lección es la misma de siempre: **verificar el resultado,
> no asumir que la operación salió bien**. `grep -n '^#'` sobre el archivo
> detectó el desorden en segundos.

### La regla peligrosa: "corregí el código, no los tests"

Dice: *"si fallan, corregí el código (no los tests, salvo que estén mal
planteados y lo expliques)"*. La intención es buena —evita que el asistente
"arregle" un fallo borrando el test— pero el efecto práctico es el contrario:
deja al asistente **modificar código de producción para satisfacer un test**
cuando el test es el que está mal, y eso es corromper el producto por el test.

Peor: para un modelo, "hacer pasar el test" es el objetivo más fácil de
optimizar, y el camino más corto suele ser *degradar la implementación* hasta
que el test pase (devolver datos de mentira, saltear una validación, marcar algo
como hecho). Eso deja el test en verde y el software roto.

Corrección a proponer: invertir la carga de la prueba.

```
Si un test falla, primero diagnosticá SI es el código o el test el que está
mal, y explicámelo antes de tocar nada.
- Si el test está mal: decímelo con el motivo y esperá mi OK. No lo cambies
  por tu cuenta.
- Si el código está mal: corregilo, pero NUNCA degrades la implementación
  (no devuelvas datos falsos, no saltees validaciones, no marques algo como
  hecho) para que un test pase.
- Nunca borres ni comentes un test para que la suite quede verde.
```

### Problema de fondo: testDebugUnitTest no prueba la app

`testDebugUnitTest` corre tests **de JVM**, sin Android real. Room, DataStore,
Compose y todo lo que depende del framework necesitan tests instrumentados, y
esos **no se corren con esta tarea**. Conclusión práctica: el prompt puede
terminar con "tests en verde" y la app sin haber sido ejecutada jamás. Se repite
el mismo agujero que en el Prompt 2.

### Lo que le falta

- **No distingue tests unitarios de instrumentados**, y eso confunde: el
  asistente va a reportar cobertura de una capa de datos que en realidad no
  testeó.
- **Cobertura sin umbral ni criterio.** "Resumen de cobertura" sin número
  objetivo ni "qué falta cubrir" es un adorno. Debe pedir cobertura de *los
  caminos que importan* (casos de uso, manejo de error), no un porcentaje global.
- **No dice qué hacer si la suite no compila**, que es un fallo distinto al de
  un test que falla.
- Falta el cierre obvio: **después de los tests, instalar y abrir la app**.


---

## Patrón que cruza los 4 prompts (lo más importante del análisis)

Hay **un solo agujero, repetido cuatro veces**: en ninguna de las cuatro etapas
se pide que la app **se abra y se mire en pantalla**. El círculo se cierra así:

- Prompt 1: arma el esqueleto → no pide correrlo.
- Prompt 2: implementa la feature → pide `assembleDebug` (solo compila).
- Prompt 3: revisa código → no pide correrlo.
- Prompt 4: corre tests de JVM → no prueba la app real.

Las cuatro etapas verifican **cosas que se pueden verificar sin ejecutar el
programa**. Es exactamente la falla que ya identificamos como la trampa número
2, y acá vuelve a aparecer cuatro veces seguidas: **compilar en verde y tests en
verde no significan que la app funcione**.

Arreglo: una sola regla, repetida al final de cada prompt.

```
Antes de dar algo por terminado: instalá y abrí la app en el emulador
(./gradlew installDebug) y confirmá que se ve y responde. Si no pudiste
correrla, decilo — no la des por terminada.
```

Y el commit de cierre, que no aparece en ningún prompt:

```
Terminá con un commit que describa la feature y los archivos tocados.
```

## Otros huecos transversales

1. **El keystore no aparece en ningún prompt**, y en Kotlin/Compose nativo la
   firma es 100% manual. Si se pierde, no se puede actualizar una app ya
   instalada. Debe estar en el Prompt 1.
2. **minSdk sigue siendo `{{MIN_SDK}}` sin valor sugerido**, y de él dependen
   cosas concretas (JUnit 5 en device pide minSdk 26).
3. **Nadie habla de datos sensibles**, que era el punto que vos mismo
   planteaste con el ejemplo del consultorio.
4. **Nada dice qué versión de Kotlin/AGP/Compose usar** salvo "última estable".
   En Android "última estable" no siempre es instalable: Compose y Kotlin tienen
   una matriz de compatibilidad. Conviene que el asistente verifique y proponga
   el conjunto compatible, no que elija cada cosa por separado.

## Resumen del análisis de los 4 prompts

| Prompt | Fortaleza | Fallo principal |
|---|---|---|
| 1 Kickoff | Concreto, pide aprobación | Redefine el stack (choca con el archivo maestro) y pide JUnit 5, sin soporte oficial |
| 2 Feature | Criterios de aceptación, respeta capas | Cierra en `assembleDebug`, que no abre la app |
| 3 Revisión | **El mejor.** Reporta sin tocar, cubre las 5 áreas correctas | No corre la app ni cubre rendimiento/recomposición |
| 4 Tests | Pide explicar antes de tocar | "Corregí el código, no los tests" invita a degradar la implementación; los tests de JVM no prueban la app |

**Conclusión:** el conjunto está bien orientado y es mejor que el Prompt 1 que
escribí yo. El problema no es la arquitectura ni el stack: es que **las cuatro
etapas verifican todo menos que el programa ande**.

