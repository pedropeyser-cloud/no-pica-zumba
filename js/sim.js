// Lógica pura de «No pica, zumba». Sin DOM: la corre el anfitrión (y los tests en node).
// Mosquitos machos zumban cerca de la oreja de un humano dormido para sumar ruido.
// El humano se fastidia y tira cachetazos; a veces prende el velador.

export const W = 1280, H = 720;
export const OREJA = { x: 930, y: 418 };
export const VENTANA = { x: 170, y: 230 };          // donde se reaparece
export const LAMPARA = { x: 1095, y: 400, radio: 470 };
export const DURACION = 90;
const ZONA = 150;              // radio de la oreja donde se suma
const GOLPE_RADIO = 95;
const AVISO_GOLPE = 0.85;      // segundos de sombra antes del cachetazo
const MUERTO = 2.0;
export const COLORES = ['#ffb347', '#7ee0ff', '#ff7eb6', '#b8ff7e'];

export const FRASES = {
  aplastado: ['No fui yo. Fueron mis hermanas.', '¡AU, culiado!', 'Me queda poco… igual.', 'Ni me dolió. Bah.'],
  punto: ['¿Qué hacé\', culiado?', 'Yo voy por el día cuatro, eh.', 'Bzzz… tranqui, no pico.', 'Escuchá esto, papá.'],
  lampara: ['¡LA LUZ! ¡RAJEN!', 'Uy, se despertó.', '¡Al techo, changos!'],
};

export function nuevoJuego(semilla = Date.now()) {
  return {
    fase: 'lobby',           // lobby | juego | fin
    tiempo: DURACION,
    molestia: 0,
    lampara: { estado: 'apagada', t: 20 },   // apagada | aviso | prendida
    golpe: null,             // { x, y, t, estado: 'aviso' | 'plaf' }
    jugadores: [],
    eventos: [],
    rnd: semilla >>> 0 || 1,
    proxFrase: 4,
  };
}

function azar(j) {          // xorshift: repetible para los tests
  let x = j.rnd;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  j.rnd = x >>> 0;
  return j.rnd / 4294967296;
}

export function agregarJugador(j, id, nombre, bot = false) {
  if (j.jugadores.find(p => p.id === id) || j.jugadores.length >= 4) return null;
  const n = j.jugadores.length;
  const p = {
    id, nombre: (nombre || 'Mosquito').slice(0, 14), bot,
    color: COLORES[n % COLORES.length],
    x: VENTANA.x + n * 30, y: VENTANA.y + n * 20, vx: 0, vy: 0,
    pts: 0, muerto: 0, fuerte: false, entrada: { ax: 0, ay: 0, fuerte: false },
  };
  j.jugadores.push(p);
  return p;
}

export function quitarJugador(j, id) {
  j.jugadores = j.jugadores.filter(p => p.id !== id);
}

export function empezar(j) {
  j.fase = 'juego';
  j.tiempo = DURACION;
  j.molestia = 0;
  j.lampara = { estado: 'apagada', t: 18 + azar(j) * 8 };
  j.golpe = null;
  j.jugadores.forEach((p, i) => {
    Object.assign(p, { x: VENTANA.x + i * 30, y: VENTANA.y + i * 20, vx: 0, vy: 0, pts: 0, muerto: 0 });
  });
}

export function entrada(j, id, e) {
  const p = j.jugadores.find(q => q.id === id);
  if (!p) return;
  p.entrada = {
    ax: Math.max(-1, Math.min(1, +e.ax || 0)),
    ay: Math.max(-1, Math.min(1, +e.ay || 0)),
    fuerte: !!e.fuerte,
  };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const iluminado = p => dist(p, LAMPARA) < LAMPARA.radio && p.x > 600;

function evento(j, tipo, datos = {}) { j.eventos.push({ tipo, ...datos }); }

function decir(j, p, tipo) {
  const lista = FRASES[tipo];
  evento(j, 'frase', { id: p.id, texto: lista[Math.floor(azar(j) * lista.length)] });
}

function cerebroBot(j, p) {
  // va a la oreja con zigzag; huye si hay luz, aviso o sombra de golpe cerca
  let objetivo = { x: OREJA.x - 60 + Math.sin(j.tiempo * 2 + p.x) * 50, y: OREJA.y - 40 };
  const peligro = j.lampara.estado !== 'apagada' ||
    // reaccionan tarde a la sombra de la mano: a veces se la comen
    (j.golpe && j.golpe.estado === 'aviso' && j.golpe.t < AVISO_GOLPE - 0.55 &&
      dist(p, j.golpe) < GOLPE_RADIO + 60);
  if (peligro) objetivo = { x: 250, y: 150 + (p.id.length * 37) % 300 };
  const dx = objetivo.x - p.x, dy = objetivo.y - p.y, d = Math.hypot(dx, dy) || 1;
  p.entrada = { ax: dx / d, ay: dy / d, fuerte: !peligro && j.molestia < 55 && d < 120 };
}

function aplastar(j, p) {
  const perdida = Math.round(p.pts * 0.25);
  p.pts -= perdida;
  p.muerto = MUERTO;
  p.vx = p.vy = 0;
  evento(j, 'aplastado', { id: p.id, x: p.x, y: p.y, perdida });
  decir(j, p, 'aplastado');
}

export function paso(j, dt) {
  j.eventos = [];
  if (j.fase !== 'juego') return j;
  j.tiempo -= dt;
  if (j.tiempo <= 0) {
    j.tiempo = 0;
    j.fase = 'fin';
    evento(j, 'fin');
    return j;
  }

  // mosquitos
  let ruido = 0;
  for (const p of j.jugadores) {
    if (p.muerto > 0) {
      p.muerto -= dt;
      if (p.muerto <= 0) {
        p.muerto = 0;
        p.x = VENTANA.x; p.y = VENTANA.y;
        evento(j, 'vuelve', { id: p.id });
      }
      continue;
    }
    if (p.bot) cerebroBot(j, p);
    const e = p.entrada;
    p.fuerte = e.fuerte;
    const acel = 1500;
    p.vx += e.ax * acel * dt;
    p.vy += e.ay * acel * dt;
    // aleteo errático de mosquito
    p.vx += (azar(j) - 0.5) * 420 * dt * 6;
    p.vy += (azar(j) - 0.5) * 420 * dt * 6;
    const roce = Math.exp(-3.2 * dt);
    p.vx *= roce; p.vy *= roce;
    const v = Math.hypot(p.vx, p.vy), max = p.fuerte ? 260 : 340;   // zumbar fuerte te hace lento
    if (v > max) { p.vx *= max / v; p.vy *= max / v; }
    p.x = Math.max(16, Math.min(W - 16, p.x + p.vx * dt));
    p.y = Math.max(16, Math.min(600, p.y + p.vy * dt));

    const d = dist(p, OREJA);
    if (d < ZONA) {
      const cerca = 1 - d / ZONA;
      const mult = p.fuerte ? 2.2 : 1;
      p.pts += dt * 10 * (1 + 2 * cerca) * mult;
      ruido += (1 + cerca) * (p.fuerte ? 3 : 1);
    }
    if (j.lampara.estado === 'prendida' && iluminado(p)) p.pts = Math.max(0, p.pts - dt * 6);
  }

  // fastidio del humano
  j.molestia = Math.max(0, Math.min(100, j.molestia + ruido * 9 * dt - 5 * dt));

  // cachetazo
  if (j.golpe) {
    j.golpe.t -= dt;
    if (j.golpe.estado === 'aviso' && j.golpe.t <= 0) {
      j.golpe.estado = 'plaf';
      j.golpe.t = 0.35;
      evento(j, 'plaf', { x: j.golpe.x, y: j.golpe.y });
      for (const p of j.jugadores) if (!p.muerto && dist(p, j.golpe) < GOLPE_RADIO) aplastar(j, p);
    } else if (j.golpe.estado === 'plaf' && j.golpe.t <= 0) {
      j.golpe = null;
    }
  } else {
    const vivos = j.jugadores.filter(p => !p.muerto);
    let blanco = null;
    if (j.molestia >= 100 && vivos.length) {
      blanco = vivos.reduce((a, b) => (dist(a, OREJA) < dist(b, OREJA) ? a : b));
      j.molestia = 35;
    } else if (j.lampara.estado === 'prendida') {
      const vistos = vivos.filter(iluminado);
      if (vistos.length && azar(j) < dt * 1.4) blanco = vistos[Math.floor(azar(j) * vistos.length)];
    }
    if (blanco) {
      // apunta adonde está ahora: el que se mueve rápido se salva
      j.golpe = { x: blanco.x, y: blanco.y, t: AVISO_GOLPE, estado: 'aviso' };
      evento(j, 'aviso_golpe', { x: blanco.x, y: blanco.y });
    }
  }

  // velador
  const L = j.lampara;
  L.t -= dt;
  if (L.t <= 0) {
    if (L.estado === 'apagada') {
      L.estado = 'aviso'; L.t = 1.6; evento(j, 'lampara_aviso');
    } else if (L.estado === 'aviso') {
      L.estado = 'prendida'; L.t = 5; evento(j, 'lampara_on');
      const alguien = j.jugadores.find(p => !p.muerto);
      if (alguien) decir(j, alguien, 'lampara');
    } else {
      L.estado = 'apagada'; L.t = 16 + azar(j) * 10; evento(j, 'lampara_off');
    }
  }

  // de vez en cuando, alguien cerca de la oreja suelta una frase
  j.proxFrase -= dt;
  if (j.proxFrase <= 0) {
    j.proxFrase = 6 + azar(j) * 5;
    const cerca = j.jugadores.filter(p => !p.muerto && dist(p, OREJA) < ZONA);
    if (cerca.length) decir(j, cerca[Math.floor(azar(j) * cerca.length)], 'punto');
  }
  return j;
}

// Lo que viaja por la red: corto y sin la semilla
export function foto(j) {
  return {
    fase: j.fase, tiempo: +j.tiempo.toFixed(2), molestia: Math.round(j.molestia),
    lampara: { estado: j.lampara.estado }, golpe: j.golpe && { ...j.golpe },
    jugadores: j.jugadores.map(p => ({
      id: p.id, nombre: p.nombre, color: p.color, bot: p.bot,
      x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx),
      pts: Math.floor(p.pts), muerto: +p.muerto.toFixed(2), fuerte: p.fuerte,
    })),
    eventos: j.eventos,
  };
}

export const ranking = jug => [...jug].sort((a, b) => b.pts - a.pts);
