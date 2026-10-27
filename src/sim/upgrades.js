import { STATIONS_BY_ID } from '../data/stations.js';
import { bulkUpgrade, maxLevel, MILESTONES } from './rules.js';
import { chainOf, nextToUnlock, zoneOf, zoneUnlocked } from './chain.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { createStationState } from './production.js';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { routeActive } from './routes.js';

// Los arrieros cuestan la mitad que la estación a la que sirven.
const TRANSPORT_COST_FACTOR = 0.5;

// Opciones de desarrollador: con saldo negativo permitido, todo se puede comprar y lo que falta queda
// como deuda (el saldo baja de cero y lo que se gana después la va pagando).
let credit = false;
export const setCredit = (on) => (credit = Boolean(on));
export const canPay = (state, cost) => credit || state.coins >= cost;

// Lo que se puede mejorar: 'dispatch:<zona>', 'route:<ruta>', el id de una estación o 'id:transport' (sus arrieros).
function target(state, id) {
  const [stationId, part] = id.split(':');
  if (stationId === 'dispatch') {
    const zone = part ?? 'finca';
    const cost = ZONES_BY_ID[zone].dispatchCost;
    return { base: cost.base, growth: cost.growth, holder: state.zones[zone].dispatch };
  }
  if (stationId === 'route') {
    const r = ROUTES_BY_ID[part];
    return { base: r.costBase, growth: r.growth, holder: state.routes[part] };
  }
  const def = STATIONS_BY_ID[stationId];
  const st = state.stations[stationId];
  if (part === 'transport') return { base: def.upgradeBase * TRANSPORT_COST_FACTOR, growth: def.growth, holder: st.transport };
  return { base: def.upgradeBase, growth: def.growth, holder: st };
}

// mode: 1 | 10 | 'max'
export function quoteUpgrade(state, id, mode) {
  const { base, growth, holder } = target(state, id);
  const level = holder.level;
  const max = maxLevel(state); // en un evento, 50 (v3.10.1)
  // Una ruta se mejora cuando existe la estación que abastece.
  if (id.startsWith('route:') && !routeActive(state, id.split(':')[1])) return { ...bulkUpgrade(base, growth, level, 1), affordable: false, maxed: false, locked: true };
  if (level >= max) return { levels: 0, cost: 0, affordable: false, maxed: true };
  if (mode === 'max') {
    const q = bulkUpgrade(base, growth, level, Infinity, credit ? Infinity : state.coins, max);
    if (q.levels > 0) return { ...q, affordable: true, maxed: false };
    return { ...bulkUpgrade(base, growth, level, 1), affordable: false, maxed: false };
  }
  const q = bulkUpgrade(base, growth, level, mode, Infinity, max);
  return { ...q, affordable: q.levels > 0 && canPay(state, q.cost), maxed: false };
}

export function buyUpgrade(state, id, mode, bus) {
  const q = quoteUpgrade(state, id, mode);
  if (!q.affordable) return false;
  const { holder } = target(state, id);
  const from = holder.level;
  state.coins -= q.cost;
  holder.level += q.levels;
  // Hito más alto alcanzado con esta compra (o null).
  const milestone = MILESTONES.filter((m) => m > from && m <= holder.level).at(-1) ?? null;
  bus.emit('levelUp', { id, from, to: holder.level, milestone });
  return true;
}

// ¿Se puede construir esta estación? Hay que seguir el orden de la cadena.
export function quoteUnlock(state, id) {
  const def = STATIONS_BY_ID[id];
  if (state.stations[id]) return { ok: false, reason: 'built', cost: 0 };
  const cost = def.unlockCost;
  if (!zoneUnlocked(state, zoneOf(id))) return { ok: false, reason: 'zone', cost };
  if (def.side) {
    // Rama secundaria: solo pide la estación que la habilita.
    if (!state.stations[def.requires]) return { ok: false, reason: 'order', previous: def.requires, cost };
  } else if (nextToUnlock(state, zoneOf(id)) !== id) {
    const chain = chainOf(zoneOf(id));
    const previous = chain[chain.indexOf(id) - 1];
    return { ok: false, reason: 'order', previous, cost };
  }
  if (!canPay(state, cost)) return { ok: false, reason: 'coins', cost };
  return { ok: true, cost };
}

export function unlockStation(state, id, bus) {
  const q = quoteUnlock(state, id);
  if (!q.ok) return false;
  state.coins -= q.cost;
  state.stations[id] = createStationState();
  bus.emit('unlocked', { id });
  return true;
}

// Todos los edificios de la zona (construidos todos) en el nivel `level` o más.
export function zoneAtLevel(state, zoneId, level) {
  const z = ZONES_BY_ID[zoneId];
  return [...z.chain, ...z.plots.map((p) => p.stationId)].every((id) => (state.stations[id]?.level ?? 0) >= level);
}

// Si todavía falta algo para poder investigarla: su estación construida, la estación y sus arrieros al
// nivel que pide (las que duplican una estación) o toda la zona a un nivel (Maestría y Supremacía).
export function researchLocked(state, r) {
  const st = r.requires && state.stations[r.requires];
  if (r.requires && !st) return true;
  if (r.stationLevel && (st.level < r.stationLevel || (!STATIONS_BY_ID[r.requires].side && st.transport.level < r.stationLevel))) return true;
  return Boolean(r.minLevel && !zoneAtLevel(state, r.zone, r.minLevel));
}

// Lo primero que le falta a una investigación bloqueada (v3.12), para ir allá: la estación por construir
// o por subir ('id'), sus arrieros ('id:transport') o, en la Maestría y la Supremacía, la primera
// estación de la zona que no llega al nivel. null si no le falta nada de eso.
export function researchBlocker(state, r) {
  const st = r.requires && state.stations[r.requires];
  if (r.requires && !st) return r.requires;
  if (r.stationLevel && st.level < r.stationLevel) return r.requires;
  if (r.stationLevel && !STATIONS_BY_ID[r.requires].side && st.transport.level < r.stationLevel) return `${r.requires}:transport`;
  if (r.minLevel) {
    const z = ZONES_BY_ID[r.zone];
    return [...z.chain, ...z.plots.map((p) => p.stationId)].find((id) => (state.stations[id]?.level ?? 0) < r.minLevel) ?? null;
  }
  return null;
}

// Investigaciones: aparecen cuando su estación está construida y se compran una vez.
export function quoteResearch(state, id) {
  const r = RESEARCH_BY_ID[id];
  // En el tablero de un evento solo valen las compras del evento (sim/events.js).
  if (state.event) return { ok: false, reason: 'event', cost: r.cost };
  if (state.research.includes(id)) return { ok: false, reason: 'owned', cost: r.cost };
  if (!zoneUnlocked(state, r.zone)) return { ok: false, reason: 'zone', cost: r.cost };
  if (researchLocked(state, r)) return { ok: false, reason: 'locked', cost: r.cost };
  if (!canPay(state, r.cost)) return { ok: false, reason: 'coins', cost: r.cost };
  return { ok: true, cost: r.cost };
}

export function buyResearch(state, id, bus) {
  const q = quoteResearch(state, id);
  if (!q.ok) return false;
  state.coins -= q.cost;
  state.research.push(id);
  bus.emit('research', { id });
  return true;
}

// «Comprar todas» (v3.57): las investigaciones de una zona que alcanza el dinero, de la más barata a la
// más cara, hasta que no alcance para ninguna más. La Maestría y la Supremacía quedan aparte: se compran a
// propósito. Devuelve las que compró.
export const bulkResearch = (state, zoneId) => RESEARCH.filter((r) => r.zone === zoneId && !r.minLevel).sort((a, b) => a.cost - b.cost);
export function buyAllResearch(state, zoneId, bus) {
  const bought = [];
  for (let again = true; again; ) {
    again = false;
    for (const r of bulkResearch(state, zoneId)) {
      if (buyResearch(state, r.id, bus)) {
        bought.push(r.id);
        again = true;
      }
    }
  }
  return bought;
}

// Cuántas compraría «Comprar todas» con el dinero de ahora, y cuánto costarían.
export function previewAllResearch(state, zoneId) {
  let coins = state.coins;
  let count = 0;
  let cost = 0;
  for (const r of bulkResearch(state, zoneId)) {
    const q = quoteResearch(state, r.id);
    if (q.reason !== 'coins' && !q.ok) continue;
    if (!canPay({ ...state, coins }, r.cost)) break;
    coins -= r.cost;
    cost += r.cost;
    count++;
  }
  return { count, cost };
}
