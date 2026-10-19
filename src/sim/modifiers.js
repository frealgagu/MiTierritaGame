// Efectos de las investigaciones compradas. Todas las cuentas de la simulación pasan por aquí.
import { RESEARCH_BY_ID } from '../data/research.js';
import { PRODUCTS } from '../data/products.js';
import { STATIONS_BY_ID } from '../data/stations.js';

const BASE_OFFLINE_HOURS = 2;

// Producto de los efectos de un tipo (y objetivo). Se calcula una vez por lista de investigaciones:
// la simulación lo pregunta miles de veces por segundo y la lista solo crece al comprar.
const cache = new WeakMap(); // lista de investigaciones -> { n, mults: tipo -> objetivo -> producto }
function product(state, type, target) {
  const list = state.research ?? [];
  let entry = cache.get(list);
  if (!entry || entry.n !== list.length) {
    entry = { n: list.length, mults: new Map() };
    cache.set(list, entry);
  }
  let byTarget = entry.mults.get(type);
  if (!byTarget) entry.mults.set(type, (byTarget = new Map()));
  let mult = byTarget.get(target);
  if (mult === undefined) {
    mult = 1;
    for (const id of list) {
      const e = RESEARCH_BY_ID[id]?.effect;
      if (e && e.type === type && (target === undefined || e.target === target)) mult *= e.mult;
    }
    byTarget.set(target, mult);
  }
  return mult;
}

// Segundo final (v1.6): cada vez que se reinicia el juego tras llevar todo al nivel 100, la producción
// se duplica (×2, ×4, ×8…). Multiplica la velocidad de las estaciones y lo que lleva el Willys; los
// arrieros y las rutas se calculan con la velocidad de su estación, así que todo sigue cuadrando.
export const legacyMult = (state) => 2 ** (state.legacy?.resets ?? 0);

export const speedMult = (state, stationId) => product(state, 'stationSpeed', stationId) * product(state, 'zoneSpeed', STATIONS_BY_ID[stationId].zone) * legacyMult(state);
// Patios y entradas: crecen con el reinicio y con la Maestría y la Supremacía de su zona.
export const capMult = (state, stationId) => legacyMult(state) * product(state, 'zoneSpeed', STATIONS_BY_ID[stationId].zone);
export const muleSpeedMult = (state) => product(state, 'muleSpeed');
// El Willys de una zona con Maestría o Supremacía también lleva ×4 o ×8 (si no, la bodega se llenaría).
export const dispatchMult = (state, zoneId = 'finca') => product(state, 'dispatchCapacity', zoneId) * product(state, 'zoneSpeed', zoneId) * legacyMult(state);
export const productValue = (state, productId) =>
  PRODUCTS[productId].value * product(state, 'productValue', productId) * product(state, 'zoneValue', PRODUCTS[productId].zone);

// Horas que la finca sigue produciendo sin conexión: 2 h, más las que suma cada investigación (una
// por zona: 3 + 3 + 4 + 4 + 4 + 4, hasta 24 h).
export function offlineCapSeconds(state) {
  let hours = BASE_OFFLINE_HOURS;
  for (const id of state.research ?? []) {
    const e = RESEARCH_BY_ID[id]?.effect;
    if (e?.type === 'offlineHours') hours += e.hours;
  }
  return hours * 3600;
}

// Compost (Compostera): mientras haya compost guardado, todo lo que vende la Finca vale más.
// No acelera ninguna estación, así que no descompensa la cadena.
// Se gasta 1 compost por cada 8 cafés lavados del Beneficiadero, que da la pulpa para 2: una
// Compostera a la mitad del nivel del Beneficiadero ya alcanza, y subir el Cafetal no lo gasta más rápido.
export const COMPOST_VALUE = 1.3;
export const WASHED_PER_COMPOST = 8;

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
