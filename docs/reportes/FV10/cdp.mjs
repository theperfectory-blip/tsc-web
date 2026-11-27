/* Driver mínimo de Chrome DevTools Protocol para FV10 (sin dependencias).
   Uso: node cdp.mjs acciones.json
   Acciones: {"eval":"expr"} {"shot":"ruta.png"} {"view":[w,h]}
             {"drag":[x1,y1,x2,y2]} {"click":[x,y]} {"wait":ms} {"url":"..."} */
import { writeFileSync, readFileSync } from 'node:fs';

const PUERTO = process.env.CDP_PORT || 9333;
const fuente = process.argv[2] || '[]';
const acciones = JSON.parse(fuente.trim().startsWith('[') ? fuente : readFileSync(fuente, 'utf8'));

async function pagina(){
  for (let i = 0; i < 60; i++){
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json`);
      const l = await r.json();
      const p = l.find(t => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('no encontré la pestaña de Chrome en el puerto ' + PUERTO);
}

const ws = new WebSocket(await pagina());
await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });

let id = 0;
const pendientes = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)){
    const { ok, mal } = pendientes.get(m.id);
    pendientes.delete(m.id);
    m.error ? mal(new Error(JSON.stringify(m.error))) : ok(m.result);
  }
};
function cmd(method, params){
  const n = ++id;
  ws.send(JSON.stringify({ id: n, method, params: params || {} }));
  return new Promise((ok, mal) => pendientes.set(n, { ok, mal }));
}
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

await cmd('Page.enable');
await cmd('Runtime.enable');

const salida = [];
for (const a of acciones){
  if (a.view){
    await cmd('Emulation.setDeviceMetricsOverride', { width: a.view[0], height: a.view[1], deviceScaleFactor: 1, mobile: !!a.movil });
  } else if (a.url){
    await cmd('Page.navigate', { url: a.url });
  } else if (a.wait){
    await esperar(a.wait);
  } else if (a.eval){
    const r = await cmd('Runtime.evaluate', { expression: a.eval, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) salida.push({ eval: a.eval, excepcion: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '') });
    else salida.push({ eval: a.eval, valor: r.result.value });
  } else if (a.shot){
    const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(a.shot, Buffer.from(r.data, 'base64'));
    salida.push({ shot: a.shot });
  } else if (a.click){
    const [x, y] = a.click;
    await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await esperar(40);
    await cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  } else if (a.drag){
    const [x1, y1, x2, y2] = a.drag;
    await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
    await cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', buttons: 1, clickCount: 1 });
    for (let k = 1; k <= 8; k++){
      await esperar(30);
      await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * k / 8, y: y1 + (y2 - y1) * k / 8, button: 'left', buttons: 1 });
    }
    await esperar(60);
    await cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', buttons: 0, clickCount: 1 });
  }
}
console.log(JSON.stringify(salida, null, 1));
ws.close();
