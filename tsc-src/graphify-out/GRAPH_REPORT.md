# Graph Report - C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src  (2026-07-15)

## Corpus Check
- 42 files · ~889,276 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2643 nodes · 6867 edges · 25 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 1195 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `copy()` - 167 edges
2. `set()` - 133 edges
3. `dbGetAll()` - 119 edges
4. `dbGet()` - 83 edges
5. `add()` - 79 edges
6. `re` - 75 edges
7. `showToast()` - 72 edges
8. `qt` - 70 edges
9. `ne` - 63 edges
10. `ks()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `add()` --calls--> `_calRowOk()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\js\calendar.js
- `_fxHideLoader()` --calls--> `add()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\js\fixture-gen.js → C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\three.min.js
- `_fxShowLoader()` --calls--> `remove()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\js\fixture-gen.js → C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\three.min.js
- `copy()` --calls--> `ensureInt8()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\draco\draco_decoder.js
- `set()` --calls--> `_emscripten_memcpy_big()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc-web-fechas\tsc-src\assets\vendor\three\draco\draco_decoder.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (68): fireSparks(), shake(), _a, add(), an, applyMatrix4(), At(), cc (+60 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (144): GLTFCubicSplineQuaternionInterpolant, getBombos(), ac, _activateAction(), _addInactiveAction(), _addInactiveBinding(), al(), ao (+136 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (265): buildBracketRounds(), buildBracketSlots(), _cleanup(), closeBracketMatchModal(), deleteBracketMatch(), getClassifiedFromPhase(), getPlayoffMatchupsCount(), getStandingsForPhase() (+257 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (33): scaleBracket(), _fxSetLoaderProgress(), _pubHCount(), _palmLayoutSala(), _palmOpenSala(), _palmReorderPointerMove(), _palmSetSalaLoaderProgress(), _palmShowSalaLoader() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (64): Particle, teamLogoHtml(), A(), B(), C(), D(), e(), F() (+56 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (79): abort(), addFunctionWasm(), addOnPostRun(), addOnPreRun(), addRunDependency(), alignUp(), assert(), AttributeOctahedronTransform() (+71 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (32): addMorphTargets(), addPrimitiveAttributes(), addUnknownExtensionsToUserData(), assignExtrasToUserData(), buildNodeHierarchy(), createAttributesKey(), createDefaultMaterial(), createPrimitiveKey() (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (103): _play(), _esc(), _escAttr(), getAllPalmaresRecords(), getPalmaresMedia(), getTrophyGlbUrl(), getTrophyStyles(), openEditCopaModal() (+95 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (96): _calCommitStage(), _calCtaBtn(), _calFormatDay(), _calHeroGoComp(), _calHeroGoH2H(), _calHeroHtml(), _calInitHeroCountdown(), calLblNavMonth() (+88 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (52): _getAudioCtx(), Rocket, _soundExplosion(), _soundRocketLaunch(), closeFixtureGenModal(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), fxBuildRoundRobin() (+44 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (71): hexToRgb(), lighten(), _initPubSidebarHover(), _palmEnsureVisibilityBinding(), _palmReorderPointerDown(), activeBombo(), addBombo(), _applySorteoStateRefreshNow() (+63 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (66): _applyFilters(), _bindHtTable(), _buildH2HPanel(), _classifyOutcomeFIFA(), _computeHistoricalStandings(), computeResultado(), _currentHistContainer(), _esc() (+58 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (7): rgbStr(), co, lineTo(), lo, moveTo(), oo, Rt

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (59): _authErrorMsg(), _authEsc(), authForgotPassword(), authSignOut(), authSubmit(), _injectAuthModal(), _loadProfile(), onAuthInit() (+51 more)

### Community 14 - "Community 14"
Cohesion: 0.04
Nodes (9): stopDrumroll(), dh, kl, _lendControlInterpolant(), rh, stopAllAction(), _takeBackControlInterpolant(), yl (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (36): frame(), init(), resize(), setVariant(), stop(), wake(), _bindPageReveals(), countUp() (+28 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (4): computeBounds(), bi, Et(), ra

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (6): Gn, hn, jn(), qn(), Vn(), Wn()

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (19): _pbBracketCards(), _pbBracketMount(), _pbCrestMini(), _pbCrestTree(), _pbDesktopTreeHTML(), _pbEsc(), _pbFmtDate(), _pbMaybeFireworks() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (2): In, on

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **1 isolated node(s):** `tc`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 21`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `convert.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `set()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `copy()` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 12`, `Community 14`, `Community 16`, `Community 19`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `ks()` connect `Community 4` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 14`, `Community 16`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `copy()` (e.g. with `.assignFinalMaterial()` and `ensureString()`) actually correct?**
  _`copy()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `set()` (e.g. with `.decodeGeometry()` and `._loadLight()`) actually correct?**
  _`set()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 116 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 116 INFERRED edges - model-reasoned connections that need verification._
- **Are the 81 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 81 INFERRED edges - model-reasoned connections that need verification._