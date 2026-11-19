// Bottom buttons in chain 🔗 (v4.1.1):
//   🏗️ Build: builds all remaining zone stations in chain order as funds allow.
//      Available from the start.
//   ⬆ To level X: brings lowest items in zone up to next milestone (10, 25, 50, 75, 100)
//      alongside anything below it: stations, haulers, warehouse, and incoming chivas from
//      other zones. All-or-nothing. Visible after one region reset, unlocked with 10 ⭐ per
//      region, and works in events already won with gold.
import { ZONES_BY_ID } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { bulkUpgrade, maxLevel, MILESTONES } from './rules.js';
import { buyUpgrade, canPay, canPayRenown, quoteUnlock, unlockStation, upgradeTarget } from './upgrades.js';
import { nextSideToUnlock, nextToUnlock } from './chain.js';
import { createStationState } from './production.js';
import { routeActive } from './routes.js';
import { regionState } from './regions.js';

export const ZONE_BOOST_COST = 10; // ⭐, once per region

// --- 🏗️ Construir ---

const nextToBuild = (state, zoneId) => nextToUnlock(state, zoneId) ?? nextSideToUnlock(state, zoneId);

// How many build right now and total cost: { count, cost, next } (`next`: price of next
// station when none are affordable). null when nothing left to build.
export function previewBuild(state, zoneId) {
  const sim = { ...state, stations: { ...state.stations } };
  let { coins } = state;
  let count = 0;
  let cost = 0;
  let next = null;
  for (let id = nextToBuild(sim, zoneId); id; id = nextToBuild(sim, zoneId)) {
    const q = quoteUnlock({ ...sim, coins }, id);
    next ??= q.cost;
    if (!q.ok) break;
    coins -= q.cost;
    cost += q.cost;
    count++;
    sim.stations[id] = createStationState();
  }
  return next === null ? null : { count, cost, next };
}

// Builds them; returns built ids.
export function buildAll(state, zoneId, bus) {
  const built = [];
  for (let id = nextToBuild(state, zoneId); id && unlockStation(state, id, bus); id = nextToBuild(state, zoneId)) built.push(id);
  return built;
}

// --- ⬆ To level X: unlock state (on player profile: profile.zoneBoost = [regions]) ---

export const hasZoneBoost = (profile, regionId) => Boolean(profile?.zoneBoost?.includes(regionId));

export function quoteZoneBoostUnlock(profile, regionId) {
  if (hasZoneBoost(profile, regionId)) return { ok: false, reason: 'owned', cost: ZONE_BOOST_COST };
  if (!canPayRenown(profile, ZONE_BOOST_COST)) return { ok: false, reason: 'renown', cost: ZONE_BOOST_COST };
  return { ok: true, cost: ZONE_BOOST_COST };
}

export function buyZoneBoostUnlock(profile, regionId) {
  if (!quoteZoneBoostUnlock(profile, regionId).ok) return false;
  profile.renown -= ZONE_BOOST_COST;
  (profile.zoneBoost ??= []).push(regionId);
  return true;
}

// Display state: 'hidden' (region not yet reset; in events, unavailable), 'locked'
// (purchasable), or 'ready'.
//   root: main save (profile and regions); state: viewed save (region or event board).
export function zoneBoostStatus(root, state, zoneId) {
  const regionId = REGION_OF_ZONE[zoneId];
  const resets = regionState(root, regionId)?.keep.resets ?? 0;
  if (resets < 1) return 'hidden';
  const owned = hasZoneBoost(root.profile, regionId);
  if (state.event) return owned && root.profile?.medals?.[state.event.id]?.best === 'gold' ? 'ready' : 'hidden';
  return owned ? 'ready' : 'locked';
}

// --- ⬆ To level X: purchase execution ---

// Targets: built zone stations (including Compostera), haulers, warehouse, and incoming
// chivas from other zones (not in events: routes tie to stations there).
export function zoneBoostTargets(state, zoneId) {
  const zone = ZONES_BY_ID[zoneId];
  const ids = [];
  for (const id of new Set([...zone.chain, ...zone.plots.map((p) => p.stationId)])) {
    const st = state.stations[id];
    if (!st || !STATIONS_BY_ID[id]) continue;
    ids.push(id);
    if (st.transport) ids.push(`${id}:transport`);
  }
  if (state.zones[zoneId]?.dispatch) ids.push(`dispatch:${zoneId}`);
  if (!state.event) for (const id of Object.keys(state.routes ?? {})) if (ROUTES_BY_ID[id]?.to === zoneId && routeActive(state, id)) ids.push(`route:${id}`);
  return ids;
}

// Plan: { level (milestone), items: [[id, levels]], cost, affordable } or null if all maxed.
export function planZoneBoost(state, zoneId) {
  const max = maxLevel(state); // en un evento, 50
  const targets = zoneBoostTargets(state, zoneId).map((id) => ({ id, ...upgradeTarget(state, id) }));
  if (!targets.length) return null;
  const low = Math.min(...targets.map((x) => x.holder.level));
  const level = MILESTONES.find((m) => m > low && m <= max) ?? (low < max ? max : null);
  if (level === null) return null;
  const plan = { level, items: [], cost: 0, affordable: false };
  for (const x of targets) {
    if (x.holder.level >= level) continue;
    const q = bulkUpgrade(x.base, x.growth, x.holder.level, level - x.holder.level, Infinity, max);
    plan.items.push([x.id, q.levels]);
    plan.cost += q.cost;
  }
  plan.affordable = canPay(state, plan.cost);
  return plan;
}

// Executes plan (all or nothing). Each upgrade emits with `bulk` (single chime) and returns plan, or null.
export function buyZoneBoost(state, zoneId, bus) {
  const plan = planZoneBoost(state, zoneId);
  if (!plan?.affordable) return null;
  const bulk = { emit: (type, data) => bus.emit(type, { ...data, bulk: true }) };
  for (const [id, n] of plan.items) buyUpgrade(state, id, n, bulk);
  return plan;
}
