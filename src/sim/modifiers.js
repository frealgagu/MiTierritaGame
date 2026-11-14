// Effects of purchased research upgrades. All simulation math flows through here.
import { RESEARCH_BY_ID } from '../data/research.js';
import { PRODUCTS } from '../data/products.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { seasonMult } from './calendar.js';
import { EVENTS_BY_ID, EVENT_ACTIONS_BY_ID } from '../data/events.js';
import { offlineHours } from './renown.js';

// A purchase can carry one effect (`effect`) or several (`effects`: event upgrades).
export const effectsOf = (def) => def?.effects ?? (def?.effect ? [def.effect] : []);

// Product of effects matching type (and target). Memoized per upgrades list:
// simulation queries thousands of times per second while list only grows on buy.
const cache = new WeakMap(); // upgrade list -> { n, mults: type -> target -> product }
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
      for (const e of effectsOf(RESEARCH_BY_ID[id] ?? EVENT_ACTIONS_BY_ID[id])) {
        if (e.type === type && (target === undefined || e.target === target)) mult *= e.mult;
      }
    }
    byTarget.set(target, mult);
  }
  return mult;
}

// Second ending (v1.6): each reset after maxing everything at level 100 doubles
// production (×2, ×4, ×8…). Scales station speed and Willys capacity; haulers and
// routes derive from station speed, keeping everything balanced.
// Multiplier has a cap: resets still count for Renown and achievements, though
// production stops doubling. v3.56: ×2³² (32 resets, ×4.29B); v3.68.3: ×2⁶⁰ (60, ×1.15Qi).
export const MAX_LEGACY_RESETS = 60;
// Coin cap (v3.68.3): 999Dc, largest suffix-formatted number. At ×2⁶⁰ with a
// maxed region it takes ~90 real nonstop days; avoids scientific notation.
export const MAX_COINS = 999e33;
export function capCoins(state) {
  if (state.coins > MAX_COINS) state.coins = MAX_COINS;
  if (state.totalEarned > MAX_COINS) state.totalEarned = MAX_COINS;
}
// Product of a single research effect type (v4.1.1: displayed in income breakdown).
export const researchMult = (state, type, target) => product(state, type, target);
export const legacyMult = (state) => 2 ** Math.min(state.legacy?.resets ?? 0, MAX_LEGACY_RESETS);
// Multiplier the save will have after next reset.
export const nextLegacyMult = (state) => 2 ** Math.min((state.legacy?.resets ?? 0) + 1, MAX_LEGACY_RESETS);

// Season (v1.9) scales all stations up or down; haulers and routes scale with this
// speed so chain stays balanced. On event board (v2.0), event penalty per station
// (borer drops Cafetal to 40 %).
const eventSpeed = (state, stationId) => (state.event ? EVENTS_BY_ID[state.event.id].speed?.[stationId] ?? 1 : 1);
export const speedMult = (state, stationId) =>
  product(state, 'stationSpeed', stationId) * product(state, 'zoneSpeed', STATIONS_BY_ID[stationId].zone) * legacyMult(state) * seasonMult(state) * eventSpeed(state, stationId);
// Yards and inputs: scale with resets plus zone Mastery and Supremacy.
export const capMult = (state, stationId) => legacyMult(state) * product(state, 'zoneSpeed', STATIONS_BY_ID[stationId].zone);
export const muleSpeedMult = (state) => product(state, 'muleSpeed');
// Willys in a zone with Mastery or Supremacy also carries ×4 or ×8 (else warehouse fills).
export const dispatchMult = (state, zoneId = 'finca') => product(state, 'dispatchCapacity', zoneId) * product(state, 'zoneSpeed', zoneId) * legacyMult(state);
// How many Willys a zone has (v3.9): second one, bought with Renown per region, runs
// independently selling same load per trip. On event boards, only one.
export const jeepCount = (state) => (state.willys2 && !state.event ? 2 : 1);
export const productValue = (state, productId) =>
  PRODUCTS[productId].value * product(state, 'productValue', productId) * product(state, 'zoneValue', PRODUCTS[productId].zone);

// Offline cap in s (v3.7): from player profile, shared across regions. Non-root
// regions don't store profile: passed from main save.
export const offlineCapSeconds = (state, profile = state.profile) => offlineHours(profile) * 3600;

// Compost (Compostera): while stored compost remains, everything Finca sells fetches more.
// Speeds up no station, so chain stays balanced.
// Consumes 1 compost per 8 coffees washed by Beneficiadero, which supplies pulp for 2:
// Compostera at half Beneficiadero level already suffices; raising Cafetal won't burn faster.
export const COMPOST_VALUE = 1.3;
export const WASHED_PER_COMPOST = 8;

export function compostValueBoost(state) {
  return (state.stations.composter?.buffer ?? 0) > 0 ? COMPOST_VALUE : 1;
}

// Actual sale price: research multipliers plus Finca compost bonus.
export function saleValue(state, productId) {
  const bonus = PRODUCTS[productId].zone === 'finca' ? compostValueBoost(state) : 1;
  return productValue(state, productId) * bonus;
}

// Compost burns proportional to coffee washed by Beneficiadero.
export function consumeCompost(state, washed) {
  const c = state.stations.composter;
  if (!c || c.buffer <= 0) return;
  c.buffer = Math.max(0, c.buffer - washed / WASHED_PER_COMPOST);
}
