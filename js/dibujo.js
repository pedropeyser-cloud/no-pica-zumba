// Dibuja el cuarto, al humano dormido y a los mosquitos en un canvas de 1280×720.
// Estilo low-poly plano, de noche, como el clip 3D de Oliver.
import { W, H, OREJA, LAMPARA, VENTANA, iluminado } from './sim.js';

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
  if (L === 'prendida') {
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
  ctx.beginPath(); ctx.arc(OREJA.x, OREJA.y, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

export function mosquito(ctx, p, t, propio) {
  if (p.muerto > 0) return;
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

export function hud(ctx, est, miId) {
  // reloj
  ctx.textAlign = 'center';
  ctx.font = '900 34px "Arial Black", Arial';
  ctx.fillStyle = est.tiempo < 10 ? '#ff6b5a' : '#fff';
  ctx.fillText(Math.ceil(est.tiempo), W / 2, 46);
  ctx.textAlign = 'left';
  // puntajes
  const orden = [...est.jugadores].sort((a, b) => b.pts - a.pts);
  orden.forEach((p, i) => {
    ctx.font = `${p.id === miId ? '900 ' : 'bold '}18px "Arial Black", Arial`;
    ctx.fillStyle = p.color;
    ctx.fillText(`${i + 1}. ${p.nombre}  ${p.pts}`, 20, 34 + i * 26);
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
  // aviso del velador
  if (est.lampara.estado === 'aviso') {
    ctx.textAlign = 'center';
    ctx.font = '900 30px "Arial Black", Arial';
    ctx.fillStyle = '#ffe2a8';
    ctx.fillText('mmmh… ¿quién anda ahí?', W / 2, 110);
    ctx.textAlign = 'left';
  }
  const yo = est.jugadores.find(p => p.id === miId);
  if (yo && yo.muerto > 0) {
    ctx.textAlign = 'center';
    ctx.font = '900 28px "Arial Black", Arial';
    ctx.fillStyle = '#ff6b5a';
    ctx.fillText(`Aplastado. Volvés por la ventana en ${yo.muerto.toFixed(1)}`, W / 2, H - 40);
    ctx.textAlign = 'left';
  } else if (yo && est.lampara.estado === 'prendida' && iluminado(yo)) {
    ctx.textAlign = 'center';
    ctx.font = '900 26px "Arial Black", Arial';
    ctx.fillStyle = '#ffe2a8';
    ctx.fillText('¡Te ve! Escondete en la oscuridad', W / 2, H - 40);
    ctx.textAlign = 'left';
  }
}
