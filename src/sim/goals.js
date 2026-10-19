import { GOALS, GOALS_BY_ZONE } from '../data/goals.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { createSourceState } from './production.js';
import { sourceOf } from './chain.js';
import { STATIONS_BY_ID, DISPATCH } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { RESEARCH_BY_ID } from '../data/research.js';
import { formatNumber } from '../core/format.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { analyzeChain } from './analysis.js';

export const VISIBLE_GOALS = 3;

function levelOf(state, target) {
  const [id, part] = target.split(':');
  if (id === 'dispatch') return state.zones[part ?? 'finca'].dispatch.level;
  if (id === 'route') return state.routes[part].level;
  const st = state.stations[id];
  if (!st) return 0;
  return part === 'transport' ? st.transport.level : st.level;
}

function targetName(target) {
  const [id, part] = target.split(':');
  if (id === 'dispatch') return `${DISPATCH.name} (${ZONES_BY_ID[part ?? 'finca'].name})`;
  if (id === 'route') return `la ${ROUTES_BY_ID[part].name}`;
  return part === 'transport' ? `los arrieros del ${STATIONS_BY_ID[id].name}` : STATIONS_BY_ID[id].name;
}

// Progreso de un objetivo: { current, target, done }.
export function goalProgress(state, goal) {
  let current = 0;
  let target = 1;
  switch (goal.type) {
    case 'sold':
      current = state.stats.sold[goal.product] ?? 0;
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
      // Solo la cadena principal (la Compostera es opcional).
      const zone = goal.zone ?? 'finca';
      const levels = Object.entries(state.stations)
        .filter(([id]) => STATIONS_BY_ID[id].zone === zone && !STATIONS_BY_ID[id].side)
        .map(([, s]) => s.level);
      current = levels.length >= ZONES_BY_ID[zone].chain.length - 1 ? Math.min(...levels) : 0;
      target = goal.level;
      break;
    }
  }
  return { current: Math.min(current, target), target, done: current >= target };
}

// Texto del objetivo para la interfaz.
export function goalText(goal) {
  switch (goal.type) {
    case 'sold':
      return `Vende ${formatNumber(goal.amount)} ${PRODUCTS[goal.product].icon} ${PRODUCTS[goal.product].name.toLowerCase()}`;
    case 'produced':
      return `Produce ${formatNumber(goal.amount)} ${PRODUCTS[goal.product].icon} ${PRODUCTS[goal.product].name.toLowerCase()}`;
    case 'imported':
      return `Recibe ${formatNumber(goal.amount)} ${PRODUCTS[goal.product].icon} ${PRODUCTS[goal.product].name.toLowerCase()} por la ruta`;
    case 'level':
      return `Sube ${goal.target.includes(':') ? '' : 'el nivel de '}${targetName(goal.target)} a ${goal.level}`.replace('Sube los', 'Sube a los');
    case 'unlock':
      return `Construye: ${STATIONS_BY_ID[goal.station].icon} ${STATIONS_BY_ID[goal.station].name}`;
    case 'research':
      return `Investiga: ${RESEARCH_BY_ID[goal.research].icon} ${RESEARCH_BY_ID[goal.research].name}`;
    case 'researchCount':
      return `Completa ${goal.count} investigaciones`;
    case 'income':
      return `Gana ${formatNumber(goal.perSecond)} 💰/s`;
    case 'allLevels':
      return `Sube todas las estaciones a nivel ${goal.level}`;
  }
  return '';
}

// Los primeros objetivos sin cobrar de una zona, en orden.
export function activeGoals(state, zoneId = 'finca') {
  if (!state.zones[zoneId]?.unlocked) return [];
  return GOALS_BY_ZONE[zoneId].filter((g) => !state.goals.claimed.includes(g.id)).slice(0, VISIBLE_GOALS);
}

export const goalZone = (goal) => Object.keys(GOALS_BY_ZONE).find((z) => GOALS_BY_ZONE[z].includes(goal));

// Abre una zona: su fuente ilimitada empieza a producir.
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
  if (!activeGoals(state, zoneId).includes(goal) || !goalProgress(state, goal).done) return false;
  state.goals.claimed.push(id);
  state.coins += goal.reward;
  state.totalEarned += goal.reward;
  if (goal.final) {
    state.zones[zoneId].complete = true;
    const next = ZONES_BY_ID[zoneId].next;
    if (next) unlockZone(state, next, bus);
  }
  bus.emit('goalClaimed', { goal, zone: zoneId });
  return true;
}
