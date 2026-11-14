import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { stationBufferCap, stationInputCap, stationRate } from './rules.js';
import { capMult, consumeCompost, speedMult } from './modifiers.js';
import { CALENDAR, clockOf, resting, seasonOf } from './calendar.js';
import { fleetOf } from './fleet.js';
import { joinOf } from './chain.js';

export function createStationState() {
  return { level: 1, input: 0, buffer: 0, byBuffer: 0, fuel: 0, imported: {}, joined: {}, progress: 0, sinceDeparture: 0, idle: 0, status: 'working', waiting: null, transport: { level: 1 } };
}

// Starting source when opening a zone. Seasonal crops (Hormiguero, v3.4) start with
// full pantry (prior harvest) so zone runs even if unlocked off-season.
export function createSourceState(id) {
  const s = createStationState();
  const def = STATIONS_BY_ID[id];
  if (def.harvest) s.buffer = stationBufferCap(def, s.level);
  return s;
}

// Is zone waiting for next harvest? Seasonal source off-season with empty pantry:
// chain shortage can't be fixed by leveling up (v3.4).
export function waitingHarvest(state, zoneId) {
  const id = ZONES_BY_ID[zoneId]?.farm.stationId;
  const s = state.stations[id];
  return Boolean(STATIONS_BY_ID[id]?.harvest && s?.status === 'season' && s.buffer < 1);
}

// Seasonal harvest (v3.4): produces nothing off-season and `mult`× in season (a full
// year's share). Haulers still work year-round carrying pantry stock. Without calendar
// (chain tests) or on event board, produces steadily.
export function harvestFactor(state, def) {
  if (!def.harvest || !CALENDAR.on || state.event) return 1;
  return seasonOf(clockOf(state)).id === def.harvest.season ? def.harvest.mult : 0;
}

// Steps a station: consumes input (if it has recipe) and places output in its yard.
//   status: 'working' | 'starved' (missing input) | 'blocked' (yard full) | 'resting' (night)
//           | 'season' (off-season harvest)
//   idle:   consecutive seconds without input
//   waiting: why yard output stalls: 'mules' (haulers busy) | 'space' (warehouse full) | null
//   missing: missing imported product arriving via inter-zone route (or null)
export function stepStation(state, id, dt, bus) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  // No work at night: in-progress cycles finish at dawn.
  if (resting(state)) {
    s.status = 'resting';
    s.missing = null;
    return;
  }
  const harvest = harvestFactor(state, def);
  if (harvest === 0) {
    s.status = 'season';
    s.missing = null;
    s.progress = 0;
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
  // Combined input from another zone station (v4.0): also halts without it (`lacking`: missing item).
  s.lacking = null;
  for (const j of def.joins ?? []) {
    const n = Math.floor(((s.joined ??= {})[j.product] ?? 0) / j.perCycle + 1e-9);
    if (n < byInput) byInput = n;
    if (n <= 0 && !s.lacking) s.lacking = j.product;
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
  // Fuel (bagazo) in Hornilla.
  const boost = def.fuel && s.fuel > 0 ? def.fuel.boost : 1;
  s.progress += dt * stationRate(def, s.level) * speedMult(state, id) * boost * harvest;
  const cycles = Math.min(Math.floor(s.progress), byInput, byOutput);
  if (cycles <= 0) return;
  s.progress -= cycles;
  // If starved of input, don't bank excess cycle progress.
  if (cycles === byInput) s.progress = Math.min(s.progress, 1);
  s.input -= cycles * need;
  s.buffer += cycles * outAmt;
  state.stats.produced[outId] = (state.stats.produced[outId] ?? 0) + cycles * outAmt;
  if (def.by) {
    // Byproduct (pulp): stored separately; if unused, overflows when full.
    const [[byId, byAmt]] = Object.entries(def.by);
    s.byBuffer = Math.min(stationBufferCap(def, s.level, capMult(state, id)), (s.byBuffer ?? 0) + cycles * byAmt);
    // (v4.6) Also counts toward produced totals: byproduct goals exist (Bogotá chicharrón).
    state.stats.produced[byId] = (state.stats.produced[byId] ?? 0) + cycles * byAmt;
  }
  if (id === 'wetmill') consumeCompost(state, cycles * outAmt);
  if (def.fuel && s.fuel > 0) s.fuel = Math.max(0, s.fuel - cycles * def.fuel.perCycle);
  for (const imp of def.imports ?? []) s.imported[imp.product] = Math.max(0, s.imported[imp.product] - cycles * imp.perCycle);
  for (const j of def.joins ?? []) s.joined[j.product] = Math.max(0, s.joined[j.product] - cycles * j.perCycle);
  bus.emit('produced', { stationId: id, productId: outId, amount: cycles * outAmt });
}

// Free input space, including en-route cargo. `product`: cargo being delivered (primary
// or combined input on combiner stations; v4.0): each has independent capacity.
export function inputSpace(state, id, product = mainInput(id)) {
  const def = STATIONS_BY_ID[id];
  const s = state.stations[id];
  const f = fleetOf(state);
  const key = incomingKey(id, product);
  const incoming = f ? f.incoming[key] ?? 0 : state.mules.reduce((n, m) => (m.phase === 'go' && incomingKey(m.to, m.productId) === key ? n + m.amount : n), 0);
  const have = joinOf(id, product) ? s.joined?.[product] ?? 0 : s.input;
  return stationInputCap(def, s.level, capMult(state, id)) - have - incoming;
}
export const mainInput = (id) => Object.keys(STATIONS_BY_ID[id].in ?? {})[0];
// Primary input tracks normally on station; combined input tracks separately.
export const incomingKey = (id, product) => (STATIONS_BY_ID[id] && joinOf(id, product) ? `${id}|${product}` : id);

// Fuel: station byproduct (Molienda bagazo) feeds burner (Hornilla) directly.
// If unused, overflows once byproduct yard fills.
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

// Compostera: receives Beneficiadero pulp via chute (stepByproducts) and makes compost,
// kept in its yard and spent by Cafetal.
export function stepComposter(state, dt, bus) {
  if (!state.stations.composter) return;
  stepStation(state, 'composter', dt, bus);
}
