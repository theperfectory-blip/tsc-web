# TSC Admin Code Map (v1.9) — Complete Reference

**Language:** HTML5 + Vanilla JS + IndexedDB  
**Structure:** Single-file monolithic application  
**Theme:** Dark editorial (Estadio de Noche) with gold accents  
**Purpose:** Tournament administration for Teams Subs Cup (Copa Suscriptores)  
**Status:** Current production version

\---

## TABLE OF CONTENTS

1. [File Overview](#file-overview)
2. [CSS Architecture](#css-architecture)
3. [HTML Structure](#html-structure)
4. [JavaScript Modules](#javascript-modules)
5. [IndexedDB Schema](#indexeddb-schema)
6. [Key Global Variables](#key-global-variables)
7. [Event Handlers \& Lifecycle](#event-handlers--lifecycle)
8. [Common Edit Instructions](#common-edit-instructions)

\---

## FILE OVERVIEW

**File:** `TSC\_Admin\_v1\_9.html`  
**Size:** \~350KB  
**Location:** `/mnt/project/TSC\_Admin\_v1\_9.html`  
**Version:** 1.9 (major feature: dual team colors)

|Section|Lines|Purpose|
|-|-|-|
|`<head>`|1–7|Meta, charset, viewport, fonts (Bebas Neue, Barlow, Barlow Condensed)|
|`<style>`|8–5700|All CSS (variables, layout, components, modals, tournament phases)|
|`<body>`|5700–6100|HTML structure (topbar, sidebar, pubnav, main container, modals)|
|`<script>`|6100–6319|JavaScript modules (database, UI, tournament logic)|

\---

## CSS ARCHITECTURE

### 1\. Color System

**Primary Variables:**

```css
:root {
  --gold: #C9A84C;              /\* Main accent (menu, highlights, buttons) \*/
  --gold-l: rgba(201,168,76,0.12);  /\* Light overlay for hover states \*/
  --gold-b: rgba(201,168,76,0.28);  /\* Bold overlay for borders \*/
  
  --blue: #3B82F6;
  --blue-l: rgba(59,130,246,0.12);
  
  --green: #25A864;             /\* Success, promotion \*/
  --green-l: rgba(37,168,100,0.12);
  
  --red: #E84040;               /\* Error, danger, relegation \*/
  --red-l: rgba(232,64,64,0.12);
  
  --yellow: #F59E0B;            /\* Warning, attention \*/
  --yellow-l: rgba(245,158,11,0.12);
  
  /\* Backgrounds \*/
  --bg: #0C0F14;                /\* Main background (very dark) \*/
  --card: #141820;              /\* Card background (dark) \*/
  --card2: #1A1F2B;             /\* Secondary card (slightly lighter) \*/
  --nav: #090C10;               /\* Navigation background (darkest) \*/
  
  /\* Borders \*/
  --brd: rgba(255,255,255,0.07);    /\* Subtle border (7% white) \*/
  --brd2: rgba(255,255,255,0.13);   /\* Bold border (13% white) \*/
  
  /\* Text \*/
  --txt: #F0EDE6;               /\* Primary text (light cream) \*/
  --txt2: #8B8F9A;              /\* Secondary text (muted gray) \*/
  --txt3: #555A66;              /\* Tertiary text (dimmed gray) \*/
  
  /\* Spacing \& Radius \*/
  --r: 6px;                     /\* Small border-radius \*/
  --rl: 10px;                   /\* Large border-radius \*/
  
  /\* Bracket-specific \*/
  --bk-card-w: 220px;           /\* Team card width in bracket \*/
  --bk-row-h: 88px;             /\* Bracket row height \*/
}
```

**Light Theme Override:**

```css
\[data-theme="light"] {
  --bg: #F4F4F0;
  --card: #FFFFFF;
  --card2: #F0EEE8;
  --nav: #FFFFFF;
  --brd: rgba(0,0,0,0.08);
  --brd2: rgba(0,0,0,0.15);
  --txt: #1A1A1A;
  --txt2: #555555;
  --txt3: #999999;
}
```

### 2\. CSS Sections Map

|Section|Lines|Purpose|
|-|-|-|
|VARIABLES|9–49|Color scheme, spacing, typography|
|RESET \& BASE|51–60|Box-sizing, font inherit, scrollbar|
|TOPBAR|62–99|Fixed header: logo, season selector, mode buttons, theme toggle|
|SIDEBAR NAV|101–123|Admin navigation (fixed left, toggleable, section labels)|
|PUBLIC NAV|125–146|Public page tabs (fixed below topbar, scrollable)|
|MAIN CONTENT|148–157|Page container (responsive, margin for sidebar)|
|PÁGINAS|159–163|Page visibility toggle (`.page.active` shows)|
|COMPONENTES GENERALES|165–320|Cards, buttons, badges, inputs, utilities|
|MODALES|322–516|Overlay backdrop, modal dialog, header/body/footer|
|TABLAS|518–667|Table styling, striped rows, hover, sorting|
|FORMULARIOS|669–781|Form groups, labels, inputs, color pickers|
|GRID UTILITIES|783–821|Flex utilities, gap classes, margin/padding|
|ESTILOS ESPECIALES|823–974|Animations, transitions, special states|
|FASE: LIGA/GRUPOS|976–1283|Standings table, group colors, promotion/relegation|
|FASE: BRACKET ELIMINATORIO|1285–1717|Bracket layout, team cards, connector lines|
|FASE: PLAYOFF IDA/VUELTA|1719–1832|Two-leg table, aggregate scoring|
|SORTEO ANIMATION|1834–2173|Lottery animation (balls, LuisYuNa poses)|
|RESPONSIVE|2175–2253|Media queries (768px, 480px)|
|PRINT STYLES|2255–2350|Print-friendly layout|

### 3\. Key CSS Classes

**Layout \& Structure:**

```css
.card               /\* bordered container, background \*/
.card-hdr           /\* header with title + actions, border-bottom \*/
.card-title         /\* uppercase, Barlow Condensed, bold \*/
.section-lbl        /\* section label with divider line (::after) \*/
```

**Buttons:**

```css
.btn                /\* transparent button with border, hover effect \*/
.btn-primary        /\* gold filled button \*/
.btn-danger         /\* red outlined button \*/
.btn-sm             /\* padding: 4px 10px, font-size: 13px \*/
.btn-xs             /\* padding: 2px 7px, font-size: 12px \*/
.btn-icon           /\* padding: 5px 8px for icon buttons \*/
```

**Badges:**

```css
.badge              /\* inline-flex, padding: 2px 8px \*/
.badge-gold         /\* gold background + light border \*/
.badge-green        /\* green background + border \*/
.badge-warn         /\* yellow background + border \*/
```

**Tables:**

```css
.table              /\* striped tbody, hover effect \*/
.table-sm           /\* condensed rows \*/
.thead              /\* table header styling \*/
.th-sort            /\* sortable column (with sort icon) \*/
.tr-alt             /\* alternate row color \*/
```

**Forms:**

```css
.form-group         /\* input wrapper, margin-bottom: 12px \*/
.form-label         /\* label styling, margin-bottom: 4px \*/
.form-input         /\* input/textarea/select base styles \*/
.color-picker-group /\* dual color picker layout \*/
```

**Modals:**

```css
.modal-overlay      /\* full-screen backdrop (rgba) \*/
.modal-dialog       /\* centered modal container \*/
.modal-header       /\* title + close button \*/
.modal-body         /\* scrollable content area \*/
.modal-footer       /\* right-aligned action buttons \*/
```

**Tournament:**

```css
.liga-standings     /\* group standings table \*/
.bracket-card       /\* team card in bracket \*/
.bracket-row        /\* horizontal bracket row \*/
.playoff-table      /\* two-leg aggregate table \*/
```

\---

## HTML STRUCTURE

### Page Layout

```html
<body>
  <div id="topbar">
    <!-- Fixed header: logo, season selector, mode buttons, theme toggle -->
  </div>
  
  <div id="sidebar">
    <!-- Fixed left nav (admin only, toggleable) -->
    <div class="nav-item">...</div>
  </div>
  
  <div id="pubnav">
    <!-- Fixed public tabs (below topbar) -->
    <div class="pub-tab">...</div>
  </div>
  
  <div id="main">
    <!-- Page container (responsive, adjusts for sidebar) -->
    <div id="admin-teams-page" class="page">...</div>
    <div id="admin-seasons-page" class="page">...</div>
    <div id="admin-phases-page" class="page">...</div>
    <div id="admin-matches-page" class="page">...</div>
    <div id="editor-page" class="page">...</div>
    
    <div id="pub-teams-page" class="page">...</div>
    <div id="pub-standings-page" class="page">...</div>
    <div id="pub-bracket-page" class="page">...</div>
    <div id="pub-matches-page" class="page">...</div>
    <div id="pub-sorteo-page" class="page">...</div>
  </div>
  
  <!-- Modal Wrappers (appended dynamically) -->
  <div id="team-modal-wrap"></div>
  <div id="season-modal-wrap"></div>
  <div id="phase-modal-wrap"></div>
  <div id="match-modal-wrap"></div>
  <div id="confirm-modal-wrap"></div>
  <div id="toast-container"></div>
</body>
```

### Key Element IDs

**Navigation:**

|ID|Purpose|Notes|
|-|-|-|
|`#topbar`|Fixed header|Contains logo, season selector, mode buttons|
|`#sidebar`|Admin navigation|Toggle with `.open` class|
|`#pubnav`|Public tabs|Toggle with `.open` class|
|`#main`|Page container|Adjusts margin-left with `.with-sidebar`|

**Admin Pages:**

|ID|Purpose|Content|
|-|-|-|
|`#admin-teams-page`|Team management|CRUD interface for teams|
|`#admin-seasons-page`|Season management|Create/edit seasons|
|`#admin-phases-page`|Phase setup|Configure tournament phases|
|`#admin-matches-page`|Match recording|Log match results|
|`#editor-page`|Data import/export|Backup/restore, CSV seed|

**Public Pages:**

|ID|Purpose|Content|
|-|-|-|
|`#pub-teams-page`|Team showcase|Searchable grid of active teams|
|`#pub-standings-page`|Current standings|Liga table, bracket, or playoff view|
|`#pub-bracket-page`|Bracket visualization|SVG bracket with match results|
|`#pub-matches-page`|Match history|Filterable match list|
|`#pub-sorteo-page`|Lottery animation|Group draw ceremony animation|

**Modal Wrappers:**

|ID|Purpose|Content|
|-|-|-|
|`#team-modal-wrap`|Team form|Create/edit team|
|`#season-modal-wrap`|Season form|Create/edit season|
|`#phase-modal-wrap`|Phase form|Create/edit phase|
|`#match-modal-wrap`|Match form|Create/edit match|
|`#confirm-modal-wrap`|Confirmation dialog|Delete/action confirmation|
|`#toast-container`|Toast queue|Success/error messages|

**Content Areas:**

|ID|Purpose|Usage|
|-|-|-|
|`#adm-teams-content`|Team list table|Render teams in admin page|
|`#pub-teams-grid`|Team card grid|Render active teams|
|`#pub-standings-content`|Standings display|Liga/bracket/playoff view|
|`#pub-bracket-svg`|Bracket visualization|SVG bracket container|
|`#pub-matches-content`|Match list|Render match history|
|`#sorteo-container`|Animation|Lottery animation container|

\---

## JAVASCRIPT MODULES

### 1\. IndexedDB Layer

**Database:** `tscDb` (version 1)

```javascript
/\* Initialize Database \*/
async initDB()
  - Opens or creates IndexedDB "tscDb"
  - Creates 8 object stores if first load
  - Returns undefined (side effect only)
  - Called on window.load

/\* Add/Put/Get/Delete \*/
async dbAdd(storeName, data)
  - Adds new object to store
  - Returns auto-incremented primary key
  - Use for: new teams, seasons, phases, matches

async dbPut(storeName, data)
  - Overwrites object (requires 'id' field)
  - Use for: updating existing records

async dbGet(storeName, id)
  - Retrieves single record by primary key
  - Returns object or undefined
  - Use for: modal prefill, data lookup

async dbGetAll(storeName, filterFn)
  - Fetches all records from store
  - Optional filterFn callback: item => boolean
  - Returns sorted array
  - Use for: lists, renders, searches

async dbDelete(storeName, id)
  - Deletes single record by ID
  - Use for: removing teams, seasons, phases, matches

async dbClear(storeName)
  - Deletes all records in store
  - Use for: data reset, re-seeding

async seedInitialData()
  - Populates 60 canonical teams on first load
  - Fetches CSV from equipos\_tsc\_60.csv
  - Parses: name, ini, color, status, etc.
  - Sets all teams to status='ACTIVO'
  - Called once during initialization
  - No-op if teams store already has data
```

**Example Usage:**

```javascript
// Create
await dbAdd('teams', {
  name: 'FC Example',
  ini: 'FC',
  color: '#1A4A7A',
  color2: '#FFD700',
  status: 'ACTIVO',
  yunacoin: 100,
  createdAt: new Date().toISOString()
});

// Read
const team = await dbGet('teams', 1);

// Read all with filter
const activeTeams = await dbGetAll('teams', t => t.status === 'ACTIVO');

// Update
await dbPut('teams', { ...team, yunacoin: 200 });

// Delete
await dbDelete('teams', 1);
```

\---

### 2\. UI Core Functions

**Theme Management:**

```javascript
function setTheme(name)
  - Sets document.documentElement.dataset.theme = 'dark' | 'light'
  - Saves to localStorage: 'tsc\_theme'
  - Updates all CSS variable colors
  - Called on: initialization, theme toggle

function toggleTheme()
  - Switches between 'dark' and 'light'
  - Calls setTheme() with new value
  - Wired to: icon button in topbar (#theme-btn)
```

**Mode Management:**

```javascript
function setMode(mode)
  - mode: 'public' | 'admin' | 'editor'
  - Effects:
    - 'public': shows #pubnav, hides #sidebar, shows pub pages
    - 'admin': hides #pubnav, shows #sidebar, shows admin pages
    - 'editor': hides #pubnav, shows #sidebar, shows editor page
  - Updates button highlights in topbar
  - Hides all .page, shows appropriate one
```

**Page Navigation:**

```javascript
function showPage(pageName)
  - Hides all .page.active
  - Shows #${pageName}-page
  - Updates .pub-tab.active for public pages
  - Called by: nav items, pub tabs

function showAdmPage(section, phaseId)
  - Specialized for admin pages with phase context
  - Sets currentPhase global
  - Triggers appropriate render function
  - Called by: admin sidebar items
```

**Toast Notifications:**

```javascript
function showToast(message, type='success', duration=2000)
  - type: 'success' | 'error' | 'info' | 'warning'
  - Auto-dismisses after duration ms
  - Appends to #toast-container
  - Multiple toasts stack vertically
  - Color-coded based on type:
    - 'success': green badge
    - 'error': red badge
    - 'info': blue badge
    - 'warning': yellow badge

function showConfirm(title, message, onConfirm, onCancel)
  - Renders modal confirmation dialog
  - Modal contains: title, message, buttons
  - onConfirm: callback if user clicks "Confirmar"
  - onCancel: optional callback if user clicks "Cancelar"
  - Inserted into #confirm-modal-wrap
```

**Modal Management:**

```javascript
/\* All modals follow same pattern \*/

function openXyzModal(id=null)
  - id=null: create new
  - id=number: edit existing
  - Fetches from DB if editing
  - Renders modal HTML as string
  - Inserts into #xyz-modal-wrap

function closeXyzModal()
  - Clears innerHTML of #xyz-modal-wrap
  - Resets any temporary data (window.\_logoData, etc.)

/\* Modal HTML Structure \*/
const html = `
  <div class="modal-overlay" onclick="if(event.target===this) closeXyzModal()">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">Title</h2>
        <button onclick="closeXyzModal()" style="...">×</button>
      </div>
      <div class="modal-body">
        <!-- Form content -->
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeXyzModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveXyz(id)">Guardar</button>
      </div>
    </div>
  </div>
`;
document.getElementById('xyz-modal-wrap').innerHTML = html;
```

\---

### 3\. Team Management (Admin)

**Render Functions:**

```javascript
async renderAdmTeams()
  - Fetches all teams from IndexedDB
  - Displays as table:
    Columns: Name | Initials | President | Color | Status | YuNaCoins | Actions
  - Add/Edit/Delete buttons per row
  - Renders to #adm-teams-content
  - Called after: team CRUD, page show

async renderPubTeams()
  - Fetches active teams (status='ACTIVO')
  - Renders search input + empty grid
  - Calls renderPubTeamsGrid(teams)
  - Renders to #pub-teams-content
  - Called when pub-teams-page shown

async filterPubTeams()
  - Triggered: oninput on search field
  - Filters teams by name (case-insensitive substring)
  - Calls renderPubTeamsGrid(filteredTeams)

function renderPubTeamsGrid(teams)
  - Renders card grid (auto-fill 140px columns)
  - Each card shows:
    - Logo or initials badge (with color)
    - Team name (bold)
    - President name (if exists)
    - YuNaCoins balance (gold text, "coins" label)
  - Hover effect: border color → gold
  - Renders to #pub-teams-grid
```

**Modal Functions:**

```javascript
function openTeamModal(id=null)
  - id=null: new team form
  - id=number: edit existing team
  - If editing: fetches from DB, prefills all fields
  
  Form Fields:
    - Nombre (required, text)
    - Iniciales (2 chars, auto-uppercase)
    - Presidente (text, optional)
    - Historial de nombres (pipe-separated aliases)
    - Logo (file upload or remove)
    - Color Primario (picker + hex input + 12 presets)
    - Color Secundario (picker + hex input + 12 presets) ← NEW in v1.9
    - Estado (ACTIVO/INACTIVO dropdown)
    - YuNaCoins (number, min 0)
  
  Implementation Details:
    - Logo preview: shows uploaded image OR initials + color
    - Color preview: updates swatch + logo background (if no image)
    - Hex inputs: sync with color picker bidirectionally
    - Preset colors: 12 color buttons for quick selection

function closeTeamModal()
  - Clears #team-modal-wrap
  - Resets window.\_logoData = null

function previewLogo(input)
  - Reads FileReader on file input change
  - Converts to base64 data URL
  - Stores in window.\_logoData
  - Updates logo-preview div with <img>

function removeLogo()
  - Clears window.\_logoData = null
  - Resets preview to initials + color
  - Updates logo-ini-preview with current ini
  - Updates preview background with current color

function updateColorPreview(val, target='primary')
  - Updates color hex input \& swatch
  - Parameter target: 'primary' | 'secondary'
  - If primary + no logo: updates logo-preview bg
  - Routes to correct element IDs:
    - Primary: tf-color-hex, color-swatch, logo-preview
    - Secondary: tf-color2-hex, color2-swatch

function syncColorPicker(val, target='primary')
  - Validates hex format: /^#\[0-9A-Fa-f]{6}$/
  - If valid: updates picker input + swatch + preview
  - Routes by target parameter

function setTeamColor(color, target='primary')
  - Preset color button handler
  - Sets picker + hex input + swatch + preview (if needed)
  - Routes by target parameter
```

**CRUD Functions:**

```javascript
async saveTeam(id)
  - Validates: name is required
  - Captures all form fields:
    name, ini, pres, hist, color, color2, status, coins, logo
  - color2 falls back to color if empty: color2 = el.value || color
  - If id: dbPut (update existing)
  - If !id: dbAdd (create new, sets season=1)
  - Shows toast: "Equipo actualizado" or "Equipo creado"
  - Closes modal
  - Calls renderAdmTeams() to refresh

async deleteTeam(id)
  - Fetches team from DB
  - Shows confirmation dialog
  - On confirm:
    - dbDelete(teams, id)
    - Shows toast: "Equipo eliminado"
    - Calls renderAdmTeams() to refresh
```

\---

### 4\. Season Management (Admin)

**Render Functions:**

```javascript
async loadSeasons()
  - Fetches all seasons from IndexedDB
  - Populates season dropdown in topbar
  - Sets currentSeason global
  - Updates topbar display to show selected season
  - Called: initialization, after season CRUD

async renderAdmSeasons()
  - Filters seasons from DB
  - Displays table:
    Columns: Year | Name | Status | Created | Actions
  - Add/Edit/Delete buttons per row
  - Renders to #admin-seasons-page
  - Called: page show, after season CRUD
```

**Modal Functions:**

```javascript
function openSeasonModal(id=null)
  - Renders form with fields:
    - Year (4-digit number, required)
    - Name (text, required)
    - Descripción (textarea)
    - Estado (ACTIVO/INACTIVO/FINALIZADA dropdown)
  - If editing: prefills from DB
  - Renders to #season-modal-wrap

async saveSeason(id)
  - Validates: year, name required
  - Builds object: { year, name, description, status, updatedAt }
  - If id: dbPut (update)
  - If !id: dbAdd (create, sets createdAt)
  - Refreshes: loadSeasons(), renderAdmSeasons()
  - Shows toast, closes modal

async deleteSeason(id)
  - Shows confirmation dialog
  - On confirm:
    - Cascades: deletes all phases + matches in season
    - dbDelete(seasons, id)
    - Refreshes UI
```

\---

### 5\. Phase Management (Admin)

**Phase Types:**

```
LIGA (Group Stage):
  - Teams divided into groups (1–8)
  - Standings calculated per group
  - Optional zone rules (ascenso/descenso)

BRACKET (Elimination):
  - Single or double elimination
  - Teams: 4, 8, or 16
  - Optional third-place match

PLAYOFF (Aggregate):
  - Two-leg series (1–6 matches)
  - Aggregate scoring + away goals rule
```

**Render Functions:**

```javascript
async renderAdmPhases()
  - Filters phases by currentSeason
  - Displays table:
    Columns: Name | Type | Status | Groups | Actions
  - Renders to #admin-phases-page
  - Called: page show, after phase CRUD
```

**Modal Functions:**

```javascript
function openPhaseModal(id=null)
  - Renders form with:
    - Nombre (required)
    - Tipo (LIGA/BRACKET/PLAYOFF dropdown)
    - Estado (ACTIVO/INACTIVO)
    - Type-specific config (shown/hidden by type):
  
  LIGA config:
    - Número de grupos (1–8 select)
    - Nombres de grupos (comma-separated text)
    - Zonas (JSON editor, optional)
  
  BRACKET config:
    - Equipos (4/8/16 select)
    - ¿Tercer puesto? (checkbox)
    - Poblar por (MANUAL/ROUND\_LABEL radio)
  
  PLAYOFF config:
    - Series (1–6 number)
    - Scoring agregado (checkbox)
  
  - If editing: prefills all fields, type-specific config

async savePhase(id)
  - Validates based on type
  - Builds config object with type-specific fields
  - If id: dbPut
  - If !id: dbAdd (sets seasonId=currentSeason)
  - Refreshes renderAdmPhases()
  - Shows toast, closes modal

async deletePhase(id)
  - Shows confirmation
  - Cascades: deletes all matches in phase
  - dbDelete(phases, id)
  - Refreshes UI
```

\---

### 6\. Match Recording (Admin)

**Render Functions:**

```javascript
async renderAdmMatches(phaseId)
  - Filters matches by phaseId + currentSeason
  - Displays table:
    Columns: Matchday | Team A | Team B | Score | Status | Actions
  - Grouped by matchday (juego)
  - Renders to #admin-matches-page
```

**Modal Functions:**

```javascript
function openMatchModal(id=null)
  - Renders form with:
    - Juego (matchday, number)
    - Equipo A (team dropdown)
    - Equipo B (team dropdown)
    - Goles A (number, min 0)
    - Goles B (number, min 0)
    - Tipo (PARTIDO\_UNICO/PARTIDO\_DOBLE/PLAYOFF\_IDA/PLAYOFF\_VUELTA)
    - Estado (PENDIENTE/JUGADO/SUSPENDIDO)
    - Notas (textarea)
    - Instancia (GRUPO/OCTAVOS/CUARTOS/SEMIS/FINAL/TERCERO)
  
  - If editing: prefills, shows current score
  - Team dropdowns populated from dbGetAll('teams', t => t.status==='ACTIVO')

async saveMatch(id)
  - Validates:
    - Both teams selected
    - Teams are different (A !== B)
    - Goals non-negative
  - Builds object:
    { season, phaseId, juego, teamA, teamB, golesA, golesB, tipo, estado, notas, updatedAt }
  - If id: dbPut
  - If !id: dbAdd
  - Refreshes renderAdmMatches()
  - Shows toast, closes modal

async deleteMatch(id)
  - Shows confirmation
  - dbDelete(matches, id)
  - Refreshes list
```

\---

### 7\. Tournament Visualization (Public)

**Liga/Standings:**

```javascript
async renderPubStandings()
  - Called when pub-standings-page shown
  - Detects currentPhase.type:
    
    if LIGA:
      → renderLigaStandings(phaseId)
    if BRACKET:
      → renderBracketStandings(phaseId)
    if PLAYOFF:
      → renderPlayoffStandings(phaseId)

async renderLigaStandings(phaseId)
  - Fetches all matches in phase
  - Groups by group/zone from phase.config.groups
  - For each group: calculates standings
  
  Calculations per team:
    - PJ (matches): count all matches where team is A or B
    - G (wins): count matches where (teamA \&\& golesA > golesB) || (teamB \&\& golesB > golesA)
    - E (draws): count matches where golesA === golesB
    - P (losses): PJ - G - E
    - GF (goals for): sum goals where team is scorer
    - GA (goals against): sum goals conceded
    - DG (difference): GF - GA
    - PTS (points): (G \* 3) + E
      (Note: may be 2-1-0 system, check with Luis)
  
  Ranking:
    - Sort by: PTS desc, DG desc, GF desc
    - Color-code rows:
      - Ascenso: green (zone rule promotion)
      - Descenso: red (zone rule relegation)
      - Normal: default
  
  Render:
    - Table with columns: Pos | Team | PJ | G | E | P | GF | GA | DG | PTS
    - Renders to #pub-standings-content

async renderBracketStandings(phaseId)
  - Fetches all matches in phase
  - Builds bracket tree structure:
    - Round 1: initial matchups
    - Round 2: winners advance
    - ... (up to finals)
    - Optional: Third-place match
  
  - Calls renderBracketHTML(rounds, phaseId)
  - Shows team cards with scores
  - Draws SVG connectors between rounds
  - Highlights winner of each match

function renderBracketHTML(rounds, phaseId)
  - Generates HTML for bracket visualization
  - Structure:
    <div class="bracket-container">
      <div class="bracket-column" data-round="1">
        <div class="bracket-card">
          Team A vs Team B, score
        </div>
      </div>
      ...
    </div>
  
  Each bracket-card shows:
    - Team A badge (logo/ini + color)
    - Score A (large, bold)
    - Team B badge
    - Score B
    - Winner highlight (gold border or bold)

function scaleBracket()
  - Adjusts bracket CSS variables based on teams count
  - Recalculates: --bk-card-w, --bk-row-h
  - Redraws SVG connectors

async renderPlayoffStandings(phaseId)
  - Fetches all matches in phase
  - Groups by series (1, 2, 3, etc.)
  - For each series: renders two-leg table
  
  Table structure:
    Equipo A | Ida | Vuelta | Aggregate | Ganador
  
  Aggregate calculation:
    - Sum: leg1Score + leg2Score
    - Tiebreaker: away goals (leg2)
    - Color-code winner (green), loser (red)
  
  Renders to #pub-standings-content
```

**Match History:**

```javascript
async renderPubMatches()
  - Fetches all matches across all phases/seasons
  - Displays searchable/filterable table:
    Columns: Date | Team A | Team B | Score | Phase | Matchday
  
  Filters:
    - Search by team name (text input)
    - Phase dropdown
    - Season dropdown
  
  - Renders to #pub-matches-content

function filterMatches()
  - Reads filter inputs
  - Re-queries DB with filter callbacks
  - Calls renderMatchesTable(filtered)
```

\---

### 8\. Data Import/Export (Editor)

**Purpose:** Backup/restore tournament data locally

```javascript
async renderEditorPage()
  - Displays three sections:
    
    1. EXPORT:
       - Button: "Descargar JSON"
       - Exports all IndexedDB to JSON file
       - File: tsc-export-${date}.json
    
    2. IMPORT:
       - File input: select JSON file
       - Button: "Subir datos"
       - Replaces all IndexedDB with JSON data
    
    3. CSV IMPORT:
       - Button: "Cargar 60 equipos"
       - Reseeds teams from equipos\_tsc\_60.csv
       - Clears existing teams first

function exportData()
  - Fetches all records from all 8 stores
  - Builds JSON object:
    {
      teams: \[...],
      seasons: \[...],
      phases: \[...],
      matches: \[...],
      standings: \[...],
      sorteo: \[...],
      config: \[...],
      import\_log: \[...]
    }
  - Creates Blob, triggers download
  - Shows toast: "Datos exportados"

async importData(file)
  - Reads file as text
  - Parses JSON
  - For each store:
    - dbClear(store)
    - dbAdd each record
  - Shows toast with import count
  - Refreshes all UI views

async seedInitialData()
  - Called on first load
  - Checks if 'teams' store empty
  - Fetches equipos\_tsc\_60.csv
  - Parses: Name, Ini, Color, President, Status, etc.
  - Calls dbAdd for each team
  - Sets all to status='ACTIVO'
```

\---

### 9\. Sorteo (Lottery Animation)

**Purpose:** Visual group draw/playoff seed ceremony

```javascript
async renderPubSorteo()
  - Initializes animation container
  - Loads LuisYuNa sprite poses:
    - idle: standing neutral
    - thinking: hand on chin
    - celebrating: arms up
  - Sequence:
    1. Intro animation (LuisYuNa enters)
    2. Ball transitions (balls drop into bowl)
    3. Ball opening (animated draw)
    4. Reaction poses (LuisYuNa reacts)
    5. Outro (transition to standings)

function initSorteoAnimation()
  - Creates Canvas/SVG for drawing
  - Sets up event listeners: click/spacebar to advance

function animateSorteoBall()
  - CSS animation: ball rotates, scales, color change
  - Duration: 0.8s per ball
  - Sequence: 1 ball per 0.8s × number of groups

function showSorteoResult()
  - Displays final group assignments
  - Table or grid format
  - Links back to standings view
```

\---

### 10\. Utility Functions

**Formatting:**

```javascript
function formatDate(iso)
  - Input: ISO 8601 string
  - Output: "DD/MM/YYYY HH:MM"

function formatScore(golesA, golesB)
  - Input: two numbers
  - Output: "3–2" (bold formatted)

function getTeamBadge(teamId)
  - Fetches team from DB
  - Returns HTML: logo or ini + color badge

function getGroupFromTeams(teamA, teamB, phaseId)
  - Lookup which group(s) teams are in
  - Returns group name (for zona rules)
```

**Sorting:**

```javascript
function sortTeamsByPoints(teams, matches)
  - Calculates stats for each team
  - Sorts by: PTS desc, GD desc, GF desc
  - Returns ranked array

function sortTeamsByAggregate(legs)
  - Calculates aggregate + away goals
  - Determines winner
  - Applies tiebreaker rules
  - Returns winner team ID
```

**Validation:**

```javascript
function validateMatch(teamA, teamB, golesA, golesB)
  - Checks: teamA !== teamB
  - Checks: goals non-negative
  - Returns: { valid: boolean, error?: string }

function validatePhase(phase)
  - Checks type-specific rules
  - Returns: { valid: boolean, errors?: \[...] }

function isValidHexColor(hex)
  - Regex: /^#\[0-9A-Fa-f]{6}$/
  - Returns: boolean
```

\---

## INDEXEDDB SCHEMA

**Database Name:** `tscDb`  
**Version:** 1  
**Total Stores:** 8

### Store Definitions

|Store|Primary Key|Indexes|Purpose|
|-|-|-|-|
|`teams`|`id` (auto)|`status`|Team registry (colors, logos, stats)|
|`seasons`|`id` (auto)|`year`|Tournament seasons/years|
|`phases`|`id` (auto)|`seasonId`|Phases within seasons|
|`matches`|`id` (auto)|`phaseId`, `seasonId`, `juego`|Match records (scores, teams)|
|`standings`|`id` (auto)|`phaseId`|Cached standings data|
|`sorteo`|`id` (auto)|none|Lottery group assignments|
|`config`|key (string)|none|App-level settings|
|`import\_log`|`id` (auto)|`timestamp`|Import/export history|

### Schema Details

**`teams` Store:**

```javascript
{
  id: <auto>,
  name: string (required),           /\* Team name \*/
  ini: string (2 chars),             /\* Initials \*/
  pres: string,                      /\* President name \*/
  color: string (hex #RRGGBB),       /\* Primary color \*/
  color2: string (hex #RRGGBB),      /\* Secondary color (NEW in v1.9) \*/
  logo: string (base64) | null,      /\* Logo image \*/
  status: 'ACTIVO' | 'INACTIVO',     /\* Active status \*/
  yunacoin: number,                  /\* Virtual currency balance \*/
  historyNames: string,              /\* Pipe-separated name aliases \*/
  season: number,                    /\* Season ID \*/
  createdAt: ISO 8601,               /\* Creation timestamp \*/
  updatedAt: ISO 8601                /\* Last update timestamp \*/
}
```

**`seasons` Store:**

```javascript
{
  id: <auto>,
  year: number (unique),             /\* 4-digit year \*/
  name: string (required),           /\* Season name \*/
  description: string,               /\* Optional description \*/
  status: 'ACTIVO' | 'INACTIVO' | 'FINALIZADA',
  createdAt: ISO 8601,
  updatedAt: ISO 8601
}
```

**`phases` Store:**

```javascript
{
  id: <auto>,
  seasonId: number (required),       /\* Foreign key to seasons \*/
  name: string (required),           /\* Phase name \*/
  type: 'LIGA' | 'BRACKET' | 'PLAYOFF',
  status: 'ACTIVO' | 'INACTIVO',
  
  config: object (type-specific):
    // LIGA:
    {
      groups: \['Grupo A', 'Grupo B', ...],
      zones: { 'Grupo A': \['ZONA\_A\_ASCENSO', ...], ... }
    }
    
    // BRACKET:
    {
      teamsCount: 4 | 8 | 16,
      hasThirdPlace: boolean,
      populateBy: 'MANUAL' | 'ROUND\_LABEL'
    }
    
    // PLAYOFF:
    {
      seriesCount: 1–6,
      aggregateScoring: boolean
    }
  
  createdAt: ISO 8601,
  updatedAt: ISO 8601
}
```

**`matches` Store:**

```javascript
{
  id: <auto>,
  seasonId: number,                  /\* Foreign key to seasons \*/
  phaseId: number,                   /\* Foreign key to phases \*/
  juego: number,                     /\* Matchday number \*/
  teamA: number,                     /\* Team ID \*/
  teamB: number,                     /\* Team ID \*/
  golesA: number,                    /\* Score for teamA \*/
  golesB: number,                    /\* Score for teamB \*/
  tipo: 'PARTIDO\_UNICO' | 'PARTIDO\_DOBLE' | 'PLAYOFF\_IDA' | 'PLAYOFF\_VUELTA',
  estado: 'PENDIENTE' | 'JUGADO' | 'SUSPENDIDO',
  notas: string,                     /\* Match notes \*/
  instancia: 'GRUPO' | 'OCTAVOS' | 'CUARTOS' | 'SEMIS' | 'FINAL' | 'TERCERO',
  createdAt: ISO 8601,
  updatedAt: ISO 8601
}
```

**`standings` Store (Optional Cache):**

```javascript
{
  id: <auto>,
  phaseId: number,
  group: string,                     /\* Group/zone name \*/
  teamId: number,
  pj: number,                        /\* Games played \*/
  g: number,                         /\* Wins \*/
  e: number,                         /\* Draws \*/
  p: number,                         /\* Losses \*/
  gf: number,                        /\* Goals for \*/
  ga: number,                        /\* Goals against \*/
  dg: number,                        /\* Goal difference \*/
  pts: number,                       /\* Points \*/
  posicion: number,                  /\* Rank \*/
  computedAt: ISO 8601
}
```

**`config` Store (Key-Value):**

```javascript
{
  key: string (e.g., 'theme', 'lastSeason'),
  value: any,
  updatedAt: ISO 8601
}
```

\---

## KEY GLOBAL VARIABLES

|Variable|Type|Default|Purpose|Set By|
|-|-|-|-|-|
|`currentSeason`|number \| null|null|Active season ID|loadSeasons()|
|`currentPhase`|object \| null|null|Active phase object|Phase selection|
|`\_logoData`|string \| null|null|Team logo base64 (temporary)|previewLogo()|
|`\_sorteoAnimating`|boolean|false|Sorteo animation in progress|renderPubSorteo()|
|`APP\_MODE`|string|'public'|Current app mode|setMode()|

\---

## EVENT HANDLERS \& LIFECYCLE

### Window Load

```javascript
window.addEventListener('load', async () => {
  // 1. Initialize IndexedDB
  await initDB();
  
  // 2. Load saved theme
  const savedTheme = localStorage.getItem('tsc\_theme') || 'dark';
  setTheme(savedTheme);
  
  // 3. Seed initial 60 teams (if empty)
  await seedInitialData();
  
  // 4. Load all seasons
  await loadSeasons();
  
  // 5. Switch to public mode
  setMode('public');
});
```

**Order is Critical:**

1. Database must exist before any queries
2. Theme must load before UI renders
3. Teams must seed before seasons render
4. Seasons must load before mode selection

### Topbar Button Events

|Button|Event|Handler|
|-|-|-|
|Mode buttons (Public/Admin/Editor)|click|`setMode('public'|
|Theme toggle|click|`toggleTheme()`|
|Hamburger menu|click|`#sidebar.classList.toggle('open')`|
|Season selector|change|Updates `currentSeason`, refreshes views|

### Navigation Events

**Admin Sidebar:**

```javascript
.nav-item (click)
  → showAdmPage(section, phaseId?)
  → Hides all .page
  → Shows #admin-${section}-page
  → Updates .nav-item.active
  → Triggers appropriate render function
```

**Public Tabs:**

```javascript
.pub-tab (click)
  → showPage(pageName)
  → Hides all .page
  → Shows #pub-${pageName}-page
  → Updates .pub-tab.active
  → Triggers render function (renderPubTeams, etc.)
```

### Form \& Modal Events

**Team Modal:**

* Logo file input → `previewLogo()`
* Remove logo button → `removeLogo()`
* Color picker → `updateColorPreview(val, target)`
* Hex input → `syncColorPicker(val, target)`
* Preset colors → `setTeamColor(color, target)`
* Save button → `saveTeam(id?)`
* Close button → `closeTeamModal()`

**Phase Modal:**

* Type select → Toggles config fields (shows/hides based on LIGA/BRACKET/PLAYOFF)
* Save button → `savePhase(id?)`

**Match Modal:**

* Team A/B selects → `renderTeamSelect()`
* Save button → `saveMatch(id?)`

### Dynamic Renders (Data Changes)

These functions are called whenever data changes:

```javascript
renderAdmTeams()      // After team CRUD
renderAdmSeasons()    // After season CRUD
renderAdmPhases()     // After phase CRUD
renderAdmMatches()    // After match CRUD
renderPubTeams()      // After team CRUD (public)
renderPubStandings()  // After match/phase changes
renderPubMatches()    // On page show or filter change
renderPubSorteo()     // On sorteo page show
```

\---

## COMMON EDIT INSTRUCTIONS

### Adding a New Field to Teams

**1. Update Modal Form:**

```javascript
function openTeamModal(id=null) {
  const html = `...
    <div class="form-group">
      <label>New Field Label</label>
      <input type="text" id="tf-newfield" value="${team?.newfield||''}">
    </div>
  ...`;
}
```

**2. Capture in Save Function:**

```javascript
async saveTeam(id) {
  const newfield = document.getElementById('tf-newfield').value.trim();
  const data = { ..., newfield };
  // ... rest of save logic
}
```

**3. Update Admin Table:**

```javascript
async renderAdmTeams() {
  // In table render:
  <td>${t.newfield}</td>
}
```

**4. Update Database Schema:**

```javascript
// In teams object initialization
{
  ...,
  newfield: defaultValue,
  ...
}
```

\---

### Adding a Third Color to Teams

**1. Add Form Group:**

```javascript
// In openTeamModal(), after color2 section:
<div class="form-group">
  <label>Color Terciario</label>
  <div style="display:flex;align-items:center;gap:10px;">
    <input type="color" id="tf-color3" value="${team?.color3||'#000000'}">
    <input type="text" id="tf-color3-hex" value="${team?.color3||'#000000'}">
    <div id="color3-swatch" style="..."></div>
  </div>
</div>
```

**2. Update Color Functions:**

```javascript
function updateColorPreview(val, target='primary') {
  const isPrimary = target !== 'secondary';
  const isTertiary = target === 'tertiary';
  
  let hexId, swatchId;
  if (isPrimary) {
    hexId = 'tf-color-hex';
    swatchId = 'color-swatch';
  } else if (isTertiary) {
    hexId = 'tf-color3-hex';
    swatchId = 'color3-swatch';
  } else {
    hexId = 'tf-color2-hex';
    swatchId = 'color2-swatch';
  }
  // ... update logic
}
```

**3. Update Save:**

```javascript
async saveTeam(id) {
  const color3 = document.getElementById('tf-color3')?.value || color;
  const data = { ..., color3 };
}
```

\---

### Displaying Secondary Colors in Public Grid

**Option 1: Split-Color Badge**

```javascript
function renderPubTeamsGrid(teams) {
  el.innerHTML = teams.map(t=>`
    <div class="card" style="...">
      <div style="display:flex;width:52px;height:52px;border-radius:50%;margin:0 auto 8px;">
        <div style="flex:1;background:${t.color};border-radius:50% 0 0 50%;"></div>
        <div style="flex:1;background:${t.color2||t.color};border-radius:0 50% 50% 0;"></div>
      </div>
      ...
    </div>
  `).join('');
}
```

**Option 2: Striped Badge**

```javascript
<div style="background:linear-gradient(45deg, ${t.color} 50%, ${t.color2||t.color} 50%);...">
```

**Option 3: Bordered Badge**

```javascript
<div style="background:${t.color};border:3px solid ${t.color2||t.color};...">
```

\---

### Validating Team Data

```javascript
function validateTeamData(data) {
  const errors = \[];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Team name is required');
  }
  if (!isValidHexColor(data.color)) {
    errors.push('Primary color must be valid hex (#RRGGBB)');
  }
  if (data.color2 \&\& !isValidHexColor(data.color2)) {
    errors.push('Secondary color must be valid hex (#RRGGBB)');
  }
  if (data.yunacoin < 0) {
    errors.push('YuNaCoins cannot be negative');
  }
  
  return { valid: errors.length === 0, errors };
}
```

\---

### Exporting Teams to CSV

```javascript
async function exportTeamsToCSV() {
  const teams = await dbGetAll('teams');
  
  let csv = 'Name,Initials,President,Primary Color,Secondary Color,Status,YuNaCoins\\n';
  teams.forEach(t => {
    csv += `"${t.name}","${t.ini}","${t.pres||''}","${t.color}","${t.color2||''}","${t.status}",${t.yunacoin}\\n`;
  });
  
  const blob = new Blob(\[csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teams-export-${new Date().toISOString().split('T')\[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

\---

### Debugging IndexedDB

```javascript
// Check all stored records
async function debugDB() {
  const teams = await dbGetAll('teams');
  const seasons = await dbGetAll('seasons');
  const phases = await dbGetAll('phases');
  const matches = await dbGetAll('matches');
  
  console.table({ 
    teams: teams.length, 
    seasons: seasons.length, 
    phases: phases.length, 
    matches: matches.length 
  });
  
  console.log('Teams:', teams);
  console.log('Seasons:', seasons);
  console.log('Phases:', phases);
  console.log('Matches:', matches);
}

// Call in browser console
await debugDB();
```

\---

### Finding Duplicate Teams

```javascript
async function findDuplicateTeams() {
  const teams = await dbGetAll('teams');
  const names = {};
  const duplicates = \[];
  
  teams.forEach(t => {
    if (names\[t.name.toLowerCase()]) {
      duplicates.push({ original: names\[t.name.toLowerCase()], duplicate: t.id });
    } else {
      names\[t.name.toLowerCase()] = t.id;
    }
  });
  
  return duplicates;
}
```

\---

## LAUNCH COMMAND

**Windows PowerShell:**

```powershell
npx serve C:\\Users\\Administrator\\Downloads
```

This starts a local HTTP server. Open browser to `http://localhost:3000` (or shown port).

\---

## PROJECT FILES

**Main Application:**

* `TSC\_Admin\_v1\_9.html` — Current version (this file)

**Data Sources:**

* `equipos\_tsc\_60.csv` — 60-team seed data (loaded on first run)
* `HISTORIAL\_TSC\_v2.1.xlsx` — Historical match data (for import)

**External Resources:**

* **Fonts:** Google Fonts (Bebas Neue, Barlow, Barlow Condensed)
* **Icons:** Unicode characters (no font dependency)
* **Database:** IndexedDB (browser-native, no backend required)

\---

**Code Map Complete**  
**Version:** v1.9  
**Generated:** 2026-04-26  
**For:** Cursor IDE \& Development Reference  
**Language:** English  
**Application:** TSC (Teams Subs Cup) Tournament Admin Panel

