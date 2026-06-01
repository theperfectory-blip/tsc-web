# Auditoría de Sincronización: Archivos vs Graphify
**Fecha:** 2026-05-09  
**Directorio:** `C:\Users\Administrator\Downloads\tsc.web\tsc-src`

---

## 📊 Resumen Ejecutivo

✅ **Estado: TODO SINCRONIZADO**

- **Archivos JS en directorio:** 17
- **Archivos JS en graph.json:** 17
- **Match 100%:** ✓ Todos los archivos están representados

---

## 📁 Archivos del Proyecto

### JavaScript (tsc-src/js/)
| # | Archivo | Líneas | Estatus | Funciones Principales |
|---|---------|--------|--------|----------------------|
| 1 | `state.js` | ~20 | ✓ En gráfico | STATE, DB_NAME, DB_VER |
| 2 | `db.js` | ~150 | ✓ En gráfico | dbGetAll, dbGet, dbAdd, dbPut, dbDelete |
| 3 | `ui-utils.js` | ~240 | ✓ ACTUALIZADO | showToast, showConfirm, notifyTeamChanged (NEW) |
| 4 | `nav.js` | ~100 | ✓ En gráfico | setMode, goAdminPage, goPublicPage |
| 5 | `color-picker.js` | ~80 | ✓ En gráfico | openColorPicker, PALETTE |
| 6 | `competitions.js` | ~225 | ✓ ACTUALIZADO | COMP_TYPES (4 tipos), PHASE_TYPES (4 tipos - sin "derived") |
| 7 | `phases.js` | ~760 | ✓ ACTUALIZADO | openPhaseModal, savePhase, buildPhaseTypeGrid |
| 8 | `standings.js` | ~450 | ✓ En gráfico | calcGroupStandings, renderGroupTable |
| 9 | `matches.js` | ~900 | ✓ En gráfico | renderAdmMatches, saveMatchResult |
| 10 | `bracket.js` | ~680 | ✓ En gráfico | renderBracket, resolveSlotRef (FIXED) |
| 11 | `playoff.js` | ~450 | ✓ En gráfico | renderPlayoff, savePlayoffLeg |
| 12 | `teams.js` | ~510 | ✓ ACTUALIZADO | saveTeam (auto-backup), openTeamModal |
| 13 | `coins.js` | ~200 | ✓ En gráfico | renderAdmCoins, saveCoinsTransaction |
| 14 | `seasons.js` | ~150 | ✓ En gráfico | renderAdmSeasons, finalizeSeason |
| 15 | `data.js` | ~120 | ✓ En gráfico | exportFullDB, importDB |
| 16 | `public.js` | ~150 | ✓ En gráfico | renderPubPanel, pubSelectComp |
| 17 | `history.js` | ~650 | ✓ ACTUALIZADO | renderAdmHistory, _teamCellHTML (mostrando "ⓘ") |

### CSS (tsc-src/css/)
| Archivo | Estatus |
|---------|--------|
| `variables.css` | ✓ Presente |
| `layout.css` | ✓ Presente |
| `components.css` | ✓ Presente |

### HTML (tsc-src/)
| Archivo | Estatus |
|---------|---------|
| `index.html` | ✓ Presente |

### Datos (tsc-src/data/)
| Archivo | Estatus |
|---------|---------|
| `historial-seed.json` | ✓ Presente |

---

## 🔄 Cambios Recientes Auditados

### 1. **competitions.js** - Limpieza de tipos de fase
```javascript
✓ COMP_TYPES: Reducido de 6 a 4 tipos
  - Removido: 'world' (Formato mundial)
  - Removido: 'split' (Liga dividida)
  - Conservado: 'league', 'cup', 'playoff', 'super'

✓ PHASE_TYPES: Reducido de 5 a 4 tipos
  - Removido: 'derived' (Fase derivada - incompleta)
  - Conservado: 'groups', 'bracket', 'playoff', 'single'
```
**Verificación:** ✓ Graph actualizado (728→727 edges)

### 2. **phases.js** - Eliminación de lógica "Fase derivada"
```javascript
✓ Removido: Color específico para 'derived'
✓ Removido: Meta badge "derivada auto"
✓ Removido: Sección modal HTML para configuración derivada
✓ Removido: else if(type==='derived') en savePhase()
✓ Removido: derived property en data object
```
**Verificación:** ✓ Ninguna referencia a 'derived' en phases.js

### 3. **teams.js** - Auto-backup de nombres históricos
```javascript
✓ NEW LOGIC en saveTeam():
  - Detecta cambios de nombre (existing.name !== name)
  - Agrega automáticamente nombre anterior a previousNames
  - Previene duplicados

✓ MEJORADO UI:
  - Tooltip en modal mostrando: 
    "💡 Si cambias el nombre, el actual se agregará automáticamente."
```
**Verificación:** ✓ Función saveTeam en graph.json

### 4. **ui-utils.js** - Regeneración de historial
```javascript
✓ NEW en notifyTeamChanged():
  - Llama refreshHistoryForSeason(STATE.season)
  - Actualiza registros de partidos de temporada actual
  - Asegura que nombres se muestren correctamente en historial
```
**Verificación:** ✓ Función notifyTeamChanged en graph.json

### 5. **history.js** - Visualización de nombres históricos
```javascript
✓ EXISTING en _teamCellHTML():
  - Muestra "ⓘ" cuando hay nombres históricos
  - Tooltip lista nombre actual y anteriores
  - Ya estaba implementado, ahora mejor aprovechado
```
**Verificación:** ✓ Función _teamCellHTML en graph.json

---

## 📈 Estadísticas del Gráfico

| Métrica | Valor |
|---------|-------|
| Nodos totales | 291 |
| Edges (relaciones) | 727 |
| Comunidades detectadas | 28 |
| God Nodes (más conectados) | 10 |
| Archivos fuente | 17 |
| Funciones extraídas | ~150+ |

### Top 5 God Nodes (Funciones Centrales)
1. `dbGetAll()` - 77 edges (CRUD - lectura masiva)
2. `dbGet()` - 51 edges (CRUD - lectura individual)
3. `showToast()` - 34 edges (UI - notificaciones)
4. `dbPut()` - 26 edges (CRUD - actualización)
5. `dbAdd()` - 16 edges (CRUD - creación)

---

## ✅ Checklist de Consistencia

| Aspecto | Check |
|--------|-------|
| Todos los archivos JS están en graph.json | ✓ |
| No hay archivos orfandados (sin referencia) | ✓ |
| Funciones nuevas están en graph.json | ✓ saveTeam, notifyTeamChanged |
| COMP_TYPES sin tipos removidos | ✓ |
| PHASE_TYPES sin tipos removidos | ✓ |
| No hay referencias residuales a 'derived' | ✓ |
| No hay referencias residuales a 'world' | ✓ |
| No hay referencias residuales a 'split' | ✓ |
| Lógica de nombres históricos documentada | ✓ |
| Historial muestra "ⓘ" correctamente | ✓ |

---

## 📋 Conclusión

**El mapa de graphify está 100% actualizado y sincronizado con los archivos fuente.**

Todos los cambios implementados en esta sesión están correctamente reflejados:
- ✓ Eliminación de tipos incompletos (Fase derivada, Formato mundial, Liga dividida)
- ✓ Implementación de respaldo automático de nombres históricos
- ✓ Mejora de visualización en historial de partidos

**Próximos pasos sugeridos:**
- Ejecutar `/graphify --wiki` para generar documentación navegable
- Revisar las "Thin Communities" para posibles refactorings
- Monitorear nuevas funciones que se agreguen

---

*Generado automáticamente - Audit Report v1.0*
