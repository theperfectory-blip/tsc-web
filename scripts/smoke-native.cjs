// Solo desarrollo (no se publica). Prueba updater.js y push.js con un Capacitor
// simulado (Android nativo): comparación de versiones, manifiesto inválido, 404,
// descarga concurrente, permiso de notificaciones y alta/baja del token FCM.
// Uso: node scripts/smoke-native.cjs   (MS-4.9; el teléfono real sigue siendo la referencia)
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const root=require('path').join(__dirname,'..','tsc-src','js')+require('path').sep;
function ctx(plugins){
  const store={};
  const win={ Capacitor:{ isNativePlatform:()=>true, getPlatform:()=>'android', Plugins:plugins } };
  const sandbox={ window:win, localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}}, console, document:{dispatchEvent(){},} , CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail}, Intl, setTimeout, Promise };
  sandbox.window.localStorage=sandbox.localStorage; sandbox.self=sandbox.window; vm.createContext(sandbox); return {sandbox,store};
}
(async()=>{
  // ---- UPDATER ----
  const run=async(info,http)=>{ const {sandbox}=ctx({App:{getInfo:async()=>info},CapacitorHttp:{request:http},AppUpdater:{canInstall:async()=>({granted:true}),downloadAndInstall:async()=>{await new Promise(r=>setTimeout(r,50))}}}); vm.runInContext(fs.readFileSync(root+'updater.js','utf8'),sandbox); return sandbox.window.UPDATER; };
  let U=await run({build:'19',version:'1.6.3'},async()=>({status:200,data:'{"versionCode":19,"versionName":"1.6.3","apkUrl":"https://github.com/x/y.apk"}'}));
  let r=await U.check(); assert(r.ok&&!r.hasUpdate&&r.currentCode===19,'igual'); console.log('ok: misma versión -> sin update');
  U=await run({build:'9',version:'1.9.0'},async()=>({status:200,data:{versionCode:10,versionName:'1.10.0',apkUrl:'u',notes:'<b>x</b>'}}));
  r=await U.check(); assert(r.ok&&r.hasUpdate&&r.remoteName==='1.10.0','1.10 > 1.9 por versionCode'); console.log('ok: 1.10.0 vs 1.9.0 compara por versionCode y acepta objeto ya parseado');
  U=await run({build:'19'},async()=>({status:404,data:''})); r=await U.check(); assert(!r.ok&&r.reason==='network-error'&&r.status===404); console.log('ok: 404 -> network-error');
  U=await run({build:'19'},async()=>({status:200,data:'no-json'})); r=await U.check(); assert(r.reason==='bad-manifest'); console.log('ok: JSON inválido -> bad-manifest');
  U=await run({build:'19'},async()=>({status:200,data:'{"versionName":"x"}'})); r=await U.check(); assert(r.reason==='bad-manifest'); console.log('ok: sin versionCode -> bad-manifest');
  U=await run({build:'19'},async()=>{throw new Error('offline')}); r=await U.check(); assert(r.reason==='network-error'); console.log('ok: sin red -> network-error');
  U=await run({build:'abc'},async()=>({status:200,data:'{}'})); r=await U.check(); assert(r.reason==='app-info-error'); console.log('ok: build no numérico -> app-info-error');
  U=await run({build:'19'},async()=>({status:200,data:'{}'}));
  const a=U.downloadAndInstall('https://github.com/a.apk'); const b=await U.downloadAndInstall('https://github.com/a.apk'); assert(b.reason==='already-downloading'); assert((await a).ok); assert((await U.downloadAndInstall('')).reason==='missing-url'); console.log('ok: segunda descarga concurrente rechazada; url vacía rechazada');
  // ---- PUSH ----
  const pushRun=async(perm,{token='tok1234567890abcdef',user=true}={})=>{
    const listeners={}; const updates=[];
    const pn={ addListener:(n,f)=>{listeners[n]=f}, createChannel:async()=>{}, checkPermissions:async()=>({receive:perm.initial}), requestPermissions:async()=>({receive:perm.afterAsk}), register:async()=>{ setTimeout(()=>listeners.registration&&listeners.registration({value:token}),10) }, removeAllDeliveredNotifications:async()=>{} };
    const {sandbox,store}=ctx({PushNotifications:pn});
    sandbox.AUTH=user?{user:{uid:'u1'},profile:{timezone:'America/Santiago'}}:{user:null};
    const FV={arrayUnion:v=>({u:v}),arrayRemove:v=>({r:v})};
    sandbox.firebase={firestore:Object.assign(()=>({collection:()=>({doc:()=>({update:async d=>{updates.push(d)}})})}),{FieldValue:FV})};
    vm.runInContext(fs.readFileSync(root+'push.js','utf8'),sandbox);
    return {P:sandbox.window.PUSH,store,updates};
  };
  let t=await pushRun({initial:'prompt',afterAsk:'denied'}); let res=await t.P.enable(); assert(!res.ok&&res.reason==='permission-denied'&&t.store.tsc_push_enabled==='0'); console.log('ok: permiso denegado -> flag apagado, sin token');
  t=await pushRun({initial:'prompt',afterAsk:'granted'}); res=await t.P.enable(); await new Promise(r=>setTimeout(r,60)); assert(res.ok&&t.store.tsc_push_enabled==='1'&&t.store.tsc_push_token==='tok1234567890abcdef'); assert(t.updates.some(u=>u.fcmTokens&&u.fcmTokens.u==='tok1234567890abcdef'&&u.pushEnabled===true)); console.log('ok: permiso concedido -> token local y arrayUnion en users/{uid}');
  t=await pushRun({initial:'prompt',afterAsk:'granted'},{user:false}); res=await t.P.enable(); await new Promise(r=>setTimeout(r,60)); assert(t.updates.length===0&&t.store.tsc_push_token); res=null; console.log('ok: invitado -> token solo local, ninguna escritura');
  t=await pushRun({initial:'granted',afterAsk:'granted'}); await t.P.enable(); await new Promise(r=>setTimeout(r,60)); await t.P.clearUserToken(); assert(t.updates.some(u=>u.fcmTokens&&u.fcmTokens.r==='tok1234567890abcdef'&&u.pushEnabled===false)); console.log('ok: cerrar sesión -> arrayRemove del token y pushEnabled=false');
  await t.P.disable(); assert(t.store.tsc_push_enabled==='0'&&!t.store.tsc_push_token); console.log('ok: disable limpia flag y token local');
  // data de notificación desconocida / no objeto no rompe
  t.P.handleNotificationData(null); t.P.handleNotificationData('x'); t.P.handleNotificationData({section:'otra'}); console.log('ok: handleNotificationData tolera entradas raras');
})().catch(e=>{console.error('FALLA',e.message);process.exit(1)});
