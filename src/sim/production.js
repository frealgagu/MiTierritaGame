import { STATIONS_BY_ID } from '../data/stations.js';
import { stationBufferCap, stationInputCap, stationRate } from './rules.js';

export function createStationState() {
  return { level: 1, input: 0, buffer: 0, progress: 0, sinceDeparture: 0, idle: 0, status: 'working', waiting: null, transport: { level: 1 } };
}

// Avanza una estación: consume su entrada (si tiene receta) y deja el producto en su patio.
//   status: 'working' | 'starved' (falta entrada) | 'blocked' (patio lleno)
//   idle:   segundos seguidos sin entrada
//   waiting: por qué no sale el producto del patio: 'mules' (arrieros ocupados) | 'space' (bodega llena) | null
export function stepStation(state, id, dt, bus) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  const [[outId, outAmt]] = Object.entries(def.out);
  const need = def.in ? Object.values(def.in)[0] : 0;
  const space = stationBufferCap(def, s.level) - s.buffer;
  const byInput = need ? Math.floor(s.input / need) : Infinity;
  const byOutput = Math.floor(space / outAmt);

  if (byOutput <= 0) {
    s.status = 'blocked';
    s.progress = 0;
    return;
  }
  if (byInput <= 0) {
    s.status = 'starved';
    s.idle = (s.idle ?? 0) + dt;
    s.progress = 0;
    return;
  }
  s.status = 'working';
  s.idle = 0;
  s.progress += dt * stationRate(def, s.level);
  const cycles = Math.min(Math.floor(s.progress), byInput, byOutput);
  if (cycles <= 0) return;
  s.progress -= cycles;
  // Si faltó entrada, no se acumula tiempo de más.
  if (cycles === byInput) s.progress = Math.min(s.progress, 1);
  s.input -= cycles * need;
  s.buffer += cycles * outAmt;
  state.stats.produced[outId] = (state.stats.produced[outId] ?? 0) + cycles * outAmt;
  bus.emit('produced', { stationId: id, productId: outId, amount: cycles * outAmt });
}

// Espacio de entrada libre, contando lo que ya viene en camino.
export function inputSpace(state, id) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  const incoming = state.mules.reduce((n, m) => (m.to === id && m.phase === 'go' ? n + m.amount : n), 0);
  return stationInputCap(def, s.level) - s.input - incoming;
}
