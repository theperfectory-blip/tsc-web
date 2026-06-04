/* ============================================================
   SFX — Web Audio (versión original v1 + tada mejorado)
   ============================================================ */
(function () {
  let ctx = null;
  let masterGain = null;

  function getCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(duration = 0.5) {
    const c = getCtx();
    const len = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------------- Snare hit (v1) ---------------- */
  function snareHit(t, vol = 1) {
    const c = getCtx();

    // Noise (rattle)
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(0.2);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1000;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.7 * vol, t + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    src.connect(hp).connect(noiseGain).connect(masterGain);
    src.start(t); src.stop(t + 0.18);

    // Body (triangle thump)
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    const oscGain = c.createGain();
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.45 * vol, t + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain).connect(masterGain);
    osc.start(t); osc.stop(t + 0.12);
  }

  /* ---------------- Drum roll (v1) ---------------- */
  function playDrumRoll(durationMs) {
    const c = getCtx(); if (!c) return { stop: () => {} };
    const start = c.currentTime + 0.02;
    const totalSec = durationMs / 1000;
    const baseInterval = 0.040;

    const hits = [];
    let t = start;
    while (t < start + totalSec - 0.02) {
      const progress = (t - start) / totalSec;
      const ease = 0.35 + 0.65 * Math.pow(progress, 0.7);
      const interval = baseInterval * (1 - 0.25 * progress);
      const jitter = (Math.random() - 0.5) * 0.006;
      hits.push({ t: t + jitter, vol: ease * (0.85 + Math.random() * 0.3) });
      t += interval;
    }
    hits.forEach(h => snareHit(h.t, h.vol));

    return { stop() {} };
  }

  /* ---------------- Cymbal crash ---------------- */
  function crash(t, vol = 1, dur = 1.4) {
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.3);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 11000;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55 * vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp).connect(lp).connect(g).connect(masterGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  /* ---------------- Brass note ---------------- */
  function brassNote(t, freq, dur, vol = 0.5, vibrato = false) {
    const c = getCtx();
    const o1 = c.createOscillator(); o1.type = 'square';   o1.frequency.value = freq;
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq * 1.005;
    const o3 = c.createOscillator(); o3.type = 'triangle'; o3.frequency.value = freq * 0.5;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.linearRampToValueAtTime(3000, t + 0.06);
    lp.Q.value = 0.6;

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.025);
    g.gain.linearRampToValueAtTime(vol * 0.85, t + 0.12);
    g.gain.setValueAtTime(vol * 0.85, t + dur - 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o1.connect(lp); o2.connect(lp); o3.connect(lp);
    lp.connect(g).connect(masterGain);
    o1.start(t); o2.start(t); o3.start(t);
    o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02); o3.stop(t + dur + 0.02);

    if (vibrato) {
      const lfo = c.createOscillator(); lfo.frequency.value = 5.5;
      const lfoGain = c.createGain(); lfoGain.gain.value = freq * 0.012;
      lfo.connect(lfoGain).connect(o1.frequency);
      lfo.connect(lfoGain).connect(o2.frequency);
      lfo.start(t + 0.15); lfo.stop(t + dur);
    }
  }

  function playTada() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime + 0.01;
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.50;
    brassNote(t,        C5, 0.12, 0.30);
    brassNote(t + 0.10, E5, 0.12, 0.32);
    const tHold = t + 0.22;
    brassNote(tHold, C5, 1.10, 0.34, true);
    brassNote(tHold, E5, 1.10, 0.30, true);
    brassNote(tHold, G5, 1.10, 0.30, true);
    brassNote(tHold, C6, 1.10, 0.22, true);
    crash(tHold, 0.95, 1.3);
  }

  window.SFX = {
    enabled: true,
    unlock() { getCtx(); },
    setVolume(v) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); },
    playDrumRoll(ms) { if (!this.enabled) return { stop(){} }; return playDrumRoll(ms); },
    playTada()       { if (!this.enabled) return; playTada(); },
    playSnare()      { if (!this.enabled) return; const c = getCtx(); if (c) snareHit(c.currentTime + 0.01, 1); },
    setEnabled(b)    { this.enabled = !!b; }
  };
})();
