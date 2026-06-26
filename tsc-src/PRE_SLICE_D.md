# Pre-slice — Macro Slice D · Palmarés Media Backend
> **v2 (2026-06-25) tras auditoría de código.** Corrige DOS premisas falsas de v1: (1) **`data.js` NO itera `STORES`** (export e import son listas hardcodeadas) → **editar `data.js` es OBLIGATORIO**, no opcional; (2) **`ownerKey` es frágil** (`season` opcional) → la clave canónica debe ser **`recordId`** (el `id` autoincrement del registro `palmares`).
> Orden maestro: **C → A → B → D**. D arranca **solo después** de que B pase QA de performance. D = media/backend/admin; **NO reabre el rediseño visual** (solo wiring al contrato de B).

## Objetivo
Agregar fotos reales por campeón para alimentar el collage de la sala (ya estabilizada en B), con subida/admin y persistencia cross-device.

## Alcance (entra)
- Store nuevo **`palmares-media`**; subir **`DB_VER` 6 → 7** (verificado: `state.js:18` = 6).
- Migración **aditiva**: `db.js:30-37` itera `STORES` y crea solo los que faltan (`if(!contains(s)) createObjectStore`) → añadir `'palmares-media'` a `STORES` + subir `DB_VER` basta, sin tocar datos previos. **Verificado seguro.**
- **Export/import (`data.js`): EDICIÓN OBLIGATORIA + integridad referencial (ver sección dedicada).** Auditoría: `data.js` **NO itera `STORES`**:
  - Export (`data.js:47-48`, `exportFullDB`): lista **hardcodeada** de 7 stores (`teams, competitions, phases, matches, coins, seasons, matchHistory`). **No incluye `palmares`/`palmares-comps` hoy.**
  - Import (`data.js:78`): `storeMap` **hardcodeado** con esos mismos 7.
  - **Import REGENERA IDs** (`data.js:84`: `const {id,...rest}=item; dbAdd(store,rest)`) salvo `matchHistory` (`data.js:81-82` preserva con `dbAdd(store,item)`).
  - Único uso dinámico de `STORES`: el borrado en overwrite (`data.js:76`).
  - → **D DEBE editar `data.js`** (export + `storeMap`) e incluir `palmares`, `palmares-comps`, `palmares-media`, **preservando IDs** (ver abajo).

## Integridad referencial en export/import (REQUISITO BLOQUEANTE — Codex 2026-06-25)
Como `palmares-media.recordId` apunta a `palmares.id`, y el import **regenera IDs por defecto** (`data.js:84`), restaurar un backup **rompería la relación media → palmarés** si no se preservan/remapean los IDs. El plan D debe implementar en `data.js`:
```
En export/import:
- incluir `palmares`
- incluir `palmares-comps`
- incluir `palmares-media`
- preservar IDs de `palmares` y `palmares-media`, o remapear `oldRecordId → newRecordId`
- recomendación: PRESERVAR IDs con `dbPut` durante el import para estas stores relacionadas
  (patrón ya usado por `matchHistory` en data.js:81-82, pero con `dbPut` = upsert para soportar
   modo 'merge' sin colisión de clave; en 'overwrite' el store ya se vació en data.js:76).
- si se opta por remapear: construir `{oldId→newId}` al importar `palmares` y aplicarlo a
  `palmares-media.recordId` ANTES de insertar media.
```
Sin esto, D queda peligroso (media huérfana tras restore). `palmares-comps`: preservar IDs también si `palmares.competition` referencia su `id`.
- Admin de media en `page-palmares-admin` (existe, index.html:251; gestión de copas en `renderAdmPalmares`, palmares.js:1529).
- Público: la sala consume `palmares-media` vía el contrato de B; lazy-load; fallback limpio sin placeholders.

## Modelo (CORREGIDO — clave canónica = recordId)
```js
{
  id,                      // id del doc media
  recordId,                // CLAVE CANÓNICA = id del registro `palmares` (autoincrement, estable)
  ownerKey,                // índice secundario LEGIBLE = `${competition}|${season||''}|${teamId}` (NO único)
  competition, season, teamId,  // denormalizados para búsqueda/UI
  items: [ { url, alt, order, uploadedAt, width, height } ],
  createdAt, updatedAt
}
```
**Por qué `recordId` y no la tripleta:** el modelo `palmares` es `{ id, teamId, competition, year?, season?, ... }` y **`season` es OPCIONAL** (seed solo lo pone `if(r.season)`, palmares.js:628). `ownerKey = comp|season|teamId` **colisiona** (mismo equipo, misma comp, sin season; o 2 ediciones misma season) y **cambia** si el admin edita season/year → media huérfana. El `id` (keyPath autoincrement) es único y estable por edición. Además el "campeón vigente" se resuelve por orden/override (`reigningChampion` palmares.js:557, overrides 498), no por la tripleta → atar media a `recordId` apunta al registro correcto.

Reglas: máx **12 fotos por campeón** · sala renderiza **máx 7 simultáneas** (rota/lazy) · **sin base64/blobs** (solo URLs) · eliminar foto = quitar referencia (sin borrado físico en Cloudinary sin backend firmado).

## Admin media (en `page-palmares-admin`)
Gestor por campeón/título: subir varias fotos · editar `alt` · reordenar · quitar referencia · preview. **Reusar `uploadImageToCloud(file)→Promise<url>`** (cloudinary.js:26, `window.uploadImageToCloud`) + **`openCropModal(file, type, onConfirm)`** (profile.js:416; patrón crop→upload en profile.js:622/661). **No tocar `cloudinary.js`** ni la gestión de copas (solo botones/enlaces hacia media).

## Firestore (REQUISITO BLOQUEANTE)
Reglas **admin-write / public-read** para `palmares-media`. Validar en la **consola Firestore** (las reglas se editan por consola) **antes de cerrar el slice**. Sin esto: bloqueado o hueco de seguridad → el slice **no se aprueba como completo**.

## Contrato con Slice B (consume — CORREGIDO)
D llena el provider de B: **`setSalaCollage({ recordId, items, colors })`** / **`getPalmaresMedia(recordId)`**. Identifica por **`recordId`**, no por la tripleta. B ya pasa los colores del club (el collage recolorea por club) → D solo aporta `items`. **Sin modificar el render principal de la sala** (solo wiring).

## Fuera de alcance (NO entra)
Rediseño visual de la sala (B) · tocar `cloudinary.js`/`firebase-config.js` · gestión/admin de copas.

## Archivos a tocar / NO tocar
**Tocar:** `state.js` (`STORES` + `DB_VER` 7), `db.js` (verificar `onupgradeneeded` aditivo — ya lo es), `data.js` (**OBLIGATORIO:** export `data.js:47-48` + `storeMap` `data.js:78`), `palmares.js` o nuevo `palmares-media.js` (admin gestor + consumo en sala vía contrato de B), admin de Palmarés (`page-palmares-admin`).
**NO tocar:** `cloudinary.js`, `firebase-config.js`, gestión de copas, el render principal de la sala de B (salvo wiring).

## Riesgos + mitigaciones
- **`data.js` hardcodeado** → editar export + storeMap (arriba). Sin esto, fotos no sobreviven backup/restore.
- **`ownerKey` no único** → clave canónica `recordId`; ownerKey solo índice legible.
- Reglas Firestore faltantes → requisito bloqueante.
- Migración `DB_VER` → aditiva (verificada), probar que datos previos sobreviven.
- Reventar la sala con muchas fotos → cap 12 guardadas / 7 simultáneas (lazy).
- Imágenes pesadas → restricciones de formato/tamaño + resize (aspecto apaisado del collage).

## Pasos de ejecución
CP0 (≤10%) → `STORES`+`DB_VER` 7 + verificar migración aditiva → modelo `palmares-media` con `recordId` canónico (dbAdd/dbPut/dbGetAll) → **editar `data.js`** (export + storeMap con `palmares`, `palmares-comps`, `palmares-media` + **preservar/remapear IDs** vía `dbPut`) → admin gestor (subir/alt/reordenar/quitar/preview, reusar `uploadImageToCloud`+`openCropModal`) → consumo en la sala vía contrato de B (`getPalmaresMedia(recordId)`, lazy, cap 7) → **probar ciclo export→overwrite import: la relación media→palmarés sobrevive** → **validar reglas Firestore en consola** → QA público/admin.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura · 1 escritor.

## Criterios de aceptación
- Admin: subir, ordenar, editar `alt` y quitar fotos de un campeón (por `recordId`).
- Público: la sala muestra fotos reales detrás de la copa; sin fotos → fallback **sin placeholders**.
- **Firestore** refleja media **cross-device**; IndexedDB local no rompe.
- **Export/import conserva `palmares-media`** + `palmares` + `palmares-comps` (`data.js` editado).
- **Integridad referencial:** tras export→import (overwrite), la relación `palmares-media.recordId → palmares.id` **sobrevive** (IDs preservados o remapeados). Probado en vivo.
- Media atada a **`recordId`** (sobrevive a edición de season/year del registro).
- **`firebase-config.js` y `cloudinary.js` NO se tocan ni se stagean.**
- Reglas Firestore admin-write/public-read **validadas en consola**.
- Sin errores de consola · `node --check` · QA admin/público desktop/mobile.
