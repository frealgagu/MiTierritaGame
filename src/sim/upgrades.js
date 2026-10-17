import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { bulkUpgrade, MAX_LEVEL, MILESTONES } from './rules.js';
import { CHAIN, nextToUnlock } from './chain.js';
import { createStationState } from './production.js';
import { RESEARCH_BY_ID } from '../data/research.js';

// Los arrieros cuestan la mitad que la estación a la que sirven.
const TRANSPORT_COST_FACTOR = 0.5;

// Lo que se puede mejorar: 'dispatch', el id de una estación o 'id:transport' (sus arrieros).
function target(state, id) {
  if (id === 'dispatch') return { base: DISPATCH.upgradeBase, growth: DISPATCH.growth, holder: state.dispatch };
  const [stationId, part] = id.split(':');
  const def = STATIONS_BY_ID[stationId];
  const st = state.stations[stationId];
  if (part === 'transport') return { base: def.upgradeBase * TRANSPORT_COST_FACTOR, growth: def.growth, holder: st.transport };
  return { base: def.upgradeBase, growth: def.growth, holder: st };
}

// mode: 1 | 10 | 'max'
export function quoteUpgrade(state, id, mode) {
  const { base, growth, holder } = target(state, id);
  const level = holder.level;
  if (level >= MAX_LEVEL) return { levels: 0, cost: 0, affordable: false, maxed: true };
  if (mode === 'max') {
    const q = bulkUpgrade(base, growth, level, Infinity, state.coins);
    if (q.levels > 0) return { ...q, affordable: true, maxed: false };
    return { ...bulkUpgrade(base, growth, level, 1), affordable: false, maxed: false };
  }
  const q = bulkUpgrade(base, growth, level, mode);
  return { ...q, affordable: q.levels > 0 && state.coins >= q.cost, maxed: false };
}

export function buyUpgrade(state, id, mode, bus) {
  const q = quoteUpgrade(state, id, mode);
  if (!q.affordable) return false;
  const { holder } = target(state, id);
  const from = holder.level;
  state.coins -= q.cost;
  holder.level += q.levels;
  // Hito más alto alcanzado con esta compra (o null).
  const milestone = MILESTONES.filter((m) => m > from && m <= holder.level).at(-1) ?? null;
  bus.emit('levelUp', { id, from, to: holder.level, milestone });
  return true;
}

// ¿Se puede construir esta estación? Hay que seguir el orden de la cadena.
export function quoteUnlock(state, id) {
  const def = STATIONS_BY_ID[id];
  if (state.stations[id]) return { ok: false, reason: 'built', cost: 0 };
  const cost = def.unlockCost;
  if (def.side) {
    // Rama secundaria: solo pide la estación que la habilita.
    if (!state.stations[def.requires]) return { ok: false, reason: 'order', previous: def.requires, cost };
  } else if (nextToUnlock(state) !== id) {
    const previous = CHAIN[CHAIN.indexOf(id) - 1];
    return { ok: false, reason: 'order', previous, cost };
  }
  if (state.coins < cost) return { ok: false, reason: 'coins', cost };
  return { ok: true, cost };
}

export function unlockStation(state, id, bus) {
  const q = quoteUnlock(state, id);
  if (!q.ok) return false;
  state.coins -= q.cost;
  state.stations[id] = createStationState();
  bus.emit('unlocked', { id });
  return true;
}

// Investigaciones: aparecen cuando su estación está construida y se compran una vez.
export function quoteResearch(state, id) {
  const r = RESEARCH_BY_ID[id];
  if (state.research.includes(id)) return { ok: false, reason: 'owned', cost: r.cost };
  if (r.requires && !state.stations[r.requires]) return { ok: false, reason: 'locked', cost: r.cost };
  if (state.coins < r.cost) return { ok: false, reason: 'coins', cost: r.cost };
  return { ok: true, cost: r.cost };
}

export function buyResearch(state, id, bus) {
  const q = quoteResearch(state, id);
  if (!q.ok) return false;
  state.coins -= q.cost;
  state.research.push(id);
  bus.emit('research', { id });
  return true;
}
