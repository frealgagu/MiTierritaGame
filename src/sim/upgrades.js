import { STATIONS_BY_ID } from '../data/stations.js';
import { bulkUpgrade, maxLevel, MILESTONES } from './rules.js';
import { buildableStations, groupOf, groupsOf, suppliersOf, zoneOf, zoneUnlocked } from './chain.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { createStationState } from './production.js';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { routeActive } from './routes.js';
import { EVENTS_BY_ID } from '../data/events.js';

// Haulers cost half their station's price.
const TRANSPORT_COST_FACTOR = 0.5;

// Dev option: with negative balance allowed, anything is affordable and shortfall becomes
// debt (coins drop below zero and subsequent earnings pay it down).
let credit = false;
export const setCredit = (on) => (credit = Boolean(on));
export const canPay = (state, cost) => credit || state.coins >= cost;
// Same for Renown (v3.68.2): negative balance allows buying without enough stars.
export const canPayRenown = (profile, cost) => credit || profile.renown >= cost;

// Upgradeable target ids: 'dispatch:<zone>', 'route:<route>', station id, or 'id:transport' (haulers).
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
  // On Bogotá event boards (v4.6) upgrades cost less (`costScale`): late-network stations are
  // very costly and without discount active play barely outperformed idling.
  const scale = (state.event && EVENTS_BY_ID[state.event.id]?.costScale) || 1;
  if (part === 'transport') return { base: def.upgradeBase * TRANSPORT_COST_FACTOR * scale, growth: def.growth, holder: st.transport };
  return { base: def.upgradeBase * scale, growth: def.growth, holder: st };
}
export const upgradeTarget = target; // (v4.1: for upgrading entire zone)

// mode: 1 | 10 | 'max'
export function quoteUpgrade(state, id, mode) {
  const { base, growth, holder } = target(state, id);
  const level = holder.level;
  const max = maxLevel(state); // en un evento, 50 (v3.10.1)
  // Route unlocks for upgrading once any station it supplies is built.
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
  // Highest milestone reached by this purchase (or null).
  const milestone = MILESTONES.filter((m) => m > from && m <= holder.level).at(-1) ?? null;
  bus.emit('levelUp', { id, from, to: holder.level, milestone });
  return true;
}

// On Bogotá event board (v4.5) only event stations apply: rest stay unbuilt.
function outsideEvent(state, id) {
  const zone = ZONES_BY_ID[zoneOf(id)];
  if (!state.event || !(zone.groups || zone.network)) return false;
  const stations = EVENTS_BY_ID[state.event.id]?.stations ?? [];
  // In network (v4.6), event stations only.
  if (zone.network) return !stations.includes(id);
  return !groupOf(id)?.stations.some((s) => stations.includes(s));
}

// Can this station be built next? Must follow chain order.
export function quoteUnlock(state, id) {
  const def = STATIONS_BY_ID[id];
  if (state.stations[id]) return { ok: false, reason: 'built', cost: 0 };
  const cost = def.unlockCost;
  if (!zoneUnlocked(state, zoneOf(id))) return { ok: false, reason: 'zone', cost };
  if (outsideEvent(state, id)) return { ok: false, reason: 'event', cost };
  if (def.side) {
    // Side branch: only requires enabling station.
    if (!state.stations[def.requires]) return { ok: false, reason: 'order', previous: def.requires, cost };
  } else if (!buildableStations(state, zoneOf(id)).includes(id)) {
    // Previous in neighborhood (v4.5) or, if first of gated neighborhood, missing prerequisites.
    // In network (v4.6, Bogotá): first unbuilt station among direct suppliers.
    let previous;
    if (ZONES_BY_ID[zoneOf(id)].network) previous = suppliersOf(id).find((s) => !state.stations[s]);
    else {
      const group = groupOf(id);
      const k = group.stations.indexOf(id);
      const waits = groupsOf(zoneOf(id)).filter((g) => (group.after ?? []).includes(g.id)).flatMap((g) => g.stations);
      previous = k > 0 ? group.stations[k - 1] : waits.find((s) => !state.stations[s]);
    }
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

// Every zone building (all must be built) at `level` or above.
export function zoneAtLevel(state, zoneId, level) {
  const z = ZONES_BY_ID[zoneId];
  return [...new Set([...z.chain, ...z.plots.map((p) => p.stationId)])].every((id) => (state.stations[id]?.level ?? 0) >= level);
}

// Missing prerequisite preventing research: station unbuilt, station/haulers below
// required level (for ×2), or whole zone below threshold (Mastery and Supremacy).
export function researchLocked(state, r) {
  const st = r.requires && state.stations[r.requires];
  if (r.requires && !st) return true;
  if (r.stationLevel && (st.level < r.stationLevel || (!STATIONS_BY_ID[r.requires].side && st.transport.level < r.stationLevel))) return true;
  return Boolean(r.minLevel && !zoneAtLevel(state, r.zone, r.minLevel));
}

// First missing prerequisite for locked research (v3.12), to jump there: station to
// build or upgrade ('id'), haulers ('id:transport'), or for Mastery/Supremacy, first
// zone station below threshold. null if none missing.
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

// Research: unlock once their station is built, bought once each.
export function quoteResearch(state, id) {
  const r = RESEARCH_BY_ID[id];
  // On an event board only event purchases apply (sim/events.js).
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

// «Buy all» (v3.57): affordable research in zone from cheapest to costliest until
// funds run out. Mastery and Supremacy stay separate: must be bought deliberately.
// Returns list of purchased upgrades.
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

// How many «Buy all» would purchase right now and total cost.
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
