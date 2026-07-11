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
// Las 11 copas viven en assets/trophies/, versionada en git (fuente canónica
// desde el commit 530bcf2 — el prototipo viejo "palmares 3d/" que las traía
// se eliminó) — Object.keys evita que una copa nueva quede desincronizada
// entre TROPHY_GLB_MAP y este set.
const LOCAL_TROPHY_GLB_STYLES = new Set(Object.keys(TROPHY_GLB_MAP));
const _TROPHY_GLB_URL_CACHE = new Map();
async function getTrophyGlbUrl(styleId){
  const file = TROPHY_GLB_MAP[styleId];
  if (!file) return null;
  if (_TROPHY_GLB_URL_CACHE.has(styleId)) return _TROPHY_GLB_URL_CACHE.get(styleId);
  const url = LOCAL_TROPHY_GLB_STYLES.has(styleId)
    ? `assets/trophies/${file}`
    : `${_TROPHY_STORAGE_BASE}${file}?alt=media`;
  _TROPHY_GLB_URL_CACHE.set(styleId, url);
  return url;
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

let _palmThemeController = null;
function _palmTheme(){
  if(_palmThemeController) return _palmThemeController;
  let audio = null;
  let source = null;
  let dry = null;
  let wet = null;
  let lowpass = null;
  let convolver = null;
  let ready = false;
  let loading = null;
  let visible = false;
  let inSala = false;
  let userActivated = false;
  let pauseTimer = null;
  let disposed = false;
  let loadFailed = false;

  const enabled = ()=>!(window.SFX && window.SFX.enabled === false);
  const volume = ()=>window.SFX && typeof window.SFX.getVolume==='function'
    ? window.SFX.getVolume()
    : (typeof window.SFX?.volume==='number' ? window.SFX.volume : .85);
  const onPageHide = ()=>_palmThemeController?.dispose();
  window.addEventListener('pagehide', onPageHide, { once:true });
  const impulse = ctx=>{
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for(let channel=0; channel<2; channel++){
      const data = ir.getChannelData(channel);
      for(let i=0; i<len; i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.8);
    }
    return ir;
  };
  const ramp = (gain, value, seconds)=>{
    if(!gain || !_palmAudioCtx) return;
    const now = _palmAudioCtx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  };
  const pauseAfterFade = ()=>{
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(()=>{
      if(audio && (!visible || !enabled())) audio.pause();
    }, 850);
  };
  async function init(){
    if(ready || loadFailed || disposed) return ready;
    if(loading) return loading;
    loading = (async()=>{
      try {
        const ctx = _palmAudio();
        if(!ctx) return false;
        audio = new Audio();
        audio.preload = 'none';
        audio.loop = true;
        audio.crossOrigin = 'anonymous';
        audio.src = 'assets/sounds/palmares_theme.mp3';
        source = ctx.createMediaElementSource(audio);
        dry = ctx.createGain();
        wet = ctx.createGain();
        lowpass = ctx.createBiquadFilter();
        convolver = ctx.createConvolver();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 900;
        convolver.buffer = impulse(ctx);
        dry.gain.value = 0;
        wet.gain.value = 0;
        source.connect(dry);
        source.connect(lowpass);
        lowpass.connect(convolver);
        convolver.connect(wet);
        dry.connect(ctx.destination);
        wet.connect(ctx.destination);
        ready = true;
        return true;
      } catch(error) {
        loadFailed = true;
        return false;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }
  async function playIfNeeded(){
    if(!ready || !visible || !enabled() || !audio) return;
    try {
      if(_palmAudioCtx?.state==='suspended') await _palmAudioCtx.resume();
      await audio.play();
    } catch(error) {
      // Autoplay puede seguir bloqueado hasta el siguiente gesto. El próximo
      // pointerdown/keydown vuelve a intentar sin afectar los SFX existentes.
    }
  }
  function apply(fast=false){
    if(!ready) return;
    clearTimeout(pauseTimer);
    const v = Math.max(0, Math.min(1, volume()));
    const time = fast || matchMedia('(prefers-reduced-motion: reduce)').matches ? .05 : (inSala ? 1.2 : .7);
    if(!visible || !enabled()){
      ramp(dry, 0, time);
      ramp(wet, 0, time);
      pauseAfterFade();
      return;
    }
    playIfNeeded();
    if(inSala){
      ramp(dry, .55 * v, time);
      ramp(wet, .05 * v, time);
    } else {
      ramp(dry, 0, time);
      ramp(wet, .12 * v, time);
    }
  }
  _palmThemeController = {
    async start(fromGesture=false){
      if(fromGesture) userActivated = true;
      if(disposed || !userActivated || !visible || !enabled()) return;
      if(await init()) {
        await playIfNeeded();
        apply();
      }
    },
    enterSala(){
      userActivated = true;
      visible = true;
      inSala = true;
      this.start(false);
      apply();
    },
    leaveSala(){
      inSala = false;
      apply();
    },
    setVisible(value){
      visible = !!value;
      if(visible) this.start(false);
      else this.stop();
    },
    stop(){
      visible = false;
      apply();
    },
    // Pausa INMEDIATA por background — a diferencia de stop()/apply(), que
    // hacen fade-out (hasta 1.2s) + pauseAfterFade() (850ms más), esto pausa
    // el <audio> ya mismo. También suspende _palmAudioCtx (compartido con los
    // efectos de zoom playPalmZoom/playPalmZoomOut) por si justo hay uno en
    // vuelo al minimizar. No llama dispose(): el controller (nodos Web Audio)
    // sigue vivo para retomar sin reconstruir todo al volver — playIfNeeded()
    // ya sabe resumir el ctx cuando haga falta.
    pauseForBackground(){
      visible = false;
      clearTimeout(pauseTimer);
      if (audio) audio.pause();
      if (_palmAudioCtx?.state === 'running') _palmAudioCtx.suspend().catch(()=>{});
    },
    onGlobalSoundChange(){
      userActivated = true;
      if(enabled() && visible) this.start(false);
      apply();
      _palmSyncSalaSoundButton();
    },
    onVolumeChange(){ apply(true); },
    dispose(){
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      clearTimeout(pauseTimer);
      if(audio){
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      [source,dry,wet,lowpass,convolver].forEach(node=>{ try{ node?.disconnect(); }catch(_){} });
      audio = null;
      source = null;
      dry = null;
      wet = null;
      lowpass = null;
      convolver = null;
      ready = false;
      loading = null;
      _palmThemeController = null;
      window.PALM_THEME = null;
    },
    get ready(){ return ready; },
    get inSala(){ return inSala; }
  };
  window.PALM_THEME = _palmThemeController;
  return _palmThemeController;
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
              ${effTeam ? `<span class="palm-vig-dot" style="background:${_escAttr(_palmIsHex(effTeam.color)?effTeam.color:'#888888')}"></span>${_esc(effTeam.name)}${effExtras?` · ${_esc(effExtras)}`:''}` : '<span style="color:var(--txt3);">sin campeón</span>'}
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
                    <div class="team-logo" style="background:${_escAttr(_palmIsHex(team.color)?team.color:'#333333')};">
                      ${team.logo ? `<img src="${_escAttr(team.logo)}" alt="">` : `<span>${_esc(team.ini || team.name.substring(0,3))}</span>`}
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
      <span style="width:26px;height:26px;border-radius:6px;background:${_escAttr(_palmIsHex(t?.color)?t.color:'#333333')};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;flex:none;">${_esc((t?.ini || t?.name || '?').slice(0,3))}</span>
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
            : recs.map(r => {
                const galleryCount = _palmGallerySafeItems(r.gallery).length;
                const missing = [!r.season ? 'temporada' : '', !r.juego ? 'juego' : ''].filter(Boolean);
                return `
                <div class="palm-rec-row" data-id="${_escAttr(String(r.id))}">
                  ${renderTrophy(comp.key, 22)}
                  <span class="palm-rec-meta">
                    <span>${r.season ? `<b>${_esc(r.season)}</b>` : '<span class="palm-rec-missing">Sin temporada</span>'}${r.juego ? ` · <span>${_esc(r.juego)}</span>` : ''}${r.year ? ` · <small>${_esc(r.year)}</small>` : ''}</span>
                    ${missing.length ? `<small class="palm-rec-warning">Registro incompleto: falta ${_esc(missing.join(' y '))}</small>` : ''}
                  </span>
                  <span class="palm-rec-actions">
                    <button type="button" class="btn btn-xs" onclick="openPalmaresEditRecord(${_escAttr(JSON.stringify(r.id))})">Editar</button>
                    <button type="button" class="btn btn-xs" onclick="openPalmaresGallery(${_escAttr(JSON.stringify(r.id))})">Imágenes (${galleryCount})</button>
                    <button type="button" class="btn btn-xs btn-danger" onclick="deletePalmaresRecord(${_escAttr(JSON.stringify(r.id))}, ${Number(teamId)}, '${_escAttr(compKey)}')">Quitar</button>
                  </span>
                </div>`;
              }).join('')}
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
          <select id="palm-edit-team">${teams.map(t => `<option value="${_escAttr(String(t.id))}" ${String(t.id)===String(rec.teamId)?'selected':''}>${_esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label>Temporada</label><input type="text" id="palm-edit-season" placeholder="T1" value="${_escAttr(rec.season||'')}"></div>
          <div><label>Juego</label><input type="text" id="palm-edit-juego" placeholder="PES 4" value="${_escAttr(rec.juego||'')}"></div>
        </div>
        <div class="form-group">
          <label>Año <span style="opacity:.5;font-weight:400;">(opcional)</span></label>
          <input type="number" id="palm-edit-year" placeholder="2024" min="1900" max="2100" value="${_escAttr(String(rec.year||''))}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePalmaresModals()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePalmaresEditRecord(${_escAttr(JSON.stringify(rec.id))})">Guardar cambios</button>
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

const _PALM_GALLERY = {
  recordId: null,
  items: [],
  uploads: [],
  activeUploads: 0,
  saving: false,
  dragIndex: null,
  session: 0
};

function _palmGallerySafeItems(value, max = _PALM_GALLERY_MAX){
  return (Array.isArray(value) ? value : [])
    .map(item => ({
      url: String(item?.url || '').trim(),
      alt: String(item?.alt || '').trim().slice(0, 240)
    }))
    .filter(item => /^https:\/\//i.test(item.url))
    .slice(0, max);
}

function _palmGalleryStatusLabel(status){
  return ({
    waiting:'Esperando',
    uploading:'Subiendo',
    completed:'Completado',
    error:'Error'
  })[status] || 'Esperando';
}

function _palmGalleryHTML(){
  const state = _PALM_GALLERY;
  const count = state.items.length;
  const busy = state.activeUploads > 0 || state.saving;
  const itemRows = state.items.length
    ? state.items.map((item, index) => `
      <div class="palm-gallery-item" draggable="${state.saving?'false':'true'}" data-gallery-index="${index}"
        ondragstart="palmGalleryDragStart(${index})" ondragend="palmGalleryDragEnd()" ondragover="palmGalleryDragOver(event)" ondrop="palmGalleryDrop(event,${index})">
        <img class="palm-gallery-thumb" src="${_escAttr(item.url)}" alt="${_escAttr(item.alt)}">
        <div class="palm-gallery-item-main">
          <label for="palm-gallery-alt-${index}">Texto alternativo</label>
          <input id="palm-gallery-alt-${index}" type="text" maxlength="240" value="${_escAttr(item.alt)}"
            oninput="palmGallerySyncAlt(${index},this.value)" ${state.saving?'disabled':''}>
        </div>
        <div class="palm-gallery-order">
          <button type="button" class="palm-gallery-icon-btn" aria-label="Mover a la izquierda" title="Mover a la izquierda"
            onclick="palmGalleryMove(${index},-1)" ${index===0||state.saving?'disabled':''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button type="button" class="palm-gallery-icon-btn" aria-label="Mover a la derecha" title="Mover a la derecha"
            onclick="palmGalleryMove(${index},1)" ${index===count-1||state.saving?'disabled':''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button type="button" class="palm-gallery-icon-btn palm-gallery-remove" aria-label="Quitar imagen" title="Quitar imagen"
            onclick="palmGalleryRemove(${index})" ${state.saving?'disabled':''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>
          </button>
        </div>
      </div>`).join('')
    : '<div class="palm-gallery-empty">Este título todavía no tiene imágenes.</div>';
  const uploadRows = state.uploads.map(upload => `
    <div class="palm-upload-row is-${_escAttr(upload.status)}">
      <span class="palm-upload-name">${_esc(upload.name)}</span>
      <span class="palm-upload-status">${_esc(_palmGalleryStatusLabel(upload.status))}${upload.error?`: ${_esc(upload.error)}`:''}</span>
      ${upload.status==='error' && upload.file
        ? `<button type="button" class="btn btn-xs" onclick="palmGalleryRetry('${_escAttr(upload.id)}')" ${busy||count>=_PALM_GALLERY_MAX?'disabled':''}>Reintentar</button>`
        : ''}
    </div>`).join('');
  return `
    <div class="palm-gallery-toolbar">
      <div>
        <strong>${count} de ${_PALM_GALLERY_MAX} imágenes</strong>
        <span>El orden define la secuencia; la sala muestra hasta ${_PALM_COLLAGE_MAX} a la vez.</span>
      </div>
      <label class="btn btn-sm${count>=_PALM_GALLERY_MAX||state.saving?' is-disabled':''}" for="palm-gallery-files">
        Subir imágenes
      </label>
      <input id="palm-gallery-files" type="file" accept="image/*" multiple hidden
        onchange="palmGalleryChoose(this.files);this.value=''" ${count>=_PALM_GALLERY_MAX||state.saving?'disabled':''}>
    </div>
    <div class="palm-gallery-list">${itemRows}</div>
    ${uploadRows ? `<div class="palm-upload-list" aria-live="polite">${uploadRows}</div>` : ''}
    <div class="palm-gallery-note">Quitar una imagen solo elimina su URL del título. El archivo remoto no se borra.</div>
    <div class="modal-footer palm-gallery-footer">
      <button type="button" class="btn" onclick="closePalmaresModals()" ${state.saving?'disabled':''}>Cerrar</button>
      <button type="button" class="btn btn-primary" onclick="savePalmaresGallery()" ${busy?'disabled':''}>${state.saving?'Guardando...':'Guardar imágenes'}</button>
    </div>`;
}

function _palmGalleryRender(){
  const body = document.getElementById('palm-gallery-body');
  if(body) body.innerHTML = _palmGalleryHTML();
}

async function openPalmaresGallery(recId){
  const rec = await dbGet('palmares', recId);
  if(!rec) return;
  const team = await dbGet('teams', rec.teamId).catch(()=>null);
  _PALM_GALLERY.recordId = rec.id;
  _PALM_GALLERY.items = _palmGallerySafeItems(rec.gallery);
  _PALM_GALLERY.uploads = [];
  _PALM_GALLERY.activeUploads = 0;
  _PALM_GALLERY.saving = false;
  _PALM_GALLERY.dragIndex = null;
  _PALM_GALLERY.session++;
  const wrap = _palmModalWrap();
  wrap.innerHTML = `
    <div class="modal-overlay open" id="palmares-gallery-modal">
      <div class="modal palm-gallery-modal" role="dialog" aria-modal="true" aria-labelledby="palm-gallery-title">
        <div class="modal-hdr">
          <div class="modal-title" id="palm-gallery-title">Imágenes · ${_esc(team?.name || 'Título')}</div>
          <button type="button" class="modal-close" aria-label="Cerrar administrador de imágenes" onclick="closePalmaresModals()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body" id="palm-gallery-body">${_palmGalleryHTML()}</div>
      </div>
    </div>`;
}

function palmGallerySyncAlt(index, value){
  const item = _PALM_GALLERY.items[index];
  if(item) item.alt = String(value || '').slice(0, 240);
}

function palmGalleryMove(index, dir){
  if(_PALM_GALLERY.saving) return;
  const next = index + dir;
  if(index < 0 || next < 0 || next >= _PALM_GALLERY.items.length) return;
  [_PALM_GALLERY.items[index], _PALM_GALLERY.items[next]] = [_PALM_GALLERY.items[next], _PALM_GALLERY.items[index]];
  _palmGalleryRender();
}

function palmGalleryRemove(index){
  if(_PALM_GALLERY.saving) return;
  _PALM_GALLERY.items.splice(index, 1);
  _palmGalleryRender();
}

function palmGalleryDragStart(index){
  if(_PALM_GALLERY.saving) return;
  _PALM_GALLERY.dragIndex = index;
}

function palmGalleryDragEnd(){
  _PALM_GALLERY.dragIndex = null;
}

function palmGalleryDragOver(event){
  if(_PALM_GALLERY.saving) return;
  event.preventDefault();
}

function palmGalleryDrop(event, index){
  event.preventDefault();
  const from = _PALM_GALLERY.dragIndex;
  _PALM_GALLERY.dragIndex = null;
  if(_PALM_GALLERY.saving || from==null || from===index || !_PALM_GALLERY.items[from]) return;
  const [item] = _PALM_GALLERY.items.splice(from, 1);
  _PALM_GALLERY.items.splice(index, 0, item);
  _palmGalleryRender();
}

async function _palmGalleryUpload(upload, session){
  if(!upload?.file || session !== _PALM_GALLERY.session) return;
  upload.status = 'uploading';
  upload.error = '';
  _PALM_GALLERY.activeUploads++;
  _palmGalleryRender();
  try {
    if(typeof uploadImageToCloud !== 'function') throw new Error('Servicio de imágenes no disponible');
    const url = await uploadImageToCloud(upload.file);
    if(session !== _PALM_GALLERY.session) return;
    if(!/^https:\/\//i.test(String(url||''))) throw new Error('La subida no devolvió una URL segura');
    if(_PALM_GALLERY.items.length >= _PALM_GALLERY_MAX) throw new Error('Se alcanzó el máximo de doce imágenes');
    _PALM_GALLERY.items.push({ url:String(url), alt:'' });
    upload.status = 'completed';
    upload.file = null;
  } catch(error) {
    if(session !== _PALM_GALLERY.session) return;
    upload.status = 'error';
    upload.error = 'No se pudo subir';
    console.error('[Palmarés] Error subiendo imagen:', error);
  } finally {
    if(session === _PALM_GALLERY.session){
      _PALM_GALLERY.activeUploads = Math.max(0, _PALM_GALLERY.activeUploads - 1);
      _palmGalleryRender();
    }
  }
}

function palmGalleryChoose(fileList){
  if(_PALM_GALLERY.saving) return;
  const files = [...(fileList || [])];
  if(!files.length) return;
  const session = _PALM_GALLERY.session;
  const queued = [];
  let available = Math.max(0, _PALM_GALLERY_MAX - _PALM_GALLERY.items.length - _PALM_GALLERY.activeUploads);
  files.forEach(file => {
    const upload = {
      id:`upl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name:String(file.name || 'Imagen'),
      file,
      status:'waiting',
      error:''
    };
    if(!String(file.type || '').startsWith('image/')){
      upload.status = 'error';
      upload.error = 'El archivo no es una imagen';
    } else if(available <= 0){
      upload.status = 'error';
      upload.error = 'Máximo de doce imágenes';
    } else {
      available--;
    }
    _PALM_GALLERY.uploads.push(upload);
    if(upload.status==='waiting') queued.push(upload);
  });
  _palmGalleryRender();
  queueMicrotask(()=>queued.forEach(upload => _palmGalleryUpload(upload, session)));
}

function palmGalleryRetry(uploadId){
  if(_PALM_GALLERY.saving || _PALM_GALLERY.activeUploads || _PALM_GALLERY.items.length >= _PALM_GALLERY_MAX) return;
  const upload = _PALM_GALLERY.uploads.find(item => item.id === uploadId);
  if(upload?.file) _palmGalleryUpload(upload, _PALM_GALLERY.session);
}

async function savePalmaresGallery(){
  if(_PALM_GALLERY.saving || _PALM_GALLERY.activeUploads) return;
  const rec = await dbGet('palmares', _PALM_GALLERY.recordId);
  if(!rec) return;
  _PALM_GALLERY.saving = true;
  _palmGalleryRender();
  try {
    const gallery = _palmGallerySafeItems(_PALM_GALLERY.items);
    await dbPut('palmares', { ...rec, gallery, updatedAt:new Date().toISOString() });
    if(typeof showToast==='function') showToast('Galería actualizada');
    closePalmaresModals(true);
    await renderAdmPalmares();
    if(document.getElementById('pub-palmares-content')) await renderPubPalmares();
  } catch(error) {
    _PALM_GALLERY.saving = false;
    _palmGalleryRender();
    console.error('[Palmarés] Error guardando galería:', error);
    if(typeof showToast==='function') showToast('No se pudo guardar la galería', 'error');
  }
}

function closePalmaresModals(force=false){
  if(!force && _PALM_GALLERY.saving) return false;
  if(!force && _PALM_GALLERY.activeUploads > 0){
    if(!confirm('Hay imágenes subiendo. ¿Cerrar y descartar las subidas pendientes?')) return false;
  }
  _PALM_GALLERY.session++;
  _PALM_GALLERY.activeUploads = 0;
  _PALM_GALLERY.saving = false;
  const wrap = _palmModalWrap();
  if (wrap) wrap.innerHTML = '';
  return true;
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

/* ============================================================
   PÚBLICO V2 — Vitrina + Sala fullscreen
   ============================================================ */
const _PALM_PUB = {
  renderToken: 0,
  compData: [],
  teamById: {},
  compIdx: 0,
  salaCompIdx: 0,
  salaChampIdx: 0,
  media: new Map(),
  visible: true,
  focusReturn: null,
  closeTimer: null,
  visibilityBound: false,
  keyHandler: null,
  trapHandler: null,
  clickHandler: null,
  touchStartHandler: null,
  touchEndHandler: null,
  resizeHandler: null,
  touchStart: null,
  salaUsesSvg: null,
  collageTimers: [],
  collageAnimations: new Set(),
  collageSeq: 0,
  edgeFadeCleanup: null,
  edgeFadeUpdate: null,
  vitrineObserver: null,
  vitrineAbort: null,
  cupCtrl: null,
  smokeCtrl: null,
  threePromise: null,
  // Gate de carga real de la sala fullscreen (ver _palmPrepareSala/_palmOpenSala):
  // se incrementa en cada open/close/cambio de comp para poder cancelar un
  // preload en curso que ya no corresponde mostrar.
  salaLoadToken: 0,
  roomImagesReady: false,
  roomImagesPromise: null,
  // Cancela una transición de swap (comp/campeón) en curso si el usuario
  // dispara otra antes de que termine — ver _palmSwapSala().
  salaSwapToken: 0
};

const _PALM_SALA_IMG = {
  w: 1536,
  h: 1024,
  shiftXr: 0,
  focoH: 0.86,
  focoL: { img: 'foco_izquierdo.png', cw: 531, ch: 912, lcx: 0.437, lcy: 0.081, Lx: 0.145, Ly: 0.168 },
  focoR: { img: 'foco_derecho.png',  cw: 354, ch: 912, lcx: 0.352, lcy: 0.102, Lx: 0.807, Ly: 0.168 },
  ped: { cx: 744, contact: 568, w: 401, panel: { cx: 744, cy: 715, w: 330 } }
};

const _PALM_CUP_VIEW = { fov: 30, dist: 5, baseY: -0.525 };
const _PALM_COLLAGE_SLOTS = [
  { x: -3, y: 6,  r: -7, dx: -92, dy: -8,  spin: -7, dur: 7600,  peak: .80 },
  { x: 20, y: -4, r: 3,  dx: -54, dy: 10,  spin: 5,  dur: 9300,  peak: .74 },
  { x: 50, y: 2,  r: -3, dx: -74, dy: -6,  spin: -4, dur: 8200,  peak: .78 },
  { x: 66, y: 14, r: 5,  dx: -48, dy: 14,  spin: 6,  dur: 10100, peak: .72 },
  { x: 6,  y: 26, r: 4,  dx: -66, dy: -10, spin: 4,  dur: 8700,  peak: .70 },
  { x: 36, y: 22, r: -5, dx: -40, dy: 8,   spin: -6, dur: 9700,  peak: .70 }
];
const _PALM_GALLERY_MAX = 12;  // máximo persistido en record.gallery (admin)
const _PALM_COLLAGE_MAX = 7;   // máximo simultáneo en pantalla (rotación pública en la sala)

function _palmIsHex(v){
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

/* ---- --metal-ink: variante de TEXTO garantizada ≥4.5:1, para cualquier
   color (los 5 de PALMARES_COMPS_DEFAULT o uno custom cargado por un admin).
   --metal en sí NUNCA se toca (trofeo 3D, bordes, fills siguen con el color
   crudo). Esto es appearance, no dato: mostramos el mismo color de marca,
   solo oscurecido lo mínimo necesario cuando se usa como texto. ---- */
function _palmHexToRgbObj(hex){
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
}
function _palmRelLuminance({ r, g, b }){
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/* Emula color-mix(in srgb, metalHex P%, baseHex) — interpolación lineal
   directa sobre los canales sRGB (0-255), igual que hace el navegador con
   `in srgb`. Devuelve la luminancia relativa del resultado. */
function _palmMixLuminance(metalHex, baseHex, metalPercent){
  const m = _palmHexToRgbObj(metalHex), b = _palmHexToRgbObj(baseHex);
  const p = metalPercent / 100;
  return _palmRelLuminance({
    r: m.r * p + b.r * (1 - p),
    g: m.g * p + b.g * (1 - p),
    b: m.b * p + b.b * (1 - p),
  });
}
/* --card2/--card3 en modo claro (variables.css). --metal-ink se pinta sobre
   3 fondos reales, todos ellos color-mix(--metal, superficie) — NO sobre la
   superficie pura: `.mv-nav-row.on` (16% metal + card3), `.mv-cta` normal
   (12% metal + card2) y `.mv-cta:hover/:focus` (22% metal + card2). Como el
   propio --metal tiñe el fondo, calibrar solo contra la superficie pura no
   alcanza (medido: oro caía a 4.22:1, bronce a 4.04:1, un rojo custom a
   3.39:1) — hay que recalcular la mezcla real para CADA color de --metal. */
const _PALM_CARD2_LIGHT = '#F0EEE8';
const _PALM_CARD3_LIGHT = '#E6E4DC';
function _palmWorstBgLumFor(metalHex){
  return Math.min(
    _palmMixLuminance(metalHex, _PALM_CARD3_LIGHT, 16), // .mv-nav-row.on
    _palmMixLuminance(metalHex, _PALM_CARD2_LIGHT, 12), // .mv-cta
    _palmMixLuminance(metalHex, _PALM_CARD2_LIGHT, 22), // .mv-cta:hover/:focus-visible
  );
}
/* Umbral real de búsqueda: más estricto que 4.5 a propósito. El binary search
   trabaja en RGB continuo pero el resultado se cuantiza a 8 bits por canal al
   volver a hex — sin este margen, un color que cierra justo en 4.50 puede
   terminar en 4.49 tras el floor/redondeo. */
const _PALM_INK_TARGET_RATIO = 4.6;
function _palmContrastSafeInk(hex, bgLum){
  const rgb = _palmHexToRgbObj(hex);
  if (!rgb) return hex;
  const maxL1 = (bgLum + 0.05) / _PALM_INK_TARGET_RATIO - 0.05;
  if (_palmRelLuminance(rgb) <= maxL1) return hex; // ya cumple: se muestra sin tocar
  // Oscurece por escalado uniforme de RGB (conserva el tono) hasta cumplir el umbral.
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const scaled = { r: rgb.r * mid, g: rgb.g * mid, b: rgb.b * mid };
    if (_palmRelLuminance(scaled) <= maxL1) lo = mid; else hi = mid;
  }
  // floor (no round): al cuantizar a 8 bits solo puede oscurecer más, nunca
  // aclarar de vuelta por encima del umbral ya verificado.
  const toHex = v => Math.floor(v).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r * lo)}${toHex(rgb.g * lo)}${toHex(rgb.b * lo)}`;
}
function _palmMetalInk(color){
  const hex = _palmIsHex(color) ? color : '#DAA520';
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return isLight ? _palmContrastSafeInk(hex, _palmWorstBgLumFor(hex)) : hex;
}
/* Recalcula --metal-ink en los nodos ya montados cuando cambia el tema —
   evita depender de que el usuario vuelva a navegar a Palmarés para que
   el color de texto se re-evalúe contra la superficie correcta. */
document.addEventListener('tsc:theme-changed', () => {
  document.querySelectorAll('#mv, .mv-nav-row, .mv-stage').forEach(el => {
    const current = el.style.getPropertyValue('--metal').trim();
    if (current) el.style.setProperty('--metal-ink', _palmMetalInk(current));
  });
});

function _palmTeamColors(team, comp){
  const c1 = _palmIsHex(team?.color) ? team.color : (_palmIsHex(comp?.color) ? comp.color : '#DAA520');
  const c2 = _palmIsHex(team?.color2) ? team.color2 : c1;
  return { c1, c2 };
}

function _palmTeamIni(team){
  const raw = String(team?.ini || '').trim();
  if (raw) return raw.slice(0, 3);
  return String(team?.name || '?').trim().slice(0, 3).toUpperCase() || '?';
}

function _palmLineArt(svg, strokeWidth){
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (root.querySelector('parsererror')) return svg;
    root.querySelectorAll('defs').forEach(node => node.remove());
    root.removeAttribute('width');
    root.removeAttribute('height');
    root.removeAttribute('class');
    root.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line').forEach(node => {
      const fill = (node.getAttribute('fill') || '').trim();
      if (/^rgba\(255/i.test(fill) && !node.getAttribute('stroke')) {
        node.remove();
        return;
      }
      node.setAttribute('fill', 'none');
      node.setAttribute('stroke', 'currentColor');
      node.setAttribute('stroke-width', String(strokeWidth));
      node.setAttribute('stroke-linecap', 'round');
      node.setAttribute('stroke-linejoin', 'round');
    });
    return new XMLSerializer().serializeToString(root);
  } catch (_) {
    return svg;
  }
}

function _palmMediaKey(recordId){
  return String(recordId || '');
}

function setSalaCollage({ recordId, items, colors }){
  const key = _palmMediaKey(recordId);
  if (!key) return;
  _PALM_PUB.media.set(key, {
    items: Array.isArray(items) ? items.filter(Boolean) : [],
    colors: colors || null
  });
  const current = _palmCurrentSalaRecord();
  if (current && String(current.id) === key) _palmRenderSalaCollage();
}

function setPalmaresMedia(payload){
  setSalaCollage(payload || {});
}

function getPalmaresMedia(recordId){
  const key = _palmMediaKey(recordId);
  const override = _PALM_PUB.media.get(key);
  const record = _PALM_PUB.compData
    .flatMap(entry => entry.records || [])
    .find(entry => _palmMediaKey(entry.id) === key);
  const overrideItems = Array.isArray(override?.items)
    ? override.items.map(item => ({
        url:typeof item === 'string' ? item : String(item?.url || item?.src || ''),
        alt:typeof item === 'object' ? String(item?.alt || '') : ''
      })).filter(item => /^https:\/\//i.test(item.url)).slice(0, _PALM_GALLERY_MAX)
    : [];
  const persistedItems = _palmGallerySafeItems(record?.gallery);
  return {
    items: overrideItems.length ? overrideItems : persistedItems,
    colors: override?.colors ? { ...override.colors } : null
  };
}

function _palmBuildPublicCompData(recs, teamById, overrides){
  return PALMARES_COMPS.map(comp => {
    const sortedRecords = recs
      .filter(r => r.competition === comp.key)
      .sort(_palmCompareChrono);
    const champion = reigningChampion(recs, comp.key, overrides || {}) || sortedRecords[0] || null;
    const records = champion
      ? [champion, ...sortedRecords.filter(record => record.id !== champion.id)]
      : sortedRecords;
    const champTeam = champion ? teamById[champion.teamId] : null;
    const champions = new Set(records.map(r => r.teamId)).size;
    return {
      comp,
      records,
      champion,
      champTeam,
      editions: records.length,
      champions,
      colors: _palmTeamColors(champTeam, comp)
    };
  });
}

function _palmVitrineShellHTML(){
  const totalTitles = _PALM_PUB.compData.reduce((sum, entry) => sum + entry.editions, 0);
  const totalChampions = new Set(
    _PALM_PUB.compData.flatMap(entry => entry.records.map(rec => rec.teamId))
  ).size;
  const particles = Array.from({ length: 24 }, () => '<i></i>').join('');
  const headIcon = _palmLineArt(renderTrophyByStyle('classica', 40), 2);
  const rawMetal = _PALM_PUB.compData[_PALM_PUB.compIdx]?.comp?.color;
  const metal = _palmIsHex(rawMetal) ? rawMetal : '#DAA520';
  return `
    <section class="mv" id="mv" style="--metal:${_escAttr(metal)};--metal-ink:${_escAttr(_palmMetalInk(rawMetal))}">
      <div class="mv-head">
        <div class="mv-head-id">
          <span class="mv-head-ico" aria-hidden="true">${headIcon}</span>
          <div>
            <div class="mv-kicker">Modo vitrina</div>
            <div class="mv-headsub">Trofeos, campeones y momentos históricos en una experiencia fullscreen</div>
          </div>
        </div>
        <div class="mv-stats" aria-label="Resumen del palmarés">
          <span><b>${PALMARES_COMPS.length}</b> competiciones</span>
          <i aria-hidden="true"></i>
          <span><b>${totalTitles}</b> títulos</span>
          <i aria-hidden="true"></i>
          <span><b>${totalChampions}</b> campeones</span>
        </div>
      </div>
      <div class="mv-body">
        <nav class="mv-nav" id="mv-nav" aria-label="Competiciones del palmarés"></nav>
        <div class="mv-hero" id="mv-hero"></div>
        <aside class="mv-data" id="mv-data"></aside>
      </div>
    </section>
    <div id="sala" role="dialog" aria-modal="true" aria-labelledby="sala-comp" aria-hidden="true" aria-describedby="sala-hint" hidden>
      <div class="sala-loader" id="sala-loader" aria-hidden="true">
        <img src="assets/tsc_sin_fondo.png" alt="">
        <div class="sala-loader-text" id="sala-loader-text" aria-live="polite">Cargando sala de trofeos…</div>
        <div class="sala-loader-bar"><div class="sala-loader-fill" id="sala-loader-fill"></div></div>
      </div>
      <div class="sala-room"></div>
      <div class="sala-collage" id="sala-collage"></div>
      <div class="sala-wall-vignette" aria-hidden="true"></div>
      <div class="sala-foreground" aria-hidden="true"></div>
      <div class="sala-beam left" aria-hidden="true"></div>
      <div class="sala-beam right" aria-hidden="true"></div>
      <div class="sala-beam-glow" aria-hidden="true"></div>
      <canvas class="sala-smoke-canvas" aria-hidden="true"></canvas>
      <div class="sala-focos" aria-hidden="true"></div>
      <div class="sala-particles" aria-hidden="true">${particles}</div>
      <div class="sala-cup" id="sala-cup"></div>
      <div class="sala-plate" id="sala-plate">
        <img src="assets/placa_dorada.png" alt="">
        <div class="palm-plate-txt" id="sala-plate-txt"></div>
      </div>
      <div class="sala-cap">
        <div class="sc-kick">Sala de trofeos · TSC</div>
      </div>
      <div class="sala-top">
        <div class="sala-nav">
          <div class="sala-comp" id="sala-comp"></div>
          <div class="sala-dots" id="sala-dots"></div>
        </div>
        <div class="sala-controls">
          <button class="sala-btn" id="sala-sound" type="button" aria-label="Activar o desactivar sonido global"></button>
          <button class="sala-btn" id="sala-close" type="button" aria-label="Cerrar sala">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="sala-note" id="sala-hint">
        <span class="sh-g" aria-label="Flechas izquierda y derecha: cambiar competición">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </span>
        <span class="sh-g" aria-label="Flechas arriba y abajo: cambiar campeón">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </span>
        <span class="sh-esc">Esc cerrar</span>
      </div>
    </div>
  `;
}

function _palmVitrineNavHTML(){
  return _PALM_PUB.compData.map((entry, idx) => {
    const icon = _palmLineArt(renderTrophy(entry.comp.key, 36), 2.2);
    return `
      <button class="mv-nav-row${idx === _PALM_PUB.compIdx ? ' on' : ''}" type="button" data-comp-idx="${idx}" style="--metal:${_escAttr(_palmIsHex(entry.comp.color)?entry.comp.color:'#DAA520')};--metal-ink:${_escAttr(_palmMetalInk(entry.comp.color))}" aria-pressed="${idx === _PALM_PUB.compIdx ? 'true' : 'false'}">
        <span class="mv-nav-ico" aria-hidden="true">${icon}</span>
        <span class="mv-nav-name">${_esc(entry.comp.label)}</span>
        <svg class="mv-nav-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    `;
  }).join('');
}

function _palmVitrineHeroHTML(entry, idx){
  if (!entry) return '';
  const disabled = entry.records.length ? '' : ' disabled aria-disabled="true"';
  const full = renderTrophy(entry.comp.key, 200);
  const line = _palmLineArt(full, 1.5);
  return `
    <button class="mv-stage" type="button" data-open-sala="${idx}" style="--metal:${_escAttr(_palmIsHex(entry.comp.color)?entry.comp.color:'#DAA520')};--metal-ink:${_escAttr(_palmMetalInk(entry.comp.color))}" aria-haspopup="dialog" aria-controls="sala"${disabled}>
      <div class="mv-scene">
        <div class="mv-axis"></div>
        <div class="mv-halo"></div>
        <div class="mv-trophy">
          <div class="mv-layer mv-line">${line}</div>
          <div class="mv-layer mv-full">${full}</div>
        </div>
      </div>
      <div class="mv-cap">
        <div class="mv-comp-name">${_esc(entry.comp.label)}</div>
        <span class="mv-cta">${entry.records.length ? '[ Inspeccionar vitrina ]' : '[ Sin campeón aún ]'}</span>
      </div>
    </button>
  `;
}

function _palmVitrineDataHTML(entry){
  if (!entry) return '';
  const team = entry.champTeam;
  const colors = entry.colors;
  const championHtml = team ? `
    <div class="mv-vig-row">
      <span class="mv-badge" style="background:${_escAttr(colors.c1)}">${_esc(_palmTeamIni(team))}</span>
      <span class="mv-vig-name">${_esc(team.name || '—')}</span>
    </div>
  ` : `<div class="mv-vig-row"><span class="mv-vig-name">Sin campeón registrado</span></div>`;
  return `
    <div class="mv-vig">
      <div class="mv-lbl">Campeón vigente</div>
      ${championHtml}
    </div>
    <div class="mv-counts">
      <div class="mv-count"><div class="mv-lbl">Ediciones</div><div class="mv-num">${entry.editions}</div></div>
      <div class="mv-count"><div class="mv-lbl">Campeones</div><div class="mv-num">${entry.champions}</div></div>
    </div>
  `;
}

function _palmRenderVitrine(){
  const nav = document.getElementById('mv-nav');
  const hero = document.getElementById('mv-hero');
  const data = document.getElementById('mv-data');
  const entry = _PALM_PUB.compData[_PALM_PUB.compIdx] || null;
  const mv = document.getElementById('mv');
  if (mv) {
    mv.style.setProperty('--metal', _palmIsHex(entry?.comp?.color) ? entry.comp.color : '#DAA520');
    mv.style.setProperty('--metal-ink', _palmMetalInk(entry?.comp?.color));
  }
  if (nav) nav.innerHTML = _palmVitrineNavHTML();
  if (hero) hero.innerHTML = _palmVitrineHeroHTML(entry, _PALM_PUB.compIdx);
  if (data) data.innerHTML = _palmVitrineDataHTML(entry);
  _palmBindVitrineInteractive();
  _PALM_PUB.edgeFadeUpdate?.();
  _palmSetVitrinePaused(!_PALM_PUB.visible);
}

function _palmSetVitrinePaused(paused){
  document.querySelectorAll('#mv-hero .mv-scene').forEach(scene => {
    scene.style.animationPlayState = paused ? 'paused' : 'running';
  });
}

function _palmBindVitrineInteractive(){
  document.querySelectorAll('#mv-nav .mv-nav-row').forEach(btn => {
    btn.addEventListener('click', () => {
      _palmTheme().start(true);
      _PALM_PUB.compIdx = Number(btn.dataset.compIdx) || 0;
      _palmRenderVitrine();
    });
  });
  const stage = document.querySelector('#mv-hero .mv-stage');
  const scene = stage?.querySelector('.mv-scene');
  if (stage && scene && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let tracking = false;
    stage.addEventListener('pointerenter', () => {
      tracking = true;
      scene.classList.add('mv-active');
    });
    stage.addEventListener('pointermove', e => {
      if (!tracking) return;
      const r = stage.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      scene.style.transform = `rotateY(${(px * 15).toFixed(2)}deg) rotateX(${(-py * 11).toFixed(2)}deg)`;
    });
    stage.addEventListener('pointerleave', () => {
      tracking = false;
      scene.classList.remove('mv-active');
      scene.style.transform = '';
    });
  }
  stage?.addEventListener('click', () => {
    if (stage.disabled) return;
    _palmTheme().start(true);
    _palmOpenSala(_PALM_PUB.compIdx, 0, stage);
  });
}

function _palmBindEdgeFade(el){
  _PALM_PUB.edgeFadeCleanup?.();
  if (!el) return;
  const update = () => {
    el.classList.toggle('more-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    el.classList.toggle('more-l', el.scrollLeft > 2);
  };
  el.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  _PALM_PUB.edgeFadeUpdate = update;
  _PALM_PUB.edgeFadeCleanup = () => {
    el.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    _PALM_PUB.edgeFadeUpdate = null;
    _PALM_PUB.edgeFadeCleanup = null;
  };
  update();
}

function _palmBindPublicPalmares(root){
  if (!root) return;
  _palmDisposeSala();
  const sala = document.getElementById('sala');
  if (sala) sala.hidden = true;
  _palmBindEdgeFade(root.querySelector('#mv-nav'));
  _PALM_PUB.vitrineAbort?.abort();
  _PALM_PUB.vitrineAbort = new AbortController();
  const gesture = { signal:_PALM_PUB.vitrineAbort.signal };
  root.addEventListener('pointerdown', ()=>_palmTheme().start(true), gesture);
  root.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' ' || e.key==='Spacebar') _palmTheme().start(true);
  }, gesture);
  _PALM_PUB.vitrineObserver?.disconnect();
  if ('IntersectionObserver' in window) {
    _PALM_PUB.vitrineObserver = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      _palmSetVitrinePaused(!_PALM_PUB.visible || !visible);
      _palmTheme().setVisible(_PALM_PUB.visible && visible);
    }, { threshold: .04 });
    _PALM_PUB.vitrineObserver.observe(root);
  } else {
    _palmTheme().setVisible(_PALM_PUB.visible);
  }
}

function _palmEnsureVisibilityBinding(){
  if (_PALM_PUB.visibilityBound) return;
  _PALM_PUB.visibilityBound = true;
  document.addEventListener('tsc:public-section-visible', e => {
    if (e?.detail?.page !== 'palmares') return;
    _PALM_PUB.visible = !!e.detail.visible;
    _palmSetVitrinePaused(!_PALM_PUB.visible);
    _palmTheme().setVisible(_PALM_PUB.visible);
    if (!_PALM_PUB.visible) _palmCloseSala(false);
  });
}

function _palmCurrentSalaComp(){
  return _PALM_PUB.compData[_PALM_PUB.salaCompIdx] || null;
}

function _palmCurrentSalaRecord(){
  const comp = _palmCurrentSalaComp();
  return comp?.records?.[_PALM_PUB.salaChampIdx] || null;
}

function _palmIsNativeApk(){
  try {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
  } catch (_) {
    return false;
  }
}

function _palmSalaShouldUseSvg(){
  if (_palmIsNativeApk()) return false;
  return window.innerWidth <= 760 || matchMedia('(pointer: coarse)').matches;
}

function _palmHexToRgba(hex, alpha){
  const safe = _palmIsHex(hex) ? hex : '#ffffff';
  const n = parseInt(safe.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function _palmLightenForLight(hex){
  const safe = _palmIsHex(hex) ? hex : '#ffffff';
  const n = parseInt(safe.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.38) {
    const mix = (0.38 - luminance) / Math.max(0.02, 1 - luminance);
    r = Math.round(r + (255 - r) * mix);
    g = Math.round(g + (255 - g) * mix);
    b = Math.round(b + (255 - b) * mix);
  }
  return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function _palmRevealActiveSalaDot(dotsEl){
  requestAnimationFrame(() => {
    if(!dotsEl?.isConnected) return;
    const active = dotsEl.querySelector('.sala-dot.on');
    if(!active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if(left < dotsEl.scrollLeft) dotsEl.scrollLeft = left;
    else if(right > dotsEl.scrollLeft + dotsEl.clientWidth) {
      dotsEl.scrollLeft = right - dotsEl.clientWidth;
    }
  });
}

function _palmRenderSala(){
  const sala = document.getElementById('sala');
  const comp = _palmCurrentSalaComp();
  const rec = _palmCurrentSalaRecord();
  if (!sala || !comp || !rec) return;
  const team = _PALM_PUB.teamById[rec.teamId] || null;
  const colors = _palmTeamColors(team, comp.comp);
  const lightColors = {
    c1: _palmLightenForLight(colors.c1),
    c2: _palmLightenForLight(colors.c2)
  };
  sala.style.setProperty('--beam-l', _palmHexToRgba(lightColors.c1, .85));
  sala.style.setProperty('--beam-r', _palmHexToRgba(lightColors.c2, .85));
  sala.style.setProperty('--beam-l-soft', _palmHexToRgba(lightColors.c1, .22));
  sala.style.setProperty('--beam-r-soft', _palmHexToRgba(lightColors.c2, .22));
  sala.style.setProperty('--haze-l', _palmHexToRgba(lightColors.c1, .42));
  sala.style.setProperty('--haze-r', _palmHexToRgba(lightColors.c2, .42));
  sala.style.setProperty('--spark-l', _palmHexToRgba(lightColors.c1, .94));
  sala.style.setProperty('--spark-r', _palmHexToRgba(lightColors.c2, .94));

  const compEl = document.getElementById('sala-comp');
  const plateEl = document.getElementById('sala-plate-txt');
  const dotsEl = document.getElementById('sala-dots');
  const plateEdition = ['CAMPEÓN', rec.season, rec.juego, rec.year].filter(Boolean).join(' · ');
  if (compEl) compEl.textContent = comp.comp.label;
  if (plateEl) {
    plateEl.innerHTML = `<b>${_esc(team?.name || 'Sin campeón')}</b><small>${_esc(plateEdition)}</small>`;
  }
  if (dotsEl) {
    dotsEl.innerHTML = comp.records.map((entry, idx) => {
      const dotTeam = _PALM_PUB.teamById[entry.teamId];
      const dotEdition = [entry.season, entry.juego, entry.year].filter(Boolean).join(' · ');
      const dotLabel = `${dotTeam?.name || `Campeón ${idx + 1}`}${dotEdition ? ` · ${dotEdition}` : ''}`;
      return `<button type="button" class="sala-dot${idx === _PALM_PUB.salaChampIdx ? ' on' : ''}" data-sala-dot="${idx}" aria-label="${_escAttr(dotLabel)}" aria-pressed="${idx === _PALM_PUB.salaChampIdx ? 'true' : 'false'}"></button>`;
    }).join('');
    _palmRevealActiveSalaDot(dotsEl);
  }
  _palmRenderSalaCollage();
  _palmLayoutSala();
  _palmSyncSalaSoundButton();

  const cupHost = document.getElementById('sala-cup');
  if (cupHost) {
    const useSvg = _palmSalaShouldUseSvg();
    _PALM_PUB.salaUsesSvg = useSvg;
    const svg = renderTrophy(comp.comp.key, useSvg ? 180 : 220);
    if (useSvg) {
      _palmStopSalaSmoke();
      _palmCupCtrl().dispose();
      cupHost.classList.remove('sala-cup-loading');
      cupHost.innerHTML = `<div class="palm-sala-svg">${svg}</div>`;
    } else {
      cupHost.innerHTML = `<div class="palm-sala-svg">${svg}</div>`;
      // Loader LOCAL corto (pulso sobre el SVG placeholder) mientras se
      // resuelve la copa 3D real — solo esta pieza, no toda la sala. Si ya
      // estaba en modelCache (precargada), start()/loadCup() resuelven casi
      // instantáneo y la clase se saca enseguida.
      cupHost.classList.add('sala-cup-loading');
      _palmCupCtrl().start(cupHost, getTrophyGlbUrl(comp.comp.trophy), svg, lightColors).catch(err => {
        const activeComp = _palmCurrentSalaComp();
        const activeRecord = _palmCurrentSalaRecord();
        if (activeComp?.comp?.key !== comp.comp.key || String(activeRecord?.id) !== String(rec.id)) return;
        console.warn('Palmarés: no se pudo iniciar Three/Draco', err?.message || err);
        cupHost.innerHTML = `<div class="palm-sala-svg">${svg}</div>`;
      }).finally(() => {
        const activeComp = _palmCurrentSalaComp();
        const activeRecord = _palmCurrentSalaRecord();
        if (activeComp?.comp?.key === comp.comp.key && String(activeRecord?.id) === String(rec.id)) {
          cupHost.classList.remove('sala-cup-loading');
        }
      });
      _palmStartSalaSmoke();
    }
  }
}

function _palmRenderSalaCollage(){
  const stage = document.getElementById('sala-collage');
  if (!stage) return;
  _palmStopSalaCollage();
  const record = _palmCurrentSalaRecord();
  const media = record ? getPalmaresMedia(record.id) : null;
  const items = (Array.isArray(media?.items) ? media.items : [])
    .map(item => ({
      url: typeof item === 'string' ? item : (item?.url || item?.src || ''),
      alt: typeof item === 'object' ? String(item?.alt || '') : ''
    }))
    .filter(item => item.url);
  if (!items.length) {
    stage.innerHTML = '';
    return;
  }
  const mediaColors = media?.colors || {};
  const currentComp = _palmCurrentSalaComp();
  const currentRecord = _palmCurrentSalaRecord();
  const currentTeam = currentRecord ? _PALM_PUB.teamById[currentRecord.teamId] : null;
  const fallbackColors = _palmTeamColors(currentTeam, currentComp?.comp);
  const c1 = _palmLightenForLight(_palmIsHex(mediaColors.c1) ? mediaColors.c1 : fallbackColors.c1);
  const c2 = _palmLightenForLight(_palmIsHex(mediaColors.c2) ? mediaColors.c2 : fallbackColors.c2);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const spawn = slot => {
    if (!stage.isConnected || stage.querySelectorAll('.sala-shot').length >= _PALM_COLLAGE_MAX) return;
    const item = items[_PALM_PUB.collageSeq++ % items.length];
    const shot = document.createElement('figure');
    const img = document.createElement('img');
    shot.className = 'sala-shot';
    img.src = item.url;
    img.alt = item.alt;
    shot.style.left = `${slot.x + Math.random() * 5 - 2.5}%`;
    shot.style.top = `${slot.y + Math.random() * 6 - 3}%`;
    shot.style.borderColor = _palmHexToRgba(c1, .18);
    shot.style.boxShadow = `0 12px 30px rgba(0,0,0,.5), 0 0 28px ${_palmHexToRgba(c2, .10)}`;
    shot.appendChild(img);
    stage.appendChild(shot);
    if (reduced) {
      shot.style.opacity = '.65';
      shot.style.transform = `rotate(${slot.r}deg) scale(.98)`;
      return;
    }
    const duration = slot.dur + Math.random() * 900 - 450;
    const driftX = slot.dx + Math.random() * 26 - 13;
    const driftY = slot.dy + Math.random() * 20 - 10;
    const r0 = slot.r + Math.random() * 5 - 2.5;
    const r1 = r0 + slot.spin;
    const animation = shot.animate([
      { opacity: 0, transform: `translate3d(0,0,0) rotate(${r0}deg) scale(.94)` },
      { opacity: slot.peak, transform: `translate3d(${driftX * .22}px,${driftY * .22}px,0) rotate(${r0 + (r1 - r0) * .22}deg) scale(.99)`, offset: .16 },
      { opacity: slot.peak, transform: `translate3d(${driftX * .76}px,${driftY * .76}px,0) rotate(${r0 + (r1 - r0) * .76}deg) scale(1.04)`, offset: .78 },
      { opacity: 0, transform: `translate3d(${driftX}px,${driftY}px,0) rotate(${r1}deg) scale(1.08)` }
    ], { duration, easing: 'linear', fill: 'forwards' });
    _PALM_PUB.collageAnimations.add(animation);
    const cleanup = () => {
      _PALM_PUB.collageAnimations.delete(animation);
      shot.remove();
    };
    animation.onfinish = cleanup;
    animation.oncancel = cleanup;
  };

  if (reduced) {
    _PALM_COLLAGE_SLOTS.slice(0, Math.min(items.length, _PALM_COLLAGE_MAX)).forEach(spawn);
    return;
  }

  _PALM_COLLAGE_SLOTS.forEach((slot, idx) => {
    const kick = () => {
      spawn(slot);
      const timer = setTimeout(kick, slot.dur + 260 + Math.random() * 900);
      _PALM_PUB.collageTimers.push(timer);
    };
    const timer = setTimeout(kick, idx * 850 + Math.random() * 300);
    _PALM_PUB.collageTimers.push(timer);
  });
}

function _palmStopSalaCollage(){
  _PALM_PUB.collageTimers.forEach(clearTimeout);
  _PALM_PUB.collageTimers.length = 0;
  _PALM_PUB.collageAnimations.forEach(animation => animation.cancel());
  _PALM_PUB.collageAnimations.clear();
  document.querySelectorAll('#sala-collage .sala-shot').forEach(shot => shot.remove());
}

/* ----------------------------------------------------------
   PRECARGA DE LA SALA — gate real antes de revelar (ver _palmOpenSala)
   ---------------------------------------------------------- */
function _palmPreloadImage(url){
  return new Promise(resolve => {
    if (!url) { resolve(); return; }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // no crítico: se salta sin romper la sala
    img.src = url;
  });
}

/* Room/foco/placa son estáticos (no cambian por competición/campeón) — se
   precargan UNA sola vez y quedan listos para siempre, incluso entre
   aperturas distintas de la sala. */
function _palmPreloadRoomImages(){
  if (_PALM_PUB.roomImagesReady) return Promise.resolve();
  if (_PALM_PUB.roomImagesPromise) return _PALM_PUB.roomImagesPromise;
  _PALM_PUB.roomImagesPromise = Promise.all([
    'assets/sin_fondo.png',
    'assets/foco_izquierdo.png',
    'assets/foco_derecho.png',
    'assets/placa_dorada.png'
  ].map(_palmPreloadImage)).then(() => { _PALM_PUB.roomImagesReady = true; });
  return _PALM_PUB.roomImagesPromise;
}

/* Precarga solo las primeras `max` imágenes del collage del récord — el
   resto se van pidiendo solas cuando _palmRenderSalaCollage() las use
   (ya no bloquean el reveal). */
function _palmPreloadCollageMedia(record, max = 3){
  if (!record) return Promise.resolve();
  const media = getPalmaresMedia(record.id);
  const urls = (Array.isArray(media?.items) ? media.items : [])
    .map(item => typeof item === 'string' ? item : (item?.url || item?.src || ''))
    .filter(Boolean)
    .slice(0, max);
  return Promise.all(urls.map(_palmPreloadImage)).then(() => {});
}

function _palmSetSalaLoaderProgress(pct){
  const fill = document.getElementById('sala-loader-fill');
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function _palmShowSalaLoader(){
  document.getElementById('sala-loader')?.classList.remove('sala-loader-hide');
  _palmSetSalaLoaderProgress(0);
}

function _palmHideSalaLoader(){
  document.getElementById('sala-loader')?.classList.add('sala-loader-hide');
}

/* Prepara TODO lo crítico para la copa/récord actual antes de que
   _palmOpenSala revele la sala: imágenes de sala, primeras fotos del
   collage, y (solo desktop/pointer fino, sin motion reducido) Three/GLTF/
   DRACO + el GLB de la copa actual. En mobile/tablet/reduced-motion no
   bloquea por 3D — esas rutas ya caen a SVG en _palmRenderSala(). Cada
   asset no crítico que falla se resuelve igual (ver _palmPreloadImage /
   .catch vacíos) para no colgar la sala para siempre. */
function _palmPrepareSala(compIdx, champIdx, token){
  const comp = _PALM_PUB.compData[compIdx];
  const rec = comp?.records?.[champIdx];
  if (!comp || !rec) return Promise.resolve();

  const useSvg = _palmSalaShouldUseSvg() || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [
    _palmPreloadRoomImages().then(() => _palmSetSalaLoaderProgress(35)),
    _palmPreloadCollageMedia(rec, 3).then(() => _palmSetSalaLoaderProgress(60))
  ];

  if (!useSvg) {
    steps.push(
      _palmLoadThreeLocal()
        .then(() => getTrophyGlbUrl(comp.comp.trophy))
        .then(url => _palmCupCtrl().preload(url))
        .then(() => _palmSetSalaLoaderProgress(90))
        .catch(() => {}) // best-effort: si Three/GLB falla acá, _palmRenderSala cae a SVG igual al revelar
    );
  }

  return Promise.all(steps).then(() => {
    if (token === _PALM_PUB.salaLoadToken) _palmSetSalaLoaderProgress(100);
  });
}

/* Tras el primer reveal, precarga en background las copas de las OTRAS
   competiciones con campeones (máximo las de PALMARES_COMPS, hoy 5) para
   que cambiar de competición dentro de la sala sea instantáneo. Se detiene
   sola si la sala se cierra mientras corre; el cache de modelos sobrevive
   igual (ver _palmCupCtrl → modelCache). */
async function _palmPreloadOtherTrophies(excludeCompIdx){
  if (_palmSalaShouldUseSvg() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = _PALM_PUB.compData.filter((entry, idx) => idx !== excludeCompIdx && entry.records.length);
  for (const entry of targets) {
    const sala = document.getElementById('sala');
    if (!sala || sala.hidden) return;
    try {
      const url = await getTrophyGlbUrl(entry.comp.trophy);
      await _palmCupCtrl().preload(url);
    } catch (_) { /* best-effort */ }
  }
}

function _palmOpenSala(compIdx, champIdx, trigger){
  const comp = _PALM_PUB.compData[compIdx];
  if (!comp || !comp.records.length) return;
  const sala = document.getElementById('sala');
  if (!sala) return;
  clearTimeout(_PALM_PUB.closeTimer);
  _PALM_PUB.closeTimer = null;
  _PALM_PUB.focusReturn = trigger || document.activeElement || null;
  _PALM_PUB.salaCompIdx = compIdx;
  _PALM_PUB.salaChampIdx = Math.max(0, Math.min(champIdx || 0, comp.records.length - 1));
  const token = ++_PALM_PUB.salaLoadToken;
  sala.hidden = false;
  sala.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sala-open');
  sala.classList.add('loading');
  _palmShowSalaLoader();
  // Bindeado YA (no después del prepare): cerrar/Escape deben funcionar
  // mientras el loader está visible, no recién cuando la sala termina de abrir.
  _palmBindSalaDialog();
  if (window.SFX && typeof window.SFX.unlock === 'function') window.SFX.unlock();

  _palmPrepareSala(compIdx, champIdx, token).then(() => {
    if (token !== _PALM_PUB.salaLoadToken) return; // se cerró o cambió mientras cargaba
    _palmRenderSala();
    sala.classList.remove('loading');
    _palmHideSalaLoader();
    requestAnimationFrame(() => sala.classList.add('open'));
    _palmTheme().enterSala();
    playPalmZoom();
    document.getElementById('sala-close')?.focus();
    _palmPreloadOtherTrophies(compIdx);
  });
}

function _palmCloseSala(restoreFocus = true){
  const sala = document.getElementById('sala');
  if (!sala || sala.hidden) return;
  _PALM_PUB.salaLoadToken++; // cancela cualquier _palmPrepareSala en curso (open a medias)
  _PALM_PUB.salaSwapToken++; // cancela cualquier _palmSwapSala en curso
  sala.classList.remove('open', 'loading', 'sala-swap-instant');
  sala.style.removeProperty('--sala-slide-x');
  sala.style.removeProperty('--sala-slide-y');
  _palmHideSalaLoader();
  sala.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sala-open');
  _palmDisposeSala();
  _palmTheme().leaveSala();
  playPalmZoomOut();
  clearTimeout(_PALM_PUB.closeTimer);
  const closeDelay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
  _PALM_PUB.closeTimer = setTimeout(() => {
    sala.hidden = true;
    if (restoreFocus && _PALM_PUB.focusReturn && typeof _PALM_PUB.focusReturn.focus === 'function') {
      _PALM_PUB.focusReturn.focus();
    }
    _PALM_PUB.focusReturn = null;
  }, closeDelay);
}

function _palmWaitTransition(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* Transición direccional secuencial (sale → cambia índice/re-renderiza →
   entra) para cambiar de competición ('left'/'right') o campeón ('up'/
   'down') dentro de una sala ya abierta. Secuencial y NO simultánea a
   propósito: hay un solo WebGLRenderer/canvas para la copa 3D — no existe
   "copa vieja saliendo mientras la nueva entra", es la misma copa
   re-posicionada entre los dos tramos. `mutate` cambia los índices y llama
   a _palmRenderSala(); corre recién cuando el contenido actual ya salió.
   Convive con el sistema de carga existente (_palmPrepareSala/
   .sala-cup-loading/salaLoadToken) sin duplicarlo: si la copa nueva no está
   en modelCache, el pulso local de siempre sigue apareciendo en el tramo de
   entrada, esto solo mueve el contenedor. */
async function _palmSwapSala(direction, mutate){
  const sala = document.getElementById('sala');
  if (!sala || sala.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mutate();
    return;
  }
  const token = ++_PALM_PUB.salaSwapToken;
  const horizontal = direction === 'left' || direction === 'right';
  const prop = horizontal ? '--sala-slide-x' : '--sala-slide-y';
  const otherProp = horizontal ? '--sala-slide-y' : '--sala-slide-x';
  const unit = horizontal ? 'vw' : 'vh';
  const dist = horizontal ? 7 : 6;
  const outVal = (direction === 'left' || direction === 'up') ? -dist : dist;

  // Limpia cualquier resto de un swap anterior CANCELADO (p.ej. el usuario
  // cambia de eje —comp→campeón— antes de que termine el primero): ese swap
  // viejo va a detectar el token inválido y salir sin tocar `otherProp`, así
  // que si no se limpia acá puede quedar pegado indefinidamente.
  sala.classList.remove('sala-swap-instant');
  sala.style.removeProperty(otherProp);

  sala.style.setProperty(prop, `${outVal}${unit}`);
  await _palmWaitTransition(180);
  if (token !== _PALM_PUB.salaSwapToken) { sala.style.removeProperty(prop); return; }

  mutate();

  // Salto instantáneo al lado opuesto (técnica FLIP) antes de animar la
  // entrada: sin esto, el contenido nuevo rebotaría desde donde salió el
  // anterior en vez de venir del lado correcto.
  sala.classList.add('sala-swap-instant');
  sala.style.setProperty(prop, `${-outVal}${unit}`);
  void sala.offsetHeight; // fuerza reflow: registra la posición saltada antes de reactivar la transición
  sala.classList.remove('sala-swap-instant');
  sala.style.setProperty(prop, '0');

  await _palmWaitTransition(260);
  if (token !== _PALM_PUB.salaSwapToken) { sala.style.removeProperty(prop); return; }
  sala.style.removeProperty(prop);
}

function _palmMoveSalaChamp(delta){
  const comp = _palmCurrentSalaComp();
  if (!comp?.records?.length) return;
  const dir = delta > 0 ? 'up' : 'down';
  _palmSwapSala(dir, () => {
    _PALM_PUB.salaChampIdx = (_PALM_PUB.salaChampIdx + delta + comp.records.length) % comp.records.length;
    _palmRenderSala();
  });
}

function _palmMoveSalaComp(delta){
  const list = _PALM_PUB.compData.filter(entry => entry.records.length);
  const current = _palmCurrentSalaComp();
  const activeIdx = Math.max(0, list.findIndex(entry => entry.comp.key === current?.comp.key));
  const next = (activeIdx + delta + list.length) % list.length;
  const nextComp = list[next];
  if (!nextComp) return;
  const dir = delta > 0 ? 'left' : 'right';
  _palmSwapSala(dir, () => {
    _PALM_PUB.salaCompIdx = _PALM_PUB.compData.findIndex(entry => entry.comp.key === nextComp.comp.key);
    _PALM_PUB.salaChampIdx = 0;
    _palmRenderSala();
  });
}

function _palmBindSalaDialog(){
  const sala = document.getElementById('sala');
  if (!sala) return;
  _palmUnbindSalaDialog();
  _PALM_PUB.keyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      _palmCloseSala();
      return;
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); _palmMoveSalaChamp(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); _palmMoveSalaChamp(-1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); _palmMoveSalaComp(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); _palmMoveSalaComp(-1); }
  };
  _PALM_PUB.trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const nodes = [...sala.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(node => !node.hidden);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  _PALM_PUB.clickHandler = (e) => {
    const dot = e.target.closest('[data-sala-dot]');
    if (dot) {
      const dotIndex = Number(dot.dataset.salaDot) || 0;
      if (dotIndex === _PALM_PUB.salaChampIdx) return;
      // Misma transición que las flechas arriba/abajo — antes esto saltaba
      // _palmSwapSala() por completo (rompía la regla de transición global)
      // y tampoco invalidaba un swap en curso, así que un swap anterior podía
      // terminar después y pisar el campeón elegido por el dot.
      const dir = dotIndex > _PALM_PUB.salaChampIdx ? 'up' : 'down';
      _palmSwapSala(dir, () => {
        _PALM_PUB.salaChampIdx = dotIndex;
        _palmRenderSala();
        requestAnimationFrame(() => {
          document.querySelector(`#sala-dots [data-sala-dot="${dotIndex}"]`)?.focus({ preventScroll:true });
        });
      });
      return;
    }
    if (e.target.id === 'sala-close' || e.target.closest('#sala-close')) {
      _palmCloseSala();
      return;
    }
    if (e.target.id === 'sala-sound' || e.target.closest('#sala-sound')) {
      const nextEnabled = !(window.SFX && window.SFX.enabled !== false);
      if (typeof setSoundOn === 'function') setSoundOn(nextEnabled);
      _palmSyncSalaSoundButton();
      return;
    }
    if (e.target === sala) _palmCloseSala();
  };
  sala.addEventListener('keydown', _PALM_PUB.trapHandler);
  document.addEventListener('keydown', _PALM_PUB.keyHandler);
  sala.addEventListener('click', _PALM_PUB.clickHandler);
  _PALM_PUB.touchStartHandler = (e) => {
    if (e.touches.length !== 1) return;
    _PALM_PUB.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  _PALM_PUB.touchEndHandler = (e) => {
    const start = _PALM_PUB.touchStart;
    _PALM_PUB.touchStart = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Date.now() - start.t > 700 || Math.max(Math.abs(dx), Math.abs(dy)) < 48) return;
    if (Math.abs(dy) > Math.abs(dx)) dy < 0 ? _palmMoveSalaChamp(1) : _palmMoveSalaChamp(-1);
    else dx < 0 ? _palmMoveSalaComp(1) : _palmMoveSalaComp(-1);
  };
  sala.addEventListener('touchstart', _PALM_PUB.touchStartHandler, { passive: true });
  sala.addEventListener('touchend', _PALM_PUB.touchEndHandler, { passive: true });
  _PALM_PUB.resizeHandler = () => {
    const useSvg = _palmSalaShouldUseSvg();
    if (_PALM_PUB.salaUsesSvg !== useSvg) _palmRenderSala();
    else _palmLayoutSala();
  };
  window.addEventListener('resize', _PALM_PUB.resizeHandler);
}

function _palmUnbindSalaDialog(){
  const sala = document.getElementById('sala');
  if (sala && _PALM_PUB.clickHandler) sala.removeEventListener('click', _PALM_PUB.clickHandler);
  if (sala && _PALM_PUB.trapHandler) sala.removeEventListener('keydown', _PALM_PUB.trapHandler);
  if (sala && _PALM_PUB.touchStartHandler) sala.removeEventListener('touchstart', _PALM_PUB.touchStartHandler);
  if (sala && _PALM_PUB.touchEndHandler) sala.removeEventListener('touchend', _PALM_PUB.touchEndHandler);
  if (_PALM_PUB.keyHandler) document.removeEventListener('keydown', _PALM_PUB.keyHandler);
  if (_PALM_PUB.resizeHandler) window.removeEventListener('resize', _PALM_PUB.resizeHandler);
  _PALM_PUB.keyHandler = null;
  _PALM_PUB.trapHandler = null;
  _PALM_PUB.clickHandler = null;
  _PALM_PUB.touchStartHandler = null;
  _PALM_PUB.touchEndHandler = null;
  _PALM_PUB.resizeHandler = null;
}

function _palmSyncSalaSoundButton(){
  const btn = document.getElementById('sala-sound');
  if (!btn) return;
  const on = !(window.SFX && window.SFX.enabled === false);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.setAttribute('aria-label', on ? 'Silenciar música y efectos' : 'Activar música y efectos');
  btn.innerHTML = on
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
}

function _palmLayoutSala(){
  const sala = document.getElementById('sala');
  if (!sala || sala.hidden) return;
  const vw = sala.clientWidth;
  const vh = sala.clientHeight;
  if (!vw || !vh) return;
  const s = Math.max(vw / _PALM_SALA_IMG.w, vh / _PALM_SALA_IMG.h);
  const shiftX = vw * _PALM_SALA_IMG.shiftXr;
  const ox = (vw - _PALM_SALA_IMG.w * s) / 2 + shiftX;
  const oy = (vh - _PALM_SALA_IMG.h * s) / 2;
  const bgSize = `${_PALM_SALA_IMG.w * s}px ${_PALM_SALA_IMG.h * s}px`;
  const bgPos = `${ox}px ${oy}px`;

  const fg = sala.querySelector('.sala-foreground');
  if (fg) {
    if (!fg.style.backgroundImage) fg.style.backgroundImage = "url('assets/sin_fondo.png')";
    fg.style.backgroundSize = bgSize;
    fg.style.backgroundPosition = bgPos;
  }
  const focos = sala.querySelector('.sala-focos');
  if (focos) {
    const L = _PALM_SALA_IMG.focoL;
    const R = _PALM_SALA_IMG.focoR;
    const place = (f) => {
      const dh = _PALM_SALA_IMG.focoH * vh;
      const ds = dh / f.ch;
      const dw = f.cw * ds;
      return { x0: f.Lx * vw - f.lcx * dw, y0: f.Ly * vh - f.lcy * dh, dw, dh };
    };
    const pl = place(L);
    const pr = place(R);
    focos.style.backgroundImage = "url('assets/foco_izquierdo.png'), url('assets/foco_derecho.png')";
    focos.style.backgroundRepeat = 'no-repeat, no-repeat';
    focos.style.backgroundSize = `${pl.dw}px ${pl.dh}px, ${pr.dw}px ${pr.dh}px`;
    focos.style.backgroundPosition = `${pl.x0}px ${pl.y0}px, ${pr.x0}px ${pr.y0}px`;
    sala.style.setProperty('--bl-x', `${(L.Lx * 100).toFixed(1)}%`);
    sala.style.setProperty('--bl-y', `${(L.Ly * 100).toFixed(1)}%`);
    sala.style.setProperty('--br-x', `${(R.Lx * 100).toFixed(1)}%`);
    sala.style.setProperty('--br-y', `${(R.Ly * 100).toFixed(1)}%`);
  }
  const px = ox + _PALM_SALA_IMG.ped.cx * s;
  const contact = oy + _PALM_SALA_IMG.ped.contact * s;
  const pw = _PALM_SALA_IMG.ped.w * s;
  const host = document.getElementById('sala-cup');
  const plate = document.getElementById('sala-plate');
  if (plate) {
    const plateW = Math.round(_PALM_SALA_IMG.ped.panel.w * s * 0.82);
    plate.style.left = `${ox + _PALM_SALA_IMG.ped.panel.cx * s}px`;
    plate.style.top = `${oy + _PALM_SALA_IMG.ped.panel.cy * s}px`;
    plate.style.width = `${plateW}px`;
    plate.style.setProperty('--plate-fs', `${Math.round(plateW * 0.105)}px`);
  }
  if (host) {
    const cw = Math.round(pw * 1.9);
    const ch = Math.round(pw * 1.5);
    const tanH = Math.tan(_PALM_CUP_VIEW.fov * Math.PI / 360) * _PALM_CUP_VIEW.dist;
    const rowFrac = (1 - _PALM_CUP_VIEW.baseY / tanH) / 2;
    host.style.left = `${px}px`;
    host.style.top = `${contact - ch * rowFrac}px`;
    host.style.width = `${cw}px`;
    host.style.height = `${ch}px`;
    _palmCupCtrl().resize(cw, ch);
  }
}

function _palmDisposeSala(){
  _palmUnbindSalaDialog();
  _palmStopSalaCollage();
  _palmStopSalaSmoke();
  _palmCupCtrl().dispose();
  _palmTheme().leaveSala();
  _PALM_PUB.salaUsesSvg = null;
}

function _palmLoadScriptOnce(src){
  window.__palmScripts = window.__palmScripts || new Map();
  if (window.__palmScripts.has(src)) return window.__palmScripts.get(src);
  let script = null;
  const promise = new Promise((resolve, reject) => {
    script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No cargó ${src}`));
    document.head.appendChild(script);
  }).catch(error => {
    window.__palmScripts.delete(src);
    script?.remove();
    throw error;
  });
  window.__palmScripts.set(src, promise);
  return promise;
}

function _palmLoadThreeLocal(){
  if (window.THREE && window.THREE.GLTFLoader && window.THREE.DRACOLoader) return Promise.resolve();
  if (!_PALM_PUB.threePromise) {
    _PALM_PUB.threePromise = _palmLoadScriptOnce('assets/vendor/three/three.min.js')
      .then(() => window.THREE?.GLTFLoader ? null : _palmLoadScriptOnce('assets/vendor/three/GLTFLoader.js'))
      .then(() => window.THREE?.DRACOLoader ? null : _palmLoadScriptOnce('assets/vendor/three/DRACOLoader.js'))
      .catch(err => {
        _PALM_PUB.threePromise = null;
        throw err;
      });
  }
  return _PALM_PUB.threePromise;
}

function _palmCupCtrl(){
  if (_PALM_PUB.cupCtrl) return _PALM_PUB.cupCtrl;
  let renderer = null;
  let scene = null;
  let camera = null;
  let host = null;
  let clock = null;
  let cup = null;
  let spotL = null;
  let spotR = null;
  let targetLeft = null;
  let targetRight = null;
  let environmentMap = null;
  let loadedUrl = null;
  let pendingW = 0;
  let pendingH = 0;
  let loadToken = 0;
  let sessionToken = 0;
  // Cache de modelos GLB crudos (sin normalizar escala/centro) por URL — cada
  // uso clona desde acá. Sobrevive a dispose()/reaperturas de la sala a
  // propósito (requisito: no destruir el cache al cambiar de competición).
  const modelCache = new Map();
  const modelFetches = new Map(); // url -> fetch en curso, evita duplicar descarga si preload() y display piden lo mismo a la vez
  const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  function disposeObject3D(root){
    root?.traverse?.(obj => {
      if (obj.geometry?.dispose) obj.geometry.dispose();
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(material => {
          if (!material) return;
          Object.values(material).forEach(value => {
            if (value?.isTexture) value.dispose?.();
          });
          material.dispose?.();
        });
      }
    });
  }

  function clearCup(){
    if (!cup) return;
    scene?.remove(cup);
    // A propósito SIN disposeObject3D(cup): `cup` viene de un .clone() de
    // modelCache y comparte geometría/material con el original cacheado —
    // liberarlos acá rompería el cache para la próxima vez que se muestre
    // esta misma copa. El contexto WebGL completo se libera en dispose().
    cup = null;
    loadedUrl = null;
  }

  function showSvg(svg){
    if (renderer) renderer.setAnimationLoop(null);
    if (host) host.innerHTML = `<div class="palm-sala-svg">${svg}</div>`;
  }

  function env(){
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#4a5468');
    g.addColorStop(0.42, '#1a2230');
    g.addColorStop(0.55, '#8b93a3');
    g.addColorStop(0.62, '#11141c');
    g.addColorStop(1, '#000');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 128);
    x.fillStyle = 'rgba(240,245,255,0.95)';
    [30, 95, 160, 225].forEach(px => x.fillRect(px, 18, 14, 34));
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    environmentMap = pm.fromEquirectangular(tex).texture;
    scene.environment = environmentMap;
    tex.dispose();
    pm.dispose();
  }

  function contactShadow(){
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 18, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.24)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(0.46, 48),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = _PALM_CUP_VIEW.baseY + 0.002;
    scene.add(m);
  }

  function init(nextHost){
    host = nextHost;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(_PALM_CUP_VIEW.fov, 1, 0.1, 50);
    camera.position.set(0, 0, _PALM_CUP_VIEW.dist);
    camera.lookAt(0, 0, 0);
    clock = new THREE.Clock();
    env();
    scene.add(new THREE.AmbientLight(0x39496a, 0.55));
    const key = new THREE.DirectionalLight(0xfff3dd, 0.8);
    key.position.set(0, 6, 5);
    scene.add(key);
    const mk = (x) => {
      const sp = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 5.5, 0.55, 1.2);
      sp.position.set(x, 4.2, -1.8);
      sp.target.position.set(0, 0.4, 0);
      scene.add(sp, sp.target);
      return sp;
    };
    spotL = mk(-4);
    spotR = mk(4);
    targetLeft = new THREE.Color(0xffffff);
    targetRight = new THREE.Color(0xffffff);
    contactShadow();
    if (pendingW) _PALM_PUB.cupCtrl.resize(pendingW, pendingH);
  }

  function renderTick(){
    const dt = Math.min(clock.getDelta(), 0.05);
    if (spotL && targetLeft) spotL.color.lerp(targetLeft, Math.min(1, dt * 3.5));
    if (spotR && targetRight) spotR.color.lerp(targetRight, Math.min(1, dt * 3.5));
    if (cup && !reducedMotionQuery.matches) cup.rotation.y += dt * 0.45;
    renderer.render(scene, camera);
  }

  function setLights(colors){
    if (!spotL || !spotR) return;
    targetLeft.set(colors.c1);
    targetRight.set(colors.c2);
    if(reducedMotionQuery.matches){
      spotL.color.copy(targetLeft);
      spotR.color.copy(targetRight);
    }
  }

  // Descarga+parsea el GLB de `url` (objeto CRUDO sin normalizar, se clona en
  // cada uso real) y lo cachea. No toca la escena en vivo — seguro de llamar
  // en background para precargar copas que todavía no se muestran.
  function fetchModel(url){
    if (modelCache.has(url)) return Promise.resolve(modelCache.get(url));
    if (modelFetches.has(url)) return modelFetches.get(url);
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('assets/vendor/three/draco/');
    const loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(draco);
    const promise = new Promise((resolve, reject) => {
      loader.load(url, gltf => {
        draco.dispose();
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        if (!size.y) { reject(new Error('modelo sin tamaño válido')); return; }
        modelCache.set(url, obj);
        resolve(obj);
      }, undefined, err => { draco.dispose(); reject(err); });
    }).finally(() => modelFetches.delete(url));
    modelFetches.set(url, promise);
    return promise;
  }

  // Normaliza escala/centro de un CLON del modelo crudo y lo agrega a la
  // escena viva. `token` descarta el resultado si el usuario ya cambió de
  // copa o cerró la sala mientras esto corría.
  function placeCup(rawObj, token){
    if (token !== loadToken || !scene) return;
    const obj = rawObj.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    obj.scale.setScalar(1.7 / size.y);
    const b2 = new THREE.Box3().setFromObject(obj);
    const center = b2.getCenter(new THREE.Vector3());
    obj.position.x -= center.x;
    obj.position.z -= center.z;
    obj.position.y -= b2.min.y;
    cup = new THREE.Group();
    cup.add(obj);
    cup.position.y = _PALM_CUP_VIEW.baseY;
    scene.add(cup);
    // querySelectorAll, no querySelector: si hubo renders rápidos seguidos
    // (cambio de campeón repetido) puede quedar más de un placeholder viejo.
    host?.querySelectorAll('.palm-sala-svg').forEach(el => el.remove());
    if(reducedMotionQuery.matches) renderTick();
  }

  function loadCup(url, svg){
    const token = ++loadToken;
    if (url && loadedUrl === url && cup) {
      // Reutiliza la copa ya puesta (mismo modelo) — este camino NO pasa por
      // placeCup(), así que el placeholder SVG que _palmRenderSala() siempre
      // vuelve a insertar (cupHost.innerHTML = svg) hay que limpiarlo acá
      // también, o queda visible detrás del canvas ya montado.
      host?.querySelectorAll('.palm-sala-svg').forEach(el => el.remove());
      if (reducedMotionQuery.matches) renderTick();
      return Promise.resolve();
    }
    clearCup();
    if (!url) {
      showSvg(svg);
      return Promise.resolve();
    }
    loadedUrl = url;
    return fetchModel(url).then(rawObj => {
      placeCup(rawObj, token);
    }).catch(err => {
      if (token !== loadToken) return;
      loadedUrl = null;
      console.warn('Palmarés: la copa GLB no cargó', err?.message || err);
      showSvg(svg);
    });
  }

  _PALM_PUB.cupCtrl = {
    async start(nextHost, modelUrl, svg, colors){
      const token = ++sessionToken;
      let resolvedModelUrl = null;
      try {
        [, resolvedModelUrl] = await Promise.all([
          _palmLoadThreeLocal(),
          Promise.resolve(modelUrl)
        ]);
      } catch (error) {
        if (token !== sessionToken) return;
        nextHost.innerHTML = `<div class="palm-sala-svg">${svg}</div>`;
        console.warn('Palmarés: no se pudo iniciar Three/Draco', error?.message || error);
        return;
      }
      if (token !== sessionToken) return;
      if (host !== nextHost || !renderer) init(nextHost);
      if (renderer.domElement.parentElement !== nextHost) nextHost.appendChild(renderer.domElement);
      setLights(colors);
      // start() no resuelve hasta que la copa esté realmente puesta (o el
      // fallback SVG, si falló) — así quien llame puede usar esto como gate
      // real de "listo para revelar", no solo "arrancó a cargar".
      await loadCup(resolvedModelUrl, svg);
      if (token !== sessionToken) return;
      if(reducedMotionQuery.matches){
        renderer.setAnimationLoop(null);
        renderTick();
      } else {
        renderer.setAnimationLoop(renderTick);
      }
    },
    // Precarga en background: descarga+cachea el modelo SIN tocar la escena
    // viva ni requerir que la sala esté abierta con ESTA copa. Usado por
    // _palmPreloadOtherTrophies para las copas que no son la actual.
    async preload(modelUrl){
      if (!modelUrl) return;
      try {
        await _palmLoadThreeLocal();
        await fetchModel(modelUrl);
      } catch (_) { /* best-effort: si falla, simplemente no queda cacheada */ }
    },
    resize(w, h){
      pendingW = w;
      pendingH = h;
      if (!renderer || !camera) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if(reducedMotionQuery.matches) renderTick();
    },
    stop(){
      sessionToken++;
      loadToken++;
      if (renderer) renderer.setAnimationLoop(null);
    },
    dispose(){
      this.stop();
      clearCup();
      disposeObject3D(scene);
      environmentMap?.dispose?.();
      environmentMap = null;
      if (renderer) {
        renderer.dispose();
        renderer.renderLists?.dispose?.();
        renderer.domElement.remove();
      }
      renderer = null;
      scene = null;
      camera = null;
      clock = null;
      host = null;
      spotL = null;
      spotR = null;
      targetLeft = null;
      targetRight = null;
      loadedUrl = null;
    }
  };
  return _PALM_PUB.cupCtrl;
}

class _PalmSmoke {
  constructor(ctx, color){
    this.ctx = ctx;
    this.color = color || [170, 175, 187];
    this.p = [];
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.W = ctx.canvas.width;
    this.H = ctx.canvas.height;
  }
  mk(x){
    return {
      x,
      y: this.H + 10 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.30,
      vy: -(0.55 + Math.random() * 1),
      r: 80 + Math.random() * 90,
      gr: 0.12 + Math.random() * 0.22,
      a: 0.026 + Math.random() * 0.05,
      life: 0,
      max: 1200 + Math.random() * 700,
      ph: Math.random() * 6.283,
      ps: 0.006 + Math.random() * 0.008,
      pa: 0.55 + Math.random() * 1.05,
      ph2: Math.random() * 6.283,
      ps2: 0.015 + Math.random() * 0.014
    };
  }
  burst(cx, spread, amt){
    const n = Math.random() < (amt % 1) ? Math.ceil(amt) : Math.floor(amt);
    for (let i = 0; i < n; i++) this.p.push(this.mk(cx + (Math.random() - 0.5) * spread));
  }
  emit(){
    const T = this.t / 60;
    const N = 5;
    for (let k = 0; k < N; k++) {
      const ph = k * 1.7;
      const cx = this.W * ((k + 0.5) / N + 0.13 * Math.sin(T * (0.05 + 0.013 * k) + ph) + 0.06 * Math.sin(T * 0.083 + ph * 2));
      const gate = 0.3 + 0.7 * Math.max(0, Math.sin(T * (0.085 + 0.022 * k) + ph * 1.3));
      this.burst(cx, this.W * 0.11, 0.31 * gate);
    }
  }
  advance(){
    this.t++;
    const T = this.t / 60;
    const windX = 0.5 * Math.sin(T * 0.06) + 0.28 * Math.sin(T * 0.026 + 1.1);
    const windY = -0.05 + 0.06 * Math.sin(T * 0.037 + 0.5);
    this.p = this.p.filter(q => q.life < q.max && q.y > -q.r - 30 && q.x > -q.r - 160 && q.x < this.W + q.r + 160);
    for (const q of this.p) {
      q.life++;
      const widen = 0.3 + (q.life / q.max) * 1.7;
      const turb = (Math.sin(q.life * q.ps + q.ph) + Math.sin(q.life * q.ps2 + q.ph2) * 0.6) * q.pa * widen;
      q.x += q.vx + windX + turb;
      q.y += q.vy + windY;
      q.r += q.gr;
    }
  }
  draw(){
    const [r, g, b] = this.color;
    const gA = 0.85 + 0.15 * Math.sin(this.t / 60 * 0.045 + 1);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (const q of this.p) {
      const tin = Math.min(1, q.life / (q.max * 0.12));
      const fx = Math.min(1, q.x / 130, (this.W - q.x) / 130);
      const fy = Math.min(1, q.y / 200);
      const a = q.a * tin * Math.max(0, Math.min(fx, fy)) * gA;
      if (a <= 0.0015) continue;
      this.ctx.globalAlpha = a;
      const gd = this.ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
      gd.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
      gd.addColorStop(0.45, `rgba(${r},${g},${b},0.4)`);
      gd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      this.ctx.fillStyle = gd;
      this.ctx.beginPath();
      this.ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }
  step(n){
    for (let i = 0; i < n; i++) {
      if (this.t % 4 === 0) this.emit();
      this.advance();
    }
  }
  loop(){
    if (this.t % 4 === 0) this.emit();
    this.advance();
    this.draw();
    if (this.running) this.raf = requestAnimationFrame(() => this.loop());
  }
  start(){
    if (this.running) return;
    this.running = true;
    this.loop();
  }
  stop(){
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.p.length = 0;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }
}

function _palmSmokeCtrl(){
  if (_PALM_PUB.smokeCtrl) return _PALM_PUB.smokeCtrl;
  _PALM_PUB.smokeCtrl = {
    instance: null,
    start(canvas){
      if (!canvas || _palmSalaShouldUseSvg() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.stop();
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      this.instance = new _PalmSmoke(ctx, [170, 175, 187]);
      this.instance.step(1100);
      this.instance.start();
    },
    stop(){
      if (this.instance) this.instance.stop();
      this.instance = null;
    }
  };
  return _PALM_PUB.smokeCtrl;
}

function _palmStartSalaSmoke(){
  const canvas = document.querySelector('#sala .sala-smoke-canvas');
  _palmSmokeCtrl().start(canvas);
}

function _palmStopSalaSmoke(){
  _palmSmokeCtrl().stop();
}

async function renderPubPalmares(){
  const el = document.getElementById('pub-palmares-content');
  if (!el) return;
  const token = ++_PALM_PUB.renderToken;
  await seedPalmaresIfEmpty();
  await loadPalmaresComps();
  const [recs, allTeams, { value: overrides }] = await Promise.all([
    getAllPalmaresRecords(),
    dbGetAll('teams'),
    getReigningOverrides()
  ]);
  if (token !== _PALM_PUB.renderToken) return;
  const teamById = {};
  allTeams.forEach(team => { teamById[team.id] = team; });
  _PALM_PUB.teamById = teamById;
  _PALM_PUB.compData = _palmBuildPublicCompData(recs, teamById, overrides);
  _PALM_PUB.compIdx = Math.max(0, Math.min(_PALM_PUB.compIdx || 0, Math.max(0, _PALM_PUB.compData.length - 1)));
  el.innerHTML = _palmVitrineShellHTML();
  _palmBindPublicPalmares(el);
  _palmRenderVitrine();
  _palmEnsureVisibilityBinding();
}
