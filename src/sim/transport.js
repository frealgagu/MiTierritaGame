import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONE1 } from '../data/zones/zone1_finca.js';
import { muleCount, muleLoad, warehouseCapacity } from './rules.js';
import { sumValues } from './state.js';
import { CHAIN, ROAD_POS, nextStation } from './chain.js';
import { inputSpace } from './production.js';
import { COMPOST_BOOST, dispatchMult, muleSpeedMult, speedMult } from './modifiers.js';

const MAX_IDLE = 6; // s: si hay algo en el patio y no sale una mula en este tiempo, sale con lo que haya
const MIN_LEG = 1; // s por trayecto
// Los desvíos solo usan la bodega mientras quede más de esta fracción libre: así el producto
// barato que sobra nunca deja sin sitio al producto final de la cadena.
export const DIVERT_RESERVE = 0.3;

// Segundos de un trayecto (solo ida) entre dos puntos de la cadena.
export function legTime(from, to, speedMult = 1) {
  return Math.max(MIN_LEG, Math.abs(ROAD_POS[to] - ROAD_POS[from]) / (ZONE1.muleSpeed * speedMult));
}

export function inTransit(state, to = 'warehouse') {
  return state.mules.reduce((n, m) => (m.to === to && m.phase === 'go' ? n + m.amount : n), 0);
}

// Cuánto acelera la producción de una estación (para dimensionar la carga de sus mulas).
export function productionMult(state, id) {
  return speedMult(state, id) * (id === 'farm' && state.stations.composter ? COMPOST_BOOST : 1);
}

// Destino normal de las mulas de una estación: la siguiente construida o la bodega.
export function normalDest(state, id) {
  return nextStation(state, id) ?? 'warehouse';
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

// Espacio libre en bodega contando lo que ya viene en camino.
export function warehouseSpace(state) {
  return warehouseCapacity(state.dispatch.level, dispatchMult(state)) - sumValues(state.warehouse) - inTransit(state);
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

  for (const id of CHAIN) {
    if (state.stations[id]) dispatchFrom(state, id, dt, bus);
  }
}

function deliver(state, m) {
  if (m.to !== 'warehouse' && state.stations[m.to]) state.stations[m.to].input += m.amount;
  else state.warehouse[m.productId] = (state.warehouse[m.productId] ?? 0) + m.amount;
}

function dispatchFrom(state, id, dt, bus) {
  const s = state.stations[id];
  const def = STATIONS_BY_ID[id];
  const level = s.transport.level;
  s.sinceDeparture += dt;
  s.waiting = null;
  const load = teamLoad(state, id);
  const next = nextStation(state, id);

  // Pueden salir varias mulas en el mismo instante si hay producto y mulas libres.
  while (s.buffer > 0) {
    if (busyMules(state, id) >= muleCount(level)) {
      s.waiting = 'mules';
      return;
    }
    if (s.buffer < load && s.sinceDeparture < MAX_IDLE) return;
    const amount = Math.min(s.buffer, load);
    if (next) {
      const space = inputSpace(state, next);
      if (space > 0) {
        sendMule(state, id, next, Math.min(amount, space), bus);
        continue;
      }
    }
    const reserve = next ? DIVERT_RESERVE * warehouseCapacity(state.dispatch.level, dispatchMult(state)) : 0;
    const room = warehouseSpace(state) - reserve;
    if (room <= 0) {
      s.waiting = 'space';
      return;
    }
    sendMule(state, id, 'warehouse', Math.min(amount, room), bus);
    if (next) s.lastDiverted = state.playTime;
  }
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
