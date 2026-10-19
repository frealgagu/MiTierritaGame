import { STATIONS_BY_ID } from '../data/stations.js';
import { stationBufferCap, stationInputCap, stationRate } from './rules.js';
import { capMult, consumeCompost, speedMult } from './modifiers.js';
import { isWorkTime } from './calendar.js';

export function createStationState() {
  return { level: 1, input: 0, buffer: 0, byBuffer: 0, fuel: 0, imported: {}, progress: 0, sinceDeparture: 0, idle: 0, status: 'working', waiting: null, transport: { level: 1 } };
}

// Avanza una estación: consume su entrada (si tiene receta) y deja el producto en su patio.
//   status: 'working' | 'starved' (falta entrada) | 'blocked' (patio lleno) | 'resting' (de noche)
//   idle:   segundos seguidos sin entrada
//   waiting: por qué no sale el producto del patio: 'mules' (arrieros ocupados) | 'space' (bodega llena) | null
//   missing: producto que falta de los que llegan por una ruta entre zonas (o null)
export function stepStation(state, id, dt, bus) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  // De noche no se trabaja: lo que iba a medias sigue al amanecer.
  if (!isWorkTime(state.playTime)) {
    s.status = 'resting';
    s.missing = null;
    return;
  }
  const [[outId, outAmt]] = Object.entries(def.out);
  const need = def.in ? Object.values(def.in)[0] : 0;
  const space = stationBufferCap(def, s.level, capMult(state, id)) - s.buffer;
  const byLocal = need ? Math.floor(s.input / need) : Infinity;
  let byInput = byLocal;
  s.missing = null;
  for (const imp of def.imports ?? []) {
    const n = Math.floor((s.imported[imp.product] ?? 0) / imp.perCycle + 1e-9);
    if (n < byInput) byInput = n;
    if (n <= 0 && !s.missing) s.missing = imp.product;
  }
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
  // Combustible (bagazo) en la Hornilla.
  const boost = def.fuel && s.fuel > 0 ? def.fuel.boost : 1;
  s.progress += dt * stationRate(def, s.level) * speedMult(state, id) * boost;
  const cycles = Math.min(Math.floor(s.progress), byInput, byOutput);
  if (cycles <= 0) return;
  s.progress -= cycles;
  // Si faltó entrada, no se acumula tiempo de más.
  if (cycles === byInput) s.progress = Math.min(s.progress, 1);
  s.input -= cycles * need;
  s.buffer += cycles * outAmt;
  state.stats.produced[outId] = (state.stats.produced[outId] ?? 0) + cycles * outAmt;
  if (def.by) {
    // Subproducto (pulpa): se guarda aparte; si no hay quien lo use, se desecha al llenarse.
    const [[, byAmt]] = Object.entries(def.by);
    s.byBuffer = Math.min(stationBufferCap(def, s.level, capMult(state, id)), (s.byBuffer ?? 0) + cycles * byAmt);
  }
  if (id === 'wetmill') consumeCompost(state, cycles * outAmt);
  if (def.fuel && s.fuel > 0) s.fuel = Math.max(0, s.fuel - cycles * def.fuel.perCycle);
  for (const imp of def.imports ?? []) s.imported[imp.product] = Math.max(0, s.imported[imp.product] - cycles * imp.perCycle);
  bus.emit('produced', { stationId: id, productId: outId, amount: cycles * outAmt });
}

// Espacio de entrada libre, contando lo que ya viene en camino.
export function inputSpace(state, id) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  const incoming = state.mules.reduce((n, m) => (m.to === id && m.phase === 'go' ? n + m.amount : n), 0);
  return stationInputCap(def, s.level, capMult(state, id)) - s.input - incoming;
}

// Combustible: el subproducto de una estación (bagazo de la Molienda) pasa directo a la que lo
// quema (Hornilla). Si nadie lo usa, se desecha al llenarse el patio de subproductos.
export function stepFuel(state, id) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  const src = state.stations[def.fuel.from];
  if (!s || !src?.byBuffer) return;
  const room = stationInputCap(def, s.level, capMult(state, id)) - (s.fuel ?? 0);
  const move = Math.max(0, Math.min(room, src.byBuffer));
  s.fuel = (s.fuel ?? 0) + move;
  src.byBuffer -= move;
}

// Compostera: recibe la pulpa del Beneficiadero por una canaleta (sin mulas) y produce compost,
// que se queda en su patio y que el Cafetal va gastando.
export function stepComposter(state, dt, bus) {
  const c = state.stations.composter;
  if (!c) return;
  const w = state.stations.wetmill;
  if (w?.byBuffer > 0) {
    const room = stationInputCap(STATIONS_BY_ID.composter, c.level, capMult(state, 'composter')) - c.input;
    const move = Math.max(0, Math.min(room, w.byBuffer));
    c.input += move;
    w.byBuffer -= move;
  }
  stepStation(state, 'composter', dt, bus);
}
