// Red entre amigos con PeerJS (WebRTC, gratis): el que crea la sala es el anfitrión
// y corre la simulación; los demás mandan sus teclas y reciben la foto del juego.
const PREFIJO = 'oliver-no-pica-';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const codigoNuevo = () => Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');

// anfitrión: avisa por cb.conecta(id, nombre), cb.mensaje(id, datos), cb.sale(id)
export function abrirSala(codigo, cb) {
  return new Promise((ok, mal) => {
    const peer = new window.Peer(PREFIJO + codigo);
    const conexiones = new Map();
    peer.on('open', () => ok({
      peer,
      enviarTodos(datos) { for (const c of conexiones.values()) if (c.open) c.send(datos); },
      enviar(id, datos) { const c = conexiones.get(id); if (c && c.open) c.send(datos); },
      cerrar() { peer.destroy(); },
    }));
    peer.on('error', e => mal(e));
    // el id de cada jugador lo pone el anfitrión: nadie puede hacerse pasar por otro (ni por 'h')
    let n = 0;
    peer.on('connection', c => {
      const id = 'g' + (++n);
      let admitido = false;
      c.on('open', () => {
        const nombre = String((c.metadata && c.metadata.nombre) || 'Mosquito');
        if (!cb.conecta(id, nombre)) { c.close(); return; }   // sala llena o partida en curso
        admitido = true;
        conexiones.set(id, c);
        c.send({ tipo: 'hola', id });
      });
      c.on('data', d => { if (admitido) cb.mensaje(id, d); });
      const fuera = () => { if (!admitido) return; admitido = false; conexiones.delete(id); cb.sale(id); };
      c.on('close', fuera);
      c.on('error', fuera);
    });
  });
}

// invitado: cb.mensaje(datos), cb.cierra()
export function entrarSala(codigo, nombre, cb) {
  return new Promise((ok, mal) => {
    const peer = new window.Peer();
    peer.on('error', e => mal(e));
    peer.on('open', () => {
      const c = peer.connect(PREFIJO + codigo, { metadata: { nombre }, serialization: 'json' });
      const plazo = setTimeout(() => mal(new Error('No encontré la sala o ya está llena.')), 9000);
      let listo = false;
      c.on('data', d => {
        if (!listo && d && d.tipo === 'hola' && typeof d.id === 'string') {
          // recién con el id que asigna el anfitrión se entra a la sala
          listo = true;
          clearTimeout(plazo);
          ok({ id: d.id, enviar: x => c.open && c.send(x), cerrar: () => peer.destroy() });
        } else if (listo) cb.mensaje(d);
      });
      c.on('close', () => { if (listo) cb.cierra(); else { clearTimeout(plazo); mal(new Error('La sala está llena o ya empezó.')); } });
    });
  });
}
