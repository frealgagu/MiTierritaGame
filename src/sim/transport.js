import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONE1 } from '../data/zones/zone1_finca.js';
import { muleBatch, warehouseCapacity } from './rules.js';
import { sumValues } from './state.js';
import { CHAIN, ROAD_POS, nextStation } from './chain.js';
import { inputSpace } from './production.js';

const MAX_IDLE = 6; // s: si hay algo en el patio y no sale una mula en este tiempo, sale con lo que haya
const MIN_TRIP = 1.5; // s

export function inTransit(state, to = 'warehouse') {
  return state.mules.reduce((n, m) => (m.to === to ? n + m.amount : n), 0);
}

// Espacio libre en bodega contando lo que ya viene en camino.
export function warehouseSpace(state) {
  return warehouseCapacity(state.dispatch.level) - sumValues(state.warehouse) - inTransit(state);
}

// v0.2: mulas ilimitadas que recorren el camino de una estación a la siguiente.
// Si la siguiente no existe o no tiene sitio, el producto se desvía a la bodega y se vende tal cual.
// Los arrieros con capacidad mejorable llegan en la v0.3.
export function stepMules(state, dt, bus) {
  const arrived = [];
  for (const m of state.mules) {
    m.t += dt;
    if (m.t >= m.duration) arrived.push(m);
  }
  if (arrived.length) {
    state.mules = state.mules.filter((m) => m.t < m.duration);
    for (const m of arrived) deliver(state, m);
    for (const m of arrived) bus.emit('muleArrived', m);
  }

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
  s.sinceDeparture += dt;
  if (s.buffer <= 0) return;
  const batch = muleBatch(def, s.level);
  if (s.buffer < batch && s.sinceDeparture < MAX_IDLE) return;
  let left = Math.min(s.buffer, batch);

  // A la siguiente estación lo que le quepa; el resto se desvía a la bodega.
  const next = nextStation(state, id);
  if (next) {
    const amount = Math.min(left, Math.floor(inputSpace(state, next)));
    if (amount > 0) {
      sendMule(state, id, next, amount, bus);
      left -= amount;
    }
  }
  if (left > 0) {
    const amount = Math.min(left, warehouseSpace(state));
    if (amount > 0) {
      sendMule(state, id, 'warehouse', amount, bus);
      if (next) s.lastDiverted = state.playTime;
    }
  }
}

function sendMule(state, from, to, amount, bus) {
  const s = state.stations[from];
  const productId = Object.keys(STATIONS_BY_ID[from].out)[0];
  s.buffer -= amount;
  s.sinceDeparture = 0;
  const s0 = ROAD_POS[from];
  const s1 = ROAD_POS[to];
  const mule = { id: state.nextId++, productId, amount, from, to, s0, s1, t: 0, duration: Math.max(MIN_TRIP, (s1 - s0) / ZONE1.muleSpeed) };
  state.mules.push(mule);
  bus.emit('muleDeparted', mule);
}
