# Propuesta de limpieza — TSC Web

Inventario del **2026-11-26, 21:05–21:30**. Alcance: `D:\Desktop\tsc.web` (raíz y sus
tres worktrees `emparejar-80`, `formacion-vivo` y `sweet-herschel-7fc15d`) y
`D:\Desktop\tsc.web-yunacoins`.

**Regla de oro: acá no se borra nada.** Este documento inventaría y propone; el
borrado lo confirma Jimbo y lo ejecuta el coordinador con
`scripts/limpiar.ps1 -Borrar`, que manda todo a la **Papelera de reciclaje**.

- Resumen de encargos: [`ENCARGOS-RESUMEN.md`](ENCARGOS-RESUMEN.md).
- Script: `scripts/limpiar.ps1` (probado solo en simulación, sin `-Borrar`).

---

## 1. Resumen

| Grupo propuesto | Tamaño | Elementos | Por qué |
|---|---:|---:|---|
| `android-builds` | **575,3 MB** | 2.823 | Salidas de Gradle; se regeneran compilando |
| `builds-web` (`dist/`, `www/`) | **248,7 MB** | 724 | Salidas de `build-web` / `build-www` |
| `android-assets-public` | **150,5 MB** | 344 | Copia de `www/` dentro de Android; la repone `cap sync` |
| `apks-2.4.0` | **103,4 MB** | 4 | 3 APK idénticos; la release 2.4.0 está publicada en GitHub |
| `graphify-regenerable` | **33,3 MB** | 196 | Caché y salidas de graphify (se regeneran) |
| `logs-emulador` | **22,8 MB** | 3 | `firebase-debug.log` / `firestore-debug.log` (se reescriben) |
| `encargos-cumplidos` | **6,9 MB** | 110 | Encargos terminados y sus logs (resumidos en `ENCARGOS-RESUMEN.md`) |
| `caches-varias` | **11 KB** | 1 | Caché de Firebase CLI |
| **TOTAL** | **1,11 GB** | **147** | |

Nota: el tamaño de `logs-emulador` cambia entre corridas porque el emulador está
escribiendo ahora mismo (a las 21:05 eran 2,2 MB; a las 21:35, 22,8 MB).

**DUDOSO: 7 elementos (~26,8 MB).** No se proponen para borrar; decide Jimbo.

**Avisos de cosas no respaldadas:** ver sección 7. Lo más importante: `tareas/`
está fuera de git, `video-mejoras/` (sweet-herschel) no está en git y
`_cmp/` (~190-200 MB de perfiles de Chrome de las pruebas) tampoco.

---

## 2. Método

- Por carpeta se corrió `git status --short` y `git ls-files`; lo ignorado se
  confirmó con `git check-ignore -v`. Resultado por repo:

| Carpeta | Rama | Trackeados | Cambios sin commit | Sin trackear / ignorado relevante |
|---|---|---:|---|---|
| `tsc.web` (raíz) | `main` | 320 | 2 (`android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, generados por Capacitor) | `dist/`, `www/`, `.firebase/`, `HISTORIAL … .ods`, `*.ps2` |
| `emparejar-80` | worktree de `main` @ `70f3dd1` | 519 | 2 (los mismos dos de Android) | `tareas/` (excluida en `.git/info/exclude`), `dist/`, `www/`, `sandbox/`, `_cmp/`, logs de emulador |
| `formacion-vivo` | `feat/formacion-vivo` | 525 | 0 | `tareas/` (excluida), `dist/` |
| `sweet-herschel` | detached HEAD | 309 | 0 | `video-mejoras/` |
| `tsc.web-yunacoins` | `feat/yunacoins-pes5` | 414 | 1 (`.claude/launch.json`) | `docs/discord/`, `tsc-src/prototipo_yunas/`, `www/` |

- **Nunca** se recorrieron ni se propone tocar: `.git`, `node_modules`
  (ninguno es junction en estas carpetas; igual quedan excluidos), `sandbox/`,
  `_cmp/`, `video-mejoras/`, ni las tareas/logs en uso.
- No hay enlaces simbólicos ni junctions en el alcance (se comprobó con
  `ReparsePoint` en todas las carpetas).
- Tamaños medidos en disco, sin `node_modules` ni `.git`.

### Totales por carpeta (sin `node_modules`/`.git`)

| Carpeta | Archivos | Tamaño |
|---|---:|---:|
| `tsc.web` (sin `.claude\worktrees`) | 1.615 | 345,3 MB |
| `emparejar-80` | 4.115 | 647,9 MB |
| — de eso `_cmp/` (en uso) | 1.887 | 199,2 MB |
| — de eso `sandbox/` (en uso) | 118 | 15,9 MB |
| `formacion-vivo` | 685 | 88,1 MB |
| `sweet-herschel-7fc15d` | 336 | 67,9 MB |
| `tsc.web-yunacoins` | 1.639 | 473,7 MB |

### Inventario por grupo (archivos, tamaño, última modificación, versionado)

| Grupo | Archivos | Tamaño | Última modificación | ¿En git? |
|---|---:|---:|---|---|
| `tareas/` emparejar | 110 | 110,2 MB | 2026-11-26 21:26 | No (excluida en `.git/info/exclude`) |
| `tareas/` formacion | 19 | 1,3 MB | 2026-11-26 20:47 | No (excluida) |
| `dist/` + `www/` raíz | 214 | 74,5 MB | 2026-11-07 / 2026-10-11 | No (ignorados) |
| `dist/` + `www/` emparejar | 260 | 64,5 MB | 2026-11-26 / 2026-11-19 | No (ignorados) |
| `dist/` formacion | 140 | 33,4 MB | 2026-11-26 20:47 | No (ignorado) |
| `www/` yunacoins | 110 | 76,3 MB | 2026-09-18 | No (ignorado) |
| `android/app/build` raíz | 880 | 166,0 MB | 2026-10-11 22:26 | No (ignorado) |
| `android/app/build` emparejar | 916 | 130,3 MB | 2026-11-19 01:24 | No (ignorado) |
| `android/app/build` yunacoins | 857 | 257,1 MB | 2026-09-18 00:17 | No (ignorado) |
| `android/.../assets/public` raíz | 107 | 42,8 MB | 2026-10-11 21:36 | No (ignorado) |
| `android/.../assets/public` emparejar | 125 | 31,4 MB | 2026-11-19 01:23 | No (ignorado) |
| `android/.../assets/public` yunacoins | 112 | 76,3 MB | 2026-09-18 00:17 | No (ignorado) |
| `graphify-out` raíz | 5 | 6,6 MB | 2026-10-21 19:17 | Parcial (`GRAPH_REPORT.md`, `cost.json`, `manifest.json` sí) |
| `graphify-out` emparejar | 103 | 15,4 MB | 2026-11-20 18:12 | Parcial (igual) |
| `graphify-out` yunacoins | 97 | 11,3 MB | 2026-11-08 17:44 | Parcial (igual) |
| `docs/reportes` emparejar | 131 | 2,8 MB | 2026-11-26 21:21 | Sí |
| `docs/reportes` formacion | 132 | 2,8 MB | 2026-11-26 21:21 | Sí |
| `docs/reportes` yunacoins | 61 | 0,9 MB | 2026-11-08 08:56 | Sí |
| `docs/reportes` raíz | 36 | 0,3 MB | 2026-11-07 21:25 | Sí |
| `video-mejoras/` sweet | 26 | 15,5 MB | 2026-10-21 19:44 | No |
| `_cmp/` emparejar | 1.869 | 185,6 MB (varía) | 2026-11-26 21:27 | No |
| `sandbox/` emparejar | 118 | 15,9 MB | 2026-11-26 20:50 | No (regenerable) |

---

## 3. Inventario por grupo

### 3.1 Encargos a DeepSeek/Haiku (`tareas/`)

**`emparejar-80/tareas/`** — 110 elementos propuestos, 109,7 MB medidos el 21:05
(3 APK = 103,4 MB; 49 encargos `.md` + 49 logs ≈ 6,9 MB; `out/` con 4 archivos).

- Encargos `TAREA_*.md`: 54 al momento del inventario (BONO2…YCORDEN,
  PESMAP1…6, VIVO1…4, VARMAP/VARACT, etc.).
- Logs `*.log`: 50, de 11 KB a 759 KB. Casi todos con cierre `LISTO …`.
- `out/`: `TSC-Web-2.4.0.apk`, `TEAM-SUBS-CUP.apk`,
  `TEAM-SUBS-CUP-v2.4.0-release.apk` (**mismo SHA-256
  `4B788E58…A2AD19`** y mismo tamaño, 36.149.891 bytes) + `update.json`.
- **No está versionado** (`.git/info/exclude` tiene `tareas/`), así que no se
  puede recuperar de git; se resume en `ENCARGOS-RESUMEN.md` y lo borrado queda
  en la Papelera.

**`formacion-vivo/tareas/`** — 19 archivos, 1,3 MB: FV1, FV2, FV3, FV5, FV6
(cumplidos), `CANCELADA_FV4.md`, `API_PUENTE.md` (contrato del puente) y
`proto/` (prototipo: `prototipo.html`, `app.js`, `app.css`, `data.json`,
`shell.html`, `HALLAZGOS.md`, 0,5 MB).

**Tareas en uso, no se tocan:** `TAREA_COMUN.md` (lo leen todos los encargos),
`TAREA_LECTURAS.md` + `LECTURAS.log`, `TAREA_REGLAPLANT.md`,
`TAREA_LIMPIEZA.md` + `LIMPIEZA.log`, `TAREA_YCACTIVOS.md` +
`YCACTIVOS.log` (creada 21:16, todavía corriendo). `TAREA_EQORDEN.md` terminó a
las 21:17 durante este inventario y ya figura como cumplido.

Los encargos sin cierre `LISTO` quedan fuera del grupo automáticamente: el
script los informa como «tarea en curso o incompleta».

### 3.2 Informes y resultados

- `docs/reportes/` (emparejar y formacion): 131–132 archivos, 2,8 MB cada uno
  (73 directamente y el resto en `capturas-*` e `img-2.0-*`). **Se conservan**:
  `AGENTS.md` cita esos slices y no son copias entre sí dentro del mismo repo
  (sí se repiten entre worktrees, porque cada worktree es una copia del
  proyecto). En yunacoins son 61 archivos / 0,9 MB y en la raíz 36 / 0,3 MB.
- `docs/2.0/investigacion/` (12 archivos, 0,15 MB) y `docs/pes5/` (4 archivos,
  0,13 MB): documentación viva.
- `docs/backups/gitignore-antes-de-MS-1.4.txt`: citado por `.gitignore`.
- Logs fuera de `tareas/`: `firebase-debug.log`, `firestore-debug.log`,
  `functions/firestore-debug.log` (22,8 MB al momento de la última corrida;
  crecen mientras corre el emulador).

### 3.3 Temporales, builds y cachés

| Qué | Dónde | Tamaño | Estado |
|---|---|---:|---|
| `dist/` | raíz, emparejar, formacion | 31,7 + 33,1 + 33,4 MB | Ignorado; lo regenera `node scripts/build-web.mjs` |
| `www/` | raíz, emparejar, yunacoins | 42,8 + 31,4 + 76,3 MB | Ignorado; lo regenera `node scripts/build-www.mjs` |
| `android/app/build` + `.gradle` + `android/build` | raíz, emparejar, yunacoins | 575,3 MB | Ignorado por `android/.gitignore`; lo regenera Gradle |
| `android/app/src/main/assets/public` | raíz, emparejar, yunacoins | 150,5 MB | Ignorado; copia de `www/`, la repone `npx cap sync android` |
| `tsc-src/graphify-out/` | raíz, emparejar, yunacoins | 33,3 MB | `cache/`, `graph.html` y `graph.json` ignorados; `GRAPH_REPORT.md` se queda |
| `.firebase/` | raíz | 11 KB | Caché de Firebase CLI |
| `releases/android/` | raíz | vacío | Nada que borrar |
| `sandbox/`, `_cmp/` | emparejar | 15,9 + ~190-200 MB | **En uso** (emuladores y LECTURAS): no se tocan |

No existen `_tmp`, `temp`, `.cache` ni `__pycache__` dentro del alcance (sí
hubo `tools/pes5/_tmp-pesmap1` según los logs de PESMAP1, pero ya no existe).

### 3.4 Duplicados y copias

- Los **3 APK** de `tareas/out/` son idénticos (SHA-256 y tamaño). Verifiqué que
  `https://github.com/theperfectory-blip/tsc-web/releases/latest/download/update.json`
  publica `versionName: 2.4.0` y que el asset `TEAM-SUBS-CUP.apk` responde 200
  con exactamente 36.149.891 bytes: la release está publicada.
- `dist/` y `www/` son copias generadas de `tsc-src/`; `android/.../assets/public`
  es copia de `www/`.
- Los worktrees `emparejar-80`, `formacion-vivo` y `sweet-herschel-7fc15d` son
  copias del repo (cada uno con su rama/estado); no se propone borrarlos.
- `tsc-src/_material-diseno/galeria/image (1..8).webp` **no** son duplicados
  entre sí (son fotos distintas de la galería).
- No hay `*.bak`, `*.orig`, `* (1).*` ni `*_copia*` fuera de lo anterior.

### 3.5 Archivos de más de 3 meses (antes del 2026-08-26)

Revisado por nombre en `scripts/`, `index.html`, `firebase.json`,
`package.json`, `.md` y configuración:

| Archivo | Fecha | Referencia | Decisión |
|---|---|---|---|
| `HISTORIAL ENCUENTROS TSC FINAL.ods` | 2026-06-10 | `docs/MACRO_SLICE_DEBUGGING.md`: «Conservar (es dato fuente)» | CONSERVAR (además está gitignoreado) |
| `tsc-src/trophies-svg/*` | 2026-06-05 | fuente de los trofeos; `convert.mjs` propio; excluido del build por `build-exclude.mjs` | CONSERVAR |
| `docs/backups/gitignore-antes-de-MS-1.4.txt` | 2026-10 | citado en `.gitignore` | CONSERVAR |
| `assets/icon-*.png`, `assets/splash*.png` | 2026-07-12 | fuente de íconos/splash de Capacitor | CONSERVAR |
| `android/.idea/` | 2026-07-09 | config local de Android Studio, sin trackear | DUDOSO |
| `android/app/src/main/assets/public` | 2026-10-11 | copia vieja de `www/` | BORRAR (regenerable) |
| `main/www` con assets viejos (`fondo_completo.png`, `palmares.png`, `luisyuna-*.png`) | 2026-06/07 | ya no están en `tsc-src/assets` | cubierto por el grupo `builds-web` |
| `docs/android-push-notifications.md`, `PRODUCT.md`, `DESIGN.md`, `tsc-src/assets/vendor/…` | varios | documentación/código vivo | CONSERVAR |

Nada más viejo quedó sin referencia y con tamaño relevante.

### 3.6 Lo que está vivo (se conserva)

`tsc-src/` (código y assets), `functions/`, `firebase/`, `android/` (proyecto,
no sus builds), `scripts/`, `tools/` (46 archivos en emparejar, 48 en formacion,
20 en yunacoins), `assets/`, `docs/` (salvo lo indicado), `package*.json`,
`AGENTS.md`, `SECURITY.md` y el resto de la raíz; `video-mejoras/` de
sweet-herschel; `sandbox/` y `_cmp/`; `node_modules` y `.git`.

---

## 4. BORRAR (seguro, por tamaño)

Todo lo de esta lista es **regenerable** (builds, cachés, copias) o ya está
**resumido** (encargos). Nada es código fuente versionado.

### 4.1 `android-builds` — 575,3 MB / 2.823 archivos

`android/app/build`, `android/.gradle`, `android/build` y
`android/capacitor-cordova-android-plugins/build` en `tsc.web`, `emparejar-80`
y `tsc.web-yunacoins`.

Motivo: salidas de Gradle, ignoradas por `android/.gitignore`. Se regeneran con
`npm run sync:android` + la compilación. Incluye APK/AAB intermedios, dex,
recursos fusionados y assets comprimidos que nadie usa entre builds.

### 4.2 `builds-web` — 248,7 MB / 724 archivos

`tsc.web/dist`, `tsc.web/www`, `emparejar-80/dist`, `emparejar-80/www`,
`formacion-vivo/dist`, `tsc.web-yunacoins/www`.

Motivo: los genera `node scripts/build-web.mjs` (Hosting) y
`node scripts/build-www.mjs` (APK). Están en `.gitignore` y el CI los reconstruye
en cada deploy. **Ojo:** después de borrarlos hay que reconstruir antes de
publicar o de compilar la APK.

### 4.3 `android-assets-public` — 150,5 MB / 344 archivos

`android/app/src/main/assets/public` en `tsc.web`, `emparejar-80` y
`tsc.web-yunacoins`.

Motivo: es la copia de `www/` que Capacitor mete en el proyecto Android; la
repone `npx cap sync android` (o `npm run sync:android`). La de `tsc.web` es de
octubre y ya está vieja. **Ojo:** hay que sincronizar antes de compilar la APK.

### 4.4 `apks-2.4.0` — 103,4 MB / 4 archivos

`emparejar-80/tareas/out/`: los 3 APK (idénticos) y `update.json`.

Motivo: la release 2.4.0 está publicada en GitHub (verificado: `update.json`
responde 2.4.0 y el asset mide exactamente lo mismo que los locales). Si se
quiere conservar un APK de respaldo, hay que sacar ese archivo del grupo en el
script (o copiarlo antes) antes de correr `-Borrar`.

### 4.5 `graphify-regenerable` — 33,3 MB / 196 archivos

`tsc-src/graphify-out/cache/`, `graph.html` y `graph.json` en `tsc.web`,
`emparejar-80` y `tsc.web-yunacoins`.

Motivo: artefactos de la skill graphify, ignorados por `.gitignore`
(`**/graphify-out/cache/`, `graph.html`, `graph.json`). Se regeneran al correr
graphify. Se conservan `GRAPH_REPORT.md`, `cost.json` y `manifest.json`.

### 4.6 `logs-emulador` — 22,8 MB / 3 archivos (variable)

`emparejar-80/firebase-debug.log`, `emparejar-80/firestore-debug.log` y
`emparejar-80/functions/firestore-debug.log`.

Motivo: logs del emulador, ignorados (`firebase-debug.log*`,
`firestore-debug.log*`). Se reescriben solos; el de `functions/` es del 18-11.
Si el emulador está corriendo, se recrean de inmediato.

### 4.7 `encargos-cumplidos` — 6,9 MB / 110 archivos

49 encargos + 49 logs de `emparejar-80/tareas/` y 7 encargos + 5 logs de
`formacion-vivo/tareas/` (incluye `CANCELADA_FV4.md` y `API_PUENTE.md`).

Motivo: tareas terminadas (su log tiene cierre `LISTO …`) o canceladas a
propósito; todas quedan resumidas en `docs/limpieza/ENCARGOS-RESUMEN.md` con
nombre, fecha, qué pedían y su línea `LISTO`. Quedan fuera las tareas en uso y
las que no tienen cierre `LISTO`.

Observación: `TAREA_YCORDEN.md` y `TAREA_EQORDEN.md` son de hoy (20:45 y 21:13)
y ya están cerradas; si Jimbo prefiere revisarlas un día más, se pueden sacar
del grupo con `-Grupos` o dejarlas fuera del borrado.

### 4.8 `caches-varias` — 11 KB / 1 archivo

`tsc.web/.firebase/` (caché de Firebase CLI). Se regenera sola.

---

## 5. DUDOSO (Jimbo decide)

| # | Elemento | Tamaño | Por qué no va a BORRAR |
|---|---|---:|---|
| 1 | `emparejar-80/tsc-src/_material-diseno/` | 8,3 MB | Material de diseño (2 PNG del APK + 9 webp de galería). Está **versionado** (recuperable) y `build-exclude.mjs` ya lo deja fuera de los builds, así que no afecta al runtime; puede ser insumo de Jimbo. Si se borra, conviene moverlo antes a `docs/`. |
| 2 | `formacion-vivo/tsc-src/_material-diseno/` | 8,3 MB | Igual que el anterior (mismo contenido, sin trackear en esa rama). |
| 3 | `tsc.web-yunacoins/tsc-src/_material-diseno/` | 8,3 MB | Igual que el anterior. |
| 4 | `tsc.web-yunacoins/tsc-src/prototipo_yunas/` | 1,2 MB | Copia de prueba del save de PES5 (`test-save-copy/KONAMI-WIN32PES5OPT`). **Sin trackear**; es dato de prueba, no el save real. |
| 5 | `formacion-vivo/tareas/proto/` | 0,5 MB | Prototipo de «Formación en vivo» (`prototipo.html`, `app.js`, `data.json`, `HALLAZGOS.md`). No lo referencia ningún script; es la maqueta que originó la pestaña. |
| 6 | `tsc.web/android/.idea/` | 0,1 MB | Config local de Android Studio (sin trackear). Se regenera al abrir el proyecto, pero puede tener run configurations. |
| 7 | `tsc.web-yunacoins/docs/discord/verificar-correo.jpg` | 73 KB | Captura para la guía de Discord, **sin trackear**; puede ser documentación útil. |

---

## 6. CONSERVAR (vivo o cita documental)

- Todo `tsc-src/` versionado, `functions/`, `firebase/`, `scripts/`, `tools/`,
  `android/` (proyecto), `assets/`, `docs/` completo (incluidos
  `docs/reportes/*` y `docs/pes5/*`), raíz (`package*.json`, `AGENTS.md`,
  `SECURITY.md`, `firebase.json`, etc.).
- `docs/limpieza/` (esta propuesta y el resumen de encargos).
- `tareas/TAREA_COMUN.md` y las tareas en uso (LECTURAS, REGLAPLANT, LIMPIEZA,
  YCACTIVOS) con sus logs.
- `emparejar-80/_cmp/` (~190-200 MB, la usa LECTURAS), `sandbox/` (emuladores),
  `node_modules/`, `.git/`.
- `sweet-herschel-7fc15d/video-mejoras/` (15,5 MB; Jimbo la quiere).
- `HISTORIAL ENCUENTROS TSC FINAL.ods`, `docs/backups/…`, `trophies-svg/`,
  `assets/icon-*`, `splash*`, `GRAPH_REPORT.md`, `cost.json` y `manifest.json`
  de graphify.
- `android/app/keystore.properties` (vacío en la raíz, pero es la config de
  firma local: no tocar), `google-services.json` y todo `android/app/src`
  salvo `assets/public`.

---

## 7. Avisos: cosas que NO están respaldadas

1. **`tareas/` no está en git** en ningún repo (`.git/info/exclude`, línea 20).
   Se borrarían 110 encargos/logs y 3 APK que git no puede recuperar. Mitigación:
   - `docs/limpieza/ENCARGOS-RESUMEN.md` conserva una línea por encargo.
   - Los APK 2.4.0 son descargables de GitHub Releases (verificado).
   - Todo lo borrado va a la Papelera de reciclaje (restaurable).
2. **`sweet-herschel-7fc15d/video-mejoras/` no está versionado** (15,5 MB,
   `?? video-mejoras/`). No se propone borrar, pero conviene respaldarlo o
   commitearlo en su rama si Jimbo lo quiere conservar a largo plazo.
3. **`_cmp/` (199 MB) no está versionado.** Son perfiles de Chrome de las
   pruebas de LECTURAS; se pueden regenerar, pero hoy está en uso.
4. **`tsc.web-yunacoins`**: `docs/discord/verificar-correo.jpg` y
   `tsc-src/prototipo_yunas/` no están en git (van a DUDOSO).
5. **`HISTORIAL ENCUENTROS TSC FINAL.ods` está gitignoreado** y los docs lo
   declaran «dato fuente»: no se toca y no tiene copia en git.
6. Ignorados pero regenerables: `dist/`, `www/`, `sandbox/`, builds de Android,
   logs del emulador y `android/.../assets/public`.
7. `functions/lib/` sí está versionado (no es un build descartable en este repo).

---

## 8. Script `scripts/limpiar.ps1`

PowerShell 5.1, comentado en español. Vive en
`emparejar-80/scripts/limpiar.ps1` y deduce la raíz principal solo (si se corre
desde un worktree, sube hasta `tsc.web`). Rutas relativas a cada carpeta:

```
powershell -NoProfile -File scripts\limpiar.ps1
powershell -NoProfile -File scripts\limpiar.ps1 -Grupos builds-web,android-builds
powershell -NoProfile -File scripts\limpiar.ps1 -Grupos apks-2.4.0 -Borrar
```

- Sin `-Borrar`: solo lista, con tamaño por grupo y total (no toca nada).
- Con `-Borrar`: pide escribir **`SI`** y usa
  `[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile/DeleteDirectory(..., 'OnlyErrorDialogs', 'SendToRecycleBin')`.
  Nunca usa `Remove-Item`.
- Salvaguardas: rechaza rutas fuera de las cinco carpetas permitidas, no sigue
  ni borra enlaces (`ReparsePoint`), y excluye siempre `.git`, `node_modules`,
  `sandbox`, `_cmp`, `video-mejoras`, `TAREA_COMUN.md`, LECTURAS, REGLAPLANT,
  LIMPIEZA y YCACTIVOS. Un encargo solo entra si su log tiene cierre `LISTO`.
- Al final informa el espacio liberado y recuerda que todo está en la Papelera.

### Salida de la prueba (solo simulación, 2026-11-26 21:30)

```text
LIMPIEZA TSC WEB
Carpetas permitidas: D:\Desktop\tsc.web | .\emparejar-80 | .\formacion-vivo | .\sweet-herschel-7fc15d | [yunacoins]
MODO: SIMULACION (no se borra nada)

GRUPO builds-web
  [  31,7 MB]     109 arch.  .\dist
  [  42,8 MB]     105 arch.  .\www
  [  33,1 MB]     137 arch.  .\emparejar-80\dist
  [  31,4 MB]     123 arch.  .\emparejar-80\www
  [  33,4 MB]     140 arch.  .\formacion-vivo\dist
  [  76,3 MB]     110 arch.  [yunacoins]\www
  Total grupo "builds-web": 248,7 MB en 724 archivos

GRUPO android-builds
  [ 166,0 MB]     880 arch.  .\android\app\build
  [  14,7 MB]      16 arch.  .\android\.gradle
  [   132 KB]       1 arch.  .\android\build
  [   371 KB]      51 arch.  .\android\capacitor-cordova-android-plugins\build
  [ 130,3 MB]     916 arch.  .\emparejar-80\android\app\build
  [   4,5 MB]      13 arch.  .\emparejar-80\android\.gradle
  [   127 KB]       1 arch.  .\emparejar-80\android\build
  [   378 KB]      51 arch.  .\emparejar-80\android\capacitor-cordova-android-plugins\build
  [ 257,1 MB]     857 arch.  [yunacoins]\android\app\build
  [   1,6 MB]      13 arch.  [yunacoins]\android\.gradle
  [   131 KB]       1 arch.  [yunacoins]\android\build
  [     8 KB]      23 arch.  [yunacoins]\android\capacitor-cordova-android-plugins\build
  Total grupo "android-builds": 575,3 MB en 2823 archivos

GRUPO android-assets-public
  [  42,8 MB]     107 arch.  .\android\app\src\main\assets\public
  [  31,4 MB]     125 arch.  .\emparejar-80\android\app\src\main\assets\public
  [  76,3 MB]     112 arch.  [yunacoins]\android\app\src\main\assets\public
  Total grupo "android-assets-public": 150,5 MB en 344 archivos

GRUPO apks-2.4.0
  [  34,5 MB]       1 arch.  .\emparejar-80\tareas\out\TEAM-SUBS-CUP.apk
  [  34,5 MB]       1 arch.  .\emparejar-80\tareas\out\TEAM-SUBS-CUP-v2.4.0-release.apk
  [  34,5 MB]       1 arch.  .\emparejar-80\tareas\out\TSC-Web-2.4.0.apk
  [     0 KB]       1 arch.  .\emparejar-80\tareas\out\update.json
  Total grupo "apks-2.4.0": 103,4 MB en 4 archivos

GRUPO encargos-cumplidos
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_APK240.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_BONO2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_BONO3.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_BONO4.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_BONO5.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_BONO5a.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_CARRO1.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_CARRO2.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_CMP.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_CMP2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_CMP3.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_COINS1.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_EQORDEN.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_FORM4.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_FORMAVISO.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_FORMFIX.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_HIST1.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_HIST2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_INTEG.md
  [    10 KB]       1 arch.  .\emparejar-80\tareas\TAREA_MEJUI.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_MEJUI2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_MINVER.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PAUSA2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PED1.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PED2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PEDIDOS.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PEDPC.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP1.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP2.md
  [     1 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP2B.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP3.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP4.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP5.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PESMAP6.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_PROTOVAR.md
  [     6 KB]       1 arch.  .\emparejar-80\tareas\TAREA_RETRO.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_RETRO2.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_RETRO3.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_SALDO1.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_TOOLDET.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_TOOLFIX.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_TOPE.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_VARACT.md
  [     5 KB]       1 arch.  .\emparejar-80\tareas\TAREA_VARMAP.md
  [     8 KB]       1 arch.  .\emparejar-80\tareas\TAREA_VIVO1.md
  [     3 KB]       1 arch.  .\emparejar-80\tareas\TAREA_VIVO2.md
  [     4 KB]       1 arch.  .\emparejar-80\tareas\TAREA_VIVO3.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_VIVO4.md
  [     2 KB]       1 arch.  .\emparejar-80\tareas\TAREA_YCORDEN.md
  [    11 KB]       1 arch.  .\emparejar-80\tareas\APK240.log
  [    30 KB]       1 arch.  .\emparejar-80\tareas\BONO2.log
  [   163 KB]       1 arch.  .\emparejar-80\tareas\BONO3.log
  [    89 KB]       1 arch.  .\emparejar-80\tareas\BONO4.log
  [    17 KB]       1 arch.  .\emparejar-80\tareas\BONO5a.log
  [   110 KB]       1 arch.  .\emparejar-80\tareas\BONO5b.log
  [   132 KB]       1 arch.  .\emparejar-80\tareas\CARRO1.log
  [    65 KB]       1 arch.  .\emparejar-80\tareas\CARRO2.log
  [    41 KB]       1 arch.  .\emparejar-80\tareas\CMP.log
  [    92 KB]       1 arch.  .\emparejar-80\tareas\CMP2.log
  [    53 KB]       1 arch.  .\emparejar-80\tareas\CMP3.log
  [    43 KB]       1 arch.  .\emparejar-80\tareas\COINS1.log
  [    34 KB]       1 arch.  .\emparejar-80\tareas\EQORDEN.log
  [    68 KB]       1 arch.  .\emparejar-80\tareas\FORM4.log
  [    68 KB]       1 arch.  .\emparejar-80\tareas\FORMAVISO.log
  [   108 KB]       1 arch.  .\emparejar-80\tareas\FORMFIX.log
  [   108 KB]       1 arch.  .\emparejar-80\tareas\HIST1.log
  [    70 KB]       1 arch.  .\emparejar-80\tareas\HIST2.log
  [   130 KB]       1 arch.  .\emparejar-80\tareas\INTEG.log
  [   278 KB]       1 arch.  .\emparejar-80\tareas\MEJUI.log
  [   120 KB]       1 arch.  .\emparejar-80\tareas\MEJUI2.log
  [    40 KB]       1 arch.  .\emparejar-80\tareas\MINVER.log
  [    63 KB]       1 arch.  .\emparejar-80\tareas\PAUSA2.log
  [    90 KB]       1 arch.  .\emparejar-80\tareas\PED1.log
  [    66 KB]       1 arch.  .\emparejar-80\tareas\PED2.log
  [    51 KB]       1 arch.  .\emparejar-80\tareas\PEDIDOS.log
  [    65 KB]       1 arch.  .\emparejar-80\tareas\PEDPC.log
  [   323 KB]       1 arch.  .\emparejar-80\tareas\PESMAP1.log
  [   392 KB]       1 arch.  .\emparejar-80\tareas\PESMAP2.log
  [   205 KB]       1 arch.  .\emparejar-80\tareas\PESMAP2B.log
  [   759 KB]       1 arch.  .\emparejar-80\tareas\PESMAP3.log
  [   576 KB]       1 arch.  .\emparejar-80\tareas\PESMAP4.log
  [   239 KB]       1 arch.  .\emparejar-80\tareas\PESMAP5.log
  [    93 KB]       1 arch.  .\emparejar-80\tareas\PESMAP6.log
  [   131 KB]       1 arch.  .\emparejar-80\tareas\PROTOVAR.log
  [   218 KB]       1 arch.  .\emparejar-80\tareas\RETRO.log
  [    21 KB]       1 arch.  .\emparejar-80\tareas\RETRO2.log
  [    90 KB]       1 arch.  .\emparejar-80\tareas\RETRO3.log
  [    30 KB]       1 arch.  .\emparejar-80\tareas\SALDO1.log
  [    89 KB]       1 arch.  .\emparejar-80\tareas\TOOLDET.log
  [    45 KB]       1 arch.  .\emparejar-80\tareas\TOOLFIX.log
  [    76 KB]       1 arch.  .\emparejar-80\tareas\TOPE.log
  [    80 KB]       1 arch.  .\emparejar-80\tareas\VARACT.log
  [   155 KB]       1 arch.  .\emparejar-80\tareas\VARMAP.log
  [    48 KB]       1 arch.  .\emparejar-80\tareas\VIVO1.log
  [    48 KB]       1 arch.  .\emparejar-80\tareas\VIVO2.log
  [   128 KB]       1 arch.  .\emparejar-80\tareas\VIVO3.log
  [    56 KB]       1 arch.  .\emparejar-80\tareas\VIVO4.log
  [    28 KB]       1 arch.  .\emparejar-80\tareas\YCORDEN.log
  [     3 KB]       1 arch.  .\formacion-vivo\tareas\TAREA_FV1.md
  [     5 KB]       1 arch.  .\formacion-vivo\tareas\TAREA_FV2.md
  [     3 KB]       1 arch.  .\formacion-vivo\tareas\TAREA_FV3.md
  [     3 KB]       1 arch.  .\formacion-vivo\tareas\TAREA_FV5.md
  [     2 KB]       1 arch.  .\formacion-vivo\tareas\TAREA_FV6.md
  [   143 KB]       1 arch.  .\formacion-vivo\tareas\FV1.log
  [   278 KB]       1 arch.  .\formacion-vivo\tareas\FV2.log
  [   134 KB]       1 arch.  .\formacion-vivo\tareas\FV3.log
  [   216 KB]       1 arch.  .\formacion-vivo\tareas\FV5.log
  [    42 KB]       1 arch.  .\formacion-vivo\tareas\FV6.log
  [     4 KB]       1 arch.  .\formacion-vivo\tareas\CANCELADA_FV4.md
  [     3 KB]       1 arch.  .\formacion-vivo\tareas\API_PUENTE.md
  Total grupo "encargos-cumplidos": 6,9 MB en 110 archivos

GRUPO graphify-regenerable
  [   2,7 MB]       1 arch.  .\tsc-src\graphify-out\graph.html
  [   4,0 MB]       1 arch.  .\tsc-src\graphify-out\graph.json
  [  10,7 MB]      98 arch.  .\emparejar-80\tsc-src\graphify-out\cache
  [   1,9 MB]       1 arch.  .\emparejar-80\tsc-src\graphify-out\graph.html
  [   2,9 MB]       1 arch.  .\emparejar-80\tsc-src\graphify-out\graph.json
  [   4,3 MB]      92 arch.  [yunacoins]\tsc-src\graphify-out\cache
  [   2,7 MB]       1 arch.  [yunacoins]\tsc-src\graphify-out\graph.html
  [   4,2 MB]       1 arch.  [yunacoins]\tsc-src\graphify-out\graph.json
  Total grupo "graphify-regenerable": 33,3 MB en 196 archivos

GRUPO logs-emulador
  [  14,6 MB]       1 arch.  .\emparejar-80\firebase-debug.log
  [   6,8 MB]       1 arch.  .\emparejar-80\firestore-debug.log
  [   1,5 MB]       1 arch.  .\emparejar-80\functions\firestore-debug.log
  Total grupo "logs-emulador": 22,8 MB en 3 archivos

GRUPO caches-varias
  [    11 KB]       1 arch.  .\.firebase
  Total grupo "caches-varias": 11 KB en 1 archivos

TOTAL: 1,11 GB en 147 elementos

AVISOS:
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\TAREA_COMUN.md
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\TAREA_LECTURAS.md
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\TAREA_LIMPIEZA.md
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\TAREA_REGLAPLANT.md
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\TAREA_YCACTIVOS.md
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\LECTURAS.log
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\LIMPIEZA.log
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tareas\YCACTIVOS.log
  - Protegido (en uso): D:\Desktop\tsc.web\.claude\worktrees\formacion-vivo\tareas\TAREA_COMUN.md

Simulacion terminada. No se borro nada.
```

---

## 9. Cómo seguir

1. Jimbo confirma qué grupos van (o qué elementos salen).
2. El coordinador corre primero la simulación:
   `powershell -NoProfile -File scripts\limpiar.ps1` (y revisa la lista).
3. Borrado por grupo, por ejemplo:
   `powershell -NoProfile -File scripts\limpiar.ps1 -Grupos builds-web,apks-2.4.0 -Borrar`
   y escribe `SI`.
4. Lo borrado queda en la Papelera de reciclaje: si algo falta, se restaura.
5. Después de borrar `dist/`/`www/`: reconstruir con
   `node scripts/build-web.mjs` / `node scripts/build-www.mjs`.
   Después de borrar `android/.../assets/public`: `npm run sync:android`.

**Sugerencia de orden:** primero `apks-2.4.0`, `graphify-regenerable`,
`encargos-cumplidos`, `caches-varias` y `logs-emulador` (no rompen nada en el
día a día); los builds (`builds-web`, `android-builds`,
`android-assets-public`) al final, cuando no haya emuladores ni compilaciones en
curso.

---

**LISTO LIMPIEZA: 1.141 MB propuestos para borrar (147 elementos), 7 en DUDOSO
(~27 MB), avisos de no respaldado: `tareas/` (fuera de git), `video-mejoras/` de
sweet-herschel (sin versionar), `_cmp/` (199 MB, sin versionar y en uso),
`docs/discord/` y `prototipo_yunas/` en yunacoins, y `HISTORIAL ENCUENTROS TSC
FINAL.ods` (gitignoreado, dato fuente).**
