import { DISPATCH } from '../data/stations.js';
import { dispatchCapacity } from './rules.js';
import { sumValues } from './state.js';
import { dispatchMult, productValue } from './modifiers.js';

// El Willys de cada zona espera en su bodega; sale lleno, o con carga parcial tras `maxWait` s.
// Vende al llegar al pueblo (mitad del viaje) y vuelve.
export function stepJeep(state, zoneId, dt, bus) {
  const zone = state.zones[zoneId];
  const j = zone.jeep;
  const half = DISPATCH.tripTime / 2;

  if (j.phase === 'idle') {
    const stock = sumValues(zone.warehouse);
    const cap = dispatchCapacity(zone.dispatch.level, dispatchMult(state, zoneId));
    j.waited = stock > 0 ? j.waited + dt : 0;
    if (stock >= cap || (stock > 0 && j.waited >= DISPATCH.maxWait)) {
      j.load = loadJeep(state, zone.warehouse, cap);
      j.phase = 'out';
      j.t = 0;
      j.waited = 0;
      bus.emit('jeepDeparted', { zone: zoneId, load: j.load });
    }
    return;
  }

  j.t += dt;
  if (j.t < half) return;
  j.t -= half;
  if (j.phase === 'out') {
    let coins = 0;
    for (const [id, amount] of Object.entries(j.load)) {
      coins += amount * productValue(state, id);
      state.stats.sold[id] = (state.stats.sold[id] ?? 0) + amount;
    }
    state.coins += coins;
    state.totalEarned += coins;
    bus.emit('sold', { zone: zoneId, coins, load: j.load });
    j.load = {};
    j.phase = 'back';
  } else {
    j.phase = 'idle';
    j.t = 0;
  }
}

// Carga primero lo más valioso.
function loadJeep(state, warehouse, cap) {
  const load = {};
  let room = cap;
  const ids = Object.keys(warehouse).sort((a, b) => productValue(state, b) - productValue(state, a));
  for (const id of ids) {
    const take = Math.min(warehouse[id], room);
    if (take <= 0) continue;
    load[id] = take;
    warehouse[id] -= take;
    if (warehouse[id] <= 1e-9) delete warehouse[id];
    room -= take;
    if (room === 0) break;
  }
  return load;
}
