import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONE1 } from '../data/zones/zone1_finca.js';
import { pathLength } from '../core/path.js';
import { muleBatch, warehouseCapacity } from './rules.js';
import { sumValues } from './state.js';

export const MULE_TRAVEL_TIME = pathLength(ZONE1.muleRoad) / ZONE1.muleSpeed;
const MAX_IDLE = 6; // s: si hay algo en el patio y no sale una mula en este tiempo, sale con lo que haya

export function inTransit(state) {
  return state.mules.reduce((n, m) => n + m.amount, 0);
}

// Espacio libre en bodega contando lo que ya viene en camino.
export function warehouseSpace(state) {
  return warehouseCapacity(state.dispatch.level) - sumValues(state.warehouse) - inTransit(state);
}

// v0.1: mulas ilimitadas del cafetal a la bodega (solo hay retraso, no cuello de botella).
// Los arrieros con capacidad mejorable llegan en la v0.3.
export function stepMules(state, dt, bus) {
  const arrived = [];
  for (const m of state.mules) {
    m.t += dt;
    if (m.t >= m.duration) arrived.push(m);
  }
  if (arrived.length) {
    state.mules = state.mules.filter((m) => m.t < m.duration);
    for (const m of arrived) {
      state.warehouse[m.productId] = (state.warehouse[m.productId] ?? 0) + m.amount;
      bus.emit('muleArrived', m);
    }
  }

  const farm = state.stations.farm;
  const def = STATIONS_BY_ID.farm;
  farm.sinceDeparture += dt;
  const batch = muleBatch(def, farm.level);
  const space = warehouseSpace(state);
  let amount = 0;
  if (farm.buffer >= batch && space >= batch) amount = batch;
  else if (farm.buffer > 0 && farm.sinceDeparture >= MAX_IDLE) amount = Math.min(farm.buffer, space);
  if (amount <= 0) return;

  const [productId] = Object.keys(def.out);
  farm.buffer -= amount;
  farm.sinceDeparture = 0;
  const mule = { id: state.nextId++, productId, amount, t: 0, duration: MULE_TRAVEL_TIME };
  state.mules.push(mule);
  bus.emit('muleDeparted', mule);
}
