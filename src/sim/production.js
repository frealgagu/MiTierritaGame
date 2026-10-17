import { STATIONS_BY_ID } from '../data/stations.js';
import { stationBufferCap, stationRate } from './rules.js';

// Fuente ilimitada: produce hasta llenar su patio; si se llena, se detiene.
export function stepSource(state, stationId, dt, bus) {
  const def = STATIONS_BY_ID[stationId];
  const s = state.stations[stationId];
  const cap = stationBufferCap(def, s.level);
  if (s.buffer >= cap) {
    s.blocked = true;
    s.progress = 0;
    return;
  }
  s.blocked = false;
  s.progress += dt * stationRate(def, s.level);
  const cycles = Math.floor(s.progress);
  if (cycles <= 0) return;
  s.progress -= cycles;
  const [[productId, amount]] = Object.entries(def.out);
  const produced = Math.min(cycles * amount, cap - s.buffer);
  s.buffer += produced;
  state.stats.produced[productId] = (state.stats.produced[productId] ?? 0) + produced;
  bus.emit('produced', { stationId, productId, amount: produced });
}
