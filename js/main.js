// Arma todo: pantallas, teclado, bucle del juego, red e historial de cada jugador.
import { nuevoJuego, agregarJugador, quitarJugador, empezar, entrada, paso, foto, podio, COLORES, FRASES, META } from './sim.js';
import * as dib from './dibujo.js';
import * as son from './sonido.js';
import { abrirSala, entrarSala, codigoNuevo } from './red.js';

const $ = id => document.getElementById(id);
const ctx = $('lienzo').getContext('2d');
const PASO = 1 / 60;
const PANTALLAS = ['inicio', 'unirse', 'sala', 'entre', 'fin', 'perfil'];

const S = {
  modo: null,          // 'anfitrion' | 'invitado'
  miId: 'h',
  juego: null,         // solo el anfitrión
  sala: null,          // conexión de red
  conRed: false,
  codigo: null,
  est: null,           // última foto que se dibuja
  vista: new Map(),    // posiciones suavizadas para dibujar (invitado)
  aplastados: [], globos: [],
  temblor: 0, proxRonquido: 3,
  faseVista: null,
  anotado: null,       // torneo ya guardado en el historial
};

// ---------- pantallas ----------
function mostrar(cual) {
  for (const id of PANTALLAS) $(id).hidden = id !== cual;
  $('salirJuego').hidden = !(S.modo && !cual);
}

function error(msg) { $('error').textContent = msg || ''; }

// lo que llega de otra compu no se mete crudo en el HTML: color de la lista fija, puntos como número
const colorSeguro = c => (COLORES.includes(c) ? c : '#ffffff');
const numero = n => Math.trunc(+n) || 0;
const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nombreDe = p => `<b style="color:${colorSeguro(p.color)}">${escapar(p.nombre)}${p.id === S.miId ? ' (vos)' : ''}</b>`;

// ---------- nombre e historial (en el navegador de cada uno) ----------
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin storage */ } };
const nombreGuardado = () => { try { return localStorage.getItem('np-nombre') || ''; } catch { return ''; } };
function guardarNombre(n) { try { localStorage.setItem('np-nombre', n); } catch { /* nada */ } }
const nombreDel = id => ($(id).value.trim() || 'Oliver').slice(0, 14);

$('nombre').value = nombreGuardado();
$('nombreUnirse').value = nombreGuardado();

function historial() { return leer('np-historial', []); }

function anotarTorneo() {
  const est = S.est;
  const clave = `${S.codigo || 'practica'}-${est.torneo}`;
  if (S.anotado === clave) return;
  const orden = podio(est);
  const puesto = orden.findIndex(p => p.id === S.miId);
  if (puesto < 0) return;                       // llegó tarde: no jugó este torneo
  S.anotado = clave;
  const yo = orden[puesto];
  const ganador = orden[0];
  const h = historial();
  h.unshift({
    fecha: new Date().toISOString(),
    puesto: puesto + 1, de: orden.length,
    final: puesto < 2,
    ganador: ganador ? ganador.nombre : '',
    rivales: orden.filter(p => p.id !== S.miId).map(p => p.nombre + (p.bot ? ' (bot)' : '')),
    conBots: orden.some(p => p.bot),
    nombre: yo.nombre,
  });
  escribir('np-historial', h.slice(0, 50));
  pintarResumen();
}

function totales(h) {
  return {
    jugadas: h.length,
    ganadas: h.filter(x => x.puesto === 1).length,
    finales: h.filter(x => x.final).length,
    contraAmigos: h.filter(x => !x.conBots).length,
  };
}

function pintarResumen() {
  const h = historial();
  const t = totales(h);
  $('resumenPerfil').innerHTML = h.length
    ? `<span><b>${t.jugadas}</b> jugadas · <b>${t.ganadas}</b> ganadas · <b>${t.finales}</b> finales</span><button class="enlace" id="verPerfil">Ver historial</button>`
    : '<span>Todavía no jugaste. Tu historial se va a guardar acá.</span>';
  const ver = $('verPerfil');
  if (ver) ver.onclick = () => { pintarPerfil(); mostrar('perfil'); };
}

function pintarPerfil() {
  const h = historial();
  const t = totales(h);
  $('stats').innerHTML = [['Jugadas', t.jugadas], ['Ganadas', t.ganadas], ['Finales', t.finales], ['Con amigos', t.contraAmigos]]
    .map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  const fecha = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  $('historial').innerHTML = h.length ? h.map(x => `<li><div><b>${x.puesto === 1 ? '🏆 Ganaste' : `${numero(x.puesto)}.º de ${numero(x.de)}`}</b>
      <small>contra ${escapar((x.rivales || []).join(', '))}${x.puesto === 1 ? '' : ` · ganó ${escapar(x.ganador)}`}</small></div><span>${fecha(x.fecha)}</span></li>`).join('')
    : '<li><span>Todavía no hay partidas.</span></li>';
}

$('volverPerfil').onclick = () => mostrar('inicio');
$('borrarPerfil').onclick = () => { escribir('np-historial', []); pintarPerfil(); pintarResumen(); };

// ---------- salas ----------
function pintarSala() {
  const est = S.est;
  if (!est) return;
  $('lista').innerHTML = est.jugadores.map(p => `<li>${nombreDe(p)}<span>${p.bot ? 'bot' : ''}</span></li>`).join('');
  const anfitrion = S.modo === 'anfitrion';
  const pocos = est.jugadores.length < 2;
  $('accionesAnfitrion').hidden = !anfitrion;
  $('esperando').hidden = anfitrion;
  $('faltaGente').hidden = !anfitrion || !pocos;
  $('empezar').disabled = pocos;
  $('bot').disabled = est.jugadores.length >= 4;
}

function pintarEntre() {
  const est = S.est;
  const fuera = est.jugadores.find(p => p.id === est.ultimoFuera);
  const quedan = est.jugadores.filter(p => !p.fuera).sort((a, b) => b.pts - a.pts);
  $('entreTitulo').textContent = `Terminó la ronda ${numero(est.ronda)}`;
  $('entreFuera').innerHTML = fuera ? `${nombreDe(fuera)} queda afuera` : '';
  $('entreFrase').textContent = fuera ? (fuera.id === S.miId ? 'Te quedaste afuera, pero podés mirar cómo sigue.' : `«${FRASES.eliminado[numero(est.ronda) % FRASES.eliminado.length]}»`) : '';
  $('entreLista').innerHTML = quedan.map(p => `<li>${nombreDe(p)}<span>${numero(p.pts)}</span></li>`).join('');
  $('entreSigue').textContent = quedan.length <= 2
    ? 'Sigue LA FINAL en el patio: la hamaca se mueve, la espiral echa humo y hay ráfagas de viento.'
    : `Sigue la ronda ${numero(est.ronda) + 1}, otra vez a ${META}.`;
  $('entreCuenta').textContent = Math.max(1, Math.ceil(est.entre || 0));
}

function pintarFin() {
  const est = S.est;
  const orden = podio(est);
  const g = orden[0];
  $('ganador').innerHTML = g ? `${nombreDe(g)} ganó la final` : 'Fin';
  const nota = p => {
    if (p.id === est.ganador) return 'campeón';
    const i = est.eliminados.indexOf(p.id);
    if (i === est.eliminados.length - 1 && orden.length > 1) return 'finalista';
    return i >= 0 ? `afuera en la ronda ${i + 1}` : '';
  };
  $('podio').innerHTML = orden.map((p, i) => `<li><span>${i + 1}. ${nombreDe(p)}</span><span>${nota(p)}</span></li>`).join('');
  const puesto = orden.findIndex(p => p.id === S.miId);
  $('finTuyo').textContent = puesto === 0 ? '¡Ganaste! Quedó anotado en tu historial.' : puesto > 0 ? `Saliste ${puesto + 1}.º de ${orden.length}. Quedó anotado en tu historial.` : '';
  $('accionesFin').hidden = S.modo !== 'anfitrion';
  $('esperandoFin').hidden = S.modo === 'anfitrion';
}

// ---------- anfitrión ----------
async function crear(conRed) {
  son.iniciarSonido();
  const nombre = nombreDel('nombre');
  guardarNombre(nombre);
  error('');
  limpiarLink();
  S.modo = null;       // la sala se muestra recién cuando tiene código (abajo)
  S.miId = 'h';
  S.conRed = conRed;
  S.juego = nuevoJuego();
  agregarJugador(S.juego, 'h', nombre);
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
    $('crear').disabled = false;
    S.codigo = codigo;
    const link = `${location.origin}${location.pathname}?sala=${codigo}`;
    $('codigoSala').textContent = codigo;
    $('linkSala').textContent = link;
    $('copiar').textContent = 'Copiar link';
    $('copiar').onclick = () => navigator.clipboard.writeText(link).then(() => { $('copiar').textContent = '¡Copiado!'; });
    $('paraInvitar').hidden = false;
  } else {
    S.codigo = null;
    $('paraInvitar').hidden = true;
    agregarJugador(S.juego, 'bot1', 'Hermana 1', true);
    agregarJugador(S.juego, 'bot2', 'Hermana 2', true);
  }
  botN = 3;
  S.est = foto(S.juego);
  S.faseVista = null;
  S.modo = 'anfitrion';
}

let botN = 3;
$('bot').onclick = () => { agregarJugador(S.juego, 'bot' + botN, 'Hermana ' + botN, true); botN++; };
$('empezar').onclick = () => { empezar(S.juego); };
$('revancha').onclick = () => { empezar(S.juego); };
$('crear').onclick = () => crear(true);
$('practicar').onclick = () => crear(false);

// ---------- invitado ----------
async function entrar(codigo, nombre, mostrarError, boton) {
  if (!/^[A-Z]{4}$/.test(codigo)) return mostrarError('El código tiene 4 letras.');
  son.iniciarSonido();
  guardarNombre(nombre);
  mostrarError('Conectando…');
  boton.disabled = true;
  try {
    const mia = {};
    mia.sala = S.sala = await entrarSala(codigo, nombre, {
      mensaje: d => { if (d && d.tipo === 'foto' && S.sala === mia.sala) recibir(d); },
      // si salí yo, la sala ya no es la actual y no hay nada que avisar
      cierra: () => { if (S.sala === mia.sala) salir('Se cortó la sala: el anfitrión salió o perdió la conexión.'); },
    });
    S.modo = 'invitado';
    S.miId = S.sala.id;
    S.codigo = codigo;
    S.faseVista = null;
    mostrarError('');
  } catch (e) {
    mostrarError(e.message && e.message.includes('sala') ? e.message : 'No pude conectar. ¿El código está bien y la sala sigue abierta?');
  }
  boton.disabled = false;
}

$('entrar').onclick = () => entrar($('codigo').value.trim().toUpperCase(), nombreDel('nombre'), error, $('entrar'));
$('entrarLink').onclick = () => entrar(($('codigoUnirse').textContent || '').toUpperCase(), nombreDel('nombreUnirse'),
  m => { $('errorUnirse').textContent = m || ''; }, $('entrarLink'));
$('noUnirse').onclick = () => { limpiarLink(); mostrar('inicio'); };

function recibir(d) {
  S.est = d;
  procesarEventos(d.eventos || []);
}

// ---------- salir y volver al inicio ----------
function limpiarLink() {
  if (location.search) history.replaceState(null, '', location.pathname);
}

function salir(msg) {
  const sala = S.sala;
  S.sala = null;
  S.modo = null;
  S.juego = null;
  S.est = null;
  S.faseVista = null;
  S.vista.clear();
  S.aplastados = []; S.globos = [];
  if (sala) try { sala.cerrar(); } catch { /* ya estaba cerrada */ }
  son.actualizarZumbidos([], null);
  limpiarLink();
  pintarResumen();
  mostrar('inicio');
  error(msg || '');
}
$('salirSala').onclick = () => salir();
$('salirFin').onclick = () => salir();
$('salirJuego').onclick = () => salir();

// ---------- teclado ----------
const teclas = new Set();
const MAPA = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowUp: 'arr', KeyW: 'arr', ArrowDown: 'aba', KeyS: 'aba', Space: 'fuerte' };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') {
    if (e.key === 'Enter' && e.target.id === 'nombreUnirse') $('entrarLink').click();
    if (e.key === 'Enter' && e.target.id === 'codigo') $('entrar').click();
    return;
  }
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
  const fase = S.est && S.modo ? S.est.fase : null;
  if (fase !== S.faseVista && S.modo) {
    S.faseVista = fase;
    if (fase === 'lobby') mostrar('sala');
    else if (fase === 'juego') { mostrar(null); S.aplastados = []; S.globos = []; }
    else if (fase === 'entre') mostrar('entre');
    else if (fase === 'fin') { anotarTorneo(); mostrar('fin'); }
  }
  if (fase === 'lobby') pintarSala();
  if (fase === 'entre') pintarEntre();
  if (fase === 'fin') pintarFin();

  dibujar(dt);
  requestAnimationFrame(cuadro);
}

function dibujar(dt) {
  const est = S.est || { fase: 'lobby', escenario: 'pieza', tiempo: 120, molestia: 0, lampara: { estado: 'apagada' }, golpe: null, jugadores: [] };
  // el invitado suaviza posiciones entre fotos
  const jugadores = est.jugadores.map(p => {
    let v = S.vista.get(p.id);
    if (!v || S.modo === 'anfitrion' || Math.hypot(v.x - p.x, v.y - p.y) > 200) v = { x: p.x, y: p.y };
    else { const k = 1 - Math.exp(-dt * 18); v = { x: v.x + (p.x - v.x) * k, y: v.y + (p.y - v.y) * k }; }
    S.vista.set(p.id, v);
    return { ...p, x: v.x, y: v.y };
  });
  const enJuego = jugadores.filter(p => !p.fuera);

  ctx.save();
  if (S.temblor > 0) {
    S.temblor -= dt;
    ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
  }
  dib.escena(ctx, est, reloj);
  dib.luz(ctx, est, reloj);
  dib.aplastados(ctx, S.aplastados, reloj);
  for (const p of enJuego) dib.mosquito(ctx, p, reloj, p.id === S.miId);
  dib.golpe(ctx, est.golpe);
  dib.globos(ctx, S.globos, jugadores, reloj);
  ctx.restore();
  if (est.fase === 'juego') dib.hud(ctx, est, S.miId);

  if (S.modo) son.actualizarZumbidos(est.fase === 'juego' ? enJuego : [], S.miId);
  S.proxRonquido -= dt;
  if (S.proxRonquido <= 0) {
    S.proxRonquido = 3.2;
    if (est.fase === 'juego' && est.escenario !== 'patio' && est.lampara.estado === 'apagada' && est.molestia < 70) son.ronquido();
  }
}

let mudo = false;
$('mute').onclick = () => { mudo = !mudo; son.silenciar(mudo); $('mute').textContent = mudo ? '🔇' : '🔊'; };

// si vino con un link de invitación, se entra directo a esa sala (sin pasar por «Crear sala»)
const desdeLink = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
pintarResumen();
if (desdeLink.length === 4) {
  $('codigoUnirse').textContent = desdeLink;
  $('codigo').value = desdeLink;
  mostrar('unirse');
  $('nombreUnirse').focus();
} else {
  mostrar('inicio');
}
requestAnimationFrame(cuadro);
