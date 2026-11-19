import { GOALS, GOALS_BY_ZONE } from '../data/goals.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { createSourceState } from './production.js';
import { sourceOf } from './chain.js';
import { STATIONS, STATIONS_BY_ID, DISPATCH } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { RESEARCH_BY_ID } from '../data/research.js';
import { formatNumber } from '../core/format.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { analyzeChain } from './analysis.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { withArticle } from '../data/lore.js';
import { t } from '../i18n/index.js';

export const VISIBLE_GOALS = 3;

function levelOf(state, target) {
  const [id, part] = target.split(':');
  if (id === 'dispatch') return state.zones[part ?? 'finca'].dispatch.level;
  if (id === 'route') return state.routes[part].level;
  const st = state.stations[id];
  if (!st) return 0;
  return part === 'transport' ? st.transport.level : st.level;
}

// Products consumed by another station (cherries -> Beneficiadero; sombrero vueltiao -> Parador).
function levelText(target, n) {
  const [id, part] = target.split(':');
  if (id === 'dispatch') return t('Sube {name} a {n}', { name: `${DISPATCH.name} (${ZONES_BY_ID[part ?? 'finca'].name})`, n });
  if (id === 'route') return t('Sube {name} a {n}', { name: withArticle(ROUTES_BY_ID[part].name), n });
  if (part === 'transport') return t('Sube a los arrieros del {station} a {n}', { station: STATIONS_BY_ID[id].name, n });
  return t('Sube el nivel de {station} a {n}', { station: STATIONS_BY_ID[id].name, n });
}

// A «sell» goal for one of these (v3.61) counts produced amount: once downstream is built
// almost none reaches warehouse (only diversions), which stalled the goal.
// Goal progress: { current, target, done }.
const CONSUMED = new Set(STATIONS.flatMap((s) => Object.keys(s.in ?? {})));
export const countsProduced = (goal) => goal.type === 'sold' && CONSUMED.has(goal.product);

// Main chain only (Compostera is optional).
export function goalProgress(state, goal) {
  let current = 0;
  let target = 1;
  switch (goal.type) {
    case 'sold':
      current = (countsProduced(goal) ? state.stats.produced : state.stats.sold)[goal.product] ?? 0;
      target = goal.amount;
      break;
    case 'produced':
      current = state.stats.produced[goal.product] ?? 0;
      target = goal.amount;
      break;
    case 'imported':
      current = state.stats.imported?.[goal.product] ?? 0;
      target = goal.amount;
      break;
    case 'level':
      current = levelOf(state, goal.target);
      target = goal.level;
      break;
    case 'unlock':
      current = state.stations[goal.station] ? 1 : 0;
      break;
    case 'research':
      current = state.research.includes(goal.research) ? 1 : 0;
      break;
    case 'researchCount':
      current = state.research.length;
      target = goal.count;
      break;
    case 'income':
      current = analyzeChain(state, goal.zone ?? 'finca').income;
      target = goal.perSecond;
      break;
    case 'allLevels': {
      // In Bogotá (v4.5), with parallel neighborhoods (and since v4.6 a network), counts built
      const zone = goal.zone ?? 'finca';
      const levels = Object.entries(state.stations)
        .filter(([id]) => STATIONS_BY_ID[id].zone === zone && !STATIONS_BY_ID[id].side)
        .map(([, s]) => s.level);
      // stations (at least five).
      // (at least five).
      const needed = ZONES_BY_ID[zone].groups || ZONES_BY_ID[zone].network ? 5 : ZONES_BY_ID[zone].chain.length - 1;
      current = levels.length >= needed ? Math.min(...levels) : 0;
      target = goal.level;
      break;
    }
  }
  return { current: Math.min(current, target), target, done: current >= target };
}

// «120 🧀 queso campesino».
const amountOf = (goal) => `${formatNumber(goal.amount)} ${PRODUCTS[goal.product].icon} ${PRODUCTS[goal.product].name.toLowerCase()}`;

// Goal copy for UI.
export function goalText(goal) {
  switch (goal.type) {
    case 'sold':
      if (countsProduced(goal)) return t('Produce {list}', { list: amountOf(goal) });
      return t('Vende {list}', { list: amountOf(goal) });
    case 'produced':
      return t('Produce {list}', { list: amountOf(goal) });
    case 'imported':
      return t('Recibe {list} por la ruta', { list: amountOf(goal) });
    case 'level':
      return levelText(goal.target, goal.level);
    case 'unlock':
      return t('Construye: {station}', { station: `${STATIONS_BY_ID[goal.station].icon} ${STATIONS_BY_ID[goal.station].name}` });
    case 'research':
      return t('Investiga: {name}', { name: `${RESEARCH_BY_ID[goal.research].icon} ${RESEARCH_BY_ID[goal.research].name}` });
    case 'researchCount':
      return t('Completa {n} investigaciones', { n: goal.count });
    case 'income':
      return t('Gana {n} 💰/s', { n: formatNumber(goal.perSecond) });
    case 'allLevels':
      return t('Sube todas las estaciones a nivel {n}', { n: goal.level });
  }
  return '';
}

// First uncollected goals in a zone, in order.
export function activeGoals(state, zoneId = 'finca') {
  if (!state.zones[zoneId]?.unlocked) return [];
  return GOALS_BY_ZONE[zoneId].filter((g) => !state.goals.claimed.includes(g.id)).slice(0, VISIBLE_GOALS);
}

// Claimable goals (v3.57): met and unclaimed; zone finale only once visible at front.
function claimable(state, goal, zoneId) {
  if (state.goals.claimed.includes(goal.id) || !goalProgress(state, goal).done) return false;
  return !goal.final || activeGoals(state, zoneId).includes(goal);
}
export const claimableGoals = (state, zoneId) => (state.zones[zoneId]?.unlocked ? GOALS_BY_ZONE[zoneId].filter((g) => claimable(state, g, zoneId)) : []);

// «Claim all» (v3.57): all met zone goals except finale (claimed separately with modal).
// Claiming one can satisfy another (coin goals): loops until none remain.
// Returns count claimed and total coins awarded.
export function claimAllGoals(state, zoneId, bus) {
  let count = 0;
  let reward = 0;
  for (;;) {
    const ready = claimableGoals(state, zoneId).filter((g) => !g.final);
    if (!ready.length) break;
    for (const g of ready) if (claimGoal(state, g.id, bus)) {
      count++;
      reward += g.reward;
    }
  }
  return { count, reward };
}

export const goalZone = (goal) => Object.keys(GOALS_BY_ZONE).find((z) => GOALS_BY_ZONE[z].includes(goal));

// Unlocks a zone: its unlimited source begins producing.
export function unlockZone(state, zoneId, bus) {
  const z = state.zones[zoneId];
  if (!z || z.unlocked) return false;
  z.unlocked = true;
  const source = sourceOf(zoneId);
  if (!state.stations[source]) state.stations[source] = createSourceState(source);
  bus.emit('zoneUnlocked', { zone: zoneId });
  return true;
}

export function claimGoal(state, id, bus) {
  const goal = GOALS.find((g) => g.id === id);
  if (!goal || state.goals.claimed.includes(id)) return false;
  const zoneId = goalZone(goal);
  // Since v3.57 any met goal claims regardless of front-3 visibility; zone finale still
  // waits its turn at end of list.
  if (!claimable(state, goal, zoneId)) return false;
  state.goals.claimed.push(id);
  state.coins += goal.reward;
  state.totalEarned += goal.reward;
  if (goal.final) {
    state.zones[zoneId].complete = true;
    const next = ZONES_BY_ID[zoneId].next;
    if (next) unlockZone(state, next, bus);
    // Final zone (v3.8): region marked permanently completed (its events spawn in all its zones).
    // A region still missing zones (wip, v3.15) doesn't mark completed.
    else if (!REGIONS_BY_ID[state.region].wip) state.keep.done = true;
  }
  bus.emit('goalClaimed', { goal, zone: zoneId });
  return true;
}
