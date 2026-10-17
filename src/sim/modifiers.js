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
export const dispatchMult = (state, zoneId = 'finca') => product(state, 'dispatchCapacity', zoneId);
export const productValue = (state, productId) => PRODUCTS[productId].value * product(state, 'productValue', productId);

export function offlineCapSeconds(state) {
  let hours = BASE_OFFLINE_HOURS;
  for (const id of state.research ?? []) {
    const e = RESEARCH_BY_ID[id]?.effect;
    if (e?.type === 'offlineHours') hours = Math.max(hours, e.mult);
  }
  return hours * 3600;
}

// Compost (Compostera): mientras haya compost guardado, todo lo que vende la Finca vale más.
// No acelera ninguna estación, así que no descompensa la cadena.
// Se gasta 1 compost por cada 10 cafés lavados del Beneficiadero, que da la pulpa para 2: una
// Compostera a la mitad del nivel del Beneficiadero ya alcanza, y subir el Cafetal no lo gasta más rápido.
export const COMPOST_VALUE = 1.3;
export const WASHED_PER_COMPOST = 10;

export function compostValueBoost(state) {
  return (state.stations.composter?.buffer ?? 0) > 0 ? COMPOST_VALUE : 1;
}

// Precio al que se vende de verdad: con investigaciones y, en la Finca, con el bono del compost.
export function saleValue(state, productId) {
  const bonus = PRODUCTS[productId].zone === 'finca' ? compostValueBoost(state) : 1;
  return productValue(state, productId) * bonus;
}

// El compost se gasta según el café que lava el Beneficiadero.
export function consumeCompost(state, washed) {
  const c = state.stations.composter;
  if (!c || c.buffer <= 0) return;
  c.buffer = Math.max(0, c.buffer - washed / WASHED_PER_COMPOST);
}
