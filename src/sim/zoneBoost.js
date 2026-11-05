// Los botones de abajo de la cadena 🔗 (v4.1.1):
//   🏗️ Construir: construye, en el orden de la cadena, todas las estaciones que falten y alcance el dinero.
//      Está desde el principio.
//   ⬆️ Al nivel X: lleva lo más bajo de la zona al siguiente hito (10, 25, 50, 75, 100) junto con todo lo que
//      esté por debajo de ese hito: las estaciones, sus arrieros, la bodega y las chivas que traen productos de
//      otras zonas. Solo si alcanza para todo. Se ve después de reiniciar la región una vez, se desbloquea con
//      10 ⭐ por región y en un evento funciona si ese evento ya se ganó con oro.
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

export const ZONE_BOOST_COST = 10; // ⭐, una vez por región

// --- 🏗️ Construir ---

const nextToBuild = (state, zoneId) => nextToUnlock(state, zoneId) ?? nextSideToUnlock(state, zoneId);

// Cuántas se construirían con el dinero de ahora y cuánto costarían: { count, cost, next } (next: lo que
// cuesta la siguiente, para decirlo cuando no alcanza para ninguna). null si ya no falta nada.
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

// Las construye; devuelve los ids construidos.
export function buildAll(state, zoneId, bus) {
  const built = [];
  for (let id = nextToBuild(state, zoneId); id && unlockStation(state, id, bus); id = nextToBuild(state, zoneId)) built.push(id);
  return built;
}

// --- ⬆️ Al nivel X: el desbloqueo (en el perfil del jugador: profile.zoneBoost = [regiones]) ---

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

// Qué se muestra: 'hidden' (aún no se ha reiniciado la región; en un evento, si no se puede usar), 'locked'
// (se puede comprar) o 'ready'.
//   root: la partida (con el perfil y las regiones); state: lo que se ve (la región o el tablero del evento).
export function zoneBoostStatus(root, state, zoneId) {
  const regionId = REGION_OF_ZONE[zoneId];
  const resets = regionState(root, regionId)?.legacy?.resets ?? 0;
  if (resets < 1) return 'hidden';
  const owned = hasZoneBoost(root.profile, regionId);
  if (state.event) return owned && root.profile?.medals?.[state.event.id]?.best === 'gold' ? 'ready' : 'hidden';
  return owned ? 'ready' : 'locked';
}

// --- ⬆️ Al nivel X: la compra ---

// Lo que sube: las estaciones construidas de la zona (también la Compostera), sus arrieros, la bodega y las
// chivas que le traen productos de otras zonas (en un evento no: allí la ruta va con su estación).
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

// El plan: { level (el hito), items: [[id, niveles]], cost, affordable } o null si todo está en el tope.
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

// Compra el plan (todo o nada). Cada mejora avisa marcada `bulk` (un solo sonido) y devuelve el plan, o null.
export function buyZoneBoost(state, zoneId, bus) {
  const plan = planZoneBoost(state, zoneId);
  if (!plan?.affordable) return null;
  const bulk = { emit: (type, data) => bus.emit(type, { ...data, bulk: true }) };
  for (const [id, n] of plan.items) buyUpgrade(state, id, n, bulk);
  return plan;
}
