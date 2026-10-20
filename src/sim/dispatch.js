import { DISPATCH } from '../data/stations.js';
import { dispatchCapacity } from './rules.js';
import { sumValues } from './state.js';
import { dispatchMult, jeepCount, productValue, saleValue } from './modifiers.js';
import { routeReserve } from './routes.js';

// Lo que el Willys puede vender: la bodega menos lo que espera una ruta hacia otra zona.
export function sellableStock(state, zoneId, reserve = routeReserve(state, zoneId)) {
  return sumValues(state.zones[zoneId].warehouse) - sumValues(reserve);
}

// Parqueado sin nada que vender (todo se lo lleva la Chiva): el conductor se toma un tinto.
export function jeepResting(state, zoneId) {
  return state.zones[zoneId].jeep.phase === 'idle' && sellableStock(state, zoneId) <= 1e-9;
}

// Los Willys de una zona (v3.9: el segundo, si la región lo tiene; se crea al usarlo).
export function jeepsOf(state, zoneId) {
  const zone = state.zones[zoneId];
  if (jeepCount(state) < 2) return [zone.jeep];
  zone.jeep2 ??= { phase: 'idle', t: 0, waited: 0, load: {} };
  return [zone.jeep, zone.jeep2];
}

// El Willys de cada zona espera en su bodega; sale lleno, o con carga parcial tras `maxWait` s.
// Vende al llegar al pueblo (mitad del viaje) y vuelve. Con dos (v3.9), cada uno por su lado: el
// primero que esté en la bodega carga primero.
export function stepJeep(state, zoneId, dt, bus) {
  jeepsOf(state, zoneId).forEach((j, k) => stepOne(state, zoneId, j, k, dt, bus));
}

function stepOne(state, zoneId, j, k, dt, bus) {
  const zone = state.zones[zoneId];
  const half = DISPATCH.tripTime / 2;

  if (j.phase === 'idle') {
    // Lo que espera una ruta hacia otra zona no se vende.
    const reserve = routeReserve(state, zoneId);
    const stock = sellableStock(state, zoneId, reserve);
    const cap = dispatchCapacity(zone.dispatch.level, dispatchMult(state, zoneId));
    j.waited = stock > 0 ? j.waited + dt : 0;
    if (stock >= cap || (stock > 0 && j.waited >= DISPATCH.maxWait)) {
      j.load = loadJeep(state, zone.warehouse, cap, reserve);
      j.phase = 'out';
      j.t = 0;
      j.waited = 0;
      bus.emit('jeepDeparted', { zone: zoneId, load: j.load, jeep: k });
    }
    return;
  }

  j.t += dt;
  if (j.t < half) return;
  j.t -= half;
  if (j.phase === 'out') {
    let coins = 0;
    for (const [id, amount] of Object.entries(j.load)) {
      coins += amount * saleValue(state, id);
      state.stats.sold[id] = (state.stats.sold[id] ?? 0) + amount;
    }
    state.coins += coins;
    state.totalEarned += coins;
    bus.emit('sold', { zone: zoneId, coins, load: j.load, jeep: k });
    j.load = {};
    j.phase = 'back';
  } else {
    j.phase = 'idle';
    j.t = 0;
  }
}

// Carga primero lo más valioso.
function loadJeep(state, warehouse, cap, reserve) {
  const load = {};
  let room = cap;
  const ids = Object.keys(warehouse).sort((a, b) => productValue(state, b) - productValue(state, a));
  for (const id of ids) {
    const take = Math.min(warehouse[id] - (reserve[id] ?? 0), room);
    if (take <= 0) continue;
    load[id] = take;
    warehouse[id] -= take;
    if (warehouse[id] <= 1e-9) delete warehouse[id];
    room -= take;
    if (room === 0) break;
  }
  return load;
}
