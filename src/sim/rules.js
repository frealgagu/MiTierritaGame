// Fórmulas de balance (GDD §5). Funciones puras.
import { DISPATCH } from '../data/stations.js';

export const MILESTONES = [10, 25, 50, 75, 100];
export const MAX_LEVEL = 100;
// 15/99 ≈ 0,1515 por nivel: así el nivel 100 da exactamente ×512 (16 × 2⁵ hitos) y, con ciclos que son
// potencias de 2, cada estación produce al máximo una potencia de 2 por segundo (256, 128, 64, 32, 16).
export const LEVEL_SPEED_BONUS = 15 / 99;

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

// Lo que cabe de un producto importado por una ruta (`imp`, de def.imports): ~90 s de consumo
// (mínimo 10), porque la ruta tarda más que las mulas. `mult`: lo que aceleran las investigaciones.
export function stationImportCap(def, level, mult = 1, imp = def.imports[0]) {
  return Math.max(10, Math.ceil(stationRate(def, level) * mult * imp.perCycle * 90));
}

// Arrieros (GDD §5.2): una mula más cada 10 niveles de transporte (máx. 10).
export const MAX_MULES = 10;
// A igual nivel, los arrieros llevan un 25 % más de lo que produce su estación, sea cual sea
// la distancia: la carga de cada mula se calcula para el viaje de ida y vuelta a su destino normal.
export const TRANSPORT_MARGIN = 1.25;

// Desde este nivel de transporte (un hito), las mulas de la estación se cambian por una banda eléctrica.
// Lleva exactamente lo mismo: solo cambia el dibujo (cajas sobre la banda en vez de mulas con arriero).
export const BELT_LEVEL = 50;
export const hasBelt = (level) => level >= BELT_LEVEL;

export function muleCount(level) {
  return Math.min(MAX_MULES, 1 + Math.floor((level - 1) / 10));
}

// Unidades por viaje de cada mula. Puede tener decimales: así cada nivel de arrieros suma un poco
// de capacidad (con números enteros, varios niveles seguidos no cambiaban nada).
//   roundTrip: segundos de ida y vuelta hasta el destino normal (a la velocidad base de las mulas)
//   mult:      lo que acelera la producción de la estación (investigaciones, compost)
export function muleLoad(def, level, roundTrip, mult = 1) {
  return (stationOutputRate(def, level) * mult * roundTrip * TRANSPORT_MARGIN) / muleCount(level);
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
