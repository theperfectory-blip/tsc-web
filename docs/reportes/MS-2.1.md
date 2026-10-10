# MS-2.1 · Sandbox con emuladores · 2026-10-10

Hallazgo que cierra: H-21. Primera versión de Sonnet 5.5, revisada y
corregida por Opus 5.5 en la misma sesión.

## Cambios

- `tsc-src/js/firebase-config.js`: modo emulador en `localhost` con `?emu=1`
  o en el puerto 3001 (aprobado por el dueño, porque `launch.json` no puede
  pasar query). Conecta Firestore `:8080` y Auth `:9099` antes de cualquier
  uso y marca `window.__TSC_EMULATOR__`. Si el emulador está apagado, las
  peticiones fallan en local: nunca caen a producción.
- `tsc-src/js/cloudinary.js`: en modo emulador, la subida se simula y
  devuelve una URL con la forma que exige `validTeamLogo`. No sale nada a la
  cuenta real.
- `tsc-src/js/calendar.js`: la callable `notifyStreamToday` va al emulador
  de Functions (`:5001`) en modo emulador.
- `firebase.json`: emulador de Auth en `:9099`.
- `scripts/emu-start.mjs`: arranca Firestore y Auth (`--functions` agrega
  Functions). Encuentra Java en `JAVA_HOME` o `~/jdk-temurin-21` (también
  dentro de la carpeta intermedia del zip). Le da a la JVM otro directorio
  para sus sockets AF_UNIX, porque en `%TEMP%` falla con
  `Invalid argument: connect` y el emulador de Firestore muere al arrancar.
- `scripts/emu-snapshot.mjs`: arma `sandbox/` (ignorado por git):
  - `backup.json`: copia real de la base. Lee las 14 colecciones de `STORES`
    de producción por REST, solo GET y sin sesión (todas son de lectura
    pública). No copia `users`.
  - `site/`: copia de `tsc-src` con las copas de las 2 competiciones con más
    títulos (`copa_1` 1ra División, `copa_3` 2da División). Las otras 3 se
    ven en SVG: la Sala cae a SVG cuando el `.glb` no carga.
  - Galerías de la vitrina: se conserva 1 de cada 5 fotos (23 de 111). El
    resto de las imágenes queda con su URL de la web.
- `scripts/emu-seed.mjs`: carga un backup de `exportFullDB` en el emulador
  (con `_counters` al máximo id) y crea admin y presidente de prueba. El
  presidente queda a cargo del primer equipo del backup, o de
  `--president-team=<id>`. Habla con `127.0.0.1`, no con `localhost` (Node
  resuelve a `::1` y el emulador escucha en IPv4).
- `scripts/emu-credentials.example.json`: credenciales de prueba, solo
  válidas en el emulador de Auth.
- `.claude/launch.json`: `tsc-emu-backend` (emuladores) y `tsc-emu`
  (`sandbox/site` en `:3001`).
- `.gitignore`: `sandbox/` y `scripts/emu-credentials.json`.
- `AGENTS.md`: sección del sandbox en "Correr localmente".

## Verificación

- Snapshot: 1 temporada, 62 equipos, 5 competiciones, 10 fases, 422
  partidos, 422 `matchHistory`, 38 palmarés, 79 eventos de sorteo, 49
  etiquetas de calendario. Sitio de 26,2 MB y base de 0,4 MB. Seed: 1119
  escrituras en el emulador.
- `tsc-emu` (`:3001`): modo emulador activo y datos reales visibles.
  Sesión de admin de prueba contra Auth `:9099`.
- En Equipos, como admin y desde la interfaz:
  - Crear: equipo "Sandbox MS21" (id 65) con logo, por la subida simulada.
  - Editar: el nombre cambia y el anterior pasa a `previousNames`.
  - Borrar: con confirmación. `dbGet('teams', 65)` da `null` y vuelven a
    ser 62 equipos.
- Red, desde que se entró al panel admin (Resource Timing, búfer de 5000):
  2486 peticiones a `localhost:8080` y 75 lecturas de imágenes en
  `res.cloudinary.com`. Nada a `firestore.googleapis.com`,
  `api.cloudinary.com`, `identitytoolkit` ni `cloudfunctions`. Lo confirma
  el registro de red del navegador.
- Variante `dist` (`node scripts/build-web.mjs` + `hosting-dist` con
  `?emu=1`): 9 bundles, modo emulador activo, 62 equipos leídos de `:8080`.
- Incidente menor: `preview_start` de `hosting-dist` abre `:5050` sin
  `?emu=1`, así que esa primera carga fue a producción. Fue solo la carga
  pública (lectura). Los seeds y migraciones del arranque no escriben con
  una base ya inicializada. Se navegó de inmediato a `?emu=1`.

## Hallazgos nuevos

- **H-nuevo (rendimiento): guardar o borrar un equipo tarda minutos.**
  `saveTeam` y `deleteTeam` llaman a `notifyTeamChanged` →
  `refreshHistoryForSeason`, que reescribe con `appendOrUpdateHistory`, uno
  por uno y esperando cada uno, todos los partidos jugados de la temporada
  (422). En el emulador fueron unos 820 ms por partido, es decir unos 6
  minutos con el modal abierto. Las lecturas salen del espejo en ~0 ms: lo
  que tarda es esperar la confirmación de cada `dbPut`. En producción la
  latencia por escritura es menor, pero el patrón (N escrituras en serie
  por cada guardado de equipo) es el mismo. Se propone para 2.5 (espejo y
  costo) o para M5.

## Notas

- `sandbox/` tiene datos reales de producción (nombres de equipos, partidos,
  fotos): nunca a git, ya está en `.gitignore`.
- Se deja `localhost:3001` reservado al sandbox. Cualquier sitio servido en
  ese puerto en localhost entra en modo emulador.

## Acción del dueño requerida

Ninguna. Las reglas no cambiaron.
