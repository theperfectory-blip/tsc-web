# Subsesiones: coordinador y ejecutores

Cómo trabajan las sesiones de Claude que el coordinador lanza o dirige
(por ejemplo, «Ejecutor TSC Web (Haiku)»). Lo decidió Jimbo el 2026-11-17.

## Roles

- **Coordinador:** la sesión que habla con Jimbo. Recibe los pedidos, los
  parte en slices, los manda a un ejecutor con
  `mcp__ccd_session_mgmt__send_message`, audita lo que entrega (código,
  tests, reporte) y le informa a Jimbo.
- **Ejecutor:** la subsesión que implementa un slice. Trabaja solo en la rama
  `dev` del worktree `emparejar-80` (ver `una-rama-dev`). Nunca hace PR,
  merge ni deploy: eso lo hace el coordinador con el OK de Jimbo.

## Regla 1 · El ejecutor avisa al terminar

Al terminar **cada** encargo, el ejecutor le manda un mensaje al coordinador
con `mcp__ccd_session_mgmt__send_message`, y el `session_id` es el del
coordinador (el `parentSessionId` de la subsesión, o el que venga en el
encargo). Esto vale para todos los resultados: terminado, bloqueado o con
una duda. El coordinador no recibe ningún aviso automático cuando una
subsesión queda inactiva, así que, sin ese mensaje, el trabajo queda parado.

El mensaje lleva:

- el estado: `TERMINADO`, `BLOQUEADO` o `PREGUNTA`;
- el slice y los hashes de los commits;
- los tests que se corrieron, con su resultado (`N/N OK`), y los que **no**
  se corrieron, con el motivo;
- la ruta del reporte en `docs/reportes/`;
- lo que haya que desplegar a mano o decidir.

Si el envío falla, el ejecutor deja el mismo texto como último mensaje de su
sesión. El coordinador lo lee con `mcp__ccd_session_mgmt__list_events`.

## Regla 2 · Permisos

Jimbo autoriza que las subsesiones que corre el coordinador ejecuten
comandos en este computador **sin pedir confirmación**: builds, tests,
emuladores, servidores del sandbox, scripts de `scripts/` y `tools/`, y
git sobre `dev` (commit y push). El coordinador puede ponerlas en modo
`bypassPermissions`.

Siguen prohibidos aunque haya permiso, porque son reglas del proyecto y no
pedidos de confirmación:

- PR, merge a `main`, deploy (hosting, reglas, functions) y releases de la
  APK. Los hace el coordinador con el OK de Jimbo.
- Apretar «Liberar Firestore» o escribir en la base de producción.
  `localhost:3000` y `hosting-dist` apuntan a producción, así que ahí solo
  se puede leer (`docs/PROTOCOLO_VERIFICACION.md`).
- `git checkout` a otra rama en `tsc.web-yunacoins` o en la carpeta de
  producción, borrar ramas y `git push --force`.
- Commitear credenciales (ver `AGENTS.md` → Seguridad).
- Correr tests de reglas contra el emulador del sandbox (`:8080`/`:9099`).
  Se usa `firebase emulators:exec` con su propio emulador.

## Emulador de Firestore en esta máquina

Arranca solo con el directorio de sockets cambiado (`emu-start.mjs` ya lo
hace). Para `npm run test:rules*`, exportar antes:

```bash
export JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=C:/Users/Administrator/.cache/firebase"
```
