// Dibuja el cuarto, al humano dormido y a los mosquitos en un canvas de 1280×720.
// Estilo low-poly plano, de noche, como el clip 3D de Oliver.
import { W, H, OREJA, LAMPARA, VENTANA, HAMACA, ESPIRAL, iluminado, puntoHamaca, humoX } from './sim.js';

const C = {
  noche: '#141522', pared: '#1f1d2b', pared2: '#262335', piso: '#2b2018', madera: '#4a2c17',
  sabana: '#5d6a8a', sabana2: '#4c5878', almohada: '#c9c1b4', piel: '#d9a57c', piel2: '#bf8a63',
  pelo: '#3a2618', luna: '#e8efff', pantalla: '#ffb35a', cuerpo: '#76829a', cuerpo2: '#5a657b',
};

function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function circulo(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function escena(ctx, est, t) {
  if (est.escenario === 'patio') patio(ctx, est, t);
  else cuarto(ctx, est, t);
}

// LA FINAL: patio de noche, el humano en una hamaca que se mece, la espiral humeando y viento
function patio(ctx, est, t) {
  // cielo y estrellas
  const cielo = ctx.createLinearGradient(0, 0, 0, 620);
  cielo.addColorStop(0, '#0a0f2c'); cielo.addColorStop(1, '#1d2347');
  ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = (i * 337) % W, y = (i * 151) % 330, b = 0.4 + 0.4 * Math.sin(t * 2 + i);
    circulo(ctx, x, y, 1.4, `rgba(220,230,255,${b})`);
  }
  circulo(ctx, 360, 90, 34, C.luna);
  circulo(ctx, 348, 82, 32, '#0f1533');
  // medianera con ligustrina (de acá salen los mosquitos)
  poly(ctx, [0, 380, W, 400, W, 620, 0, 620], '#2a2638');
  for (let x = 0; x < W; x += 80) poly(ctx, [x, 382 + x / 64, x + 78, 383 + x / 64, x + 78, 620, x, 620], x % 160 ? '#2f2a40' : '#2a2638');
  for (const [x, y, r] of [[110, 300, 90], [210, 270, 80], [60, 220, 70], [250, 350, 70], [150, 380, 80]]) circulo(ctx, x, y, r, '#1c3326');
  for (const [x, y, r] of [[130, 260, 50], [200, 320, 45], [80, 330, 40]]) circulo(ctx, x, y, r, '#244233');
  // baldosas del patio
  ctx.fillStyle = '#3a2f2a'; ctx.fillRect(0, 620, W, 100);
  ctx.strokeStyle = '#2c2420'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 620); ctx.lineTo(x - 30, 720); ctx.stroke(); }
  // el árbol con la rama de la hamaca
  poly(ctx, [1150, 720, 1210, 720, 1195, 40, 1165, 40], '#3d2a1c');
  poly(ctx, [1180, 60, 1180, 84, HAMACA.x - 120, 82, HAMACA.x - 120, 64], '#3d2a1c');
  for (const [x, y, r] of [[1180, 30, 110], [1040, 20, 90], [900, 10, 80], [1260, 90, 90], [780, 25, 60]]) circulo(ctx, x, y, r, '#17291f');
  for (const [x, y, r] of [[1120, 40, 60], [980, 30, 50], [1240, 50, 50]]) circulo(ctx, x, y, r, '#1f3829');

  // hamaca: cuelga de la rama con dos sogas y se mece
  const ang = est.hamaca || 0;
  const c = puntoHamaca(ang);
  const rot = (lx, ly) => ({ x: c.x + lx * Math.cos(ang) - ly * Math.sin(ang), y: c.y + lx * Math.sin(ang) + ly * Math.cos(ang) });
  const izq = rot(-170, -30), der = rot(170, -30);
  ctx.strokeStyle = '#b9a27a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(HAMACA.x - 30, HAMACA.y + 12); ctx.lineTo(izq.x, izq.y);
  ctx.moveTo(HAMACA.x + 30, HAMACA.y + 12); ctx.lineTo(der.x, der.y); ctx.stroke();
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(ang);
  const resp = Math.sin(t * 1.6) * 3;
  // cuerpo acostado (de costado, piernas a la izquierda)
  poly(ctx, [-150, -22, -60, -40 - resp, 40, -46 - resp, 100, -40, 100, -10, -150, -6], '#6c5a8a');
  poly(ctx, [-150, -12, 100, -18, 100, -6, -150, -2], '#584a73');
  circulo(ctx, 120, -36, 32, C.piel);                                         // cabeza
  poly(ctx, [96, -60, 130, -70, 152, -52, 146, -40, 120, -54, 100, -46], C.pelo);
  ctx.strokeStyle = '#5a3a26'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(128, -34, 6, 0.2, Math.PI - 0.2); ctx.stroke();  // ojo cerrado
  // tela de la hamaca, a rayas
  ctx.beginPath(); ctx.moveTo(-170, -30); ctx.quadraticCurveTo(0, 60, 170, -30); ctx.quadraticCurveTo(0, 20, -170, -30);
  ctx.fillStyle = '#c0533e'; ctx.fill();
  ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-150, -18); ctx.quadraticCurveTo(0, 50, 150, -18); ctx.stroke();
  ctx.restore();
  circulo(ctx, est.oreja.x, est.oreja.y, 10, C.piel2);                          // oreja
  if (est.molestia < 70) {
    ctx.fillStyle = 'rgba(220,225,255,0.7)';
    ctx.font = 'bold 20px "Arial Black", Arial';
    const z = (t * 0.7) % 1;
    ctx.fillText('z', est.oreja.x + 20 + z * 30, est.oreja.y - 60 - z * 50);
  }

  // la espiral en su platito, con la brasa
  ctx.fillStyle = '#6d6a63';
  ctx.beginPath(); ctx.ellipse(ESPIRAL.x, ESPIRAL.y + 14, 44, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3f6b3a'; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.2) {
    const r = 4 + a * 1.7;
    const x = ESPIRAL.x + Math.cos(a) * r, y = ESPIRAL.y + 8 + Math.sin(a) * r * 0.28;
    a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  circulo(ctx, ESPIRAL.x + 34, ESPIRAL.y + 8, 4 + Math.sin(t * 7), '#ff7a3a');
  // el humo (la zona que te saca puntos)
  const r = est.reloj || t;
  for (let y = ESPIRAL.y; y > ESPIRAL.y - 420; y -= 14) {
    const ancho = 30 + 40 * (ESPIRAL.y - y) / 420;
    const k = (ESPIRAL.y - y) / 420;
    ctx.fillStyle = `rgba(200,210,215,${0.2 - k * 0.12})`;
    ctx.beginPath(); ctx.ellipse(humoX(y, r) + Math.sin(t * 2 + y) * 6, y, ancho, 12, 0, 0, Math.PI * 2); ctx.fill();
  }

  // viento: hojas y rayas que cruzan
  const V = est.viento || { estado: 'calma', dir: 1 };
  if (V.estado !== 'calma') {
    const fuerza = V.estado === 'sopla' ? 1 : 0.35;
    ctx.strokeStyle = `rgba(210,225,255,${0.35 * fuerza})`; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const y = 60 + (i * 97) % 520;
      const x = ((i * 211 + t * 900 * V.dir) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - V.dir * 90 * fuerza, y + 4); ctx.stroke();
      if (i % 3 === 0) poly(ctx, [x, y + 10, x + 10, y + 4, x + 14, y + 14, x + 4, y + 18], '#3f6b3a');
    }
  }
}

export function cuarto(ctx, est, t) {
  const L = est.lampara.estado;
  // pared y piso
  ctx.fillStyle = C.pared;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) poly(ctx, [i * 160, 0, i * 160 + 160, 0, i * 160 + 120, 620, i * 160 - 40, 620], i % 2 ? C.pared : C.pared2);
  ctx.fillStyle = C.piso;
  ctx.fillRect(0, 620, W, 100);

  // ventana con luna (de acá se sale y se vuelve)
  ctx.fillStyle = '#0c1430';
  ctx.fillRect(70, 110, 200, 250);
  circulo(ctx, 210, 165, 26, C.luna);
  circulo(ctx, 200, 158, 24, '#0c1430');
  for (const [x, y] of [[100, 140], [130, 300], [240, 260], [160, 210]]) circulo(ctx, x, y, 1.6, '#dfe6ff');
  ctx.strokeStyle = '#3b3550';
  ctx.lineWidth = 8;
  ctx.strokeRect(70, 110, 200, 250);
  ctx.beginPath(); ctx.moveTo(170, 110); ctx.lineTo(170, 360); ctx.moveTo(70, 235); ctx.lineTo(270, 235); ctx.stroke();
  poly(ctx, [40, 90, 95, 90, 80, 400, 30, 400], '#5b2e3e');   // cortina
  poly(ctx, [245, 90, 300, 90, 310, 400, 260, 400], '#5b2e3e');

  // cama
  poly(ctx, [360, 470, 1010, 470, 1010, 620, 360, 620], C.madera);
  poly(ctx, [990, 330, 1020, 330, 1020, 620, 990, 620], '#3c2312');    // respaldo
  poly(ctx, [880, 400, 1000, 392, 1004, 470, 872, 474], C.almohada);
  // cuerpo bajo la sábana, respira
  const resp = Math.sin(t * 1.6) * 4;
  poly(ctx, [370, 480, 420, 455, 560, 440 - resp, 720, 438 - resp, 860, 450, 900, 470, 900, 560, 370, 560], C.sabana);
  poly(ctx, [370, 520, 900, 510, 900, 560, 370, 560], C.sabana2);
  // cabeza dormida mirando al techo, oreja hacia el lado del jugador
  circulo(ctx, 945, 410, 46, C.piel);
  poly(ctx, [905, 380, 950, 362, 990, 378, 985, 400, 940, 388, 910, 398], C.pelo);
  circulo(ctx, OREJA.x, OREJA.y, 11, C.piel2);                        // oreja
  ctx.strokeStyle = '#5a3a26'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(958, 414, 8, 0.2, Math.PI - 0.2); ctx.stroke();   // ojo cerrado
  if (L === 'apagada' && est.molestia < 70) {                        // ronquido
    ctx.fillStyle = 'rgba(220,225,255,0.7)';
    ctx.font = 'bold 22px "Arial Black", Arial';
    const z = (t * 0.7) % 1;
    ctx.fillText('z', 975 + z * 30, 360 - z * 50);
    ctx.font = 'bold 16px "Arial Black", Arial';
    ctx.fillText('z', 965 + ((z + 0.5) % 1) * 30, 370 - ((z + 0.5) % 1) * 50);
  } else if (est.molestia >= 70 || L !== 'apagada') {                // ceño fruncido
    ctx.beginPath(); ctx.moveTo(948, 398); ctx.lineTo(968, 402); ctx.stroke();
  }

  // mesa de luz y velador
  poly(ctx, [1040, 480, 1170, 480, 1170, 620, 1040, 620], C.madera);
  poly(ctx, [1088, 420, 1102, 420, 1108, 480, 1082, 480], '#8a6a3a');
  poly(ctx, [1055, 360, 1135, 360, 1150, 425, 1040, 425], L === 'prendida' ? '#ffe2a8' : (L === 'aviso' ? '#a9864f' : '#6b5638'));
}

export function luz(ctx, est, t) {
  const L = est.lampara.estado;
  const oreja = est.oreja || OREJA;
  if (est.escenario === 'patio') {
    ctx.fillStyle = 'rgba(5,6,18,0.3)';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(ESPIRAL.x + 34, ESPIRAL.y + 8, 4, ESPIRAL.x + 34, ESPIRAL.y + 8, 90);
    g.addColorStop(0, 'rgba(255,120,60,0.25)'); g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (L === 'prendida') {
    const g = ctx.createRadialGradient(LAMPARA.x, LAMPARA.y, 20, LAMPARA.x, LAMPARA.y, LAMPARA.radio);
    g.addColorStop(0, 'rgba(255,200,120,0.55)');
    g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    // oscuridad: solo la luna ilumina
    ctx.fillStyle = 'rgba(5,6,18,0.45)';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(VENTANA.x, VENTANA.y, 30, VENTANA.x, VENTANA.y, 520);
    g.addColorStop(0, 'rgba(140,165,255,0.16)');
    g.addColorStop(1, 'rgba(140,165,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (L === 'aviso') {   // titila antes de prenderse
      ctx.fillStyle = `rgba(255,200,120,${0.12 + 0.1 * Math.sin(t * 40)})`;
      ctx.fillRect(600, 0, W - 600, H);
    }
  }
  // zona de la oreja, apenas marcada
  ctx.strokeStyle = 'rgba(255,220,150,0.18)';
  ctx.setLineDash([6, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(oreja.x, oreja.y, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

export function mosquito(ctx, p, t, propio) {
  if (p.muerto > 0 || p.fuera) return;
  const mira = p.vx < -10 ? -1 : 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(mira * 1.25, 1.25);
  // alas: un borrón que aletea
  const a = Math.sin(t * 90 + p.x) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(230,220,255,${0.25 + 0.2 * a})`;
  ctx.beginPath(); ctx.ellipse(-4, -10 - a * 4, 16, 5, -0.5 - a * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2, -10 - a * 3, 14, 4, -0.2 - a * 0.3, 0, Math.PI * 2); ctx.fill();
  // patas largas colgando
  ctx.strokeStyle = '#2c3240'; ctx.lineWidth = 1.4;
  for (const dx of [-6, -1, 4]) {
    ctx.beginPath(); ctx.moveTo(dx, 2); ctx.lineTo(dx - 5, 12); ctx.lineTo(dx - 3, 20); ctx.stroke();
  }
  // abdomen, tórax y cabeza
  poly(ctx, [-4, 0, -24, 8, -26, 12, -6, 6], C.cuerpo2);
  circulo(ctx, -2, 0, 6, C.cuerpo);
  circulo(ctx, 8, -6, 8, C.cuerpo);
  // ojo de párpado caído
  circulo(ctx, 11, -7, 3.6, '#efe9d8');
  poly(ctx, [7, -11, 15, -11, 15, -7, 7, -7], C.cuerpo2);
  circulo(ctx, 12.5, -6, 1.3, '#111');
  // trompa
  ctx.strokeStyle = '#9aa3b6'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(14, -3); ctx.lineTo(28, 6); ctx.stroke();
  // antenas de plumero, del color del jugador
  ctx.strokeStyle = p.color; ctx.lineWidth = 2;
  for (const dx of [5, 10]) {
    ctx.beginPath(); ctx.moveTo(dx, -13); ctx.lineTo(dx + 4, -25); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const yy = -15 - k * 3;
      ctx.beginPath(); ctx.moveTo(dx + 1 + k, yy); ctx.lineTo(dx - 3 + k, yy - 3); ctx.moveTo(dx + 1 + k, yy); ctx.lineTo(dx + 6 + k, yy - 3); ctx.stroke();
    }
  }
  ctx.restore();
  // ondas de zumbido fuerte
  if (p.fuerte) {
    ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
    for (let k = 0; k < 2; k++) {
      const r = 22 + ((t * 60 + k * 12) % 24);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, r, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // nombre
  ctx.font = `${propio ? 'bold ' : ''}14px "Arial Black", Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = p.color;
  ctx.fillText(propio ? `▼ ${p.nombre}` : p.nombre, p.x, p.y - 42);
  ctx.textAlign = 'left';
}

export function golpe(ctx, g) {
  if (!g) return;
  if (g.estado === 'aviso') {
    // sombra de la mano que crece
    const k = 1 - Math.max(0, g.t) / 0.85;
    ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.4 * k})`;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, 50 + 45 * k, 34 + 30 * k, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,90,70,${0.4 + 0.5 * k})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(g.x, g.y, 95, 0, Math.PI * 2); ctx.stroke();
  } else {
    // la mano
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(-0.3);
    poly(ctx, [-60, -30, 40, -40, 70, -10, 60, 30, -50, 36, -80, 6], C.piel);
    for (let i = 0; i < 4; i++) poly(ctx, [40, -38 + i * 17, 95, -36 + i * 17, 96, -24 + i * 17, 42, -24 + i * 17], C.piel2);
    ctx.restore();
    ctx.font = '900 46px "Arial Black", Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText('¡PLAF!', g.x, g.y - 70); ctx.fillText('¡PLAF!', g.x, g.y - 70);
    ctx.textAlign = 'left';
  }
}

export function aplastados(ctx, lista, t) {
  for (const a of lista) {
    const k = (t - a.t0) / 1.2;
    if (k > 1) continue;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#2a2f3a';
    for (let i = 0; i < 6; i++) circulo(ctx, a.x + Math.cos(i) * 12 * (1 + k), a.y + Math.sin(i * 2) * 8 * (1 + k), 3, '#2a2f3a');
    if (a.perdida) {
      ctx.font = 'bold 20px "Arial Black", Arial';
      ctx.fillStyle = '#ff6b5a';
      ctx.fillText(`-${a.perdida}`, a.x + 12, a.y - 20 - k * 30);
    }
    ctx.globalAlpha = 1;
  }
}

export function globos(ctx, lista, jugadores, t) {
  for (const g of lista) {
    const p = jugadores.find(q => q.id === g.id);
    if (!p || t - g.t0 > 2.6) continue;
    ctx.font = 'bold 17px Arial';
    const ancho = ctx.measureText(g.texto).width + 24;
    let x = Math.min(W - ancho - 10, Math.max(10, p.x - ancho / 2)), y = p.y - 92;
    if (y < 10) y = p.y + 40;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.roundRect(x, y, ancho, 32, 10); ctx.fill();
    ctx.fillStyle = '#16131f';
    ctx.fillText(g.texto, x + 12, y + 22);
  }
}

function texto(ctx, s, x, y, tam, color) {
  ctx.textAlign = 'center';
  ctx.font = `900 ${tam}px "Arial Black", Arial`;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}

export function hud(ctx, est, miId) {
  const final = est.escenario === 'patio';
  const meta = est.meta || 250;
  // ronda y reloj
  texto(ctx, final ? 'LA FINAL' : `RONDA ${est.ronda || 1}`, W / 2, 30, 18, final ? '#ffb35a' : '#cfc8e0');
  texto(ctx, Math.ceil(est.tiempo), W / 2, 66, 30, est.tiempo < 10 ? '#ff6b5a' : '#fff');
  // carrera a la meta: solo los que siguen en juego
  const orden = est.jugadores.filter(p => !p.fuera).sort((a, b) => b.pts - a.pts);
  ctx.font = 'bold 13px "Arial Black", Arial';
  ctx.fillStyle = '#cfc8e0';
  ctx.fillText(`PRIMERO A ${meta}`, 20, 22);
  orden.forEach((p, i) => {
    const y = 32 + i * 30;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(20, y + 14, 200, 6);
    ctx.fillStyle = p.color;
    ctx.fillRect(20, y + 14, 200 * Math.min(1, p.pts / meta), 6);
    ctx.font = `${p.id === miId ? '900 ' : 'bold '}16px "Arial Black", Arial`;
    ctx.fillText(`${p.nombre}  ${p.pts}`, 20, y + 10);
  });
  // ¿se despierta?
  const x = W - 280, y = 22;
  ctx.font = 'bold 14px "Arial Black", Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('¿SE DESPIERTA?', x, y + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y + 10, 250, 14);
  ctx.fillStyle = est.molestia > 75 ? '#ff6b5a' : '#ffb35a';
  ctx.fillRect(x, y + 10, 2.5 * est.molestia, 14);
  // avisos del escenario
  if (est.lampara.estado === 'aviso') texto(ctx, 'mmmh… ¿quién anda ahí?', W / 2, 116, 30, '#ffe2a8');
  if (final && est.viento && est.viento.estado === 'aviso') texto(ctx, est.viento.dir > 0 ? 'Se levanta viento  →' : '←  Se levanta viento', W / 2, 116, 30, '#d2e1ff');
  const yo = est.jugadores.find(p => p.id === miId);
  if (yo && yo.fuera) texto(ctx, 'Quedaste afuera. Mirá cómo sigue.', W / 2, H - 40, 26, '#cfc8e0');
  else if (yo && yo.muerto > 0) texto(ctx, `Aplastado. Volvés en ${yo.muerto.toFixed(1)}`, W / 2, H - 40, 28, '#ff6b5a');
  else if (yo && yo.humo) texto(ctx, '¡Humo de espiral! Salí de ahí', W / 2, H - 40, 26, '#d8e0e4');
  else if (yo && !final && est.lampara.estado === 'prendida' && iluminado(yo)) texto(ctx, '¡Te ve! Escondete en la oscuridad', W / 2, H - 40, 26, '#ffe2a8');
}
