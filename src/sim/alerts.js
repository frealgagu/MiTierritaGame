import { warehouseSpace } from './transport.js';

// Avisos que duran: con todo nivelado, el producto viaja por tandas y es normal que un patio se
// llene un momento, que una estación espere la siguiente mula o que un viaje se desvíe a la
// bodega. Eso no es un problema. Un aviso (el ícono del mapa y el texto del panel) sale solo si
// el problema ocupa al menos la mitad de los últimos 10 s de juego, y se quita cuando baja de la
// quinta parte (para que no parpadee).
export const ALERT_WINDOW = 10; // s de juego
const BUCKET = 1; // s por casilla de la ventana
const ON = 0.5;
const OFF = 0.2;
export const DIVERT_TIME = 3; // s que cuenta como «desviando» tras un viaje desviado a la bodega
// «Esperando» cuenta solo en las rachas largas sin que llegue nada: una estación más rápida que la
// anterior (la Hornilla con bagazo) espera un poco entre tanda y tanda, y eso no es un problema.
export const STARVED_IDLE = 8; // s seguidos sin entrada

const KINDS = ['blocked', 'starved', 'diverting', 'full'];
const empty = () => ({ time: 0, blocked: 0, starved: 0, diverting: 0, full: 0 });
// Por estación y por zona (el objeto de la partida): no se guarda con la partida.
const tracks = new WeakMap();
// La bodega llena se mira dos veces por segundo (calcular su espacio cuesta más).
const ZONE_SAMPLE = 0.5;
const zoneTime = new WeakMap();

function track(obj, dt, flags) {
  let t = tracks.get(obj);
  // sum: lo que suman las casillas de la ventana (se lleva la cuenta al entrar y salir cada una).
  if (!t) tracks.set(obj, (t = { buckets: [], cur: empty(), sum: empty(), on: {}, waiting: null }));
  const c = t.cur;
  c.time += dt;
  for (const kind of KINDS) if (flags[kind]) c[kind] += dt;
  if (c.time < BUCKET) return t;
  const add = (b, sign) => {
    t.sum.time += sign * b.time;
    for (const kind of KINDS) t.sum[kind] += sign * b[kind];
  };
  t.buckets.push(c);
  add(c, 1);
  t.cur = empty();
  while (t.buckets.length > 1 && t.sum.time - t.buckets[0].time >= ALERT_WINDOW) add(t.buckets.shift(), -1);
  // Al empezar (o tras cargar la partida) la ventana aún no está llena: cuenta como sin problemas.
  const time = Math.max(ALERT_WINDOW, t.sum.time);
  for (const kind of KINDS) {
    const frac = t.sum[kind] / time;
    if (frac >= ON) t.on[kind] = true;
    else if (frac <= OFF) t.on[kind] = false;
  }
  return t;
}

export function stepAlerts(state, dt) {
  for (const st of Object.values(state.stations)) {
    const t = track(st, dt, {
      blocked: st.status === 'blocked',
      starved: st.status === 'starved' && st.idle > STARVED_IDLE,
      diverting: st.lastDiverted !== undefined && state.playTime - st.lastDiverted < DIVERT_TIME,
    });
    // Por qué se llena el patio (mulas o bodega): lo último que se vio.
    if (st.status === 'blocked') t.waiting = st.waiting;
  }
  const since = (zoneTime.get(state) ?? 0) + dt;
  if (since < ZONE_SAMPLE) return void zoneTime.set(state, since);
  zoneTime.set(state, 0);
  for (const [id, zone] of Object.entries(state.zones)) {
    if (zone.unlocked) track(zone, since, { full: warehouseSpace(state, id) <= 0 });
  }
}

// { blocked, starved, diverting, full, waiting }: los avisos que duran de una estación o una zona.
export function alerts(obj) {
  const t = obj && tracks.get(obj);
  return { blocked: false, starved: false, diverting: false, full: false, ...t?.on, waiting: t?.waiting ?? null };
}
