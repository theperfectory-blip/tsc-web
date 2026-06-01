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
        <button class="btn btn-primary" onclick="exportFullDB()">📥 Exportar todo</button>
        <button class="btn" onclick="exportSeason()">📥 Solo ${seasonName}</button>
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
        <button class="btn btn-primary" onclick="importDB('merge')">📤 Fusionar</button>
        <button class="btn btn-danger" onclick="importDB('overwrite')">⚠ Sobrescribir</button>
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
  const [teams,comps,phases,matches,coins,seasons,matchHistory]=await Promise.all([dbGetAll('teams'),dbGetAll('competitions'),dbGetAll('phases'),dbGetAll('matches'),dbGetAll('coins'),dbGetAll('seasons'),dbGetAll('matchHistory')]);
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
    ${[['Temporadas',seasons.length],['Equipos',teams.length],['Competiciones',comps.length],['Fases',phases.length],['Partidos',matches.length],['Transacciones',coins.length],['Historial',matchHistory.length]].map(([l,v])=>`
    <div style="text-align:center;padding:10px;background:var(--card2);border-radius:var(--r);">
      <div style="font-family:'Bebas Neue';font-size:29px;color:var(--gold);">${v}</div>
      <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:0.5px;">${l}</div>
    </div>`).join('')}
  </div>`;
}

async function exportFullDB(){
  const [teams,comps,phases,matches,coins,seasons,matchHistory]=await Promise.all([dbGetAll('teams'),dbGetAll('competitions'),dbGetAll('phases'),dbGetAll('matches'),dbGetAll('coins'),dbGetAll('seasons'),dbGetAll('matchHistory')]);
  downloadJSON({version:'TSC_v4',exportedAt:new Date().toISOString(),teams,competitions:comps,phases,matches,coins,seasons,matchHistory},`TSC_backup_${new Date().toISOString().split('T')[0]}.json`);
  showToast('Backup exportado');
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

async function importDB(mode){
  const file=document.getElementById('import-file')?.files[0];
  if(!file){showToast('Selecciona un archivo JSON','error');return;}
  const msg=mode==='overwrite'?'Esto BORRARÁ todos los datos actuales.':'Se fusionarán con los datos actuales.';
  showConfirm(mode==='overwrite'?'¿Sobrescribir datos?':'¿Fusionar datos?',msg,async()=>{
    try{
      const data=JSON.parse(await file.text());
      if(mode==='overwrite'){
        for(const store of STORES){const all=await dbGetAll(store);for(const item of all)await dbDelete(store,item.id);}
      }
      const storeMap={teams:'teams',competitions:'competitions',phases:'phases',matches:'matches',coins:'coins',seasons:'seasons',matchHistory:'matchHistory'};
      for(const [key,store] of Object.entries(storeMap)){
        for(const item of (data[key]||[])){
          if(store==='matchHistory' && item.id!=null){
            await dbAdd(store, item); // preservar IDs históricos
          } else {
            const {id,...rest}=item;
            await dbAdd(store,rest);
          }
        }
      }
      await loadSeasons();
      showToast('Datos importados correctamente');
      renderAdmData();
    }catch(err){showToast('Error: '+err.message,'error');}
  });
}


/* ----------------------------------------------------------
   TEMPORADAS
   ---------------------------------------------------------- */
