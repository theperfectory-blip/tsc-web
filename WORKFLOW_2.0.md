# Flujo de trabajo — Web 2.0 (rama `feat/yunacoins-pes5`)

Este archivo vive solo en la rama 2.0 y explica cómo se trabaja en ella sin
volver a perder nada y sin pisar la web que está en producción.

---

## 1. Mapa: dos carpetas, dos ramas, un repositorio

| Carpeta | Rama fija | Qué es |
|---|---|---|
| `C:\Users\Administrator\Downloads\tsc.web` | `main` | La web en producción. Bugs y mejoras chicas de la versión actual. Push = deploy automático a Firebase Hosting. |
| `C:\Users\Administrator\Downloads\tsc.web-yunacoins` | `feat/yunacoins-pes5` | La 2.0: editor de jugadores, tools PES5, pedidos de mejora, YunaCoins. Push **no** despliega nada. |

Las dos carpetas son *worktrees* del mismo repo (`git worktree list`). Comparten
historial; un commit hecho en una se ve en la otra al instante.

Lo que la 2.0 tiene de más respecto de `main`:
- `tsc-src/prototipo_yunas/` (editor, tools PES4/PES5, documentación).
- `tsc-src/js/pes5-crypt.js` y `tsc-src/js/pes5-editor.js`.
- Reglas de Firestore `pedidos_pes5` y `pes5_plantillas` (ya desplegadas el 30/08/2026).
- `tsc-src/_material-diseno/`.

---

## 2. Reglas duras (nunca romperlas)

1. **Nunca cambiar de rama dentro de una carpeta.** Ni `git checkout main` en
   `tsc.web-yunacoins`, ni `git checkout feat/...` en `tsc.web`. Se abre la
   carpeta que corresponde al trabajo del día. Cambiar de rama desde la app
   hace un stash automático que saca del disco todo lo no commiteado: así se
   "perdió" `prototipo_yunas` el 01/09/2026.
2. **Commitear antes de cerrar la sesión.** Nada nuevo queda sin commitear de
   un día para otro. Si algo desaparece del disco, mirar `git stash list`
   antes de reconstruir nada.
3. **Lo que git ignora vive solo en esta carpeta** y no tiene respaldo:
   memory cards `.ps2`, snapshots de PES5 (`pes5/snapshots/*.bin` salvo
   `00-baseline.bin`), `settings.local.json`. Si es valioso, copia manual
   fuera del repo.
4. **`main` no recibe nada de la 2.0 hasta el PR final** (sección 5). Un
   arreglo que producción necesita ya se hace en `tsc.web`, no acá.
5. Siguen valiendo todas las reglas de `CLAUDE.md`: iconos SVG, `_esc()` en
   `innerHTML`, sin credenciales inline, `graphify update .` tras tocar código.

---

## 3. Ciclo normal de trabajo en la 2.0

```bash
cd C:\Users\Administrator\Downloads\tsc.web-yunacoins
git pull                      # por si se pusheó desde otro lado
# ... trabajar ...
git add -A && git commit -m "feat(editor): ..."
git push
```

Servidor local: `cd tsc-src && npx serve .` en **esta** carpeta. Ojo: pega
contra el Firestore real (no hay sandbox), igual que en `tsc.web`.

Convención de mensajes: `feat(editor)`, `feat(pes5)`, `feat(pedidos)`,
`feat(yunacoins)`, `fix(...)`, `docs(...)`, `chore(...)`.

---

## 4. Cuándo traer `main` a la 2.0 (`git merge main`)

Siempre en la dirección **main → feat**, siempre desde `tsc.web-yunacoins`.

Hacerlo:
- **Antes de empezar una tarea grande** (un slice nuevo del editor, integrar
  una pantalla en `index.html`, tocar `public.js`/`redesign.css`).
- **Cada vez que en `tsc.web` se arregló algo que la 2.0 también toca**
  (`db.js`, `auth.js`, `state.js`, `components.css`, `variables.css`,
  `public.js`, `index.html`, `firestore.rules`).
- **Como mínimo una vez por semana** si hubo commits en `main`. Cuanto más se
  alejan las ramas, más conflictos habrá al final.
- **Obligatorio justo antes del PR final** (sección 5).

```bash
cd C:\Users\Administrator\Downloads\tsc.web-yunacoins
git fetch origin
git merge main --no-edit
```

Conflicto típico y único hasta ahora: `tsc-src/graphify-out/GRAPH_REPORT.md`.
No se resuelve a mano:

```bash
git checkout --theirs -- tsc-src/graphify-out/GRAPH_REPORT.md
cd tsc-src && graphify update . && cd ..
git add tsc-src/graphify-out/GRAPH_REPORT.md
git commit --no-edit
git push
```

Cualquier otro conflicto se resuelve mirando los dos lados; ante la duda, la
versión de `main` es la que está en producción y manda.

**Chequeo rápido de si hace falta mergear:**
`git rev-list --count feat/yunacoins-pes5..main` → si da más de 0, hay commits
de `main` que la 2.0 todavía no tiene.

---

## 5. Cuándo hacer el PR de la 2.0 a `main`

Solo cuando **todo** esto se cumple. Mientras falte algo, no hay PR.

**Checklist de "2.0 lista":**
- [ ] El editor de jugadores está integrado como sección de la web (no como
      prototipo suelto en `prototipo_yunas`), con login, equipos y coins reales.
- [ ] El flujo completo funciona de punta a punta en local contra datos
      reales: presidente crea pedido → admin lo ve en la tool → lo aplica en
      el option file de PES5 → lo marca aplicado → el presidente lo ve.
- [ ] YunaCoins: decidida e implementada la dirección del sync con Streamlabs
      (ver `tsc-src/prototipo_yunas/STREAMLABS_YUNACOINS.md`), o
      explícitamente pospuesta a una 2.1.
- [ ] Reglas de Firestore desplegadas a mano y verificadas
      (`firebase deploy --only firestore:rules` desde esta carpeta).
- [ ] `prototipo_yunas/` limpia: lo que quedó como investigación
      (`tools/`, `pes5/tools/`, `README.md`, mapas) se conserva como
      documentación; lo que ya se portó a `tsc-src/js` se borra o se marca
      como obsoleto. Nada de HTML duplicado del editor.
- [ ] Probado en la APK Android (Capacitor) además del navegador.
- [ ] `versionCode`/`versionName` subidos a 2.0.0 en `android/app/build.gradle`.
- [ ] `graphify update .` corrido y `GRAPH_REPORT.md` commiteado.
- [ ] `git rev-list --count feat/yunacoins-pes5..main` da **0** (merge de
      `main` hecho el mismo día del PR).

**Pasos del PR:**

```bash
cd C:\Users\Administrator\Downloads\tsc.web-yunacoins
git merge main --no-edit          # último merge, mismo día
git push
gh pr create --base main --head feat/yunacoins-pes5 --title "Web 2.0: editor de jugadores, PES5 y YunaCoins" --body-file PR_2.0.md
```

Después:
1. Revisar el PR en GitHub (diff completo, sin `.ps2`, sin snapshots, sin
   credenciales).
2. Mergear con **merge commit** (no squash: se pierde el historial de la 2.0).
3. El push a `main` dispara el deploy de hosting. Verificar producción en
   `teamsubscup.web.app` con el checklist de la memoria de deploy: confirmar
   que el JS servido ya es el nuevo antes de dar por hecho nada.
4. Publicar la APK 2.0 como release (misma firma, ver memoria de releases).
5. Cerrar el ciclo:
   ```bash
   cd C:\Users\Administrator\Downloads\tsc.web
   git pull
   git worktree remove ../tsc.web-yunacoins
   git branch -d feat/yunacoins-pes5
   git push origin --delete feat/yunacoins-pes5
   ```
   Antes de borrar el worktree, copiar fuera del repo lo ignorado que valga
   (memory cards, snapshots).

---

## 6. Casos especiales

**Hotfix urgente en producción mientras se trabaja la 2.0.**
Se hace en `tsc.web` sobre `main`, se pushea (deploy automático), y después
`git merge main` en `tsc.web-yunacoins` para que la 2.0 también lo tenga.
Nunca al revés.

**Un fix hecho por error en la 2.0 que producción necesita ya.**
Desde `tsc.web`: `git cherry-pick <sha>` y push. Después, en
`tsc.web-yunacoins`, `git merge main` *antes* de seguir. Si no se hace ese
merge, el PR final va a tener el mismo cambio con dos SHA distintos y conflictos
tontos.

**Un cambio de reglas de Firestore en la 2.0.**
Las reglas son globales: desplegarlas desde esta carpeta las aplica a
producción también. Solo agregar colecciones o reglas nuevas
(`pedidos_pes5`, `pes5_plantillas`); no cambiar el comportamiento de las
existentes hasta el PR final. Nunca tocar `isAdmin()`/`isUser()` sin verificar
la consola.

**Cambio de versión de la APK en `main`.**
Al mergear `main`, `android/app/build.gradle` trae el `versionCode` nuevo. La
2.0 no sube versión por su cuenta hasta el PR final.

---

## 7. Dónde está cada cosa de la 2.0

| Tema | Archivo |
|---|---|
| **Plan vigente: Tool PES5 unificada (slices A-E)** | `tsc-src/prototipo_yunas/MACRO_SLICE_PES5_TOOL.md` |
| Plan del editor PES4 (slices A-E, sin implementar) | `tsc-src/prototipo_yunas/MACRO_SLICE_EDITOR_PES4.md` |
| Cifrado y mapa del option file PES5 (resuelto) | `tsc-src/prototipo_yunas/pes5/README.md`, `pes5-map.json`, `pes5-keys.json` |
| Editor de jugadores (prototipo funcional) | `tsc-src/prototipo_yunas/prototype-editor-jugador.html` |
| Tool del admin para aplicar pedidos | `tsc-src/prototipo_yunas/pes5/admin-pes5.html`, `admin-tool-luis.html` |
| Vincular equipos TSC ↔ PES5 | `tsc-src/prototipo_yunas/pes5/admin-vincular-equipos.html` |
| Módulos de navegador PES5 | `tsc-src/js/pes5-crypt.js`, `tsc-src/js/pes5-editor.js` |
| YunaCoins / Streamlabs (decisión abierta) | `tsc-src/prototipo_yunas/STREAMLABS_YUNACOINS.md` |
| Reglas Firestore nuevas | `firebase/firestore.rules` (`pedidos_pes5`, `pes5_plantillas`) |
