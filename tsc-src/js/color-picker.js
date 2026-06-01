const PALETTE = ['#C9A84C','#3B82F6','#25A864','#E84040','#8B5CF6','#F97316','#EC4899','#14B8A6','#6366F1','#EF4444','#10B981','#64748B'];

/* ----------------------------------------------------------
   COLOR PICKER — rueda hexagonal
   ---------------------------------------------------------- */
(function injectColorPickerStyles(){
  const s = document.createElement('style');
  s.textContent = `
  #color-picker-overlay{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);}
  #color-picker-box{background:var(--card);border:1px solid var(--brd2);border-radius:var(--rl);padding:16px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.4);}
  #color-picker-box h4{font-family:'Barlow Condensed';font-weight:700;font-size:17px;margin-bottom:12px;color:var(--txt);}
  .cp-hex-grid{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:12px;}
  .cp-hex{width:24px;height:24px;border-radius:4px;cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;border:2px solid transparent;}
  .cp-hex:hover{transform:scale(1.2);box-shadow:0 0 0 2px #fff;}
  .cp-hex.selected{border-color:#fff;transform:scale(1.15);}
  .cp-custom-row{display:flex;gap:8px;align-items:center;margin-top:4px;}
  .cp-custom-row input[type=color]{width:36px;height:36px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px;}
  .cp-custom-row input[type=text]{flex:1;padding:6px 8px;background:var(--card2);border:1px solid var(--brd2);border-radius:var(--r);color:var(--txt);font-size:14px;font-family:monospace;}
  .cp-preview{width:36px;height:36px;border-radius:6px;border:1px solid var(--brd2);flex-shrink:0;}
  `;
  document.head.appendChild(s);
})();

// Colores de la rueda — organizados por tono
const COLOR_WHEEL = [
  // Rojos/naranjas
  '#FF0000','#FF3300','#FF6600','#FF9900','#FFCC00','#FFE066',
  // Amarillos/verdes
  '#FFFF00','#CCFF00','#99FF00','#66FF00','#33FF00','#00FF00',
  // Verdes/cianos
  '#00FF33','#00FF66','#00FF99','#00FFCC','#00FFFF','#00CCFF',
  // Azules/violetas
  '#0099FF','#0066FF','#0033FF','#0000FF','#3300FF','#6600FF',
  // Violetas/magentas
  '#9900FF','#CC00FF','#FF00FF','#FF00CC','#FF0099','#FF0066',
  // Oscuros
  '#990000','#994400','#997700','#557700','#005500','#004499',
  '#220066','#660033','#333333','#555555','#777777','#999999',
  // Pastel
  '#FFAAAA','#FFCCAA','#FFFFAA','#AAFFAA','#AAFFFF','#AAAAFF',
  // Dorados/especiales
  '#C9A84C','#B8860B','#DAA520','#CD853F','#A0522D','#8B4513',
];

function openColorPicker(currentColor, onSelect){
  // Cerrar picker anterior si existe
  document.getElementById('color-picker-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'color-picker-overlay';

  let tempColor = currentColor || '#3B82F6';

  const render = () => {
    overlay.innerHTML = `
    <div id="color-picker-box">
      <h4>Elegir color</h4>
      <div class="cp-hex-grid">
        ${COLOR_WHEEL.map(c=>`
          <div class="cp-hex${tempColor===c?' selected':''}" data-color="${c}"
               style="background:${c};" title="${c}"></div>
        `).join('')}
      </div>
      <div class="cp-custom-row">
        <input type="color" id="cp-native" value="${tempColor}" title="Color personalizado">
        <input type="text" id="cp-hex-input" value="${tempColor}" placeholder="#RRGGBB" maxlength="7">
        <div class="cp-preview" id="cp-preview" style="background:${tempColor};"></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
        <button class="btn btn-sm" id="cp-cancel">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="cp-confirm">Aplicar</button>
      </div>
    </div>`;

    // Eventos hexágonos
    overlay.querySelectorAll('.cp-hex').forEach(el=>{
      el.addEventListener('click',()=>{
        tempColor = el.dataset.color;
        render();
      });
    });

    // Input color nativo
    overlay.querySelector('#cp-native').addEventListener('input', e=>{
      tempColor = e.target.value;
      overlay.querySelector('#cp-hex-input').value = tempColor;
      overlay.querySelector('#cp-preview').style.background = tempColor;
      overlay.querySelectorAll('.cp-hex').forEach(h=>h.classList.toggle('selected', h.dataset.color===tempColor));
    });

    // Input texto hex
    overlay.querySelector('#cp-hex-input').addEventListener('input', e=>{
      const v = e.target.value;
      if(/^#[0-9A-Fa-f]{6}$/.test(v)){
        tempColor = v;
        overlay.querySelector('#cp-native').value = tempColor;
        overlay.querySelector('#cp-preview').style.background = tempColor;
        overlay.querySelectorAll('.cp-hex').forEach(h=>h.classList.toggle('selected', h.dataset.color===tempColor));
      }
    });

    // Cancelar
    overlay.querySelector('#cp-cancel').addEventListener('click',()=>overlay.remove());

    // Aplicar
    overlay.querySelector('#cp-confirm').addEventListener('click',()=>{
      onSelect(tempColor);
      overlay.remove();
    });
  };

  // Click fuera cierra
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  render();
  document.body.appendChild(overlay);
}
