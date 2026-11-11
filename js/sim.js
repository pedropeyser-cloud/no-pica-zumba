// Lógica pura de «No pica, zumba». Sin DOM: la corre el anfitrión (y los tests en node).
// Mosquitos machos zumban cerca de la oreja de un humano dormido para sumar ruido.
// Torneo por eliminación: cada ronda es una carrera a META puntos; el último queda afuera.
// Cuando quedan dos, se juega la FINAL en el patio: hamaca que se mueve, humo de espiral y viento.

export const W = 1280, H = 720;
export const OREJA = { x: 930, y: 418 };            // la oreja de la pieza (en el patio se mueve)
export const VENTANA = { x: 170, y: 230 };          // donde se reaparece
export const LAMPARA = { x: 1095, y: 400, radio: 470 };
export const META = 250;                            // puntos para ganar una ronda
export const DURACION = 120;                        // tope de cada ronda (si nadie llega a META)
export const ENTRE = 6;                             // pausa entre rondas
export const HAMACA = { x: 860, y: 70, largo: 360 };// rama de la que cuelga la hamaca
export const ESPIRAL = { x: 520, y: 610 };          // la espiral humeando en el piso del patio
const ZONA = 150;              // radio de la oreja donde se suma
const GOLPE_RADIO = 95;
const MUERTO = 2.0;
export const COLORES = ['#ffb347', '#7ee0ff', '#ff7eb6', '#b8ff7e'];

export const FRASES = {
  aplastado: ['No fui yo. Fueron mis hermanas.', '¡AU, culiado!', 'Me queda poco… igual.', 'Ni me dolió. Bah.'],
  punto: ['¿Qué hacé\', culiado?', 'Yo voy por el día cuatro, eh.', 'Bzzz… tranqui, no pico.', 'Escuchá esto, papá.'],
  lampara: ['¡LA LUZ! ¡RAJEN!', 'Uy, se despertó.', '¡Al techo, changos!'],
  humo: ['¡La espiral, la puta madre!', 'Cof… cof… igual zumbo.', '¿Quién prendió esto?'],
  viento: ['¡Me lleva el viento, culiado!', 'Agarrate de algo…'],
  eliminado: ['Me voy, pero vuelvo mañana. Ah, no.', 'Diez días de vida y esto.', 'Tranqui, igual era el peor.', 'Me rajo a la casa de al lado.'],
};

export function nuevoJuego(semilla = Date.now()) {
  return {
    fase: 'lobby',           // lobby | juego | entre | fin
    escenario: 'pieza',      // pieza | patio (la final)
    ronda: 0,
    torneo: 0,               // número de torneo: cambia con cada revancha (para guardar el historial una vez)
    tiempo: DURACION,
    entre: 0,
    molestia: 0,
    oreja: { ...OREJA },
    hamaca: 0,               // ángulo de la hamaca (patio)
    viento: { estado: 'calma', t: 10, dir: 1 },   // calma | aviso | sopla
    lampara: { estado: 'apagada', t: 20 },        // apagada | aviso | prendida (solo en la pieza)
    golpe: null,             // { x, y, t, estado: 'aviso' | 'plaf' }
    jugadores: [],
    eliminados: [],          // ids en el orden en que quedaron afuera
    ultimoFuera: null,
    ganador: null,
    eventos: [],
    reloj: 0,
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

// solo se entra en la sala de espera o al terminar (para la revancha), nunca a mitad de torneo
export function agregarJugador(j, id, nombre, bot = false) {
  if (j.fase !== 'lobby' && j.fase !== 'fin') return null;
  if (j.jugadores.find(p => p.id === id) || j.jugadores.length >= 4) return null;
  const n = j.jugadores.length;
  const usados = new Set(j.jugadores.map(p => p.color));
  const p = {
    id, nombre: (nombre || 'Mosquito').slice(0, 14), bot,
    color: COLORES.find(c => !usados.has(c)) || COLORES[0],
    x: VENTANA.x + n * 30, y: VENTANA.y + n * 20, vx: 0, vy: 0,
    pts: 0, muerto: 0, fuerte: false, fuera: false, enHumo: false, entrada: { ax: 0, ay: 0, fuerte: false },
  };
  j.jugadores.push(p);
  return p;
}

export function quitarJugador(j, id) {
  j.jugadores = j.jugadores.filter(p => p.id !== id);
  j.eliminados = j.eliminados.filter(x => x !== id);
}

export const activos = j => j.jugadores.filter(p => !p.fuera);
export const esFinal = j => j.escenario === 'patio';

// arranca un torneo nuevo (también la revancha)
export function empezar(j) {
  if (j.jugadores.length < 2) return false;
  j.torneo++;
  j.ronda = 0;
  j.eliminados = [];
  j.ultimoFuera = null;
  j.ganador = null;
  for (const p of j.jugadores) p.fuera = false;
  iniciarRonda(j);
  return true;
}

function iniciarRonda(j) {
  const quedan = activos(j);
  j.ronda++;
  j.escenario = quedan.length <= 2 ? 'patio' : 'pieza';
  j.fase = 'juego';
  j.tiempo = DURACION;
  j.molestia = 0;
  j.golpe = null;
  j.lampara = { estado: 'apagada', t: 18 + azar(j) * 8 };
  j.viento = { estado: 'calma', t: 8 + azar(j) * 5, dir: 1 };
  j.hamaca = 0;
  j.oreja = j.escenario === 'patio' ? orejaHamaca(0) : { ...OREJA };
  quedan.forEach((p, i) => {
    Object.assign(p, { x: VENTANA.x + i * 30, y: VENTANA.y + i * 20, vx: 0, vy: 0, pts: 0, muerto: 0, enHumo: false });
  });
  evento(j, 'ronda', { ronda: j.ronda, escenario: j.escenario });
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

// la hamaca cuelga de una rama y se hamaca; la cabeza va en la punta derecha
export function puntoHamaca(ang) {
  return { x: HAMACA.x + Math.sin(ang) * HAMACA.largo, y: HAMACA.y + Math.cos(ang) * HAMACA.largo };
}
export function orejaHamaca(ang) {
  const c = puntoHamaca(ang);
  return { x: c.x + 125 * Math.cos(ang), y: c.y - 30 + 125 * Math.sin(ang) };
}

// el humo de la espiral sube y se mece; más arriba se abre más
export function humoX(y, reloj) {
  const alto = (ESPIRAL.y - y) / 400;
  return ESPIRAL.x + Math.sin(reloj * 0.7 + alto * 2) * 70 * alto;
}
export function enHumo(p, reloj) {
  if (p.y > ESPIRAL.y || p.y < ESPIRAL.y - 420) return false;
  const ancho = 30 + 40 * (ESPIRAL.y - p.y) / 420;
  return Math.abs(p.x - humoX(p.y, reloj)) < ancho;
}

function evento(j, tipo, datos = {}) { j.eventos.push({ tipo, ...datos }); }

function decir(j, p, tipo) {
  const lista = FRASES[tipo];
  evento(j, 'frase', { id: p.id, texto: lista[Math.floor(azar(j) * lista.length)] });
}

function cerebroBot(j, p) {
  // va a la oreja con zigzag; huye si hay luz, aviso o sombra de golpe cerca
  const o = j.oreja;
  let objetivo = { x: o.x - 60 + Math.sin(j.tiempo * 2 + p.x) * 50, y: o.y - 40 };
  const aviso = j.golpe && j.golpe.estado === 'aviso' ? 0.85 - (esFinal(j) ? 0.15 : 0) : 0;
  const peligro = j.lampara.estado !== 'apagada' ||
    // reaccionan tarde a la sombra de la mano: a veces se la comen
    (j.golpe && j.golpe.estado === 'aviso' && j.golpe.t < aviso - 0.55 &&
      dist(p, j.golpe) < GOLPE_RADIO + 60);
  if (peligro) objetivo = esFinal(j) ? { x: 240, y: 120 + (p.id.length * 37) % 200 } : { x: 250, y: 150 + (p.id.length * 37) % 300 };
  const dx = objetivo.x - p.x, dy = objetivo.y - p.y, d = Math.hypot(dx, dy) || 1;
  let ax = dx / d, ay = dy / d;
  // en el patio esquivan el humo (a medias)
  if (esFinal(j) && p.y < ESPIRAL.y && p.y > ESPIRAL.y - 440) {
    const hx = p.x - humoX(p.y, j.reloj);
    if (Math.abs(hx) < 110) ay -= 0.9;
  }
  p.entrada = { ax, ay, fuerte: !peligro && j.molestia < 55 && d < 120 };
}

function aplastar(j, p) {
  const perdida = Math.round(p.pts * 0.25);
  p.pts -= perdida;
  p.muerto = MUERTO;
  p.vx = p.vy = 0;
  evento(j, 'aplastado', { id: p.id, x: p.x, y: p.y, perdida });
  decir(j, p, 'aplastado');
}

export const ranking = jug => [...jug].sort((a, b) => b.pts - a.pts);

// orden final del torneo: ganador, finalista y después los eliminados del último al primero
export function podio(j) {
  const porId = id => j.jugadores.find(p => p.id === id);
  const ids = [j.ganador, ...[...j.eliminados].reverse()].filter(id => id && porId(id));
  for (const p of ranking(activos(j))) if (!ids.includes(p.id)) ids.push(p.id);
  return ids.map(porId);
}

function terminarRonda(j) {
  const quedan = ranking(activos(j));
  if (quedan.length <= 2) {
    j.ganador = quedan[0] ? quedan[0].id : null;
    if (quedan[1]) { j.eliminados.push(quedan[1].id); quedan[1].fuera = true; }
    j.fase = 'fin';
    evento(j, 'fin', { ganador: j.ganador });
    return;
  }
  const ultimo = quedan[quedan.length - 1];
  ultimo.fuera = true;
  j.eliminados.push(ultimo.id);
  j.ultimoFuera = ultimo.id;
  j.fase = 'entre';
  j.entre = ENTRE;
  j.golpe = null;
  evento(j, 'eliminado', { id: ultimo.id });
  decir(j, ultimo, 'eliminado');
}

export function paso(j, dt) {
  j.eventos = [];
  j.reloj += dt;
  if (j.fase === 'entre') {
    j.entre -= dt;
    if (activos(j).length < 2) return cortarPorAbandono(j);
    if (j.entre <= 0) iniciarRonda(j);
    return j;
  }
  if (j.fase !== 'juego') return j;
  if (activos(j).length < 2) return cortarPorAbandono(j);

  const final = esFinal(j);
  j.tiempo -= dt;

  // la hamaca se mece y la oreja con ella
  if (final) {
    j.hamaca = 0.32 * Math.sin(j.reloj * 0.85);
    j.oreja = orejaHamaca(j.hamaca);
  }

  // viento en el patio: aviso y ráfaga hacia un lado
  if (final) {
    const V = j.viento;
    V.t -= dt;
    if (V.t <= 0) {
      if (V.estado === 'calma') { V.estado = 'aviso'; V.t = 1.3; V.dir = azar(j) < 0.5 ? -1 : 1; evento(j, 'viento_aviso', { dir: V.dir }); }
      else if (V.estado === 'aviso') {
        V.estado = 'sopla'; V.t = 2.6; evento(j, 'viento');
        const alguien = activos(j).find(p => !p.muerto);
        if (alguien) decir(j, alguien, 'viento');
      } else { V.estado = 'calma'; V.t = 8 + azar(j) * 6; }
    }
  }

  // mosquitos
  let ruido = 0;
  for (const p of activos(j)) {
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
    if (final && j.viento.estado === 'sopla') p.vx += j.viento.dir * 1300 * dt;
    // aleteo errático de mosquito
    p.vx += (azar(j) - 0.5) * 420 * dt * 6;
    p.vy += (azar(j) - 0.5) * 420 * dt * 6;
    const roce = Math.exp(-3.2 * dt);
    p.vx *= roce; p.vy *= roce;
    const humo = final && enHumo(p, j.reloj);
    if (humo && !p.enHumo) decir(j, p, 'humo');
    p.enHumo = humo;
    const v = Math.hypot(p.vx, p.vy), max = humo ? 170 : (p.fuerte ? 260 : 340);   // zumbar fuerte te hace lento
    if (v > max) { p.vx *= max / v; p.vy *= max / v; }
    p.x = Math.max(16, Math.min(W - 16, p.x + p.vx * dt));
    p.y = Math.max(16, Math.min(600, p.y + p.vy * dt));

    const d = dist(p, j.oreja);
    if (d < ZONA) {
      const cerca = 1 - d / ZONA;
      const mult = p.fuerte ? 2.2 : 1;
      p.pts += dt * 10 * (1 + 2 * cerca) * mult;
      ruido += (1 + cerca) * (p.fuerte ? 3 : 1);
    }
    if (humo) p.pts = Math.max(0, p.pts - dt * 12);
    if (!final && j.lampara.estado === 'prendida' && iluminado(p)) p.pts = Math.max(0, p.pts - dt * 6);
  }

  // fastidio del humano (en la final se fastidia más rápido)
  j.molestia = Math.max(0, Math.min(100, j.molestia + ruido * (final ? 11.5 : 9) * dt - 5 * dt));

  // cachetazo
  if (j.golpe) {
    j.golpe.t -= dt;
    if (j.golpe.estado === 'aviso' && j.golpe.t <= 0) {
      j.golpe.estado = 'plaf';
      j.golpe.t = 0.35;
      evento(j, 'plaf', { x: j.golpe.x, y: j.golpe.y });
      for (const p of activos(j)) if (!p.muerto && dist(p, j.golpe) < GOLPE_RADIO) aplastar(j, p);
    } else if (j.golpe.estado === 'plaf' && j.golpe.t <= 0) {
      j.golpe = null;
    }
  } else {
    const vivos = activos(j).filter(p => !p.muerto);
    let blanco = null;
    if (j.molestia >= 100 && vivos.length) {
      blanco = vivos.reduce((a, b) => (dist(a, j.oreja) < dist(b, j.oreja) ? a : b));
      j.molestia = 35;
    } else if (!final && j.lampara.estado === 'prendida') {
      const vistos = vivos.filter(iluminado);
      if (vistos.length && azar(j) < dt * 1.4) blanco = vistos[Math.floor(azar(j) * vistos.length)];
    }
    if (blanco) {
      // apunta adonde está ahora: el que se mueve rápido se salva (en la final, la mano es más rápida)
      j.golpe = { x: blanco.x, y: blanco.y, t: final ? 0.7 : 0.85, estado: 'aviso' };
      evento(j, 'aviso_golpe', { x: blanco.x, y: blanco.y });
    }
  }

  // velador (solo en la pieza)
  if (!final) {
    const L = j.lampara;
    L.t -= dt;
    if (L.t <= 0) {
      if (L.estado === 'apagada') {
        L.estado = 'aviso'; L.t = 1.6; evento(j, 'lampara_aviso');
      } else if (L.estado === 'aviso') {
        L.estado = 'prendida'; L.t = 5; evento(j, 'lampara_on');
        const alguien = activos(j).find(p => !p.muerto);
        if (alguien) decir(j, alguien, 'lampara');
      } else {
        L.estado = 'apagada'; L.t = 16 + azar(j) * 10; evento(j, 'lampara_off');
      }
    }
  }

  // de vez en cuando, alguien cerca de la oreja suelta una frase
  j.proxFrase -= dt;
  if (j.proxFrase <= 0) {
    j.proxFrase = 6 + azar(j) * 5;
    const cerca = activos(j).filter(p => !p.muerto && dist(p, j.oreja) < ZONA);
    if (cerca.length) decir(j, cerca[Math.floor(azar(j) * cerca.length)], 'punto');
  }

  // fin de ronda: alguien llegó a la meta o se acabó el tiempo
  if (j.tiempo <= 0 || activos(j).some(p => p.pts >= META)) {
    j.tiempo = Math.max(0, j.tiempo);
    terminarRonda(j);
  }
  return j;
}

// si se va gente y queda uno solo, gana ese
function cortarPorAbandono(j) {
  const quedan = ranking(activos(j));
  j.ganador = quedan[0] ? quedan[0].id : null;
  j.fase = 'fin';
  evento(j, 'fin', { ganador: j.ganador });
  return j;
}

// Lo que viaja por la red: corto y sin la semilla
export function foto(j) {
  return {
    fase: j.fase, escenario: j.escenario, ronda: j.ronda, torneo: j.torneo, meta: META,
    tiempo: +j.tiempo.toFixed(2), entre: +Math.max(0, j.entre).toFixed(1), molestia: Math.round(j.molestia),
    reloj: +j.reloj.toFixed(2), hamaca: +j.hamaca.toFixed(3),
    oreja: { x: Math.round(j.oreja.x), y: Math.round(j.oreja.y) },
    viento: { estado: j.viento.estado, dir: j.viento.dir },
    lampara: { estado: j.lampara.estado }, golpe: j.golpe && { ...j.golpe },
    eliminados: [...j.eliminados], ultimoFuera: j.ultimoFuera, ganador: j.ganador,
    jugadores: j.jugadores.map(p => ({
      id: p.id, nombre: p.nombre, color: p.color, bot: p.bot, fuera: p.fuera,
      x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx),
      pts: Math.floor(p.pts), muerto: +p.muerto.toFixed(2), fuerte: p.fuerte, humo: p.enHumo,
    })),
    eventos: j.eventos,
  };
}
