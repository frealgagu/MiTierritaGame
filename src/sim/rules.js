// Balance formulas (GDD §5). Pure functions.
import { DISPATCH } from '../data/stations.js';

export const MILESTONES = [10, 25, 50, 75, 100];
export const MAX_LEVEL = 100;
// On event boards (v3.10.1) level caps at 50.
export const EVENT_MAX_LEVEL = 50;
export const maxLevel = (state) => (state?.event ? EVENT_MAX_LEVEL : MAX_LEVEL);
// 15/99 ≈ 0.1515 per level: makes level 100 equal exactly ×8,192 (16 from levels × 512 from
// milestones) and, with power-of-2 cycle rates, every maxed station hits a power of 2 per
// second (4,096, 2,048, 1,024, 512, or 256).
export const LEVEL_SPEED_BONUS = 15 / 99;

export function milestoneTier(level) {
  return MILESTONES.filter((m) => level >= m).length;
}

// What each milestone multiplies (v1.7): level 10 ×2, 25 ×2, 50 ×4, 75 ×4, 100 ×8 (×512 total).
export const MILESTONE_MULTS = [2, 2, 4, 4, 8];
export const milestoneBoost = (milestone) => MILESTONE_MULTS[MILESTONES.indexOf(milestone)];

export function milestoneMultiplier(level) {
  return MILESTONE_MULTS.slice(0, milestoneTier(level)).reduce((a, b) => a * b, 1);
}

export function nextMilestone(level) {
  return MILESTONES.find((m) => m > level) ?? null;
}

// Cycles per second of a station.
export function stationRate(def, level) {
  return (1 / def.cycle) * (1 + LEVEL_SPEED_BONUS * (level - 1)) * milestoneMultiplier(level);
}

// Units of primary product per second.
export function stationOutputRate(def, level) {
  const [amount] = Object.values(def.out);
  return stationRate(def, level) * amount;
}

// mult: research effect (Remolque), see sim/modifiers.js.
export function dispatchCapacity(level, mult = 1) {
  return Math.round((DISPATCH.capacityBase + DISPATCH.capacityPerLevel * (level - 1)) * milestoneMultiplier(level) * mult);
}

export function dispatchRate(level, mult = 1) {
  return dispatchCapacity(level, mult) / DISPATCH.tripTime;
}

export function warehouseCapacity(level, mult = 1) {
  return dispatchCapacity(level, mult) * DISPATCH.warehouseTrips;
}

// Station yard: holds ~15 s of production (min 20). `mult`: reset production
// multiplier (×2, ×4…) so a mule load still fits at doubled output.
export function stationBufferCap(def, level, mult = 1) {
  // Seasonal harvest pantry (v3.4) holds enough for the rest of the year.
  return Math.max(20, Math.ceil(stationOutputRate(def, level) * mult * (def.harvest?.store ?? 15)));
}

// Station input buffer capacity: ~15 s of consumption (min 20). `mult`: same as yard.
export function stationInputCap(def, level, mult = 1) {
  const need = def.in ? Object.values(def.in)[0] : 0;
  return Math.max(20, Math.ceil(stationRate(def, level) * mult * need * 15));
}

// Capacity for an imported product delivered by route (`imp` from def.imports): ~90 s of consumption
// (min 10), because routes take longer than mules. `mult`: research speedup.
export function stationImportCap(def, level, mult = 1, imp = def.imports[0]) {
  return Math.max(10, Math.ceil(stationRate(def, level) * mult * imp.perCycle * 90));
}

// Haulers (GDD §5.2): one extra mule every 10 transport levels (max 10).
export const MAX_MULES = 10;
// At equal level, haulers carry 25 % more than their station outputs regardless of
// distance: load per mule scales to the round-trip to its normal destination.
export const TRANSPORT_MARGIN = 1.25;

// From this transport level (a milestone), mules upgrade to an electric conveyor belt.
// Carries the exact same capacity: only visual changes (crates on belt instead of mules).
export const BELT_LEVEL = 50;
export const hasBelt = (level) => level >= BELT_LEVEL;

export function muleCount(level) {
  return Math.min(MAX_MULES, 1 + Math.floor((level - 1) / 10));
}

// Units per trip per mule. Fractional allowed: lets each hauler level add slightly more
// capacity (integers made several consecutive levels do nothing).
//   roundTrip: round-trip seconds to normal destination (at base mule speed)
//   mult:      station speedup (research, compost)
export function muleLoad(def, level, roundTrip, mult = 1) {
  return (stationOutputRate(def, level) * mult * roundTrip * TRANSPORT_MARGIN) / muleCount(level);
}

// Cost to upgrade from `level` to `level + 1`.
export function upgradeCost(base, growth, level) {
  return Math.ceil(base * growth ** (level - 1));
}

// How many levels fit budget and total cost.
//   count: desired levels, or Infinity for «max» (limited by `coins`).   max: cap
export function bulkUpgrade(base, growth, level, count, coins = Infinity, max = MAX_LEVEL) {
  let levels = 0;
  let cost = 0;
  while (levels < count && level + levels < max) {
    const next = upgradeCost(base, growth, level + levels);
    if (count === Infinity && cost + next > coins) break;
    cost += next;
    levels++;
  }
  return { levels, cost };
}
