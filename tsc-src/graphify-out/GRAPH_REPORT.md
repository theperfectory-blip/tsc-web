# Graph Report - .  (2026-11-17)

## Corpus Check
- solo AST

## Summary
- 1563 nodes · 4252 edges · 27 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 1018 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Push|Push]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_pes5-yunacoins.js|pes5-yunacoins.js]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 138 edges
2. `showToast()` - 110 edges
3. `escHtml()` - 101 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `showConfirm()` - 33 edges
7. `dbPut()` - 32 edges
8. `aplicarPedidosSeleccionados()` - 32 edges
9. `currentPlayer()` - 23 edges
10. `renderAdminPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\standings.js

## Communities

### Community 16 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 5 - "Perfil del presidente"
Cohesion: 0.03
Nodes (90): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+82 more)

### Community 14 - "Push"
Cohesion: 0.15
Nodes (22): authSignOut(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+14 more)

### Community 18 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 4 - "Bracket"
Cohesion: 0.03
Nodes (117): getWinner(), rgbStr(), Particle, spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket() (+109 more)

### Community 6 - "Historial y H2H"
Cohesion: 0.04
Nodes (97): teamLogoHtml(), _calLogo(), openCompModal(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory() (+89 more)

### Community 9 - "Sonido"
Cohesion: 0.06
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), Rocket, liveRadarStart(), liveRadarProximity() (+35 more)

### Community 7 - "Sorteo en vivo"
Cohesion: 0.05
Nodes (81): hexToRgb(), lighten(), _mxDeleteOps(), renderAdmSorteo(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase() (+73 more)

### Community 2 - "Capa de datos"
Cohesion: 0.03
Nodes (138): cloudReady(), uploadImageToCloud(), renderAdmCoins(), _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal(), saveComp() (+130 more)

### Community 13 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (23): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+15 more)

### Community 12 - "Calendario"
Cohesion: 0.11
Nodes (34): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+26 more)

### Community 8 - "Navegacion"
Cohesion: 0.06
Nodes (72): _calHeroGoH2H(), _calHeroGoComp(), renderPubHistory(), _pubSwitchHistoryView(), histH2HShow(), liveStop(), liveRadarStop(), getPublicScrollPages() (+64 more)

### Community 19 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 10 - "pes5-yunacoins.js"
Cohesion: 0.07
Nodes (53): _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderCoinsTable(), filterCoinsTable(), _coinsCobroLineaHTML(), openCoinsModal() (+45 more)

### Community 11 - "Equipos"
Cohesion: 0.06
Nodes (40): resize(), frame(), wake(), stop(), setVariant(), getVariant(), init(), reduced() (+32 more)

### Community 15 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 20 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 1 - "mejoras-page.js"
Cohesion: 0.02
Nodes (190): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+182 more)

### Community 0 - "pes5-tool.js"
Cohesion: 0.03
Nodes (203): _tiempoPedido(), jugadorDesdePlantillaReal(), cargarTopeTemporada(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), atributosDeEditor(), cambiosDesdeEditor() (+195 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (129): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+121 more)

### Community 22 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 23 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Estado global"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Config Firebase (ejemplo)`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-bloqueo.js`** (1 nodes): `pes5-bloqueo.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-crypt.js`** (1 nodes): `pes5-crypt.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-editor.js`** (1 nodes): `pes5-editor.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-save.js`** (1 nodes): `pes5-save.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Estado global`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Capa de datos` to `pes5-tool.js`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Perfil del presidente`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `pes5-yunacoins.js`, `Equipos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `pes5-tool.js`, `mejoras-page.js`, `Capa de datos`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Perfil del presidente`, `Sorteo en vivo`, `Navegacion`, `pes5-yunacoins.js`, `Equipos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `showToast()` connect `pes5-tool.js` to `Capa de datos`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Perfil del presidente`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Sonido`, `pes5-yunacoins.js`, `Calendario`, `Tablas de posiciones`, `Push`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 106 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 106 INFERRED edges - model-reasoned connections that need verification._
- **Are the 99 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 99 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._