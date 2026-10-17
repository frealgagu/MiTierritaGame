import { GOALS } from '../data/goals.js';
import { STATIONS_BY_ID, DISPATCH } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { RESEARCH_BY_ID } from '../data/research.js';
import { formatNumber } from '../core/format.js';
import { analyzeChain } from './analysis.js';

export const VISIBLE_GOALS = 3;

function levelOf(state, target) {
  if (target === 'dispatch') return state.dispatch.level;
  const [id, part] = target.split(':');
  const st = state.stations[id];
  if (!st) return 0;
  return part === 'transport' ? st.transport.level : st.level;
}

function targetName(target) {
  if (target === 'dispatch') return DISPATCH.name;
  const [id, part] = target.split(':');
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
    case 'level':
      current = levelOf(state, goal.target);
      target = goal.level;
      break;
    case 'unlock':
      current = state.stations[goal.station] ? 1 : 0;
      break;
    case 'research':
      current = state.research.includes(goal.id) ? 1 : 0;
      break;
    case 'researchCount':
      current = state.research.length;
      target = goal.count;
      break;
    case 'income':
      current = analyzeChain(state).income;
      target = goal.perSecond;
      break;
    case 'allLevels': {
      const levels = Object.values(state.stations).map((s) => s.level);
      current = levels.length >= 5 ? Math.min(...levels) : 0;
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
    case 'level':
      return `Sube ${goal.target.includes(':') ? '' : 'el nivel de '}${targetName(goal.target)} a ${goal.level}`.replace('Sube los', 'Sube a los');
    case 'unlock':
      return `Construye: ${STATIONS_BY_ID[goal.station].icon} ${STATIONS_BY_ID[goal.station].name}`;
    case 'research':
      return `Investiga: ${RESEARCH_BY_ID[goal.id].icon} ${RESEARCH_BY_ID[goal.id].name}`;
    case 'researchCount':
      return `Completa ${goal.count} investigaciones`;
    case 'income':
      return `Gana ${formatNumber(goal.perSecond)} 💰/s`;
    case 'allLevels':
      return `Sube todas las estaciones a nivel ${goal.level}`;
  }
  return '';
}

// Los primeros objetivos sin cobrar, en orden.
export function activeGoals(state) {
  return GOALS.filter((g) => !state.goals.claimed.includes(g.id)).slice(0, VISIBLE_GOALS);
}

export function claimGoal(state, id, bus) {
  const goal = GOALS.find((g) => g.id === id);
  if (!goal || state.goals.claimed.includes(id)) return false;
  if (!activeGoals(state).includes(goal) || !goalProgress(state, goal).done) return false;
  state.goals.claimed.push(id);
  state.coins += goal.reward;
  state.totalEarned += goal.reward;
  if (goal.final) state.zoneComplete = true;
  bus.emit('goalClaimed', { goal });
  return true;
}
