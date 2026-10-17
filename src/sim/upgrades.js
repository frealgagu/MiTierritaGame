import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { bulkUpgrade, MAX_LEVEL, MILESTONES } from './rules.js';

// Lo que se puede mejorar: 'dispatch' o el id de una estación.
function target(state, id) {
  if (id === 'dispatch') return { base: DISPATCH.upgradeBase, growth: DISPATCH.growth, holder: state.dispatch };
  const def = STATIONS_BY_ID[id];
  return { base: def.upgradeBase, growth: def.growth, holder: state.stations[id] };
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
