# Graph Report - D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src  (2026-11-06)

## Corpus Check
- 66 files · ~688,539 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1379 nodes · 3774 edges · 38 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 1082 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 143 edges
2. `showToast()` - 97 edges
3. `dbGet()` - 94 edges
4. `showToast()` - 91 edges
5. `escHtml()` - 69 edges
6. `dbPut()` - 59 edges
7. `dbErrorMsg()` - 34 edges
8. `dbAdd()` - 32 edges
9. `showConfirm()` - 29 edges
10. `renderAdminPage()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (191): authSignOut(), _bkRefPhaseEditable(), _bkResultOps(), invalidateStandingsAndSyncBrackets(), openSlotRefModal(), _readRefSourceFromModal(), removeSlotRef(), rerenderPhaseFromRefTarget() (+183 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (107): closePalmaresModals(), getPalmaresMedia(), getTrophyGlbUrl(), getTrophyStyles(), loadStaticPalmares(), openManagedCopaModal(), openNewCopaModal(), openPalmaresAddModal() (+99 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (95): actualizarBadgeHistorial(), adjustAge(), adjustHeight(), adjustInjury(), adjustMain(), adjustSec(), ajustarPosicionAlMover(), applyTheme() (+87 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (90): bloques(), capaPC(), checksums(), cifrar(), descifrar(), aplicarCambiosAlJugador(), cambiosDesdeEditor(), jugadorParaEditor() (+82 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (68): _authErrorMsg(), authForgotPassword(), authSubmit(), _injectAuthModal(), _loadProfile(), onAuthInit(), openAuthModal(), _renderAuthModalMode() (+60 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (72): activeBombo(), addBombo(), _applySorteoStateRefreshNow(), assignBracketLink(), assignLink(), _bindChibiRig(), broadcast(), clearLink() (+64 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (73): _calHeroGoComp(), _pubSwitchHistoryView(), liveRadarProximity(), liveRadarStop(), liveStop(), liveSubscribe(), _applyPubSidebar(), closePubSidebar() (+65 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (70): _calHeroGoH2H(), dbIsArchivedSeason(), _applyFilters(), _bindHtTable(), _buildH2HPanel(), _classifyOutcomeFIFA(), _computeHistoricalStandings(), computeResultado() (+62 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (56): _bkGoal(), _bkNextPlayed(), _bkPatch(), _bkSlotDocs(), _bkWinnerOfDocs(), _bkWritePatched(), buildBracketRounds(), buildBracketSlots() (+48 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (43): _calCenterAnchorScroll(), _calCommitStage(), _calCtaBtn(), _calFormatDay(), _calHeroHtml(), _calInitHeroCountdown(), _calJornadaViewerDate(), calLblNavMonth() (+35 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (39): _fwSoundOff(), _getAudioCtx(), resume(), _soundExplosion(), _soundRocketLaunch(), liveRadarStart(), _palmApplyVol(), _palmAudio() (+31 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (38): frame(), init(), resize(), setVariant(), stop(), wake(), _bindPageReveals(), countdown() (+30 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (42): getVariant(), closeIfBackdrop(), ch(), en(), fn(), rc(), rcp(), _handleNotificationData() (+34 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (37): teamLogoHtml(), openCompModal(), _histStdRowHTML(), _htCrest(), openEditCopaModal(), openPalmaresCellEdit(), openPalmaresEditRecord(), palmaresCompByKey() (+29 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (35): _dataApplyImport(), _dataBackupStores(), _dataRollback(), _dataTypeOk(), _dataValidateBackup(), _dataValidateRecord(), _dataValidateStoreItems(), _dataWarnings() (+27 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (27): Rocket, _bindListeners(), _clearPendingTokenRemoval(), _clearToken(), clearUserToken(), _currentTimezone(), disable(), _disableLocalPushFlagAndToken() (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (10): _onEventFor(), _onIsNative(), _onParse(), _onResolve(), _onRun(), _onTokens(), bitsOf(), setField() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (1): OptionFile

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (8): openCard(), chain(), eccBlock(), ents(), fatNext(), par(), rc(), rcp()

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (9): fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), fxBuildRoundRobin(), _fxGenerateCalendarAndRoute(), _fxScheduledCount(), _fxSetLoaderProgress(), _fxShuffle(), fxShuffleAgain() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (9): _apkAlreadyDownloaded(), _apkClosedRecently(), _apkHideOverlay(), _apkInit(), _apkIsNativeApp(), _apkShouldOffer(), closeApkPromo(), openApkPromo() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.38
Nodes (9): addToTeam(), findPlayerId(), findTeamIndex(), playerName(), readRoster(), removeFromTeam(), rosterOffset(), teamName() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.52
Nodes (6): chain(), fatNext(), readCluster(), readClusterPhys(), readEntries(), readFile()

### Community 23 - "Community 23"
Cohesion: 0.6
Nodes (5): chain(), fatNext(), readCluster(), readClusterPhys(), readEntries()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.6
Nodes (3): bitsOf(), setField(), writeBits()

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 28`** (2 nodes): `test-yunacoins-rules.js`, `assert()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `pes5-bloqueo.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `pes5-crypt.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `pes5-editor.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `pes5-save.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `snapshot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `xor-diff.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Community 0` to `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 13`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Community 0` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 140 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 140 INFERRED edges - model-reasoned connections that need verification._
- **Are the 93 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 78 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 78 INFERRED edges - model-reasoned connections that need verification._