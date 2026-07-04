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

async function exportSeason(){
  const [teams,comps,phases,matches,coins]=await Promise.all([getForSeason('teams'),getForSeason('competitions'),getForSeason('phases'),getForSeason('matches'),dbGetAll('coins',c=>c.season===STATE.season)]);
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const seasonName = getSeasonName(currentSeason);
  downloadJSON({version:'TSC_v4',season:STATE.season,exportedAt:new Date().toISOString(),teams,competitions:comps,phases,matches,coins},`TSC_${seasonName}_${new Date().toISOString().split('T')[0]}.json`);
  showToast(seasonName+' exportada');
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

function _dataValidateRecord(store,item,index){
  if(!item || typeof item!=='object' || Array.isArray(item)) throw new Error(`Registro inválido en ${store} #${index+1}`);
  const record={...item};
  const id=record.id;
  if(typeof id!=='number' || !Number.isSafeInteger(id) || id<1) throw new Error(`ID inválido en ${store} #${index+1}`);
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

/* Prevalida TODAS las stores del backup antes de cualquier mutación.
   Garantía: un backup estructuralmente inválido (JSON corrupto, colección con forma
   inválida, registro sin id numérico válido, ID duplicado) no produce ninguna escritura
   ni borrado. NO es una transacción atómica: un fallo de red/cuota/permisos DURANTE las
   escrituras (después de pasar esta validación) todavía puede dejar una restauración parcial. */
function _dataValidateBackup(backupStores){
  const validated={};
  for(const store of Object.keys(backupStores)){
    validated[store]=_dataValidateStoreItems(store,backupStores[store]);
  }
  return validated;
}

async function _dataImportStore(store,items){
  let maxId=0;
  for(const record of items){
    maxId=Math.max(maxId,record.id);
    await dbPut(store,record);
  }
  if(maxId && typeof dbEnsureCounterAtLeast==='function') await dbEnsureCounterAtLeast(store,maxId);
}

async function importDB(mode){
  const file=document.getElementById('import-file')?.files[0];
  if(!file){showToast('Selecciona un archivo JSON','error');return;}
  let validatedStores;
  try{
    const data=JSON.parse(await file.text());
    const backupStores=_dataBackupStores(data);
    validatedStores=_dataValidateBackup(backupStores); // valida TODO antes de mostrar el confirm o tocar la DB
  }catch(err){
    console.error('[Datos] Error leyendo backup:',err);
    showToast('No se pudo leer el backup: '+err.message,'error');
    return;
  }
  const storeNames=Object.keys(validatedStores).join(', ');
  const msg=mode==='overwrite'
    ?`Esto BORRARÁ los datos actuales de: ${storeNames}. Las demás colecciones no incluidas en este backup no se tocan.`
    :`Se fusionarán con los datos actuales de: ${storeNames}. Los registros del backup con el mismo ID que uno existente lo REEMPLAZARÁN (no se duplican ni se saltan).`;
  showConfirm(mode==='overwrite'?'¿Sobrescribir datos?':'¿Fusionar datos?',msg,async()=>{
    try{
      if(mode==='overwrite'){
        for(const store of Object.keys(validatedStores)){
          const all=await dbGetAll(store);
          for(const item of all) await dbDelete(store,item.id);
        }
      }
      for(const store of STORES){
        if(!validatedStores[store]) continue;
        await _dataImportStore(store,validatedStores[store]);
      }
      await loadSeasons();
      showToast('Datos importados correctamente');
      renderAdmData();
    }catch(err){
      console.error('[Datos] Error importando backup:',err);
      showToast('No se pudo importar el backup','error');
    }
  });
}


/* ----------------------------------------------------------
   TEMPORADAS
   ---------------------------------------------------------- */
