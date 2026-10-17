// Fórmulas de balance (GDD §5). Funciones puras.
import { DISPATCH } from '../data/stations.js';

export const MILESTONES = [10, 25, 50, 75, 100];
export const MAX_LEVEL = 100;
export const LEVEL_SPEED_BONUS = 0.15;

export function milestoneTier(level) {
  return MILESTONES.filter((m) => level >= m).length;
}

export function milestoneMultiplier(level) {
  return 2 ** milestoneTier(level);
}

export function nextMilestone(level) {
  return MILESTONES.find((m) => m > level) ?? null;
}

// Ciclos por segundo de una estación.
export function stationRate(def, level) {
  return (1 / def.cycle) * (1 + LEVEL_SPEED_BONUS * (level - 1)) * milestoneMultiplier(level);
}

// Unidades del producto principal por segundo.
export function stationOutputRate(def, level) {
  const [amount] = Object.values(def.out);
  return stationRate(def, level) * amount;
}

export function dispatchCapacity(level) {
  return Math.round((DISPATCH.capacityBase + DISPATCH.capacityPerLevel * (level - 1)) * milestoneMultiplier(level));
}

export function dispatchRate(level) {
  return dispatchCapacity(level) / DISPATCH.tripTime;
}

export function warehouseCapacity(level) {
  return dispatchCapacity(level) * DISPATCH.warehouseTrips;
}

// Patio de la estación: guarda ~15 s de producción (mínimo 20).
export function stationBufferCap(def, level) {
  return Math.max(20, Math.ceil(stationOutputRate(def, level) * 15));
}

// Carga de cada mula: ~4 s de producción (mínimo 5) para que no haya cientos de mulas.
export function muleBatch(def, level) {
  return Math.max(5, Math.ceil(stationOutputRate(def, level) * 4));
}

// Coste de pasar de `level` a `level + 1`.
export function upgradeCost(base, growth, level) {
  return Math.ceil(base * growth ** (level - 1));
}

// Cuántos niveles se compran y a qué coste.
//   count: número de niveles deseados, o Infinity para «máx» (limitado por `coins`).
export function bulkUpgrade(base, growth, level, count, coins = Infinity) {
  let levels = 0;
  let cost = 0;
  while (levels < count && level + levels < MAX_LEVEL) {
    const next = upgradeCost(base, growth, level + levels);
    if (count === Infinity && cost + next > coins) break;
    cost += next;
    levels++;
  }
  return { levels, cost };
}
