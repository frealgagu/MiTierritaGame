// Efectos de las investigaciones compradas. Todas las cuentas de la simulación pasan por aquí.
import { RESEARCH_BY_ID } from '../data/research.js';
import { PRODUCTS } from '../data/products.js';

const BASE_OFFLINE_HOURS = 2;

function product(state, type, target) {
  let mult = 1;
  for (const id of state.research ?? []) {
    const e = RESEARCH_BY_ID[id]?.effect;
    if (e && e.type === type && (target === undefined || e.target === target)) mult *= e.mult;
  }
  return mult;
}

export const speedMult = (state, stationId) => product(state, 'stationSpeed', stationId);
export const muleSpeedMult = (state) => product(state, 'muleSpeed');
export const dispatchMult = (state) => product(state, 'dispatchCapacity');
export const productValue = (state, productId) => PRODUCTS[productId].value * product(state, 'productValue', productId);

export function offlineCapSeconds(state) {
  let hours = BASE_OFFLINE_HOURS;
  for (const id of state.research ?? []) {
    const e = RESEARCH_BY_ID[id]?.effect;
    if (e?.type === 'offlineHours') hours = Math.max(hours, e.mult);
  }
  return hours * 3600;
}

// Compost (Compostera): acelera el Cafetal mientras haya compost guardado.
export const COMPOST_BOOST = 1.5;
export const CHERRIES_PER_COMPOST = 20;

export function compostBoost(state) {
  return (state.stations.composter?.buffer ?? 0) > 0 ? COMPOST_BOOST : 1;
}

// El Cafetal gasta compost según lo que cosecha.
export function consumeCompost(state, cherries) {
  const c = state.stations.composter;
  if (!c || c.buffer <= 0) return;
  c.buffer = Math.max(0, c.buffer - cherries / CHERRIES_PER_COMPOST);
}
