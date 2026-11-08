# Investigación de la 2.0 (slice 5.A)

Esta carpeta guarda la documentación de investigación que vivía en
`tsc-src/prototipo_yunas/`. Se movió con `git mv` para conservar el historial.
Fuera de `tsc-src/`: nada de esto se publica con la web.

| Antes | Ahora |
|---|---|
| `prototipo_yunas/*.md` (macros, slices, `STREAMLABS_YUNACOINS.md`, `LOOP_CIERRE_2.0.md`) | `docs/2.0/investigacion/` |
| `prototipo_yunas/pes5/README.md` | `pes5-README.md` |
| `prototipo_yunas/pes4-map.json` | `pes4-map.json` (lo lee `tools/pes5/write-attrs.js`) |
| `prototipo_yunas/pes5/key-256.bin` | `key-256.bin`: clave XOR **pública** del formato de PES5, la misma que sirve `js/pes5/pes5-keys.json`. No es una credencial; se conserva como investigación. |
| `prototipo_yunas/pes5/tools/OptionFile.java` | `OptionFile.java` (lo lee `tools/pes5/pes5-crypt.js`) |

Los scripts de node están en `tools/pes5/` y los tests en `tools/` (`npm test`).

**Importante:** los documentos de esta carpeta son históricos. Sus rutas
`tsc-src/prototipo_yunas/...` y `localhost:3001/prototipo_yunas/...` corresponden
a la versión anterior al slice 5.A. Las páginas HTML sueltas (`pes5-tool.html`,
`prototype-editor-jugador.html`, `admin-*.html`, `test-browser-crypto.html`) se
borraron; la versión viva es `tsc-src/js/pes5-tool.js` y `tsc-src/js/mejoras-page.js`.
Para verlas como estaban, usar el historial de git.
