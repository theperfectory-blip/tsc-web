/* ============================================================
   PALMARÉS — Sala de Trofeos (vista pública) + matriz admin
   Store IDB: 'palmares'  · un registro = un título conquistado
   { id, teamId, competition, year?, season?, notes? }

   Override de "campeón vigente" persiste en 'settings' bajo key
   'palmares.reigningOverrides' como { [compKey]: recordId }.
   ============================================================ */

/* ---------------- Competiciones canónicas (predefinidas) + dinámicas (IDB) */
const PALMARES_COMPS_DEFAULT = [
  { key:'TSC 1RA DIVISION',              label:'TSC 1ra División',     short:'1ra',   trophy:'classica', color:'#DAA520' },
  { key:'COPA DEL EMPERADOR DE LA TSC',  label:'Copa del Emperador',   short:'Emp.',  trophy:'imperial', color:'#E8C97A' },
  { key:'SUPER COPA DE LA TSC',          label:'Super Copa',           short:'Super', trophy:'konami',   color:'#D8D8D8' },
  { key:'LIGA DE CAMPEONES',             label:'Liga de Campeones',    short:'LdC',   trophy:'orejona',  color:'#EAEAEA' },
  { key:'TSC 2DA DIVISION',              label:'TSC 2da División',     short:'2da',   trophy:'sobria',   color:'#CD7F32' },
];

let PALMARES_COMPS = [...PALMARES_COMPS_DEFAULT];

async function loadPalmaresComps(){
  const saved = await dbGetAll('palmares-comps');
  // Las entradas con key que coincide con una predefinida actúan como override.
  // Las demás son copas personalizadas nuevas.
  const merged = PALMARES_COMPS_DEFAULT.map(def => {
    const override = saved.find(s => s.key === def.key);
    return override ? { ...def, ...override } : def;
  });
  const customs = saved.filter(s => !PALMARES_COMPS_DEFAULT.find(d => d.key === s.key));
  PALMARES_COMPS = [...merged, ...customs];
}

function palmaresCompByKey(key){ return PALMARES_COMPS.find(c => c.key === key); }
function palmaresCompIndex(key){
  const i = PALMARES_COMPS.findIndex(c => c.key === key);
  return i < 0 ? PALMARES_COMPS.length : i;
}

/* Obtener estilos de trofeos disponibles (para selector) */
function getTrophyStyles(){
  return [
    { id:'classica',    label:'Clásico (Copa oro)',     preview:'◆' },
    { id:'imperial',    label:'Imperial (Corona)',      preview:'♔' },
    { id:'konami',      label:'Konami (Balón)',         preview:'◆' },
    { id:'orejona',     label:'Orejona (Orejas)',       preview:'◆' },
    { id:'sobria',      label:'Sobria (Cáliz bronce)',  preview:'◆' },
    { id:'moderno',     label:'Moderno (Orbital)',      preview:'◆' },
    { id:'celtica',     label:'Céltica (Disco)',        preview:'◈' },
    { id:'barroca',     label:'Barroca (Ánfora)',       preview:'♣' },
    { id:'geometrica',  label:'Geométrica (Brazos)',    preview:'◊' },
    { id:'minimalista', label:'Minimalista (Cuenco)',   preview:'◇' },
    { id:'nebula',      label:'Nebula (Globo)',         preview:'✦' },
  ];
}

/* ---------------- SVG Trofeos (5 siluetas) ---------------- */
function _uid(){ return 'p'+Math.random().toString(36).slice(2,9); }

function trophyClassica(size=120){
  const u = _uid();
  return `<svg class="palm-trophy classica" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${u}-g" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#B8860B"/><stop offset="45%" stop-color="#FFE082"/><stop offset="100%" stop-color="#B8860B"/>
      </linearGradient>
      <radialGradient id="${u}-h" cx="35%" cy="30%">
        <stop offset="0%" stop-color="#FFE8AE"/><stop offset="100%" stop-color="#B8860B"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="20" r="10" fill="url(#${u}-h)" stroke="#8B6914" stroke-width="0.6"/>
    <path d="M 78 30 Q 100 24 122 30 L 120 44 L 80 44 Z" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.6"/>
    <path d="M 70 44 L 130 44 L 132 56 Q 132 116 100 134 Q 68 116 68 56 Z" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.6"/>
    <path d="M 70 58 Q 38 60 38 88 Q 38 104 60 98" fill="none" stroke="url(#${u}-g)" stroke-width="7" stroke-linecap="round"/>
    <path d="M 130 58 Q 162 60 162 88 Q 162 104 140 98" fill="none" stroke="url(#${u}-g)" stroke-width="7" stroke-linecap="round"/>
    <rect x="94" y="134" width="12" height="22" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/>
    <rect x="76" y="156" width="48" height="14" rx="2" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/>
    <rect x="58" y="170" width="84" height="20" rx="3" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/>
    <ellipse cx="100" cy="62" rx="18" ry="3" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}
function trophyImperial(size=120){
  const u = _uid();
  return `<svg class="palm-trophy imperial" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#A8854D"/><stop offset="50%" stop-color="#FFE8AE"/><stop offset="100%" stop-color="#A8854D"/></linearGradient></defs>
    <path d="M 72 14 L 80 28 L 88 8 L 96 24 L 100 4 L 104 24 L 112 8 L 120 28 L 128 14 L 128 34 L 72 34 Z" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/>
    <circle cx="80" cy="10" r="2.4" fill="#B22222"/><circle cx="100" cy="4" r="2.4" fill="#B22222"/><circle cx="120" cy="10" r="2.4" fill="#B22222"/>
    <ellipse cx="100" cy="38" rx="30" ry="5" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/>
    <path d="M 76 38 L 124 38 L 118 132 Q 100 144 82 132 Z" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/>
    <path d="M 76 52 Q 52 70 58 108" fill="none" stroke="url(#${u}-g)" stroke-width="4" stroke-linecap="round"/>
    <path d="M 124 52 Q 148 70 142 108" fill="none" stroke="url(#${u}-g)" stroke-width="4" stroke-linecap="round"/>
    <rect x="88" y="142" width="24" height="10" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <rect x="78" y="152" width="44" height="12" rx="2" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <rect x="66" y="164" width="68" height="14" rx="2" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <rect x="54" y="178" width="92" height="16" rx="3" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <ellipse cx="100" cy="56" rx="14" ry="2.5" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}
function trophyKonami(size=120){
  const u = _uid();
  return `<svg class="palm-trophy konami" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${u}-ball" cx="32%" cy="28%"><stop offset="0%" stop-color="#FFEAB0"/><stop offset="55%" stop-color="#F1C232"/><stop offset="100%" stop-color="#6B5210"/></radialGradient>
      <linearGradient id="${u}-ped" x1="0%" x2="100%"><stop offset="0%" stop-color="#5A5A5A"/><stop offset="50%" stop-color="#E0E0E0"/><stop offset="100%" stop-color="#5A5A5A"/></linearGradient>
    </defs>
    <circle cx="100" cy="80" r="55" fill="url(#${u}-ball)" stroke="#5C420F" stroke-width="0.6"/>
    <g fill="none" stroke="#5C420F" stroke-width="1.6" opacity="0.55">
      <polygon points="100,38 117,48 117,68 100,78 83,68 83,48"/>
      <polygon points="100,78 117,68 130,82 124,102 107,108 100,98"/>
      <polygon points="100,78 83,68 70,82 76,102 93,108 100,98"/>
      <polygon points="70,82 53,90 50,108 60,120 76,116 76,102"/>
      <polygon points="130,82 147,90 150,108 140,120 124,116 124,102"/>
      <polygon points="100,98 107,108 100,124 93,108"/>
    </g>
    <ellipse cx="80" cy="58" rx="14" ry="8" fill="rgba(255,255,255,0.45)"/>
    <path d="M 78 140 L 100 130 L 122 140 L 116 188 L 84 188 Z" fill="url(#${u}-ped)" stroke="#3A3A3A" stroke-width="0.6"/>
    <line x1="92" y1="138" x2="89" y2="186" stroke="#3A3A3A" stroke-width="1" opacity="0.5"/>
    <line x1="100" y1="135" x2="100" y2="188" stroke="#3A3A3A" stroke-width="1" opacity="0.5"/>
    <line x1="108" y1="138" x2="111" y2="186" stroke="#3A3A3A" stroke-width="1" opacity="0.5"/>
    <ellipse cx="100" cy="200" rx="58" ry="9" fill="url(#${u}-ped)" stroke="#3A3A3A" stroke-width="0.6"/>
    <ellipse cx="100" cy="198" rx="58" ry="4" fill="#F0F0F0"/>
  </svg>`;
}
function trophyOrejona(size=120){
  const u = _uid();
  return `<svg class="palm-trophy orejona" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#8A8A8A"/><stop offset="50%" stop-color="#F4F4F4"/><stop offset="100%" stop-color="#7A7A7A"/></linearGradient></defs>
    <path d="M 68 50 L 132 50 L 138 60 Q 142 118 100 148 Q 58 118 62 60 Z" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.6"/>
    <ellipse cx="100" cy="50" rx="32" ry="6" fill="#3A3A3A"/>
    <ellipse cx="100" cy="49" rx="30" ry="4" fill="#1A1A1A"/>
    <path d="M 70 56 C 16 30, 10 96, 60 124" fill="none" stroke="url(#${u}-g)" stroke-width="9" stroke-linecap="round"/>
    <path d="M 130 56 C 184 30, 190 96, 140 124" fill="none" stroke="url(#${u}-g)" stroke-width="9" stroke-linecap="round"/>
    <rect x="95" y="148" width="10" height="32" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/>
    <rect x="80" y="180" width="40" height="9" rx="2" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/>
    <rect x="68" y="189" width="64" height="14" rx="3" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/>
    <ellipse cx="100" cy="80" rx="18" ry="4" fill="rgba(255,255,255,0.4)"/>
  </svg>`;
}
function trophySobria(size=120){
  const u = _uid();
  return `<svg class="palm-trophy sobria" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#5C2E0C"/><stop offset="50%" stop-color="#E8A05A"/><stop offset="100%" stop-color="#5C2E0C"/></linearGradient></defs>
    <path d="M 76 32 Q 100 18 124 32 L 122 46 L 78 46 Z" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.6"/>
    <path d="M 78 46 L 122 46 L 124 60 Q 124 110 100 124 Q 76 110 76 60 Z" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.6"/>
    <rect x="93" y="124" width="14" height="28" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/>
    <rect x="76" y="152" width="48" height="10" rx="2" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/>
    <rect x="60" y="162" width="80" height="18" rx="3" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/>
    <ellipse cx="100" cy="64" rx="14" ry="3" fill="rgba(255,255,255,0.3)"/>
  </svg>`;
}

/* ============================================================
   5 NUEVOS TROFEOS — ESTILOS COMPLETAMENTE DISTINTOS
   ============================================================ */

/* MODERNO — inspirado en el FIFA Club World Cup (anillos orbitales) */
function trophyModerno(size=120){
  const u = _uid();
  return `<svg class="palm-trophy moderno" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${u}-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C9A227"/><stop offset="35%" stop-color="#FFE9A0"/><stop offset="62%" stop-color="#EFC65C"/><stop offset="100%" stop-color="#9A7B1E"/>
      </linearGradient>
      <linearGradient id="${u}-gold2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#9A7B1E"/><stop offset="50%" stop-color="#FFE9A0"/><stop offset="100%" stop-color="#9A7B1E"/>
      </linearGradient>
      <linearGradient id="${u}-base" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2A2E45"/><stop offset="100%" stop-color="#0A0C16"/>
      </linearGradient>
    </defs>
    <!-- Pedestal cúbico (perspectiva) -->
    <path d="M 72 172 L 128 172 L 128 212 L 72 212 Z" fill="url(#${u}-base)" stroke="#000" stroke-width="0.5"/>
    <path d="M 128 172 L 138 164 L 138 204 L 128 212 Z" fill="#05070F"/>
    <path d="M 72 172 L 82 164 L 138 164 L 128 172 Z" fill="#1B1F33"/>
    <!-- Collar dorado -->
    <rect x="72" y="160" width="56" height="8" rx="2" fill="url(#${u}-gold2)" stroke="#7A5E18" stroke-width="0.4"/>
    <ellipse cx="100" cy="160" rx="28" ry="5" fill="url(#${u}-gold2)" stroke="#7A5E18" stroke-width="0.4"/>
    <!-- Anillo exterior (toro) -->
    <ellipse cx="100" cy="82" rx="58" ry="64" fill="none" stroke="url(#${u}-gold)" stroke-width="11"/>
    <ellipse cx="100" cy="82" rx="63" ry="69" fill="none" stroke="#7A5E18" stroke-width="0.6" opacity="0.4"/>
    <ellipse cx="100" cy="82" rx="53" ry="59" fill="none" stroke="#7A5E18" stroke-width="0.6" opacity="0.4"/>
    <!-- Anillos internos entrelazados (giroscopio) -->
    <g fill="none" stroke-linecap="round">
      <ellipse cx="100" cy="82" rx="30" ry="50" stroke="url(#${u}-gold)" stroke-width="7" transform="rotate(-24 100 82)"/>
      <ellipse cx="100" cy="82" rx="47" ry="25" stroke="#FFF4D6" stroke-width="6" opacity="0.9" transform="rotate(13 100 82)"/>
      <ellipse cx="100" cy="82" rx="22" ry="40" stroke="url(#${u}-gold)" stroke-width="6" transform="rotate(30 100 82)"/>
      <ellipse cx="100" cy="82" rx="40" ry="18" stroke="url(#${u}-gold)" stroke-width="5" transform="rotate(-9 100 82)"/>
    </g>
    <!-- Núcleo -->
    <circle cx="100" cy="82" r="8" fill="url(#${u}-gold)" stroke="#7A5E18" stroke-width="0.5"/>
    <!-- Brillo -->
    <ellipse cx="76" cy="48" rx="9" ry="15" fill="rgba(255,255,255,0.4)" transform="rotate(-25 76 48)"/>
  </svg>`;
}

function trophyCeltica(size=120){
  const u = _uid();
  return `<svg class="palm-trophy celtica" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${u}-cel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C0AF3F"/><stop offset="50%" stop-color="#F4E4A0"/><stop offset="100%" stop-color="#8B7E2F"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="60" r="45" fill="url(#${u}-cel)" stroke="#5C4620" stroke-width="1.5"/>
    <path d="M 75 50 Q 65 40 60 50 M 75 60 Q 60 55 55 70 M 75 70 Q 65 80 70 90" fill="none" stroke="#5C4620" stroke-width="2" stroke-linecap="round"/>
    <path d="M 125 50 Q 135 40 140 50 M 125 60 Q 140 55 145 70 M 125 70 Q 135 80 130 90" fill="none" stroke="#5C4620" stroke-width="2" stroke-linecap="round"/>
    <circle cx="100" cy="60" r="28" fill="none" stroke="#5C4620" stroke-width="1" opacity="0.6"/>
    <circle cx="100" cy="60" r="18" fill="none" stroke="#5C4620" stroke-width="1" opacity="0.4"/>
    <path d="M 95 35 L 105 35 M 95 90 L 105 90" stroke="#5C4620" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="90" y="105" width="20" height="30" fill="url(#${u}-cel)" stroke="#5C4620" stroke-width="0.8" rx="1"/>
    <polygon points="70,135 130,135 125,155 75,155" fill="url(#${u}-cel)" stroke="#5C4620" stroke-width="0.8"/>
  </svg>`;
}

/* BARROCA — inspirada en la Copa América (ánfora ornamentada, base escalonada) */
function trophyBarroca(size=120){
  const u = _uid();
  const plaque = (cx,cy)=>`<ellipse cx="${cx}" cy="${cy}" rx="3.4" ry="2.1" fill="#D8B24A" stroke="#7A5E18" stroke-width="0.3"/>`;
  return `<svg class="palm-trophy barroca" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${u}-sil" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#8A8792"/><stop offset="28%" stop-color="#F6F2F8"/><stop offset="50%" stop-color="#CFC7D6"/><stop offset="72%" stop-color="#F0EAF4"/><stop offset="100%" stop-color="#7C7984"/>
      </linearGradient>
      <linearGradient id="${u}-wood" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#2E1B10"/><stop offset="50%" stop-color="#6B4630"/><stop offset="100%" stop-color="#231009"/>
      </linearGradient>
    </defs>
    <!-- Boca acampanada -->
    <ellipse cx="100" cy="20" rx="26" ry="6" fill="url(#${u}-sil)" stroke="#5A5762" stroke-width="0.5"/>
    <ellipse cx="100" cy="20" rx="18" ry="3.2" fill="#9A97A4" opacity="0.6"/>
    <path d="M 74 20 Q 100 13 126 20 L 122 32 Q 100 26 78 32 Z" fill="url(#${u}-sil)" stroke="#5A5762" stroke-width="0.5"/>
    <!-- Banda decorativa con relieve -->
    <path d="M 78 32 L 122 32 L 120 46 L 80 46 Z" fill="url(#${u}-sil)" stroke="#5A5762" stroke-width="0.5"/>
    <path d="M 84 39 q 4 -4.5 8 0 q 4 4.5 8 0 q 4 -4.5 8 0 q 4 4.5 8 0" fill="none" stroke="#7C7984" stroke-width="1.2" opacity="0.55"/>
    <!-- Cuerpo bulboso alargado (ánfora Copa América) -->
    <path d="M 80 46 L 120 46 Q 142 66 138 100 Q 134 130 116 144 Q 108 150 100 150 Q 92 150 84 144 Q 66 130 62 100 Q 58 66 80 46 Z" fill="url(#${u}-sil)" stroke="#5A5762" stroke-width="0.6"/>
    <!-- Estrías verticales -->
    <g fill="none" stroke="#A6A2AE" stroke-width="0.8" opacity="0.5">
      <path d="M 86 80 Q 80 116 96 146"/>
      <path d="M 100 82 L 100 148"/>
      <path d="M 114 80 Q 120 116 104 146"/>
      <path d="M 74 76 Q 68 104 84 134"/>
      <path d="M 126 76 Q 132 104 116 134"/>
    </g>
    <ellipse cx="86" cy="82" rx="9" ry="24" fill="rgba(255,255,255,0.32)"/>
    <!-- Cuello inferior y pie -->
    <path d="M 92 150 L 108 150 L 106 160 L 94 160 Z" fill="url(#${u}-sil)" stroke="#5A5762" stroke-width="0.5"/>
    <ellipse cx="100" cy="161" rx="16" ry="3.5" fill="url(#${u}-sil)" stroke="#5A5762" stroke-width="0.4"/>
    <!-- Base escalonada de madera con plaquitas -->
    <ellipse cx="100" cy="164" rx="30" ry="4.5" fill="url(#${u}-wood)"/>
    <rect x="70" y="164" width="60" height="8" rx="1" fill="url(#${u}-wood)"/>
    <rect x="64" y="172" width="72" height="9" rx="1" fill="url(#${u}-wood)"/>
    <rect x="58" y="181" width="84" height="10" rx="1" fill="url(#${u}-wood)"/>
    <ellipse cx="100" cy="191" rx="42" ry="4.5" fill="#1C0D06"/>
    <g>
      ${[74,88,102,116,126].map(x=>plaque(x,168)).join('')}
      ${[68,82,96,110,124,134].map(x=>plaque(x,176.5)).join('')}
      ${[64,78,92,106,120,134,140].map(x=>plaque(x,186)).join('')}
    </g>
  </svg>`;
}

/* GEOMÉTRICA — inspirada en la Copa de la Liga (balón cromado cradlado por brazos) */
function trophyGeometrica(size=120){
  const u = _uid();
  return `<svg class="palm-trophy geometrica" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${u}-ball" cx="36%" cy="28%">
        <stop offset="0%" stop-color="#FCFBF2"/><stop offset="42%" stop-color="#D8D2BE"/><stop offset="100%" stop-color="#8A8270"/>
      </radialGradient>
      <linearGradient id="${u}-chr" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7C7C84"/><stop offset="30%" stop-color="#F4F4F8"/><stop offset="55%" stop-color="#B6B6C0"/><stop offset="80%" stop-color="#EDEDF2"/><stop offset="100%" stop-color="#6C6C74"/>
      </linearGradient>
    </defs>
    <!-- Brazo izquierdo (hoja curva alta) -->
    <path d="M 74 150 C 70 116, 74 82, 86 54 C 88 60, 88 64, 90 76 C 84 104, 82 126, 94 150 Z" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.5"/>
    <!-- Brazo derecho -->
    <path d="M 126 150 C 130 116, 126 82, 114 54 C 112 60, 112 64, 110 76 C 116 104, 118 126, 106 150 Z" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.5"/>
    <!-- Columna central con cintura -->
    <path d="M 95 74 L 105 74 C 108 100, 107 126, 104 150 L 96 150 C 93 126, 92 100, 95 74 Z" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.5"/>
    <!-- Balón cromado cradlado -->
    <circle cx="100" cy="46" r="28" fill="url(#${u}-ball)" stroke="#6E6856" stroke-width="0.6"/>
    <g fill="none" stroke="#6E6856" stroke-width="1" opacity="0.45">
      <polygon points="100,32 110,40 106,52 94,52 90,40"/>
      <path d="M 90 40 L 78 38 M 110 40 L 122 38 M 94 52 L 88 64 M 106 52 L 112 64 M 100 52 L 100 60"/>
    </g>
    <ellipse cx="90" cy="36" rx="7" ry="10" fill="rgba(255,255,255,0.45)"/>
    <!-- Base redonda escalonada (plata) -->
    <ellipse cx="100" cy="150" rx="20" ry="4.5" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <rect x="84" y="150" width="32" height="8" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <ellipse cx="100" cy="160" rx="28" ry="6" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <ellipse cx="100" cy="166" rx="34" ry="6" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
  </svg>`;
}

/* MINIMALISTA — inspirada en la coupe de Roland Garros (cuenco ancho, asas, base mármol) */
function trophyMinimalista(size=120){
  const u = _uid();
  return `<svg class="palm-trophy minimalista" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${u}-sil" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#8E8E96"/><stop offset="26%" stop-color="#F8F8FB"/><stop offset="50%" stop-color="#CACAD2"/><stop offset="74%" stop-color="#F2F2F6"/><stop offset="100%" stop-color="#7E7E86"/>
      </linearGradient>
    </defs>
    <!-- Asas curvas hacia afuera -->
    <path d="M 58 56 Q 32 42 44 24 Q 49 18 55 23" fill="none" stroke="url(#${u}-sil)" stroke-width="5" stroke-linecap="round"/>
    <path d="M 142 56 Q 168 42 156 24 Q 151 18 145 23" fill="none" stroke="url(#${u}-sil)" stroke-width="5" stroke-linecap="round"/>
    <!-- Banda del borde con relieve -->
    <ellipse cx="100" cy="50" rx="54" ry="13" fill="url(#${u}-sil)" stroke="#5A5A62" stroke-width="0.6"/>
    <ellipse cx="100" cy="49" rx="46" ry="9" fill="#B9B9C2" opacity="0.5"/>
    <path d="M 60 50 q 5 -5 10 0 q 5 5 10 0 q 5 -5 10 0 q 5 5 10 0 q 5 -5 10 0 q 5 5 10 0" fill="none" stroke="#7C7C84" stroke-width="1" opacity="0.5"/>
    <!-- Cuenco ancho y poco profundo -->
    <path d="M 50 54 Q 56 96 100 104 Q 144 96 150 54 Q 125 70 100 70 Q 75 70 50 54 Z" fill="url(#${u}-sil)" stroke="#5A5A62" stroke-width="0.6"/>
    <!-- Estrías inferiores -->
    <g fill="none" stroke="#9C9CA6" stroke-width="0.8" opacity="0.5">
      <path d="M 72 70 L 78 100"/>
      <path d="M 86 72 L 90 103"/>
      <path d="M 100 72 L 100 104"/>
      <path d="M 114 72 L 110 103"/>
      <path d="M 128 70 L 122 100"/>
    </g>
    <ellipse cx="80" cy="64" rx="14" ry="5" fill="rgba(255,255,255,0.4)"/>
    <!-- Vástago y pie -->
    <rect x="94" y="104" width="12" height="16" fill="url(#${u}-sil)" stroke="#5A5A62" stroke-width="0.4"/>
    <ellipse cx="100" cy="122" rx="20" ry="5" fill="url(#${u}-sil)" stroke="#5A5A62" stroke-width="0.4"/>
    <!-- Base de mármol negro con placa dorada -->
    <path d="M 64 132 L 136 132 L 140 178 L 60 178 Z" fill="#0E0E12"/>
    <path d="M 136 132 L 146 126 L 150 172 L 140 178 Z" fill="#050507"/>
    <path d="M 64 132 L 74 126 L 146 126 L 136 132 Z" fill="#1C1C22"/>
    <rect x="74" y="150" width="40" height="16" rx="1" fill="#E8D49A" stroke="#B89A4E" stroke-width="0.5"/>
  </svg>`;
}

/* NEBULA — inspirada en la Copa Libertadores (globo plateado, asas axiales, base torre + madera) */
function trophyNebula(size=120){
  const u = _uid();
  return `<svg class="palm-trophy nebula" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${u}-glb" cx="38%" cy="30%">
        <stop offset="0%" stop-color="#FBFBFE"/><stop offset="45%" stop-color="#C9C9D2"/><stop offset="100%" stop-color="#6E6E78"/>
      </radialGradient>
      <linearGradient id="${u}-chr" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7C7C84"/><stop offset="30%" stop-color="#F2F2F6"/><stop offset="55%" stop-color="#B6B6C0"/><stop offset="100%" stop-color="#6C6C74"/>
      </linearGradient>
      <linearGradient id="${u}-wood" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3A2418"/><stop offset="50%" stop-color="#6E4A30"/><stop offset="100%" stop-color="#2E1B10"/>
      </linearGradient>
    </defs>
    <!-- Figura del futbolista -->
    <g fill="#9A9AA4">
      <circle cx="100" cy="11" r="2.4"/>
      <path d="M 100 13 L 97 23 L 103 23 Z"/>
      <path d="M 98 15 L 92 13 M 102 15 L 108 16" stroke="#9A9AA4" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M 99 23 L 96 30 M 101 23 L 105 29" stroke="#9A9AA4" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <ellipse cx="100" cy="31" rx="5" ry="2" fill="url(#${u}-chr)"/>
    <!-- Globo plateado -->
    <circle cx="100" cy="58" r="27" fill="url(#${u}-glb)" stroke="#5A5A62" stroke-width="0.6"/>
    <ellipse cx="88" cy="44" rx="8" ry="11" fill="rgba(255,255,255,0.45)"/>
    <!-- Banda ecuatorial "LIBERTADORES" -->
    <rect x="70" y="51" width="60" height="13" fill="#E4E4EA" stroke="#7A7A82" stroke-width="0.5"/>
    <g fill="#8A8A92">
      ${[76,82,88,94,100,106,112,118,124].map(x=>`<rect x="${x}" y="55" width="2" height="5"/>`).join('')}
    </g>
    <!-- Asas laterales (tapas axiales) -->
    <rect x="60" y="54" width="12" height="8" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <rect x="53" y="50" width="7" height="16" rx="1" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <rect x="128" y="54" width="12" height="8" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <rect x="140" y="50" width="7" height="16" rx="1" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <!-- Cuello acampanado fluteado -->
    <path d="M 92 85 Q 90 94 82 104 L 118 104 Q 110 94 108 85 Z" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.5"/>
    <g stroke="#8A8A92" stroke-width="0.6" opacity="0.5">
      <line x1="96" y1="87" x2="90" y2="103"/>
      <line x1="100" y1="87" x2="100" y2="103"/>
      <line x1="104" y1="87" x2="110" y2="103"/>
    </g>
    <ellipse cx="100" cy="104" rx="22" ry="3.5" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <ellipse cx="100" cy="109" rx="25" ry="3.5" fill="url(#${u}-chr)" stroke="#5A5A62" stroke-width="0.4"/>
    <!-- Pedestal torre con rejilla de placas -->
    <rect x="68" y="112" width="64" height="54" fill="url(#${u}-wood)" stroke="#2E1B10" stroke-width="0.5"/>
    <g fill="url(#${u}-chr)">
      ${[68,83,98,113,126].map(x=>`<rect x="${x}" y="112" width="6" height="54"/>`).join('')}
    </g>
    <g stroke="#D6D6DE" stroke-width="2" opacity="0.9">
      ${[122,134,146,158].map(y=>`<line x1="68" y1="${y}" x2="132" y2="${y}"/>`).join('')}
    </g>
    <!-- Base de madera escalonada -->
    <rect x="60" y="166" width="80" height="9" rx="1" fill="url(#${u}-wood)" stroke="#2E1B10" stroke-width="0.4"/>
    <rect x="54" y="175" width="92" height="10" rx="1" fill="url(#${u}-wood)" stroke="#2E1B10" stroke-width="0.4"/>
  </svg>`;
}

const TROPHY_RENDERERS = {
  classica: trophyClassica,
  imperial: trophyImperial,
  konami: trophyKonami,
  orejona: trophyOrejona,
  sobria: trophySobria,
  moderno: trophyModerno,
  celtica: trophyCeltica,
  barroca: trophyBarroca,
  geometrica: trophyGeometrica,
  minimalista: trophyMinimalista,
  nebula: trophyNebula
};
function renderTrophy(key, size=120){
  const comp = palmaresCompByKey(key);
  const fn = TROPHY_RENDERERS[comp?.trophy];
  return fn ? fn(size) : '';
}
function renderTrophyByStyle(styleId, size=120){
  const fn = TROPHY_RENDERERS[styleId];
  return fn ? fn(size) : '<svg viewBox="0 0 200 240" width="'+(size)+'" height="'+(size*1.2)+'"><rect x="10" y="10" width="180" height="220" fill="#ddd" stroke="#999"/></svg>';
}

/* ---- 3-D GLB — Firebase Storage (bucket: tsc-web-yuna.firebasestorage.app) ---- */
const _TROPHY_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/tsc-web-yuna.firebasestorage.app/o/trophies%2F';
const TROPHY_GLB_MAP = {
  classica:    'copa_1.glb',
  imperial:    'copa_2.glb',
  konami:      'copa_3.glb',
  orejona:     'copa_4.glb',
  sobria:      'copa_5.glb',
  moderno:     'copa_6.glb',
  celtica:     'copa_7.glb',
  barroca:     'copa_8.glb',
  geometrica:  'copa_9.glb',
  minimalista: 'copa_10.glb',
  nebula:      'copa_11.glb'
};
function getTrophyGlbUrl(styleId){
  const file = TROPHY_GLB_MAP[styleId];
  return file ? `${_TROPHY_STORAGE_BASE}${file}?alt=media` : null;
}

/* Render trofeo 3D con <model-viewer> (desktop) · fallback SVG si no hay GLB.
   - La etiqueta <model-viewer> queda siempre en el DOM aunque el script de
     model-viewer aún no haya terminado de cargar (el navegador la define
     cuando el módulo esté listo; el slot "poster" muestra el SVG entretanto).
   - En móvil (pointer:coarse o ancho ≤768) se usa siempre el SVG para ahorrar
     datos y batería. */
function renderTrophy3D(compKey, svgSize=320){
  const comp = palmaresCompByKey(compKey);
  if (!comp) return '';
  const glbUrl = getTrophyGlbUrl(comp.trophy);
  if (!glbUrl){
    return `<div class="tr-fs-trophy">${renderTrophy(compKey, svgSize)}</div>`;
  }
  const svgPoster = renderTrophy(compKey, svgSize);
  return `<div class="tr-fs-trophy tr-fs-trophy--3d">
    <model-viewer
      src="${glbUrl}"
      alt="${_esc(comp.label)}"
      auto-rotate
      auto-rotate-delay="600"
      rotation-per-second="20deg"
      shadow-intensity="0.5"
      exposure="1.15"
      environment-image="neutral"
      interaction-prompt="none"
      style="width:320px;height:384px;--poster-color:transparent;touch-action:none;"
      loading="eager"
      reveal="auto">
      <div slot="poster" class="tr-mv-poster">${svgPoster}</div>
    </model-viewer>
  </div>`;
}

/* ---------------- Helpers de datos ---------------- */
async function getAllPalmaresRecords(){ return dbGetAll('palmares'); }

/* Orden de campeones dentro de una competición. El PRIMERO es el más
   reciente / campeón vigente.
   1) orden manual (campo `order`, ascendente) si existe;
   2) si no, por año DESC y luego id ASC (el seed inserta el más reciente
      primero, así que id ascendente = del más nuevo al más antiguo). */
function _palmCompareChrono(a, b){
  const oa = (typeof a.order === 'number') ? a.order : null;
  const ob = (typeof b.order === 'number') ? b.order : null;
  if(oa !== null && ob !== null) return oa - ob;
  if(oa !== null) return -1;
  if(ob !== null) return 1;
  return (b.year||0) - (a.year||0) || (a.id||0) - (b.id||0);
}

async function aggregatePalmaresByTeam(){
  const recs = await getAllPalmaresRecords();
  const out = new Map();
  for (const r of recs) {
    if (!out.has(r.teamId)) out.set(r.teamId, { _total: 0 });
    const t = out.get(r.teamId);
    t[r.competition] = (t[r.competition] || 0) + 1;
    t._total++;
  }
  return out;
}

/* Reigning overrides: { [compKey]: palmaresRecordId } */
async function getReigningOverrides(){
  const all = await dbGetAll('settings');
  const rec = all.find(r => r.key === 'palmares.reigningOverrides');
  return { record: rec || null, value: rec?.value || {} };
}
async function setReigningOverride(compKey, recordIdOrNull){
  const { record, value } = await getReigningOverrides();
  const next = { ...value };
  if (recordIdOrNull == null) delete next[compKey];
  else next[compKey] = recordIdOrNull;
  if (record) {
    await dbPut('settings', { ...record, value: next });
  } else {
    await dbAdd('settings', { key: 'palmares.reigningOverrides', value: next });
  }
}

/* Crear nueva copa personalizada */
async function createNewCopa(label, short, trophy, color){
  const key = `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const copa = { key, label, short, trophy, color, createdAt: new Date().toISOString() };
  await dbAdd('palmares-comps', copa);
  await loadPalmaresComps();
  return copa;
}

/* Editar copa existente (predefinida o personalizada) — siempre persiste en IDB */
async function editCopa(key, label, short, trophy, color){
  const all = await dbGetAll('palmares-comps');
  const existing = all.find(c => c.key === key);

  if (existing) {
    // Ya existe en IDB (override previo o copa personalizada) — actualizar
    await dbPut('palmares-comps', { ...existing, label, short, trophy, color, updatedAt: new Date().toISOString() });
  } else {
    // Primera edición de una copa predefinida — crear registro en IDB
    await dbAdd('palmares-comps', { key, label, short, trophy, color, updatedAt: new Date().toISOString() });
  }

  await loadPalmaresComps();
  return true;
}

async function deleteCopa(key){
  if (PALMARES_COMPS_DEFAULT.find(c => c.key === key)) {
    if (typeof showToast === 'function') showToast('No se pueden borrar copas predefinidas');
    return false;
  }
  const all = await dbGetAll('palmares-comps');
  const rec = all.find(c => c.key === key);
  if (!rec) return false;
  await dbDelete('palmares-comps', rec.id);
  await loadPalmaresComps();
  return true;
}

/* El campeón vigente = el PRIMERO del orden (manual o cronológico).
   Así "el #1 de la lista" es siempre el vigente / más reciente, y no hay
   un selector separado que entre en conflicto con el orden. */
function reigningChampion(records, compKey){
  const filtered = records.filter(r => r.competition === compKey);
  if (!filtered.length) return null;
  filtered.sort(_palmCompareChrono);
  return filtered[0];
}

/* ---------------- Seed estático embebido ----------------
   Carga data/palmares-seed.json y lo siembra en IDB si está vacía.
   Marca un flag en 'settings' para no re-sembrar en boots posteriores.
   Idéntico patrón al historial de partidos (loadStaticHistory). */
let _palmaresSeedCache = null;
async function loadStaticPalmares(){
  if (_palmaresSeedCache) return _palmaresSeedCache;
  try {
    const res = await fetch('data/palmares-seed.json');
    if (!res.ok) throw new Error('palmares-seed.json no encontrado');
    const data = await res.json();
    _palmaresSeedCache = data.records || [];
  } catch (e) {
    console.warn('[palmares] no se pudo cargar el seed estático:', e.message);
    _palmaresSeedCache = [];
  }
  return _palmaresSeedCache;
}

async function seedPalmaresIfEmpty(){
  // Flag para no re-sembrar (incluso si el admin borra todos los registros
  // a propósito, no queremos re-popular automáticamente)
  const flag = await dbGetAll('settings', s => s.key === 'palmaresSeedV1');
  if (flag.length > 0) return;

  const existing = await dbGetAll('palmares');
  if (existing.length > 0) {
    // Ya hay registros (de un seed anterior o ingresados manualmente).
    // Marcar el flag para no tocar nada.
    await dbAdd('settings', { key: 'palmaresSeedV1', value: 'skipped-existing' });
    return;
  }

  const seedRecords = await loadStaticPalmares();
  if (!seedRecords.length) {
    await dbAdd('settings', { key: 'palmaresSeedV1', value: 'no-seed-file' });
    return;
  }

  const teams = await dbGetAll('teams');
  const norm = s => String(s||'').toUpperCase().replace(/\s+/g,' ').replace(/[.,]/g,'').trim();
  const findTeam = (name) => {
    const n = norm(name);
    let t = teams.find(x => norm(x.name) === n);
    if (t) return t;
    // Match por previousNames
    t = teams.find(x => (x.previousNames||[]).some(p => norm(p) === n));
    if (t) return t;
    // Match por substring tolerante
    return teams.find(x => norm(x.name).includes(n)) || teams.find(x => n.includes(norm(x.name)));
  };

  const overrideTargets = {};   // compKey -> insertedId
  const skipped = [];
  let inserted = 0;
  for (const r of seedRecords) {
    const team = findTeam(r.team);
    if (!team) { skipped.push(r.team); continue; }
    const rec = {
      teamId: team.id,
      competition: r.competition,
      createdAt: new Date().toISOString(),
      source: 'seed'
    };
    if (r.season) rec.season = r.season;
    if (r.juego)  rec.juego  = r.juego;
    if (r.year)   rec.year   = r.year;
    const id = await dbAdd('palmares', rec);
    if (r.vigente) overrideTargets[r.competition] = id;
    inserted++;
  }
  // Aplicar overrides de campeón vigente
  for (const [comp, id] of Object.entries(overrideTargets)) {
    await setReigningOverride(comp, id);
  }

  await dbAdd('settings', {
    key: 'palmaresSeedV1',
    value: { inserted, vigentes: Object.keys(overrideTargets).length, skipped },
    at: new Date().toISOString()
  });
  console.log(`[palmares] sembrado ${inserted} títulos, ${Object.keys(overrideTargets).length} vigentes` +
    (skipped.length ? `, ${skipped.length} omitidos: ${skipped.join(', ')}` : ''));
}

/* ---------------- Audio "ding" sutil ---------------- */
let _palmAudioCtx = null;
let _palmMaster = null;
function _palmAudio(){
  if (_palmAudioCtx) return _palmAudioCtx;
  try {
    _palmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _palmMaster = _palmAudioCtx.createGain();
    _palmMaster.connect(_palmAudioCtx.destination);
  } catch(e) { _palmAudioCtx = null; }
  return _palmAudioCtx;
}
/* El sonido del palmarés respeta el control GLOBAL (⚙ Configuración). */
function _palmSoundOff(){ return (window.SFX && window.SFX.enabled === false); }
function _palmApplyVol(){ if (_palmMaster) _palmMaster.gain.value = (window.SFX && typeof window.SFX.volume === 'number') ? window.SFX.volume : 0.85; }
function playPalmDing(){
  if (_palmSoundOff()) return;
  const ctx = _palmAudio(); if (!ctx) return;
  _palmApplyVol();
  // Algunos navegadores requieren resume() tras gesto del usuario
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e){} }
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 600;
  o.connect(f); f.connect(g); g.connect(_palmMaster);
  o.type = 'sine';
  o.frequency.setValueAtTime(1480, t);  // ~F#6
  o.frequency.exponentialRampToValueAtTime(880, t + 0.22);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  o.start(t); o.stop(t + 0.42);
}

/* Sonido de "expansión" al abrir el fullscreen: whoosh ascendente +
   acorde triunfal corto. Acompaña la animación de zoom. */
function playPalmZoom(){
  if (_palmSoundOff()) return;
  const ctx = _palmAudio(); if (!ctx) return;
  _palmApplyVol();
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e){} }
  const t = ctx.currentTime;

  // 1) Whoosh: ruido filtrado con barrido lowpass de grave a agudo
  const bufSize = Math.floor(ctx.sampleRate * 0.55);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    const env = Math.pow(1 - i / bufSize, 1.8);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(280, t);
  lp.frequency.exponentialRampToValueAtTime(7200, t + 0.45);
  lp.Q.value = 1.6;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.10, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  noise.connect(lp); lp.connect(ng); ng.connect(_palmMaster);
  noise.start(t); noise.stop(t + 0.6);

  // 2) Acorde triunfal: fundamental + quinta + octava
  const notes = [392, 587, 784]; // G4 · D5 · G5
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t + 0.10);
    o.connect(g); g.connect(_palmMaster);
    g.gain.setValueAtTime(0.0001, t + 0.10);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    o.start(t + 0.10 + i * 0.015); o.stop(t + 0.85);
  });

  // 3) Sub-boom corto en el punto de impacto
  const sub = ctx.createOscillator();
  const subG = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(120, t + 0.18);
  sub.frequency.exponentialRampToValueAtTime(50, t + 0.45);
  sub.connect(subG); subG.connect(_palmMaster);
  subG.gain.setValueAtTime(0.0001, t + 0.18);
  subG.gain.exponentialRampToValueAtTime(0.08, t + 0.22);
  subG.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  sub.start(t + 0.18); sub.stop(t + 0.6);
}

/* Sonido de "cierre" al volver de pantalla completa a la vista normal:
   whoosh descendente + tono que baja. Complemento de playPalmZoom. */
function playPalmZoomOut(){
  if (_palmSoundOff()) return;
  const ctx = _palmAudio(); if (!ctx) return;
  _palmApplyVol();
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e){} }
  const t = ctx.currentTime;
  // Whoosh descendente (lowpass de agudo a grave)
  const bufSize = Math.floor(ctx.sampleRate * 0.4);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++){ const env = Math.pow(1 - i / bufSize, 1.2); data[i] = (Math.random()*2-1) * env; }
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(6000, t);
  lp.frequency.exponentialRampToValueAtTime(320, t + 0.32);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  noise.connect(lp); lp.connect(ng); ng.connect(_palmMaster);
  noise.start(t); noise.stop(t + 0.45);
  // Tono descendente corto
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(540, t);
  o.frequency.exponentialRampToValueAtTime(170, t + 0.28);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  o.connect(g); g.connect(_palmMaster);
  o.start(t); o.stop(t + 0.4);
}

/* ============================================================
   PÚBLICO — Sala de Trofeos (drag horizontal, sin panel inferior)
   ============================================================ */
async function renderPubPalmares(){
  const el = document.getElementById('pub-palmares-content');
  if(!el) return;

  await loadPalmaresComps();
  const [recs, allTeams, { value: overrides }] = await Promise.all([
    getAllPalmaresRecords(),
    dbGetAll('teams'),
    getReigningOverrides()
  ]);
  const teamById = {}; allTeams.forEach(t => teamById[t.id] = t);

  const compData = PALMARES_COMPS.map(comp => {
    const compRecs = recs
      .filter(r => r.competition === comp.key)
      .sort(_palmCompareChrono);
    const champion = reigningChampion(recs, comp.key, overrides);
    const champTeam = champion ? teamById[champion.teamId] : null;
    return { comp, records: compRecs, champion, champTeam };
  });

  const totalTitles    = recs.length;
  const totalChampions = new Set(recs.map(r => r.teamId)).size;

  el.innerHTML = `
    <div class="tr-root" id="tr-root">
      <header class="tr-header">
        <h1 class="tr-title">Sala de Trofeos</h1>
        <div class="tr-subtitle">Arrastra para explorar · ${PALMARES_COMPS.length} competiciones · ${totalTitles} títulos · ${totalChampions} campeones</div>
      </header>

      <div class="tr-room" id="tr-room">
        <div class="tr-bg-wall"></div>
        <div class="tr-bg-glow"></div>
        <div class="tr-spotlights">${Array.from({length:7}).map(()=>`<span class="tr-spot"></span>`).join('')}</div>
        <div class="tr-floor"></div>
        <div class="tr-flash" id="tr-flash"></div>
        <div class="tr-stage" id="tr-stage">${compData.map((d, i) => buildCase(d, i, teamById)).join('')}</div>

        <button class="tr-nav tr-nav-prev" id="tr-prev" aria-label="Copa anterior">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="tr-nav tr-nav-next" id="tr-next" aria-label="Copa siguiente">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <div class="tr-drag-hint" id="tr-drag-hint">
          <svg viewBox="0 0 64 24" width="58" height="22"><path d="M2 12h60M8 6l-6 6 6 6M56 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Arrastra · Doble click (o mantén pulsado) para ver más</span>
        </div>

        <aside class="tr-side-panel" id="tr-side-panel"></aside>
      </div>

    </div>
  `;

  initTrophyRoom(el, compData, teamById);
}

function buildCase(data, idx, teamById){
  const { comp, champion, champTeam } = data;
  // Meta combinada: temporada + juego (formato "T1 · PES 4"). Año se omite
  // porque la temporada+juego ya identifican el período.
  const metaBits = champion ? [champion.season, champion.juego].filter(Boolean) : [];
  const metaTxt = metaBits.join(' · ');
  return `
    <div class="tr-case" data-idx="${idx}" style="--accent:${comp.color}">
      <div class="tr-case-niche">
        <div class="tr-case-spot"></div>
        <div class="tr-case-back"></div>
        <div class="tr-case-glow"></div>
        <div class="tr-case-trophy">${renderTrophy(comp.key, 160)}</div>
        <div class="tr-case-base">
          <div class="tr-case-plaque">
            <span class="tr-case-comp">${_esc(comp.label)}</span>
            ${champTeam ? `
              <span class="tr-case-champ">
                <span class="tr-case-champ-logo" style="background:${champTeam.color||'#333'}">
                  ${champTeam.logo ? `<img src="${_esc(champTeam.logo)}" alt="">` : `<span>${_esc(champTeam.ini || champTeam.name.slice(0,2))}</span>`}
                </span>
                <span class="tr-case-champ-name">${_esc(champTeam.name)}</span>
              </span>
              ${metaTxt ? `<span class="tr-case-meta">${_esc(metaTxt)}</span>` : ''}
            ` : `<span class="tr-case-empty">Sin campeón aún</span>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildInfoPanel(data, teamById){
  const { comp, records, champTeam, champion } = data;
  // Conteo de títulos del campeón vigente en esta copa (para metadata)
  const champCountInComp = champTeam
    ? records.filter(r => r.teamId === champTeam.id).length
    : 0;

  // Vigente como bloque destacado arriba (fuente más grande)
  let vigenteBlock = '';
  if (champion && champTeam) {
    const tags = [champion.season, champion.juego, champion.year].filter(Boolean).join(' · ');
    vigenteBlock = `
      <div class="tr-hist-vig">
        ${tags ? `<div class="tr-hist-vig-tags">${_esc(tags)}</div>` : ''}
        <div class="tr-hist-vig-row">
          <span class="tr-hist-vig-logo" style="background:${champTeam.color || '#333'}">
            ${champTeam.logo ? `<img src="${_esc(champTeam.logo)}" alt="">` : `<span>${_esc(champTeam.ini || champTeam.name.slice(0,2))}</span>`}
          </span>
          <span class="tr-hist-vig-name">${_esc(champTeam.name)}</span>
          <span class="tr-hist-badge">VIGENTE</span>
        </div>
      </div>`;
  }

  // Resto del historial: excluye al vigente y ordena year DESC (más reciente arriba)
  const restRecords = records
    .filter(r => !champion || r.id !== champion.id)
    .sort(_palmCompareChrono);

  const list = restRecords.map((r) => {
    const team = teamById[r.teamId] || {};
    const primary = r.season || (r.year ? String(r.year) : '—');
    const secondary = [r.juego, r.season && r.year ? r.year : null].filter(Boolean).join(' · ');
    return `
      <li class="tr-hist-row tr-hist-row--btn" data-rec-id="${r.id}" tabindex="0" role="button">
        <span class="tr-hist-year">${_esc(primary)}${secondary?`<small>${_esc(secondary)}</small>`:''}</span>
        <span class="tr-hist-team">
          <span class="tr-hist-logo" style="background:${team.color || '#333'}">
            ${team.logo ? `<img src="${_esc(team.logo)}" alt="">` : `<span>${_esc(team.ini || (team.name||'?').slice(0,2))}</span>`}
          </span>
          <span class="tr-hist-name">${_esc(team.name || '—')}</span>
        </span>
      </li>`;
  }).join('');

  const colorHalo = champTeam?.color || comp.color;
  return `
    <div class="tr-champ" style="--halo:${colorHalo}">
      <div class="tr-champ-eyebrow">${_esc(comp.label)}</div>
      ${champTeam ? `
        <div class="tr-champ-body">
          <div class="tr-champ-logo" style="background:${champTeam.color || '#333'}">
            ${champTeam.logo ? `<img src="${_esc(champTeam.logo)}" alt="">` : `<span>${_esc(champTeam.ini || champTeam.name.slice(0,2))}</span>`}
          </div>
          <div class="tr-champ-text">
            <div class="tr-champ-label">Campeón vigente</div>
            <div class="tr-champ-name">${_esc(champTeam.name)}</div>
            <div class="tr-champ-meta">
              ${champion.season ? `<span>${_esc(champion.season)}</span>` : ''}
              ${champion.juego ? `<span class="tr-dotsep">·</span><span>${_esc(champion.juego)}</span>` : ''}
              ${champion.year ? `<span class="tr-dotsep">·</span><span>${champion.year}</span>` : ''}
              ${champCountInComp > 1 ? `<span class="tr-dotsep">·</span><span>${champCountInComp} en esta copa</span>` : ''}
            </div>
          </div>
        </div>` : `
        <div class="tr-champ-empty">
          <div class="tr-champ-label">Aún sin campeón</div>
          <div class="tr-champ-name">La primera edición está por jugarse.</div>
        </div>`}
    </div>
    <div class="tr-history">
      <header class="tr-history-hdr">
        <h2>Historial de campeones</h2>
        <span class="tr-history-count">${records.length} ${records.length===1?'edición':'ediciones'}</span>
      </header>
      ${vigenteBlock}
      ${list ? `<ul class="tr-history-list">${list}</ul>` : (vigenteBlock ? '' : `<div class="tr-history-empty">No hay títulos registrados en esta competición.</div>`)}
    </div>`;
}

/* Modal fullscreen "campeón en pleno" — doble click (escritorio) o long-press (móvil) */
function openChampionFullscreen(data, teamById, sourceRect, allCompData, compIdx){
  document.body.style.overflow = 'hidden';
  if (window.innerWidth <= 768 || window.matchMedia('(pointer:coarse)').matches) {
    openChampionFullscreenMobile(data, teamById, sourceRect, allCompData ?? [data], compIdx ?? 0);
    return;
  }

  /* ── Desktop: nav entre competiciones + campeones anteriores clicables ── */
  const compArr = (allCompData && allCompData.length) ? allCompData : [data];
  let currentCompIdx = (compIdx != null) ? compIdx : Math.max(0, compArr.findIndex(d => d.comp.key === data.comp.key));
  if (currentCompIdx < 0) currentCompIdx = 0;

  const hasMultiComp = compArr.length > 1;
  const wrap = _palmModalWrap();

  function curComp(){ return compArr[currentCompIdx]; }

  let originStyle = '';
  if (sourceRect) {
    const cx = sourceRect.left + sourceRect.width / 2;
    const cy = sourceRect.top + sourceRect.height / 2;
    const tx = cx - window.innerWidth / 2;
    const ty = cy - window.innerHeight / 2;
    originStyle = ` --tr-fs-tx:${Math.round(tx)}px; --tr-fs-ty:${Math.round(ty)}px;`;
  }

  function buildDesktopShell(){
    const comp   = curComp();
    const accent = comp.comp.color;
    const canP   = currentCompIdx > 0;
    const canN   = currentCompIdx < compArr.length - 1;
    const nav    = hasMultiComp ? `
      <div class="tr-fs-comp-nav">
        <button class="tr-fs-comp-arr" id="tr-fs-cp" ${!canP?'disabled':''} title="Competición anterior">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span class="tr-fs-comp-pos">${currentCompIdx+1} / ${compArr.length}</span>
        <button class="tr-fs-comp-arr" id="tr-fs-cn" ${!canN?'disabled':''} title="Competición siguiente">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>` : '';
    wrap.innerHTML = `
      <div class="tr-fullscreen" id="tr-fs" style="--accent:${accent};${originStyle}">
        <button class="tr-fs-close" onclick="closeChampionFullscreen()" aria-label="Cerrar">×</button>
        ${nav}
        <div class="tr-fs-spotlight"></div>
        <div class="tr-fs-grid">
          <div class="tr-fs-trophy-wrap">
            <div class="tr-fs-halo" style="background:radial-gradient(circle, ${accent}55, transparent 65%);"></div>
            ${renderTrophy3D(comp.comp.key, 320)}
            <div class="tr-fs-plaque">
              <div class="tr-fs-plaque-comp">${_esc(comp.comp.label)}</div>
              <div class="tr-fs-plaque-count">${comp.records.length} ${comp.records.length===1?'edición':'ediciones'}</div>
            </div>
          </div>
          <div class="tr-fs-side" id="tr-fs-side-inner">${buildInfoPanel(comp, teamById)}</div>
        </div>
      </div>`;
    bindDesktopEvents();
  }

  function bindDesktopEvents(){
    const fs = wrap.querySelector('#tr-fs');
    /* Cerrar al click en fondo */
    fs.addEventListener('click', (e) => { if (e.target.id === 'tr-fs') closeChampionFullscreen(); });

    /* Navegación entre competiciones */
    wrap.querySelector('#tr-fs-cp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCompIdx > 0) { currentCompIdx--; buildDesktopShell(); }
    });
    wrap.querySelector('#tr-fs-cn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCompIdx < compArr.length - 1) { currentCompIdx++; buildDesktopShell(); }
    });

    /* Campeones anteriores clicables: actualizan el bloque tr-champ */
    const side = wrap.querySelector('#tr-fs-side-inner');
    side?.addEventListener('click', (e) => {
      const row = e.target.closest('.tr-hist-row--btn');
      if (!row) return;
      e.stopPropagation();
      const recId = Number(row.dataset.recId);
      const comp  = curComp();
      const rec   = comp.records.find(r => r.id === recId);
      if (!rec) return;
      const team  = teamById[rec.teamId] || {};
      /* Actualiza solo el bloque tr-champ */
      const champEl = side.querySelector('.tr-champ');
      if (champEl) {
        const colorHalo = team.color || comp.comp.color;
        const tags = [rec.season, rec.juego, rec.year].filter(Boolean).join(' · ');
        champEl.style.setProperty('--halo', colorHalo);
        champEl.innerHTML = `
          <div class="tr-champ-eyebrow">${_esc(comp.comp.label)}</div>
          <div class="tr-champ-body">
            <div class="tr-champ-logo" style="background:${team.color||'#333'}">
              ${team.logo?`<img src="${_esc(team.logo)}" alt="">`:
                `<span>${_esc(team.ini||(team.name||'?').slice(0,2))}</span>`}
            </div>
            <div class="tr-champ-text">
              <div class="tr-champ-label">${_esc(tags)}</div>
              <div class="tr-champ-name">${_esc(team.name||'—')}</div>
            </div>
          </div>`;
      }
      /* Resaltar fila seleccionada */
      side.querySelectorAll('.tr-hist-row--btn').forEach(r => r.classList.remove('tr-hist-row--sel'));
      row.classList.add('tr-hist-row--sel');
    });
  }

  buildDesktopShell();
  document.addEventListener('keydown', _trFsEsc);
}

/* Fullscreen móvil: swipe ↕ para campeones del historial, swipe ← → para cambiar competición */
function openChampionFullscreenMobile(data, teamById, sourceRect, allCompData, compIdx){
  const compArr = (allCompData && allCompData.length) ? allCompData : [data];
  let currentCompIdx = (compIdx != null) ? compIdx : Math.max(0, compArr.findIndex(d => d.comp.key === data.comp.key));
  if (currentCompIdx < 0) currentCompIdx = 0;
  if (!compArr[currentCompIdx]?.records?.length) return;
  let currentRecIdx = 0;

  const hasMultiComp = compArr.length > 1;
  const wrap = _palmModalWrap();

  function curComp(){ return compArr[currentCompIdx]; }

  function cardHTML(){
    const comp = curComp();
    const records = comp.records || [];
    const rec = records[currentRecIdx];
    if (!rec) return '';
    const accent = comp.comp.color;
    const team = teamById[rec.teamId] || {};
    const teamColor = team.color || '#666';
    const tags = [rec.season, rec.juego, rec.year].filter(Boolean).join(' · ');
    const isVigente = currentRecIdx === 0;
    const logoHtml = team.logo
      ? `<img src="${_esc(team.logo)}" alt="">`
      : `<span>${_esc(team.ini || (team.name||'?').slice(0,2))}</span>`;
    const canUp   = currentRecIdx < records.length - 1;
    const canDown = currentRecIdx > 0;
    const compPosHtml = hasMultiComp
      ? `<div class="tr-fs-mob-comp-pos">${currentCompIdx + 1} / ${compArr.length}</div>`
      : '';
    const hint = hasMultiComp ? '← → Competición  ·  ↕ Campeón' : '↕ Desliza para navegar';
    return `
      <div class="tr-fs-mob-card" style="--accent:${accent}">
        <div class="tr-fs-mob-halo" style="background:radial-gradient(circle at 35% 30%, ${teamColor}88, transparent 65%)"></div>
        <div class="tr-fs-mob-trophy">${renderTrophy3D(comp.comp.key, 200)}</div>
        <div class="tr-fs-mob-comp">${_esc(comp.comp.label)}</div>
        ${compPosHtml}
        <div class="tr-fs-mob-champ-row">
          <div class="tr-fs-mob-logo" style="background:${teamColor}">${logoHtml}</div>
          <div>
            <div class="tr-fs-mob-name">${_esc(team.name || '—')}</div>
            ${tags ? `<div class="tr-fs-mob-tags">${_esc(tags)}</div>` : ''}
            ${isVigente ? `<div class="tr-fs-mob-badge">VIGENTE</div>` : ''}
          </div>
        </div>
        <div class="tr-fs-mob-pos">${currentRecIdx + 1} / ${records.length}</div>
      </div>
      <div class="tr-fs-mob-arrows">
        <button class="tr-fs-mob-arr" id="tr-fs-mob-up" ${!canUp?'disabled':''} title="Campeón anterior">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
        <button class="tr-fs-mob-arr" id="tr-fs-mob-down" ${!canDown?'disabled':''} title="Campeón siguiente">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="tr-fs-mob-hint">${hint}</div>`;
  }

  function render(){
    const content = wrap.querySelector('#tr-fs-mob-content');
    if (content) content.innerHTML = cardHTML();
    wrap.querySelector('#tr-fs-mob-up')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const recs = curComp().records || [];
      if (currentRecIdx < recs.length - 1) { currentRecIdx++; render(); }
    });
    wrap.querySelector('#tr-fs-mob-down')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentRecIdx > 0) { currentRecIdx--; render(); }
    });
  }

  let originStyle = '';
  if (sourceRect) {
    const cx = sourceRect.left + sourceRect.width / 2;
    const cy = sourceRect.top + sourceRect.height / 2;
    const tx = cx - window.innerWidth / 2;
    const ty = cy - window.innerHeight / 2;
    originStyle = ` --tr-fs-tx:${Math.round(tx)}px; --tr-fs-ty:${Math.round(ty)}px;`;
  }
  const initAccent = curComp().comp.color;
  wrap.innerHTML = `
    <div class="tr-fullscreen tr-fullscreen-mob" id="tr-fs" style="--accent:${initAccent};${originStyle}">
      <button class="tr-fs-close" onclick="closeChampionFullscreen()" aria-label="Cerrar">×</button>
      <div class="tr-fs-spotlight"></div>
      <div id="tr-fs-mob-content"></div>
    </div>`;

  render();

  // Swipe vertical (↕) → navegar campeones · Swipe horizontal (← →) → cambiar competición
  let touchStartX = 0, touchStartY = 0;
  const fs = wrap.querySelector('#tr-fs');
  fs.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  fs.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
      const dir = dx < 0 ? 1 : -1;
      const newIdx = currentCompIdx + dir;
      if (newIdx >= 0 && newIdx < compArr.length) {
        currentCompIdx = newIdx;
        currentRecIdx = 0;
        fs.style.setProperty('--accent', curComp().comp.color);
        render();
      }
    } else if (Math.abs(dy) > 45) {
      const recs = curComp().records || [];
      if (dy < 0 && currentRecIdx < recs.length - 1) { currentRecIdx++; render(); }
      else if (dy > 0 && currentRecIdx > 0) { currentRecIdx--; render(); }
    }
  }, { passive: true });

  document.addEventListener('keydown', _trFsEsc);
  fs.addEventListener('click', (e) => {
    if (e.target.id === 'tr-fs') closeChampionFullscreen();
  });
}
function _trFsEsc(e){ if (e.key === 'Escape') closeChampionFullscreen(); }
function closeChampionFullscreen(){
  const wrap = _palmModalWrap();
  const fs = wrap && wrap.querySelector('#tr-fs');
  if (!fs) { document.removeEventListener('keydown', _trFsEsc); return; }
  fs.classList.add('tr-fs-closing');
  setTimeout(() => {
    if (wrap) wrap.innerHTML = '';
    document.removeEventListener('keydown', _trFsEsc);
    document.body.style.overflow = '';
  }, 280);
}

/* ---------------- Trophy Room interactivity ---------------- */
function initTrophyRoom(root, compData, teamById){
  const N       = compData.length;
  const stage   = root.querySelector('#tr-stage');
  const room    = root.querySelector('#tr-room');
  const flash   = root.querySelector('#tr-flash');
  const prevBtn = root.querySelector('#tr-prev');
  const nextBtn = root.querySelector('#tr-next');
  const hint    = root.querySelector('#tr-drag-hint');
  const sideEl  = root.querySelector('#tr-side-panel');
  const cards   = [...stage.querySelectorAll('.tr-case')];

  let pos = 0, target = 0, snapped = -1, dragging = false;
  let dragStartX = 0, dragStartPos = 0;
  let velocity = 0, frame = null;
  let movedDuringDrag = false, interacted = false;
  let firstSnap = true;

  function positionCards(){
    // Usar ancho del stage (no del room) para calcular spread, así las
    // cartas quedan centradas en la zona del carrusel aunque el panel
    // lateral ocupe parte del room.
    const W = stage.clientWidth || room.clientWidth || 1100;
    const STEP_X = Math.min(290, Math.max(180, W * 0.22));
    const STEP_Z = 180;
    const TILT   = 26;

    cards.forEach((c, i) => {
      let off = i - pos;
      // Wrapping infinito: asegurar que offset siempre esté en [-N/2, N/2]
      while (off >  N/2) off -= N;
      while (off < -N/2) off += N;

      const abs   = Math.abs(off);
      const scale = Math.max(0.55, 1 - abs * 0.16);
      const x     = off * STEP_X;
      const z     = -abs * STEP_Z;
      const rotY  = -off * TILT;
      const op    = abs > 2.6 ? 0 : Math.max(0, 1 - Math.pow(abs/2.6, 1.6));
      const blur  = abs > 0.6 ? Math.min(2.5, (abs - 0.6) * 1.4) : 0;

      c.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
      c.style.opacity   = op.toFixed(3);
      c.style.zIndex    = String(1000 - Math.round(abs * 100));
      c.style.filter    = blur ? `blur(${blur.toFixed(2)}px)` : '';
      c.classList.toggle('is-active', abs < 0.5);
    });
  }

  function setActive(idx){
    target = idx;
    interacted = true;
    if (hint) hint.classList.add('is-hidden');
  }
  // Returns the position equivalent to cardIdx (mod N) that is closest to current target.
  // Prevents setActive(rawIndex) from discarding loop offsets after multiple rotations.
  function nearestTarget(cardIdx){
    const k = Math.round((target - cardIdx) / N);
    return cardIdx + k * N;
  }
  function snapTarget(){ target = Math.round(target); }

  function triggerCinematicSnap(idx){
    const card = cards[((idx % N) + N) % N];
    if (!card) return;
    // 1) destello dorado en la sala
    flash.classList.remove('fire'); void flash.offsetWidth;
    flash.classList.add('fire');
    // 2) zoom-in pulse en la vitrina activa
    card.classList.remove('cinematic-snap'); void card.offsetWidth;
    card.classList.add('cinematic-snap');
    // 3) sonido sutil
    playPalmDing();
  }

  function tick(){
    const k = dragging ? 1 : 0.18;
    const diff = target - pos;
    if (Math.abs(diff) < 0.0008 && !dragging) pos = target;
    else pos += diff * k;
    positionCards();

    const currentSnap = ((Math.round(pos) % N) + N) % N;
    if (currentSnap !== snapped) {
      snapped = currentSnap;
      renderSidePanel(currentSnap);
      updateSpotlights(currentSnap);
      // El primer asentamiento no dispara cinemática (evita ruido al cargar).
      if (!firstSnap) triggerCinematicSnap(currentSnap);
      firstSnap = false;
    }
    frame = requestAnimationFrame(tick);
  }

  function renderSidePanel(idx){
    if (!sideEl) return;
    const data = compData[idx];
    if (!data) { sideEl.innerHTML = ''; return; }
    sideEl.innerHTML = buildInfoPanel(data, teamById);
  }

  /* Focos dinámicos: los 7 focos alternan entre color primario y secundario
     del equipo campeón. Fallback: color de la copa o dorado cálido. */
  function updateSpotlights(idx){
    const data = compData[idx];
    if (!data) return;
    const champTeam = data.champTeam;
    const isHex = h => h && /^#[0-9a-fA-F]{6}$/.test(h);

    const hex1 = isHex(champTeam?.color)  ? champTeam.color
               : isHex(data.comp.color)   ? data.comp.color
               : '#ffd479';
    const hex2 = isHex(champTeam?.color2) ? champTeam.color2
               : hex1; // si no hay secundario, repite el primario

    function applySpot(spot, hex){
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      spot.style.setProperty('--spot-color', hex);
      spot.style.setProperty('--spot-glow',  `rgba(${r},${g},${b},0.45)`);
      spot.style.setProperty('--spot-cone',  `rgba(${r},${g},${b},0.10)`);
    }

    room.querySelectorAll('.tr-spot').forEach((spot, i) => {
      applySpot(spot, i % 2 === 0 ? hex1 : hex2);
    });
  }

  function onPointerDown(e){
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    movedDuringDrag = false;
    dragStartX = e.clientX;
    dragStartPos = target;
    pos = target;
    velocity = 0;
    room.classList.add('is-dragging');
    interacted = true;
    if (hint) hint.classList.add('is-hidden');
    // NO usamos setPointerCapture: si lo hacemos, pointerup/click/dblclick
    // se redirigen al stage y nunca llegan a las cards individuales,
    // matando la detección de click y doble click. El drag funciona
    // igual porque pointermove/pointerup están attached a window.
  }
  function onPointerMove(e){
    if (!dragging) return;
    const W = stage.clientWidth || room.clientWidth || 1100;
    const STEP_X = Math.min(290, Math.max(180, W * 0.22));
    const dx = e.clientX - dragStartX;
    // Threshold 15px: tolera micro-movimientos involuntarios entre los dos
    // clicks de un doble click humano (antes era 4px, demasiado estricto).
    if (Math.abs(dx) > 15) {
      movedDuringDrag = true;
      // Cancelar long-press si el usuario está arrastrando
      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    }
    const newTarget = dragStartPos - dx / STEP_X;
    velocity = newTarget - target;
    target   = newTarget;
  }
  function onPointerUp(e){
    if (!dragging) return;
    dragging = false;
    room.classList.remove('is-dragging');
    target = target + velocity * 6;
    snapTarget();
  }
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup',   onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Click: si la card no fue arrastrada, la enfoca.
  // Doble click manual (timing) — solo escritorio: el nativo dblclick no dispara
  // confiable porque las cards están en transform 3D. Detectamos dos clicks
  // consecutivos sobre la misma card en <600ms.
  // Móvil: usa long-press (500ms) en su lugar.
  const DBL_MS = 600;
  const LONG_MS = 500;
  let _lastClickIdx = -1, _lastClickT = 0;
  let _longPressTimer = null;

  cards.forEach((c, i) => {
    // Long-press para móvil: abre fullscreen al mantener pulsado 500ms
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return; // solo touch
      _longPressTimer = setTimeout(() => {
        _longPressTimer = null;
        if (movedDuringDrag) return;
        // Centrar la card si no lo está (preserva offset de vueltas)
        const idx = ((Math.round(target) % N) + N) % N;
        if (idx !== i) { setActive(nearestTarget(i)); snapTarget(); }
        const srcRect = c.getBoundingClientRect();
        openChampionFullscreen(compData[i], teamById, srcRect, compData, i);
      }, LONG_MS);
    });
    c.addEventListener('pointerup', () => {
      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    });
    c.addEventListener('pointercancel', () => {
      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    });

    c.addEventListener('click', (e) => {
      if (movedDuringDrag) return;
      // En móvil el fullscreen lo maneja el long-press; el click solo enfoca la card.
      if (window.matchMedia('(pointer:coarse)').matches) {
        setActive(nearestTarget(i));
        return;
      }
      // Escritorio: doble click detectado manualmente
      const now = performance.now();
      const isDouble = _lastClickIdx === i && (now - _lastClickT) < DBL_MS;
      if (isDouble) {
        _lastClickIdx = -1; _lastClickT = 0;
        const idx = ((Math.round(target) % N) + N) % N;
        if (idx !== i) { setActive(nearestTarget(i)); snapTarget(); }
        setTimeout(() => {
          const srcRect = c.getBoundingClientRect();
          openChampionFullscreen(compData[i], teamById, srcRect, compData, i);
        }, 180);
      } else {
        _lastClickIdx = i; _lastClickT = now;
        setActive(nearestTarget(i));
      }
    });
  });


  prevBtn.addEventListener('click', () => { setActive(target - 1); snapTarget(); });
  nextBtn.addEventListener('click', () => { setActive(target + 1); snapTarget(); });

  function onKey(e){
    if (!root.isConnected) return;
    if (e.key === 'ArrowLeft')  { setActive(target - 1); snapTarget(); }
    if (e.key === 'ArrowRight') { setActive(target + 1); snapTarget(); }
    if (e.key === 'Enter')      {
      const idx = ((Math.round(target) % N) + N) % N;
      openChampionFullscreen(compData[idx], teamById, undefined, compData, idx);
    }
  }
  window.addEventListener('keydown', onKey);

  let wheelLock = false;
  room.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < 8 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    setActive(target + (e.deltaX > 0 ? 1 : -1));
    snapTarget();
    setTimeout(() => wheelLock = false, 280);
  }, { passive: false });

  /* Reflejo de la placa metálica sigue al mouse */
  let _plqRaf = null;
  room.addEventListener('mousemove', (e) => {
    if (_plqRaf) return;
    _plqRaf = requestAnimationFrame(() => {
      _plqRaf = null;
      cards.forEach((c) => {
        const plq = c.querySelector('.tr-case-plaque');
        if (!plq) return;
        const rect = plq.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(0);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(0);
        plq.style.setProperty('--plq-mx', x + '%');
        plq.style.setProperty('--plq-my', y + '%');
      });
    });
  });
  room.addEventListener('mouseleave', () => {
    if (_plqRaf) { cancelAnimationFrame(_plqRaf); _plqRaf = null; }
    cards.forEach((c) => {
      const plq = c.querySelector('.tr-case-plaque');
      if (plq) { plq.style.removeProperty('--plq-mx'); plq.style.removeProperty('--plq-my'); }
    });
  });

  const ro = new ResizeObserver(() => positionCards());
  ro.observe(room);

  const mo = new MutationObserver(() => {
    if (!root.isConnected) {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup',   onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKey);
      ro.disconnect();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  positionCards();
  tick();

  setTimeout(() => { if (!interacted && hint) hint.classList.add('is-hidden'); }, 7000);
}

/* ============================================================
   ADMIN — Matriz + Campeones vigentes + Editar registro
   ============================================================ */
/* Limpieza one-time: borra los `order` asignados con el default viejo
   (id descendente, que dejaba al campeón vigente al final). Tras esto, el
   orden por defecto vuelve a ser cronológico (más reciente primero) y el
   admin puede reordenar a mano. Corre solo cuando un admin abre el palmarés. */
async function _palmResetBadOrderOnce(){
  try {
    const flag = await dbGetAll('settings', s => s.key === 'palmaresOrderResetV1');
    if(flag.length) return;
    const recs = await getAllPalmaresRecords();
    let cleared = 0;
    for(const r of recs){
      if(typeof r.order === 'number'){
        const { order, ...rest } = r;
        await dbPut('palmares', rest);   // setDoc reemplaza: el campo order desaparece
        cleared++;
      }
    }
    await dbAdd('settings', { key:'palmaresOrderResetV1', value:true });
    if(cleared) console.log(`[palmares] reset de order viejo: ${cleared} registros`);
  } catch(e){ /* si no es admin la escritura falla; se ignora */ }
}

async function renderAdmPalmares(){
  const el = document.getElementById('adm-palmares-content');
  if(!el) return;

  await _palmResetBadOrderOnce();
  await loadPalmaresComps();
  const [recs, allTeams, { value: overrides }] = await Promise.all([
    getAllPalmaresRecords(),
    dbGetAll('teams'),
    getReigningOverrides()
  ]);
  const teamById = {}; allTeams.forEach(t => teamById[t.id] = t);
  const agg = await aggregatePalmaresByTeam();
  const teamsWithTitles = [...agg.entries()]
    .map(([tid, counts]) => ({ team: teamById[tid], counts }))
    .filter(x => x.team)
    .sort((a, b) => (b.counts._total - a.counts._total) || a.team.name.localeCompare(b.team.name, 'es'));

  // Para cada competición, lista de registros + el override actual
  const compSections = PALMARES_COMPS.map(c => {
    const compRecs = recs.filter(r => r.competition === c.key)
      .sort(_palmCompareChrono);
    const overrideId = overrides[c.key];
    const autoChamp = reigningChampion(recs, c.key, {}); // sin override
    const effective = reigningChampion(recs, c.key, overrides);
    return { comp: c, recs: compRecs, overrideId, autoChamp, effective };
  });

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
    <div style="font-size:14px;color:var(--txt2);">${recs.length} título(s) registrado(s) · ${teamsWithTitles.length} club(es) campeón(es) · ${PALMARES_COMPS.length} copa(s)</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="openPalmaresAddModal()">+ Agregar título</button>
      <button class="btn btn-secondary" onclick="openNewCopaModal()">+ Nueva copa</button>
      <button class="btn btn-sm" onclick="openManagedCopaModal()" title="Gestionar copas personalizadas"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Copas</button>
    </div>
  </div>

  <div class="card" style="padding:14px;margin-bottom:14px;">
    <div style="font:700 11px/1 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;color:var(--txt3);margin-bottom:10px;">Campeones vigentes</div>
    <div class="palm-vigentes-grid">
      ${compSections.map(s => {
        const opts = s.recs.map(r => {
          const t = teamById[r.teamId];
          const extras = [r.season, r.juego, r.year].filter(Boolean).join(' · ');
          const lbl = `${t ? t.name : '#'+r.teamId}${extras ? ' · ' + extras : ''}`;
          const selected = s.overrideId === r.id;
          return `<option value="${r.id}" ${selected?'selected':''}>${_esc(lbl)}</option>`;
        }).join('');
        const autoExtras = s.autoChamp ? [s.autoChamp.season, s.autoChamp.juego, s.autoChamp.year].filter(Boolean).join(' · ') : '';
        const autoLbl = s.autoChamp ? `Auto · ${teamById[s.autoChamp.teamId]?.name || '#'+s.autoChamp.teamId}${autoExtras?' ('+autoExtras+')':''}` : 'Auto · sin campeón';
        const effTeam = s.effective ? teamById[s.effective.teamId] : null;
        const effExtras = s.effective ? [s.effective.season, s.effective.juego, s.effective.year].filter(Boolean).join(' · ') : '';
        return `
        <div class="palm-vig-item">
          <div class="palm-vig-trophy">${renderTrophy(s.comp.key, 28)}</div>
          <div class="palm-vig-text">
            <div class="palm-vig-comp">${_esc(s.comp.label)}</div>
            <div class="palm-vig-eff">
              ${effTeam ? `<span class="palm-vig-dot" style="background:${effTeam.color||'#888'}"></span>${_esc(effTeam.name)}${effExtras?` · ${_esc(effExtras)}`:''}` : '<span style="color:var(--txt3);">sin campeón</span>'}
            </div>
          </div>
          ${s.recs.length > 1 ? `<button class="btn btn-xs" title="Ordenar campeones · el #1 es el vigente" onclick="openPalmaresReorder('${_escAttr(s.comp.key)}')" style="margin-top:6px;">↕ Ordenar campeones</button>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>

  <div class="card" style="overflow:auto;">
    <table class="palm-admin-table">
      <thead>
        <tr>
          <th class="head-teams">Clubes campeones</th>
          ${PALMARES_COMPS.map(c => `<th class="head-comp"><div class="head-comp-inner">${renderTrophy(c.key, 22)}<span>${_esc(c.label)}</span></div></th>`).join('')}
          <th class="head-total">Total</th>
          <th class="head-actions"></th>
        </tr>
      </thead>
      <tbody>
        ${teamsWithTitles.length === 0
          ? `<tr><td colspan="${PALMARES_COMPS.length+3}" style="text-align:center;padding:30px;color:var(--txt3);">No hay títulos registrados aún.</td></tr>`
          : teamsWithTitles.map(({team, counts}) => `
              <tr>
                <td class="cell-team">
                  <div class="team-cell">
                    <div class="team-logo" style="background:${team.color || '#333'};">
                      ${team.logo ? `<img src="${team.logo}">` : `<span>${_esc(team.ini || team.name.substring(0,3))}</span>`}
                    </div>
                    <span class="team-name">${_esc(team.name)}</span>
                  </div>
                </td>
                ${PALMARES_COMPS.map(c => {
                  const n = counts[c.key] || 0;
                  return `<td class="cell-count ${n>0?'has':'zero'}" onclick="openPalmaresCellEdit(${team.id}, '${_escAttr(c.key)}')">${n>0?`<span class="big-n">${n}</span>`:''}</td>`;
                }).join('')}
                <td class="cell-total">${counts._total}</td>
                <td class="cell-actions"><button class="btn btn-xs" onclick="openPalmaresAddModal(${team.id})">+ Título</button></td>
              </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

/* Selector de campeón vigente (override) */
async function setVigenteChampion(compKey, value){
  const recordId = value ? parseInt(value) : null;
  await setReigningOverride(compKey, recordId);
  if (typeof showToast === 'function') showToast(recordId ? 'Campeón vigente actualizado' : 'Vuelve al modo automático');
  renderAdmPalmares();
}

/* ---- Reordenamiento manual de campeones por competición ---- */
async function openPalmaresReorder(compKey){
  const [recs, teams] = await Promise.all([getAllPalmaresRecords(), dbGetAll('teams')]);
  const teamById = {}; teams.forEach(t => teamById[t.id] = t);
  const comp = PALMARES_COMPS.find(c => c.key === compKey);
  const list = recs.filter(r => r.competition === compKey).sort(_palmCompareChrono);
  window._palmReorderTeams = teamById;
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="palmares-reorder-modal">
    <div class="modal" style="max-width:460px;">
      <div class="modal-hdr">
        <div class="modal-title">Ordenar · ${_esc(comp?.label || compKey)}</div>
        <button class="modal-close" onclick="closePalmaresModals(); renderAdmPalmares();">×</button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--txt3);margin-bottom:10px;">Usa ▲▼ para ordenar. <b style="color:var(--gold);">El #1 (arriba) es el campeón vigente</b> — el más reciente.</div>
        <div id="palm-reorder-list">${_palmReorderListHTML(list, teamById)}</div>
      </div>
    </div>
  </div>`;
}

function _palmReorderListHTML(list, teamById){
  return list.map((r, i) => {
    const t = teamById[r.teamId];
    const extras = [r.season, r.juego, r.year].filter(Boolean).join(' · ');
    const isVig = i === 0;
    const vigBadge = isVig ? `<span style="background:var(--gold);color:#000;font-size:9px;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:6px;letter-spacing:0.5px;">VIGENTE</span>` : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid ${isVig?'var(--gold)':'var(--brd)'};border-radius:6px;margin-bottom:6px;background:${isVig?'rgba(212,175,55,0.08)':'transparent'};">
      <span style="width:18px;text-align:right;color:${isVig?'var(--gold)':'var(--txt3)'};font-size:12px;font-weight:${isVig?'700':'400'};">${i+1}</span>
      <span style="width:26px;height:26px;border-radius:6px;background:${t?.color||'#333'};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;flex:none;">${_esc((t?.ini || t?.name || '?').slice(0,3))}</span>
      <span style="flex:1;font-size:13px;min-width:0;">${_esc(t ? t.name : '#'+r.teamId)}${extras?`<span style="color:var(--txt3);font-size:11px;"> · ${_esc(extras)}</span>`:''}${vigBadge}</span>
      <button class="btn btn-xs" ${i===0?'disabled':''} onclick="palmaresMove('${_escAttr(r.competition)}',${r.id},-1)">▲</button>
      <button class="btn btn-xs" ${i===list.length-1?'disabled':''} onclick="palmaresMove('${_escAttr(r.competition)}',${r.id},1)">▼</button>
    </div>`;
  }).join('');
}

async function palmaresMove(compKey, recId, dir){
  const recs = await getAllPalmaresRecords();
  const list = recs.filter(r => r.competition === compKey).sort(_palmCompareChrono);
  const idx = list.findIndex(r => r.id === recId);
  const ni = idx + dir;
  if(idx < 0 || ni < 0 || ni >= list.length) return;
  [list[idx], list[ni]] = [list[ni], list[idx]];
  // Reasignar order secuencial 1..n y guardar los que cambian
  for(let i=0; i<list.length; i++){
    if(list[i].order !== i+1){
      await dbPut('palmares', {...list[i], order: i+1});
      list[i].order = i+1;
    }
  }
  const cont = document.getElementById('palm-reorder-list');
  if(cont) cont.innerHTML = _palmReorderListHTML(list, window._palmReorderTeams || {});
}

/* Modal: agregar título */
async function openPalmaresAddModal(presetTeamId=null){
  const teams = await dbGetAll('teams', t => (t.status||'ACTIVO') === 'ACTIVO');
  teams.sort((a,b) => a.name.localeCompare(b.name, 'es'));
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="palmares-add-modal">
    <div class="modal" style="max-width:440px;">
      <div class="modal-hdr"><div class="modal-title">Agregar título</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Equipo</label>
          <select id="palm-team">${teams.map(t => `<option value="${t.id}" ${t.id===presetTeamId?'selected':''}>${_esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Competición</label>
          <select id="palm-comp">${PALMARES_COMPS.map(c => `<option value="${_escAttr(c.key)}">${_esc(c.label)}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label>Temporada</label><input type="text" id="palm-season" placeholder="T1"></div>
          <div><label>Juego</label><input type="text" id="palm-juego" placeholder="PES 4"></div>
        </div>
        <div class="form-group">
          <label>Año <span style="opacity:.5;font-weight:400;">(opcional)</span></label>
          <input type="number" id="palm-year" placeholder="2024" min="1900" max="2100">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePalmaresModals()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePalmaresAdd()">Guardar título</button>
      </div>
    </div>
  </div>`;
}
async function savePalmaresAdd(){
  const teamId = parseInt(document.getElementById('palm-team').value);
  const competition = document.getElementById('palm-comp').value;
  const yearRaw = document.getElementById('palm-year').value.trim();
  const seasonRaw = document.getElementById('palm-season').value.trim();
  const juegoRaw = document.getElementById('palm-juego').value.trim();
  const rec = { teamId, competition };
  if (yearRaw) rec.year = parseInt(yearRaw);
  if (seasonRaw) rec.season = seasonRaw;
  if (juegoRaw) rec.juego = juegoRaw;
  rec.createdAt = new Date().toISOString();
  await dbAdd('palmares', rec);
  if (typeof showToast === 'function') showToast('Título registrado');
  closePalmaresModals();
  renderAdmPalmares();
}

/* Modal: editar títulos en una celda (team × competición). Cada fila
   incluye botón Editar (cambiar team/year/season) y botón Quitar. */
async function openPalmaresCellEdit(teamId, compKey){
  const team = await dbGet('teams', teamId);
  const comp = palmaresCompByKey(compKey);
  if (!team || !comp) return;
  const recs = (await dbGetAll('palmares', r => r.teamId === teamId && r.competition === compKey))
    .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.id - a.id));
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="palmares-cell-modal">
    <div class="modal" style="max-width:520px;">
      <div class="modal-hdr"><div class="modal-title">${_esc(team.name)} · ${_esc(comp.label)}</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div style="margin-bottom:12px;font-size:13px;color:var(--txt3);">${recs.length} título(s) registrado(s)</div>
        <div id="palm-cell-list" style="display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;">
          ${recs.length === 0
            ? `<div style="padding:14px;text-align:center;color:var(--txt3);border:1px dashed var(--brd);border-radius:var(--r);">Sin títulos aún en esta competición.</div>`
            : recs.map(r => `
                <div class="palm-rec-row" data-id="${r.id}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);">
                  ${renderTrophy(comp.key, 22)}
                  <span style="flex:1;font-size:14px;">${r.season ? `<b>${_esc(r.season)}</b>` : '<span style="color:var(--txt3);">temp?</span>'}${r.juego ? ` · <span style="color:var(--txt2);">${_esc(r.juego)}</span>` : ''}${r.year ? ` · <small style="color:var(--txt3);">${r.year}</small>` : ''}</span>
                  <button class="btn btn-xs btn-danger" onclick="deletePalmaresRecord(${r.id}, ${teamId}, '${_escAttr(compKey)}')">Quitar</button>
                </div>`).join('')}
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--brd);">
          <div style="font-size:11px;font-weight:700;color:var(--txt3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Agregar nuevo título</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;">
            <div><label style="font-size:11px;color:var(--txt3);">Temporada</label><input type="text" id="palm-cell-season" placeholder="T1"></div>
            <div><label style="font-size:11px;color:var(--txt3);">Juego</label><input type="text" id="palm-cell-juego" placeholder="PES 4"></div>
            <div><label style="font-size:11px;color:var(--txt3);">Año</label><input type="number" id="palm-cell-year" placeholder="2024" min="1900" max="2100"></div>
            <button class="btn btn-primary" onclick="addPalmaresRecord(${teamId}, '${_escAttr(compKey)}')">+ Agregar</button>
          </div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn" onclick="closePalmaresModals()">Cerrar</button></div>
    </div>
  </div>`;
}
async function addPalmaresRecord(teamId, compKey){
  const yearRaw = document.getElementById('palm-cell-year').value.trim();
  const seasonRaw = document.getElementById('palm-cell-season').value.trim();
  const juegoRaw = document.getElementById('palm-cell-juego').value.trim();
  const rec = { teamId, competition: compKey, createdAt: new Date().toISOString() };
  if (yearRaw) rec.year = parseInt(yearRaw);
  if (seasonRaw) rec.season = seasonRaw;
  if (juegoRaw) rec.juego = juegoRaw;
  await dbAdd('palmares', rec);
  if (typeof showToast === 'function') showToast('Título agregado');
  await openPalmaresCellEdit(teamId, compKey);
  renderAdmPalmares();
}
async function deletePalmaresRecord(recId, teamId, compKey){
  if (!confirm('¿Quitar este título del palmarés?')) return;
  // Si era el campeón vigente forzado, limpiar el override.
  const { value: overrides } = await getReigningOverrides();
  if (overrides[compKey] === recId) await setReigningOverride(compKey, null);
  await dbDelete('palmares', recId);
  if (typeof showToast === 'function') showToast('Título eliminado');
  await openPalmaresCellEdit(teamId, compKey);
  renderAdmPalmares();
}

/* Modal: editar un registro (cambiar equipo / año / temporada) */
async function openPalmaresEditRecord(recId){
  const rec = await dbGet('palmares', recId);
  if (!rec) return;
  const teams = await dbGetAll('teams');
  teams.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="palmares-edit-modal">
    <div class="modal" style="max-width:440px;">
      <div class="modal-hdr"><div class="modal-title">Editar título</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          ${renderTrophy(rec.competition, 32)}
          <div style="font:600 12px/1.3 'Barlow Condensed',sans-serif;letter-spacing:1px;color:var(--txt2);text-transform:uppercase;">${_esc(palmaresCompByKey(rec.competition)?.label || rec.competition)}</div>
        </div>
        <div class="form-group"><label>Equipo</label>
          <select id="palm-edit-team">${teams.map(t => `<option value="${t.id}" ${t.id===rec.teamId?'selected':''}>${_esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label>Temporada</label><input type="text" id="palm-edit-season" placeholder="T1" value="${_esc(rec.season||'')}"></div>
          <div><label>Juego</label><input type="text" id="palm-edit-juego" placeholder="PES 4" value="${_esc(rec.juego||'')}"></div>
        </div>
        <div class="form-group">
          <label>Año <span style="opacity:.5;font-weight:400;">(opcional)</span></label>
          <input type="number" id="palm-edit-year" placeholder="2024" min="1900" max="2100" value="${rec.year||''}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePalmaresModals()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePalmaresEditRecord(${rec.id})">Guardar cambios</button>
      </div>
    </div>
  </div>`;
}
async function savePalmaresEditRecord(recId){
  const rec = await dbGet('palmares', recId);
  if (!rec) return;
  const teamId = parseInt(document.getElementById('palm-edit-team').value);
  const yearRaw = document.getElementById('palm-edit-year').value.trim();
  const seasonRaw = document.getElementById('palm-edit-season').value.trim();
  const juegoRaw = document.getElementById('palm-edit-juego').value.trim();
  const next = { ...rec, teamId };
  if (yearRaw) next.year = parseInt(yearRaw); else delete next.year;
  if (seasonRaw) next.season = seasonRaw; else delete next.season;
  if (juegoRaw) next.juego = juegoRaw; else delete next.juego;
  next.updatedAt = new Date().toISOString();
  await dbPut('palmares', next);
  if (typeof showToast === 'function') showToast('Título actualizado');
  closePalmaresModals();
  renderAdmPalmares();
}

function closePalmaresModals(){
  const wrap = _palmModalWrap();
  if (wrap) wrap.innerHTML = '';
}

/* Modal: crear nueva copa */
async function openNewCopaModal(){
  const trophyStyles = getTrophyStyles();
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="new-copa-modal">
    <div class="modal" style="max-width:520px;">
      <div class="modal-hdr"><div class="modal-title">Crear nueva copa</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nombre de la copa</label>
          <input type="text" id="nueva-copa-label" placeholder="ej: Mi Copa Personalizada">
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label>Abreviatura</label><input type="text" id="nueva-copa-short" placeholder="ej: MCP" maxlength="6"></div>
          <div><label>Color</label><input type="color" id="nueva-copa-color" value="#FFD700"></div>
        </div>
        <div class="form-group">
          <label>Estilo de trofeo <span style="opacity:.6;font-size:11px;">(selecciona uno de los 11 disponibles)</span></label>
          <div id="trophy-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;max-height:28vh;overflow:auto;">
            ${trophyStyles.map(t => {
              const trophySvg = renderTrophyByStyle(t.id, 32);
              return `
              <label style="display:flex;flex-direction:column;align-items:center;padding:8px;border:2px solid transparent;border-radius:6px;cursor:pointer;transition:all 200ms;" onclick="selectTrophyStyle('${t.id}', this)">
                <input type="radio" name="trophy-style" value="${t.id}" style="margin-bottom:4px;">
                <div style="margin:4px 0;">${trophySvg}</div>
                <span style="font-size:10px;text-align:center;color:var(--txt2);">${t.label}</span>
              </label>
            `;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePalmaresModals()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveNewCopa()">Crear copa</button>
      </div>
    </div>
  </div>`;

  // Seleccionar el primer trofeo por defecto
  const firstRadio = wrap.querySelector('input[name="trophy-style"]');
  if (firstRadio) {
    firstRadio.checked = true;
    firstRadio.closest('label').style.borderColor = 'var(--accent)';
  }
}

function selectTrophyStyle(styleId, labelEl){
  const modal = document.getElementById('new-copa-modal');
  if (!modal) return;
  modal.querySelectorAll('.modal-body label').forEach(l => l.style.borderColor = 'transparent');
  labelEl.style.borderColor = 'var(--accent, #FFD700)';
  const radio = labelEl.querySelector('input');
  if (radio) radio.checked = true;
}

async function saveNewCopa(){
  const label = document.getElementById('nueva-copa-label').value.trim();
  const short = document.getElementById('nueva-copa-short').value.trim();
  const color = document.getElementById('nueva-copa-color').value;
  const trophy = document.querySelector('input[name="trophy-style"]:checked')?.value;

  if (!label || label.length < 3) { if (typeof showToast === 'function') showToast('Nombre debe tener al menos 3 caracteres'); return; }
  if (!short || short.length < 2) { if (typeof showToast === 'function') showToast('Abreviatura debe tener al menos 2 caracteres'); return; }
  if (!trophy) { if (typeof showToast === 'function') showToast('Selecciona un estilo de trofeo'); return; }

  await createNewCopa(label, short, trophy, color);
  if (typeof showToast === 'function') showToast('Nueva copa creada');
  closePalmaresModals();
  renderAdmPalmares();
}

/* Modal: gestionar TODAS las copas (predefinidas + personalizadas) */
async function openManagedCopaModal(){
  const customComps = PALMARES_COMPS.filter(c => !PALMARES_COMPS_DEFAULT.find(d => d.key === c.key));
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="manage-copas-modal">
    <div class="modal" style="max-width:700px;">
      <div class="modal-hdr"><div class="modal-title">Gestionar copas</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div style="margin-bottom:14px;">
          <div style="font-size:12px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Copas predefinidas</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${PALMARES_COMPS_DEFAULT.map(c => `
              <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:6px;">
                <div style="font-size:18px;">${renderTrophyByStyle(c.trophy, 22)}</div>
                <div>
                  <div style="font-weight:600;color:var(--txt1);">${_esc(c.label)}</div>
                  <div style="font-size:11px;color:var(--txt3);">${_esc(c.short)} · ${_esc(c.trophy)}</div>
                </div>
                <button class="btn btn-xs" onclick="openEditCopaModal('${_escAttr(c.key)}')">Editar</button>
              </div>
            `).join('')}
          </div>
        </div>

        ${customComps.length > 0 ? `
        <div style="padding-top:14px;border-top:1px solid var(--brd);">
          <div style="font-size:12px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Copas personalizadas</div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:30vh;overflow:auto;">
            ${customComps.map(c => `
              <div style="display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:12px;padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:6px;">
                <div style="font-size:18px;">${renderTrophyByStyle(c.trophy, 22)}</div>
                <div>
                  <div style="font-weight:600;color:var(--txt1);">${_esc(c.label)}</div>
                  <div style="font-size:11px;color:var(--txt3);">${_esc(c.short)} · ${_esc(c.trophy)}</div>
                </div>
                <button class="btn btn-xs" onclick="openEditCopaModal('${_escAttr(c.key)}')">Editar</button>
                <button class="btn btn-xs btn-danger" onclick="deleteCopaAndRefresh('${_escAttr(c.key)}')">Eliminar</button>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="openNewCopaModal()">+ Nueva copa</button>
        <button class="btn" onclick="closePalmaresModals()">Cerrar</button>
      </div>
    </div>
  </div>`;
}

async function deleteCopaAndRefresh(key){
  if (!confirm(`¿Eliminar la copa "${palmaresCompByKey(key)?.label}"?\n\nNota: Los títulos registrados en esta copa se mantendrán, solo desaparecerá la copa del listado.`)) return;
  await deleteCopa(key);
  if (typeof showToast === 'function') showToast('Copa eliminada');
  await openManagedCopaModal();
  renderAdmPalmares();
}

/* Modal: editar copa (predefinida o personalizada) */
async function openEditCopaModal(key){
  const copa = palmaresCompByKey(key);
  if (!copa) {
    if (typeof showToast === 'function') showToast('Copa no encontrada');
    return;
  }

  const isPredefined = PALMARES_COMPS_DEFAULT.find(c => c.key === key);
  const resetBtn = isPredefined
    ? `<button class="btn btn-xs" style="margin-left:auto;" onclick="resetCopaToDefault('${_escAttr(key)}')">↺ Restaurar original</button>`
    : '';
  const noteText = '';
  const trophyStyles = getTrophyStyles();
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
  <div class="modal-overlay open" id="edit-copa-modal">
    <div class="modal" style="max-width:520px;">
      <div class="modal-hdr"><div class="modal-title">Editar copa: ${_esc(copa.label)}</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        ${noteText}
        <div class="form-group">
          <label>Nombre de la copa</label>
          <input type="text" id="edit-copa-label" placeholder="ej: Mi Copa Personalizada" value="${_esc(copa.label)}">
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label>Abreviatura</label><input type="text" id="edit-copa-short" placeholder="ej: MCP" maxlength="6" value="${_esc(copa.short)}"></div>
          <div><label>Color</label><input type="color" id="edit-copa-color" value="${copa.color}"></div>
        </div>
        <div class="form-group">
          <label>Estilo de trofeo</label>
          <div id="trophy-grid-edit" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;max-height:28vh;overflow:auto;">
            ${trophyStyles.map(t => {
              const trophySvg = renderTrophyByStyle(t.id, 32);
              return `
              <label style="display:flex;flex-direction:column;align-items:center;padding:8px;border:2px solid ${t.id === copa.trophy ? 'var(--accent, #FFD700)' : 'transparent'};border-radius:6px;cursor:pointer;transition:all 200ms;" onclick="selectTrophyStyleEdit('${t.id}', this)">
                <input type="radio" name="trophy-style-edit" value="${t.id}" ${t.id === copa.trophy ? 'checked' : ''} style="margin-bottom:4px;">
                <div style="margin:4px 0;">${trophySvg}</div>
                <span style="font-size:10px;text-align:center;color:var(--txt2);">${t.label}</span>
              </label>
            `;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;gap:8px;align-items:center;">
        ${resetBtn}
        <button class="btn" onclick="closePalmaresModals()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveEditCopa('${_escAttr(key)}')">Guardar cambios</button>
      </div>
    </div>
  </div>`;
}

function selectTrophyStyleEdit(styleId, labelEl){
  const modal = document.getElementById('edit-copa-modal');
  if (!modal) return;
  modal.querySelectorAll('#trophy-grid-edit label').forEach(l => l.style.borderColor = 'transparent');
  labelEl.style.borderColor = 'var(--accent, #FFD700)';
  const radio = labelEl.querySelector('input');
  if (radio) radio.checked = true;
}

async function resetCopaToDefault(key){
  if (!confirm('¿Restaurar esta copa a sus valores originales?')) return;
  const all = await dbGetAll('palmares-comps');
  const rec = all.find(c => c.key === key);
  if (rec) await dbDelete('palmares-comps', rec.id);
  await loadPalmaresComps();
  if (typeof showToast === 'function') showToast('Copa restaurada a valores originales');
  closePalmaresModals();
  renderAdmPalmares();
  renderPubPalmares();
}

async function saveEditCopa(key){
  const label = document.getElementById('edit-copa-label').value.trim();
  const short = document.getElementById('edit-copa-short').value.trim();
  const color = document.getElementById('edit-copa-color').value;
  const trophy = document.querySelector('input[name="trophy-style-edit"]:checked')?.value;

  if (!label || label.length < 3) { if (typeof showToast === 'function') showToast('Nombre debe tener al menos 3 caracteres'); return; }
  if (!short || short.length < 2) { if (typeof showToast === 'function') showToast('Abreviatura debe tener al menos 2 caracteres'); return; }
  if (!trophy) { if (typeof showToast === 'function') showToast('Selecciona un estilo de trofeo'); return; }

  const success = await editCopa(key, label, short, trophy, color);
  if (!success) { if (typeof showToast === 'function') showToast('Error al guardar la copa'); return; }
  if (typeof showToast === 'function') showToast('Copa actualizada');
  closePalmaresModals();
  renderAdmPalmares();
  renderPubPalmares();
}

/* ---------------- Utils ---------------- */
function _esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function _escAttr(s){ return _esc(s).replace(/`/g,'&#96;'); }

/* Wrap único para todos los modales del palmarés. Garantiza que admin y
   público compartan el mismo contenedor (evita el bug de IDs duplicados
   cuando ambas vistas renderizan su propio wrap interno). */
function _palmModalWrap(){
  const all = [...document.querySelectorAll('#palmares-modal-wrap')];
  // Si quedaron wraps duplicados (legacy), nos quedamos solo con el último
  // del body y limpiamos los demás.
  if (all.length > 1) {
    let keep = all.find(el => el.parentElement === document.body);
    if (!keep) keep = all[all.length - 1];
    all.forEach(el => { if (el !== keep) el.remove(); });
    if (keep.parentElement !== document.body) document.body.appendChild(keep);
    return keep;
  }
  if (all.length === 1) {
    if (all[0].parentElement !== document.body) document.body.appendChild(all[0]);
    return all[0];
  }
  const w = document.createElement('div');
  w.id = 'palmares-modal-wrap';
  document.body.appendChild(w);
  return w;
}
