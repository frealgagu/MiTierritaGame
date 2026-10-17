import { DISPATCH } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { dispatchCapacity } from './rules.js';
import { sumValues } from './state.js';

// El Willys espera en la bodega; sale lleno, o con carga parcial tras `maxWait` s.
// Vende al llegar al pueblo (mitad del viaje) y vuelve.
export function stepJeep(state, dt, bus) {
  const j = state.jeep;
  const half = DISPATCH.tripTime / 2;

  if (j.phase === 'idle') {
    const stock = sumValues(state.warehouse);
    const cap = dispatchCapacity(state.dispatch.level);
    j.waited = stock > 0 ? j.waited + dt : 0;
    if (stock >= cap || (stock > 0 && j.waited >= DISPATCH.maxWait)) {
      j.load = loadJeep(state.warehouse, cap);
      j.phase = 'out';
      j.t = 0;
      j.waited = 0;
      bus.emit('jeepDeparted', { load: j.load });
    }
    return;
  }

  j.t += dt;
  if (j.t < half) return;
  j.t -= half;
  if (j.phase === 'out') {
    let coins = 0;
    for (const [id, amount] of Object.entries(j.load)) {
      coins += amount * PRODUCTS[id].value;
      state.stats.sold[id] = (state.stats.sold[id] ?? 0) + amount;
    }
    state.coins += coins;
    state.totalEarned += coins;
    bus.emit('sold', { coins, load: j.load });
    j.load = {};
    j.phase = 'back';
  } else {
    j.phase = 'idle';
    j.t = 0;
  }
}

// Carga primero lo más valioso.
function loadJeep(warehouse, cap) {
  const load = {};
  let room = cap;
  const ids = Object.keys(warehouse).sort((a, b) => PRODUCTS[b].value - PRODUCTS[a].value);
  for (const id of ids) {
    const take = Math.min(warehouse[id], room);
    if (take <= 0) continue;
    load[id] = take;
    warehouse[id] -= take;
    if (warehouse[id] === 0) delete warehouse[id];
    room -= take;
    if (room === 0) break;
  }
  return load;
}
