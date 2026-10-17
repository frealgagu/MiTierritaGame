import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID, ZONE_LIST } from '../data/zones/index.js';
import { muleCount, muleLoad, stationInputCap, warehouseCapacity } from './rules.js';
import { sumValues } from './state.js';
import { ROAD_POS, chainOf, consumers, zoneOf, zoneUnlocked } from './chain.js';
import { inputSpace } from './production.js';
import { dispatchMult, muleSpeedMult, speedMult } from './modifiers.js';

const MAX_IDLE = 6; // s: si hay algo en el patio y no sale una mula en este tiempo, sale con lo que haya
const MIN_LEG = 1; // s por trayecto
// Los desvíos solo usan la bodega mientras quede más de esta fracción libre: así el producto
// barato que sobra nunca deja sin sitio al producto final de la cadena.
export const DIVERT_RESERVE = 0.3;

// Segundos de un trayecto (solo ida) entre dos puntos de la cadena de una zona.
// `to` puede ser otra estación o 'warehouse' (la bodega de la zona de `from`).
export function legTime(from, to, speedMult = 1) {
  const zone = zoneOf(from);
  const pos = ROAD_POS[zone];
  return Math.max(MIN_LEG, Math.abs(pos[to] - pos[from]) / (ZONES_BY_ID[zone].muleSpeed * speedMult));
}

// Unidades en camino hacia una estación, o hacia la bodega de una zona.
export function inTransit(state, to = 'warehouse', zoneId = 'finca') {
  return state.mules.reduce((n, m) => {
    if (m.phase !== 'go' || m.to !== to) return n;
    if (to === 'warehouse' && zoneOf(m.from) !== zoneId) return n;
    return n + m.amount;
  }, 0);
}

// Cuánto acelera la producción de una estación (para dimensionar la carga de sus mulas).
export function productionMult(state, id) {
  return speedMult(state, id);
}

// Destino normal de las mulas de una estación: la siguiente construida o la bodega. Si reparte entre
// varias (una rama), la más lejana: así la carga alcanza para cualquiera de ellas.
export function normalDest(state, id) {
  const targets = consumers(state, id);
  if (!targets.length) return 'warehouse';
  return targets.reduce((far, c) => (legTime(id, c) > legTime(id, far) ? c : far));
}

// Carga de cada mula del equipo de una estación (a su nivel de arrieros o al indicado).
export function teamLoad(state, id, level = state.stations[id].transport.level) {
  const def = STATIONS_BY_ID[id];
  return muleLoad(def, level, 2 * legTime(id, normalDest(state, id)), productionMult(state, id));
}

// Unidades por segundo que mueven los arrieros de una estación hasta `dest`.
// Hacia su destino normal: un 25 % más de lo que produce la estación al mismo nivel
// (más con Herraduras o Cable aéreo). Hacia la bodega en un desvío: menos, el viaje es más largo.
export function teamCapacity(state, id, dest = normalDest(state, id), level = state.stations[id].transport.level) {
  return (muleCount(level) * teamLoad(state, id, level)) / (2 * legTime(id, dest, muleSpeedMult(state)));
}

// Mulas de una estación que están en camino (ida o vuelta).
export function busyMules(state, id) {
  return state.mules.reduce((n, m) => (m.from === id ? n + 1 : n), 0);
}

export function warehouseCap(state, zoneId) {
  return warehouseCapacity(state.zones[zoneId].dispatch.level, dispatchMult(state, zoneId));
}

// Espacio libre en la bodega de una zona contando lo que ya viene en camino.
export function warehouseSpace(state, zoneId) {
  return warehouseCap(state, zoneId) - sumValues(state.zones[zoneId].warehouse) - inTransit(state, 'warehouse', zoneId);
}

// Arrieros (v0.3): cada estación tiene sus mulas. Van a la siguiente estación (o a la bodega si
// la siguiente no existe o no tiene sitio), entregan y vuelven. Si todas están en camino, el
// producto se acumula en el patio.
export function stepMules(state, dt, bus) {
  let finished = false;
  for (const m of state.mules) {
    m.t += dt;
    if (m.t < m.duration) continue;
    if (m.phase === 'go') {
      deliver(state, m);
      bus.emit('muleArrived', m);
      m.phase = 'back';
      m.t -= m.duration;
      m.amount = 0;
    }
    if (m.phase === 'back' && m.t >= m.duration) {
      m.done = true;
      finished = true;
    }
  }
  if (finished) state.mules = state.mules.filter((m) => !m.done);

  for (const zone of ZONE_LIST) {
    if (!zoneUnlocked(state, zone.id)) continue;
    for (const id of chainOf(zone.id)) if (state.stations[id]) dispatchFrom(state, id, dt, bus);
  }
}

function deliver(state, m) {
  if (m.to !== 'warehouse' && state.stations[m.to]) state.stations[m.to].input += m.amount;
  else {
    const wh = state.zones[zoneOf(m.from)].warehouse;
    wh[m.productId] = (wh[m.productId] ?? 0) + m.amount;
  }
}

function dispatchFrom(state, id, dt, bus) {
  const s = state.stations[id];
  const def = STATIONS_BY_ID[id];
  const level = s.transport.level;
  s.sinceDeparture += dt;
  s.waiting = null;
  const load = teamLoad(state, id);
  const targets = consumers(state, id);

  // Pueden salir varias mulas en el mismo instante si hay producto y mulas libres.
  while (s.buffer > 0) {
    if (busyMules(state, id) >= muleCount(level)) {
      s.waiting = 'mules';
      return;
    }
    if (s.buffer < load && s.sinceDeparture < MAX_IDLE) return;
    const amount = Math.min(s.buffer, load);
    const next = pickConsumer(state, targets);
    if (next) {
      sendMule(state, id, next, Math.min(amount, inputSpace(state, next)), bus);
      continue;
    }
    const zoneId = zoneOf(id);
    const reserve = targets.length ? DIVERT_RESERVE * warehouseCap(state, zoneId) : 0;
    const room = warehouseSpace(state, zoneId) - reserve;
    if (room <= 0) {
      s.waiting = 'space';
      return;
    }
    sendMule(state, id, 'warehouse', Math.min(amount, room), bus);
    if (targets.length) s.lastDiverted = state.playTime;
  }
}

// Entre las estaciones que reciben el producto, la que tiene la entrada más vacía (contando lo que
// ya va en camino). Así la que trabaja más rápido recibe más, sin que el jugador tenga que repartir.
function pickConsumer(state, targets) {
  let best = null;
  let bestFill = Infinity;
  for (const c of targets) {
    const space = inputSpace(state, c);
    if (space <= 0) continue;
    const cap = stationInputCap(STATIONS_BY_ID[c], state.stations[c].level);
    const fill = 1 - space / cap;
    if (fill < bestFill) {
      best = c;
      bestFill = fill;
    }
  }
  return best;
}

function sendMule(state, from, to, amount, bus) {
  const s = state.stations[from];
  const productId = Object.keys(STATIONS_BY_ID[from].out)[0];
  s.buffer -= amount;
  s.sinceDeparture = 0;
  const mule = { id: state.nextId++, productId, amount, from, to, phase: 'go', t: 0, duration: legTime(from, to, muleSpeedMult(state)) };
  state.mules.push(mule);
  bus.emit('muleDeparted', mule);
}
