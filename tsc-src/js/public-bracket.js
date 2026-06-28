/* public-bracket.js — Renderers públicos broadcast de bracket y playoff.
   Wrappers sobre renderBracket / renderPlayoff (isAdmin=false).
   Cargado entre playoff.js y public.js (ver index.html).             */

async function _pubRenderBracketBroadcast(phaseId, containerId){
  await renderBracket(phaseId, containerId, false);
}

async function _pubRenderPlayoffBroadcast(phaseId, containerId){
  await renderPlayoff(phaseId, containerId, false);
}
