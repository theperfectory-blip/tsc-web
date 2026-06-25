# Pre-slice — Macro Slice D · Palmarés Media Backend
> Orden maestro: **C → A → B → D**. D arranca **solo después** de que B pase QA de performance.
> D = media/backend/admin. **D NO reabre el rediseño visual** (solo wiring mínimo al contrato de collage de B).

## Objetivo
Agregar fotos reales por campeón para alimentar el collage/carrusel de la sala fullscreen ya estabilizada en B, con subida/admin y persistencia cross-device.

## Alcance (entra)
- Store nuevo **`palmares-media`**; subir **`DB_VER` 6 → 7**.
- Migración **aditiva** (`onupgradeneeded` crea solo el store nuevo, sin tocar datos existentes).
- Export/import: agregar `palmares-media` a `STORES` → `data.js` (que itera `STORES`) lo incluye **automáticamente** (verificar el `storeMap` de `importDB`).
- Admin de media en `page-palmares-admin` (gestor por campeón/título).
- Público: la sala consume `palmares-media` vía el contrato de B; lazy-load; fallback limpio sin placeholders.

## Modelo (decidido)
```js
{
  id, ownerKey,            // ownerKey = `${competition}|${season}|${teamId}` (clave canónica, id del doc)
  competition, season, teamId,
  recordId,                // opcional: id del registro palmares cuando exista (no reemplaza ownerKey)
  items: [ { url, alt, order, uploadedAt, width, height } ],
  createdAt, updatedAt
}
```
Reglas: `ownerKey` = clave canónica para buscar/upsert · máx **12 fotos por campeón** · la sala renderiza **máx 7 simultáneas** (rota/lazy, no monta todas) · **sin base64/blobs** (solo URLs) · eliminar foto = quitar referencia (sin borrado físico en Cloudinary sin backend firmado).

## Admin media (en `page-palmares-admin`)
Gestor por campeón/título: subir varias fotos · editar `alt` · reordenar · quitar referencia · preview antes de guardar. Reusar **`uploadImageToCloud`** + `openCropModal`. **No tocar `cloudinary.js`** ni la gestión de copas (solo botones/enlaces hacia media).

## Firestore (REQUISITO BLOQUEANTE)
Reglas **admin-write / public-read** para `palmares-media`. Validar en la **consola Firestore** (las reglas se editan por consola, no CLI) **antes de cerrar el slice**. Si las reglas no están listas, el slice **no se aprueba como completo** (sin esto: o queda bloqueado, o es hueco de seguridad).

## Contrato con Slice B (consume)
D llena el provider de B (`setSalaCollage(items)` / `getPalmaresMedia(ownerKey)`) **sin modificar el render principal de la sala** (solo wiring mínimo). La sala pasa de "fallback sin fotos" a collage real.

## Fuera de alcance (NO entra)
- Rediseño visual de la sala (es B).
- Tocar `cloudinary.js` / `firebase-config.js`.
- Gestión/admin de copas.

## Archivos a tocar / a NO tocar
- **Tocar:** `state.js` (`STORES` + `DB_VER` 7), `db.js` (`onupgradeneeded` aditivo), `palmares.js` o nuevo `palmares-media.js` (admin gestor + consumo en sala vía contrato de B), `data.js` (verificar inclusión en export/import), admin de Palmarés (`page-palmares-admin`).
- **NO tocar:** `cloudinary.js`, `firebase-config.js`, gestión de copas, el render principal de la sala de B (salvo wiring del contrato).

## Riesgos + mitigaciones
- Reglas Firestore faltantes → requisito bloqueante (arriba).
- Migración `DB_VER` rompe datos → aditiva, probar que datos previos sobreviven.
- `ownerKey` no joinea con `palmares` → confirmar cómo `palmares` identifica al campeón por edición antes de fijar la clave.
- Reventar la sala con muchas fotos → cap 12 guardadas / 7 simultáneas (lazy).
- Imágenes pesadas → restricciones de formato/tamaño + resize (aspecto apaisado del collage).

## Pasos de ejecución
CP0 (usage ≤10%) → `STORES`+`DB_VER` 7 + migración aditiva → modelo `palmares-media` (dbAdd/dbPut/dbGetAll) → admin gestor (subir/alt/reordenar/quitar/preview, reusar `uploadImageToCloud`) → consumo en la sala vía contrato de B (lazy, cap 7) → verificar export/import → **validar reglas Firestore en consola** → QA público/admin.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre estable 75%. Máx 3 subagentes solo-lectura · 1 escritor.

## Criterios de aceptación
- Admin: subir, ordenar, editar `alt` y quitar fotos de un campeón.
- Público: la sala muestra fotos reales detrás de la copa; sin fotos → fallback **sin placeholders**.
- **Firestore** refleja media **cross-device**; IndexedDB local no rompe.
- Export/import conserva `palmares-media`.
- **`firebase-config.js` y `cloudinary.js` NO se tocan ni se stagean.**
- Reglas Firestore admin-write/public-read **validadas en consola**.
- Sin errores de consola · `node --check` en JS tocado · QA admin/público desktop/mobile.
