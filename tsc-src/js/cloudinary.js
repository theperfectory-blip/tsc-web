'use strict';
/* ============================================================
   SUBIDA DE IMÁGENES — Cloudinary (logos de equipos)
   ------------------------------------------------------------
   En vez de guardar la imagen como base64 dentro del documento,
   se sube a Cloudinary y se guarda SOLO la URL (un string corto).
   Usa un "upload preset UNSIGNED" → no se expone ningún secreto
   en el cliente; es seguro tenerlo en el código.

   👉 Reemplaza los "TODO" con los datos de tu cuenta Cloudinary:
      - cloudName: el "Cloud name" del dashboard.
      - uploadPreset: el nombre de un preset creado en modo Unsigned.
   ============================================================ */
const CLOUDINARY_CONFIG = {
  cloudName:    'dnjijd8mx',  // Cloud name de la cuenta TSC
  uploadPreset: 'tsc_logos',  // upload preset Unsigned (la carpeta tsc-logos ya va en el preset)
  folder:       '',           // vacío: la carpeta la define el preset (evita duplicar)
};

function cloudReady(){
  const c = CLOUDINARY_CONFIG;
  return !!(c.cloudName && c.cloudName!=='TODO' && c.uploadPreset && c.uploadPreset!=='TODO');
}

/* Sube un File/Blob a Cloudinary y devuelve la secure_url (https). */
async function uploadImageToCloud(file){
  if(!cloudReady()) throw new Error('Cloudinary no está configurado (revisa js/cloudinary.js).');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  if(CLOUDINARY_CONFIG.folder) fd.append('folder', CLOUDINARY_CONFIG.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
    method: 'POST', body: fd,
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok || !data.secure_url){
    throw new Error(data?.error?.message || `Error ${res.status} al subir la imagen`);
  }
  return data.secure_url;
}
