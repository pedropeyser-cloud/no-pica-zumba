// Arma todo: pantallas, teclado, bucle del juego y red.
import { nuevoJuego, agregarJugador, quitarJugador, empezar, entrada, paso, foto, ranking, COLORES } from './sim.js';
import * as dib from './dibujo.js';
import * as son from './sonido.js';
import { abrirSala, entrarSala, codigoNuevo } from './red.js';

const $ = id => document.getElementById(id);
const ctx = $('lienzo').getContext('2d');
const PASO = 1 / 60;

const S = {
  modo: null,          // 'anfitrion' | 'invitado'
  miId: 'h',
  juego: null,         // solo el anfitrión
  sala: null,          // conexión de red
  est: null,           // última foto que se dibuja
  vista: new Map(),    // posiciones suavizadas para dibujar (invitado)
  aplastados: [], globos: [],
  temblor: 0, proxRonquido: 3,
  faseVista: null,
};

// ---------- pantallas ----------
function mostrar(cual) {
  for (const id of ['inicio', 'sala', 'fin']) $(id).hidden = id !== cual;
}

function error(msg) { $('error').textContent = msg || ''; }

const nombre = () => $('nombre').value.trim() || 'Oliver';
try { $('nombre').value = localStorage.getItem('np-nombre') || ''; } catch { /* sin storage */ }
const guardarNombre = () => { try { localStorage.setItem('np-nombre', nombre()); } catch { /* nada */ } };

const desdeLink = new URLSearchParams(location.search).get('sala');
if (desdeLink) $('codigo').value = desdeLink.toUpperCase();

function pintarSala() {
  const est = S.est;
  if (!est) return;
  $('lista').innerHTML = est.jugadores.map(p =>
    `<li><b style="color:${colorSeguro(p.color)}">${escapar(p.nombre)}${p.id === S.miId ? ' (vos)' : ''}</b><span>${p.bot ? 'bot' : ''}</span></li>`).join('');
  const anfitrion = S.modo === 'anfitrion';
  $('accionesAnfitrion').hidden = !anfitrion;
  $('esperando').hidden = anfitrion;
  $('bot').disabled = est.jugadores.length >= 4;
}

function pintarFin() {
  const orden = ranking(S.est.jugadores);
  const g = orden[0];
  $('ganador').innerHTML = g ? `<span style="color:${colorSeguro(g.color)}">${escapar(g.nombre)}</span> hizo más ruido` : 'Fin';
  $('podio').innerHTML = orden.map((p, i) =>
    `<li><b style="color:${colorSeguro(p.color)}">${i + 1}. ${escapar(p.nombre)}</b><span>${numero(p.pts)}</span></li>`).join('');
  $('accionesFin').hidden = S.modo !== 'anfitrion';
  $('esperandoFin').hidden = S.modo === 'anfitrion';
}

// lo que llega de otra compu no se mete crudo en el HTML: color de la lista fija, puntos como número
const colorSeguro = c => (COLORES.includes(c) ? c : '#ffffff');
const numero = n => Math.trunc(+n) || 0;
const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- anfitrión ----------
async function crear(conRed) {
  son.iniciarSonido();
  guardarNombre();
  error('');
  S.modo = 'anfitrion';
  S.miId = 'h';
  S.juego = nuevoJuego();
  agregarJugador(S.juego, 'h', nombre());
  if (conRed) {
    const codigo = codigoNuevo();
    try {
      $('crear').disabled = true;
      S.sala = await abrirSala(codigo, {
        conecta: (id, n) => !!agregarJugador(S.juego, id, n),
        mensaje: (id, d) => { if (d && d.tipo === 'entrada') entrada(S.juego, id, d); },
        sale: id => quitarJugador(S.juego, id),
      });
    } catch (e) {
      error('No pude abrir la sala. Probá de nuevo en unos segundos.');
      $('crear').disabled = false;
      return;
    }
    const link = `${location.origin}${location.pathname}?sala=${codigo}`;
    $('codigoSala').textContent = codigo;
    $('linkSala').textContent = link;
    $('copiar').onclick = () => navigator.clipboard.writeText(link).then(() => { $('copiar').textContent = '¡Copiado!'; });
    $('paraInvitar').hidden = false;
  } else {
    $('paraInvitar').hidden = true;
    agregarJugador(S.juego, 'bot1', 'Hermana 1', true);
    agregarJugador(S.juego, 'bot2', 'Hermana 2', true);
  }
  S.est = foto(S.juego);
  mostrar('sala');
  pintarSala();
}

let botN = 3;
$('bot').onclick = () => { agregarJugador(S.juego, 'bot' + botN, 'Hermana ' + botN, true); botN++; };
$('empezar').onclick = () => { empezar(S.juego); };
$('revancha').onclick = () => { empezar(S.juego); };
$('crear').onclick = () => crear(true);
$('practicar').onclick = () => crear(false);

// ---------- invitado ----------
$('entrar').onclick = async () => {
  const codigo = $('codigo').value.trim().toUpperCase();
  if (codigo.length !== 4) return error('El código tiene 4 letras.');
  son.iniciarSonido();
  guardarNombre();
  error('Conectando…');
  $('entrar').disabled = true;
  try {
    S.sala = await entrarSala(codigo, nombre(), {
      mensaje: d => { if (d && d.tipo === 'foto') recibir(d); },
      cierra: () => { mostrar('inicio'); error('Se cortó la sala.'); S.modo = null; },
    });
    S.modo = 'invitado';
    S.miId = S.sala.id;
    error('');
  } catch (e) {
    error(e.message && e.message.includes('sala') ? e.message : 'No pude conectar. ¿El código está bien y la sala sigue abierta?');
  }
  $('entrar').disabled = false;
};

function recibir(d) {
  S.est = d;
  procesarEventos(d.eventos || []);
}

// ---------- teclado ----------
const teclas = new Set();
const MAPA = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowUp: 'arr', KeyW: 'arr', ArrowDown: 'aba', KeyS: 'aba', Space: 'fuerte' };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (MAPA[e.code]) { teclas.add(MAPA[e.code]); e.preventDefault(); }
});
addEventListener('keyup', e => { if (MAPA[e.code]) teclas.delete(MAPA[e.code]); });
addEventListener('blur', () => teclas.clear());

function miEntrada() {
  return {
    ax: (teclas.has('der') ? 1 : 0) - (teclas.has('izq') ? 1 : 0),
    ay: (teclas.has('aba') ? 1 : 0) - (teclas.has('arr') ? 1 : 0),
    fuerte: teclas.has('fuerte'),
  };
}

let ultimaEntrada = '', ultimoEnvio = 0;
function mandarEntrada(ahora) {
  const e = miEntrada();
  if (S.modo === 'anfitrion') { entrada(S.juego, 'h', e); return; }
  const k = JSON.stringify(e);
  if (S.sala && (k !== ultimaEntrada || ahora - ultimoEnvio > 250)) {
    S.sala.enviar({ tipo: 'entrada', ...e });
    ultimaEntrada = k; ultimoEnvio = ahora;
  }
}

// ---------- efectos ----------
let reloj = 0;
function procesarEventos(evs) {
  for (const e of evs) {
    if (e.tipo === 'plaf') { son.cachetazo(); S.temblor = 0.3; }
    else if (e.tipo === 'aplastado') S.aplastados.push({ ...e, t0: reloj });
    else if (e.tipo === 'frase') S.globos = S.globos.filter(g => g.id !== e.id).concat({ ...e, t0: reloj });
    else if (e.tipo === 'lampara_on' || e.tipo === 'lampara_off') son.clickVelador();
  }
  S.aplastados = S.aplastados.filter(a => reloj - a.t0 < 1.5);
  S.globos = S.globos.filter(g => reloj - g.t0 < 3);
}

// ---------- bucle ----------
let acumulado = 0, antes = performance.now(), ultimaFoto = 0, pendientes = [];
function cuadro(ahora) {
  const dt = Math.min(0.1, (ahora - antes) / 1000);
  antes = ahora;
  reloj += dt;

  if (S.modo) mandarEntrada(ahora);

  if (S.modo === 'anfitrion') {
    acumulado += dt;
    while (acumulado >= PASO) {
      paso(S.juego, PASO);
      pendientes.push(...S.juego.eventos);
      acumulado -= PASO;
    }
    const f = foto(S.juego);
    f.eventos = pendientes;
    procesarEventos(pendientes);
    S.est = f;
    if (S.sala && ahora - ultimaFoto > 50) {
      S.sala.enviarTodos({ tipo: 'foto', ...f });
      ultimaFoto = ahora;
      pendientes = [];
    } else if (!S.sala) {
      pendientes = [];
    }
    if (S.sala && pendientes.length > 50) pendientes = pendientes.slice(-50);
  }

  // cambia la pantalla según la fase
  const fase = S.est ? S.est.fase : null;
  if (fase !== S.faseVista && S.modo) {
    S.faseVista = fase;
    if (fase === 'lobby') { mostrar('sala'); }
    else if (fase === 'juego') { mostrar(null); S.aplastados = []; S.globos = []; }
    else if (fase === 'fin') { mostrar('fin'); pintarFin(); }
  }
  if (fase === 'lobby') pintarSala();

  dibujar(dt);
  requestAnimationFrame(cuadro);
}

function dibujar(dt) {
  const est = S.est || { fase: 'lobby', tiempo: 90, molestia: 0, lampara: { estado: 'apagada' }, golpe: null, jugadores: [] };
  // el invitado suaviza posiciones entre fotos
  const jugadores = est.jugadores.map(p => {
    let v = S.vista.get(p.id);
    if (!v || S.modo === 'anfitrion' || Math.hypot(v.x - p.x, v.y - p.y) > 200) v = { x: p.x, y: p.y };
    else { const k = 1 - Math.exp(-dt * 18); v = { x: v.x + (p.x - v.x) * k, y: v.y + (p.y - v.y) * k }; }
    S.vista.set(p.id, v);
    return { ...p, x: v.x, y: v.y };
  });

  ctx.save();
  if (S.temblor > 0) {
    S.temblor -= dt;
    ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
  }
  dib.cuarto(ctx, est, reloj);
  dib.luz(ctx, est, reloj);
  dib.aplastados(ctx, S.aplastados, reloj);
  for (const p of jugadores) dib.mosquito(ctx, p, reloj, p.id === S.miId);
  dib.golpe(ctx, est.golpe);
  dib.globos(ctx, S.globos, jugadores, reloj);
  ctx.restore();
  if (est.fase === 'juego') dib.hud(ctx, est, S.miId);

  if (S.modo) son.actualizarZumbidos(est.fase === 'juego' ? jugadores : [], S.miId);
  S.proxRonquido -= dt;
  if (S.proxRonquido <= 0) {
    S.proxRonquido = 3.2;
    if (est.fase === 'juego' && est.lampara.estado === 'apagada' && est.molestia < 70) son.ronquido();
  }
}

let mudo = false;
$('mute').onclick = () => { mudo = !mudo; son.silenciar(mudo); $('mute').textContent = mudo ? '🔇' : '🔊'; };

mostrar('inicio');
requestAnimationFrame(cuadro);
