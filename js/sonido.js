// Sonido sintetizado con WebAudio: zumbidos, ronquido, cachetazo, click del velador.
let ac = null, maestro = null;
const zumbidos = new Map();

export function iniciarSonido() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  maestro = ac.createGain();
  maestro.gain.value = 0.6;
  maestro.connect(ac.destination);
}

export function silenciar(si) { if (maestro) maestro.gain.value = si ? 0 : 0.6; }

function ruidoBuffer(seg) {
  const b = ac.createBuffer(1, ac.sampleRate * seg, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// un oscilador por mosquito; el volumen sigue a qué tan cerca está de tu mosquito
export function actualizarZumbidos(jugadores, miId) {
  if (!ac) return;
  const yo = jugadores.find(p => p.id === miId);
  const vivos = new Set();
  jugadores.forEach((p, i) => {
    vivos.add(p.id);
    let z = zumbidos.get(p.id);
    if (!z) {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.frequency.value = 6 + i;
      lfoG.gain.value = 18;
      lfo.connect(lfoG).connect(osc.frequency);
      const filtro = ac.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.value = 0;
      osc.connect(filtro).connect(g).connect(maestro);
      osc.start(); lfo.start();
      z = { osc, filtro, g, base: 540 + i * 55 };
      zumbidos.set(p.id, z);
    }
    let vol = 0;
    if (!p.muerto) {
      const d = yo ? Math.hypot(p.x - yo.x, p.y - yo.y) : 400;
      vol = p.id === miId ? 0.07 : 0.06 * Math.max(0, 1 - d / 700);
      if (p.fuerte) vol *= 1.8;
    }
    const ahora = ac.currentTime;
    z.g.gain.setTargetAtTime(vol, ahora, 0.05);
    z.osc.frequency.setTargetAtTime(z.base + (p.fuerte ? 90 : 0), ahora, 0.05);
    z.filtro.frequency.setTargetAtTime(z.base * 1.6, ahora, 0.05);
  });
  for (const [id, z] of zumbidos) if (!vivos.has(id)) { z.g.gain.value = 0; z.osc.stop(); zumbidos.delete(id); }
}

export function cachetazo() {
  if (!ac) return;
  const s = ac.createBufferSource();
  s.buffer = ruidoBuffer(0.25);
  const f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1800;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.9, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
  s.connect(f).connect(g).connect(maestro);
  s.start();
}

export function clickVelador() {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = 1400;
  g.gain.setValueAtTime(0.25, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
  o.connect(g).connect(maestro);
  o.start(); o.stop(ac.currentTime + 0.06);
}

export function ronquido() {
  if (!ac) return;
  const s = ac.createBufferSource();
  s.buffer = ruidoBuffer(1.4);
  const f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 260;
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.5);
  g.gain.linearRampToValueAtTime(0, t + 1.3);
  s.connect(f).connect(g).connect(maestro);
  s.start();
}
