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

// mult: efecto de investigaciones (Remolque), ver sim/modifiers.js.
export function dispatchCapacity(level, mult = 1) {
  return Math.round((DISPATCH.capacityBase + DISPATCH.capacityPerLevel * (level - 1)) * milestoneMultiplier(level) * mult);
}

export function dispatchRate(level, mult = 1) {
  return dispatchCapacity(level, mult) / DISPATCH.tripTime;
}

export function warehouseCapacity(level, mult = 1) {
  return dispatchCapacity(level, mult) * DISPATCH.warehouseTrips;
}

// Patio de la estación: guarda ~15 s de producción (mínimo 20).
export function stationBufferCap(def, level) {
  return Math.max(20, Math.ceil(stationOutputRate(def, level) * 15));
}

// Lo que cabe en la entrada de una estación: ~15 s de consumo (mínimo 20).
export function stationInputCap(def, level) {
  const need = def.in ? Object.values(def.in)[0] : 0;
  return Math.max(20, Math.ceil(stationRate(def, level) * need * 15));
}

// Arrieros (GDD §5.2): una mula más cada 10 niveles de transporte (máx. 10).
export const MAX_MULES = 10;
const REF_ROUND_TRIP = 6; // s: en un tramo de este largo, transporte y estación del mismo nivel...
const TRANSPORT_MARGIN = 1.25; // ...mueven un 25 % más de lo que produce la estación

export function muleCount(level) {
  return Math.min(MAX_MULES, 1 + Math.floor((level - 1) / 10));
}

// Unidades por viaje de cada mula; crece con el nivel y se duplica en los hitos, como la estación.
export function muleLoad(def, level) {
  return Math.max(1, Math.ceil((stationOutputRate(def, level) * REF_ROUND_TRIP * TRANSPORT_MARGIN) / muleCount(level)));
}

// Unidades por segundo que mueven los arrieros en un tramo con ese tiempo de ida y vuelta.
export function transportCapacity(def, level, roundTrip) {
  return (muleCount(level) * muleLoad(def, level)) / roundTrip;
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
