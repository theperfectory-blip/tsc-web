function _dataEsc(value){
  return String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);
}

async function renderAdmData(){
  const el=document.getElementById('adm-data-content');
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const seasonName = getSeasonName(currentSeason);
  el.innerHTML=`
  <div class="grid-2" style="margin-bottom:24px;">
    <div class="card" style="padding:18px;">
      <div style="font-family:'Barlow Condensed';font-weight:700;font-size:17px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Exportar datos</div>
      <p style="font-size:14px;color:var(--txt2);margin-bottom:14px;line-height:1.5;">Backup completo de toda la base de datos en JSON.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-primary" onclick="exportFullDB()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar todo</button>
        <button class="btn" onclick="exportSeason()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Solo ${_dataEsc(seasonName)}</button>
      </div>
    </div>
    <div class="card" style="padding:18px;">
      <div style="font-family:'Barlow Condensed';font-weight:700;font-size:17px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Importar datos</div>
      <p style="font-size:14px;color:var(--txt2);margin-bottom:14px;line-height:1.5;">Restaura desde un backup JSON.</p>
      <div class="form-group" style="margin-bottom:10px;">
        <label>Archivo JSON</label>
        <input type="file" id="import-file" accept=".json" style="padding:8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" onclick="importDB('merge')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Fusionar</button>
        <button class="btn btn-danger" onclick="importDB('overwrite')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Sobrescribir</button>
      </div>
    </div>
  </div>
  <div class="section-lbl">Información de la base de datos</div>
  <div class="card" style="padding:14px;" id="db-info"></div>`;
  await renderDBInfo();
}

async function renderDBInfo(){
  const el=document.getElementById('db-info');
  if(!el) return;
  const [teams,comps,phases,matches,coins,seasons,matchHistory,palmares]=await Promise.all([dbGetAll('teams'),dbGetAll('competitions'),dbGetAll('phases'),dbGetAll('matches'),dbGetAll('coins'),dbGetAll('seasons'),dbGetAll('matchHistory'),dbGetAll('palmares')]);
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
    ${[['Temporadas',seasons.length],['Equipos',teams.length],['Competiciones',comps.length],['Fases',phases.length],['Partidos',matches.length],['Transacciones',coins.length],['Historial',matchHistory.length],['Palmarés',palmares.length]].map(([l,v])=>`
    <div style="text-align:center;padding:10px;background:var(--card2);border-radius:var(--r);">
      <div style="font-family:'Bebas Neue';font-size:29px;color:var(--gold);">${v}</div>
      <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:0.5px;">${l}</div>
    </div>`).join('')}
  </div>`;
}

async function exportFullDB(){
  try{
    const entries=await Promise.all(STORES.map(async store=>[store,await dbGetAll(store)]));
    const stores=Object.fromEntries(entries);
    downloadJSON({
      version:'TSC_v5',
      schemaVersion:1,
      exportedAt:new Date().toISOString(),
      manifest:{stores:STORES.slice()},
      stores
    },`TSC_backup_${new Date().toISOString().split('T')[0]}.json`);
    showToast('Backup completo exportado');
  }catch(err){
    console.error('[Datos] Error exportando backup:',err);
    showToast('No se pudo exportar el backup','error');
  }
}

/* Export de UNA temporada. Es parcial: lleva solo lo de esa temporada (y el
   plantel completo), así que se marca `partial` y el import no deja usarlo
   para «Sobrescribir» (borraría las otras temporadas). Las fases no tienen
   `season`: se toman por las competiciones de la temporada (antes
   getForSeason('phases') las traía todas, MS-5.2). */
async function exportSeason(){
  try{
    const n=STATE.season;
    const comps=await dbGetAll('competitions',c=>c.season===n);
    const compIds=new Set(comps.map(c=>c.id));
    const [teams,phases,matches,coins,matchHistory,sorteo,sorteoEvents,calDayLabels]=await Promise.all([
      dbGetAll('teams'),
      dbGetAll('phases',p=>compIds.has(p.compId)),
      dbGetAll('matches',m=>m.season===n),
      dbGetAll('coins',c=>c.season===n),
      dbGetAll('matchHistory',h=>h.seasonRef===n),
      dbGetAll('sorteo',r=>r.season===n),
      dbGetAll('sorteoEvents',r=>r.season===n),
      dbGetAll('calDayLabels',r=>r.season===n),
    ]);
    const currentSeason=(await dbGetAll('seasons')).find(s=>s.number===n);
    const seasonName=getSeasonName(currentSeason);
    const stores={seasons:currentSeason?[currentSeason]:[],teams,competitions:comps,phases,matches,coins,matchHistory,sorteo,sorteoEvents,calDayLabels};
    downloadJSON({version:'TSC_v5',schemaVersion:1,partial:true,season:n,exportedAt:new Date().toISOString(),manifest:{stores:Object.keys(stores)},stores},
      `TSC_${seasonName}_${new Date().toISOString().split('T')[0]}.json`);
    showToast(seasonName+' exportada');
  }catch(err){
    console.error('[Datos] Error exportando temporada:',err);
    showToast('No se pudo exportar la temporada: '+dbErrorMsg(err),'error');
  }
}

function downloadJSON(data,filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

function _dataBackupStores(data){
  if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Formato de backup inválido');
  const source=data.stores && typeof data.stores==='object' && !Array.isArray(data.stores)
    ? data.stores
    : data;
  const result={};
  STORES.forEach(store=>{
    if(source[store]===undefined) return;
    if(!Array.isArray(source[store])) throw new Error(`Colección inválida: ${store}`);
    result[store]=source[store];
  });
  if(!Object.keys(result).length) throw new Error('El backup no contiene colecciones reconocidas');
  return result;
}

/* Campos mínimos de cada colección: los que la app usa para enlazar o
   mostrar. Un registro sin ellos rompe pantallas después de importar. */
const _DATA_REQUIRED={
  seasons:{number:'int'},
  teams:{name:'string'},
  competitions:{name:'string',season:'int'},
  phases:{compId:'int',type:'string'},
  matches:{phaseId:'int'},
  coins:{teamId:'int',amount:'number'},
  matchHistory:{golesA:'number',golesB:'number'},
  palmares:{teamId:'int',competition:'string'},
  'palmares-comps':{key:'string'},
  settings:{key:'string'},
  sorteo:{season:'int'},
  sorteoEvents:{season:'int'},
  calDayLabels:{date:'string'},
};
function _dataTypeOk(v,type){
  if(type==='int') return Number.isSafeInteger(v);
  if(type==='number') return typeof v==='number' && Number.isFinite(v);
  if(type==='string') return typeof v==='string' && v.trim()!=='';
  return true;
}

function _dataValidateRecord(store,item,index){
  if(!item || typeof item!=='object' || Array.isArray(item)) throw new Error(`Registro inválido en ${store} #${index+1}`);
  const record={...item};
  const id=record.id;
  if(typeof id!=='number' || !Number.isSafeInteger(id) || id<1) throw new Error(`ID inválido en ${store} #${index+1}`);
  for(const [field,type] of Object.entries(_DATA_REQUIRED[store]||{})){
    if(!_dataTypeOk(record[field],type)) throw new Error(`${store} #${id}: falta «${field}» o no es válido`);
  }
  return record;
}

/* Validación pura (sin tocar la DB) de una store completa del backup.
   Se usa para prevalidar TODO antes de borrar o escribir nada (ver _dataValidateBackup). */
function _dataValidateStoreItems(store,items){
  const seen=new Set();
  const validated=[];
  for(let index=0;index<items.length;index++){
    const record=_dataValidateRecord(store,items[index],index);
    if(seen.has(record.id)) throw new Error(`ID duplicado en ${store}: ${record.id}`);
    seen.add(record.id);
    validated.push(record);
  }
  return validated;
}

/* Prevalida TODAS las stores del backup antes de cualquier mutación: un
   backup inválido (JSON corrupto, colección con forma inválida, registro sin
   id o sin sus campos mínimos, ID duplicado) no produce ninguna escritura. */
function _dataValidateBackup(backupStores){
  const validated={};
  for(const store of Object.keys(backupStores)){
    validated[store]=_dataValidateStoreItems(store,backupStores[store]);
  }
  return validated;
}

/* Referencias rotas dentro del backup (no bloquean: un backup viejo puede
   tenerlas, pero el admin las ve antes de confirmar). */
function _dataWarnings(v){
  const out=[];
  const ids=store=>new Set((v[store]||[]).map(r=>r.id));
  if(v.phases && v.competitions){
    const c=ids('competitions'); const n=v.phases.filter(p=>!c.has(p.compId)).length;
    if(n) out.push(`${n} fase${n===1?'':'s'} sin su competición`);
  }
  if(v.matches && v.phases){
    const ph=ids('phases'); const n=v.matches.filter(m=>!ph.has(m.phaseId)).length;
    if(n) out.push(`${n} partido${n===1?'':'s'} sin su fase`);
  }
  if(v.matchHistory && v.matches){
    const ms=ids('matches'); const n=v.matchHistory.filter(h=>h.source==='live' && !ms.has(h.matchRef)).length;
    if(n) out.push(`${n} registro${n===1?'':'s'} del historial sin su partido`);
  }
  return out;
}

/* Aplica el import (H-19, MS-5.13):
   1. Lee el estado actual de las colecciones afectadas y DESCARGA una copia
      («TSC_antes_de_importar_…json»), que se puede volver a importar.
   2. Escribe primero todos los registros del backup y recién después borra
      los que sobran (sobrescribir): la base nunca queda vacía a mitad.
   3. Si todo entra en un lote (500 escrituras), es un solo dbWriteBatch:
      atómico. Si no, va por lotes y, si uno falla, revierte lo ya aplicado
      al estado leído en el paso 1. Si la reversión también falla, queda la
      copia descargada. */
async function _dataApplyImport(mode,validated){
  const stores=STORES.filter(s=>validated[s]);
  const before={};
  for(const store of stores) before[store]=await dbGetAll(store);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  downloadJSON({version:'TSC_v5',schemaVersion:1,kind:'pre-import',exportedAt:new Date().toISOString(),manifest:{stores},stores:before},
    `TSC_antes_de_importar_${stamp}.json`);

  const ops=[];
  for(const store of stores) validated[store].forEach(rec=>ops.push({type:'set',store,data:rec}));
  if(mode==='overwrite'){
    for(const store of stores){
      const keep=new Set(validated[store].map(r=>r.id));
      before[store].filter(r=>!keep.has(r.id)).forEach(r=>ops.push({type:'delete',store,id:r.id}));
    }
  }

  let applied=0;
  try{
    for(let i=0;i<ops.length;i+=DB_BATCH_MAX){
      const chunk=ops.slice(i,i+DB_BATCH_MAX);
      await dbWriteBatch(chunk);
      applied+=chunk.length;
    }
  }catch(err){
    err.rolledBack = applied===0 ? true : await _dataRollback(ops.slice(0,applied),before);
    throw err;
  }

  for(const store of stores){
    const maxId=validated[store].reduce((mx,r)=>Math.max(mx,r.id),0);
    if(maxId) await dbEnsureCounterAtLeast(store,maxId);
  }
  if(typeof dbMirrorInvalidate==='function') dbMirrorInvalidate(...stores);
  return {stores,writes:ops.length,batches:Math.ceil(ops.length/DB_BATCH_MAX)};
}

/* Deshace las operaciones ya aplicadas, volviendo cada documento tocado a
   como estaba antes (o borrándolo si no existía). true si lo logró. */
async function _dataRollback(appliedOps,before){
  const prev=new Map();
  for(const [store,rows] of Object.entries(before)) rows.forEach(r=>prev.set(store+'/'+r.id,r));
  const seen=new Set();
  const undo=[];
  for(const op of appliedOps){
    const id=op.type==='delete'?op.id:op.data.id;
    const k=op.store+'/'+id;
    if(seen.has(k)) continue;
    seen.add(k);
    const old=prev.get(k);
    undo.push(old ? {type:'set',store:op.store,data:old} : {type:'delete',store:op.store,id});
  }
  try{
    for(let i=0;i<undo.length;i+=DB_BATCH_MAX) await dbWriteBatch(undo.slice(i,i+DB_BATCH_MAX));
    return true;
  }catch(e){
    console.error('[Datos] La reversión del import falló:',e);
    return false;
  }
}

let _dataBusy=false;

async function importDB(mode){
  if(_dataBusy) return;
  const file=document.getElementById('import-file')?.files[0];
  if(!file){showToast('Selecciona un archivo JSON','error');return;}
  let validatedStores, warnings, partial=false;
  try{
    const data=JSON.parse(await file.text());
    partial = data?.partial===true || (data?.season!=null && !data?.stores);
    const backupStores=_dataBackupStores(data);
    validatedStores=_dataValidateBackup(backupStores); // valida TODO antes de mostrar el confirm o tocar la DB
    warnings=_dataWarnings(validatedStores);
  }catch(err){
    console.error('[Datos] Error leyendo backup:',err);
    showToast('No se pudo leer el backup: '+err.message,'error');
    return;
  }
  if(mode==='overwrite' && partial){
    showToast('Este archivo es el export de una sola temporada: solo se puede «Fusionar». Para sobrescribir usa un backup completo («Exportar todo»).','error');
    return;
  }
  const counts=Object.entries(validatedStores).map(([s,r])=>`${s} (${r.length})`).join(', ');
  const pre=' Antes de escribir se descarga una copia de lo que hay ahora en esas colecciones (TSC_antes_de_importar_…json).';
  const warn=warnings.length?` Atención: el archivo trae ${warnings.join(', ')}.`:'';
  const msg=mode==='overwrite'
    ?`Las colecciones ${counts} quedarán exactamente como en el archivo: se borra lo que no esté en él. Las demás colecciones no se tocan.${pre}${warn}`
    :`Se agregan o reemplazan (por ID) los registros de ${counts}. No se borra nada.${pre}${warn}`;
  showConfirm(mode==='overwrite'?'¿Sobrescribir datos?':'¿Fusionar datos?',msg,async()=>{
    if(_dataBusy) return;
    _dataBusy=true;
    try{
      const r=await _dataApplyImport(mode,validatedStores);
      await loadSeasons();
      showToast(`Datos importados: ${r.writes} escritura${r.writes===1?'':'s'}${r.batches>1?` en ${r.batches} lotes`:' en un solo lote'}`);
    }catch(err){
      console.error('[Datos] Error importando backup:',err);
      const how = err.rolledBack===true
        ? 'No se cambió nada (se revirtió lo aplicado).'
        : 'La base pudo quedar a medias: importa la copia TSC_antes_de_importar_… que se descargó.';
      showToast(`No se pudo importar: ${dbErrorMsg(err)} ${how}`,'error');
    }finally{
      _dataBusy=false;
      renderAdmData();
    }
  });
}


/* ----------------------------------------------------------
   TEMPORADAS
   ---------------------------------------------------------- */
