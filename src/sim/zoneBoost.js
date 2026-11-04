// Mejorar toda la zona (v4.1), desde la cadena 🔗. Se desbloquea con Renombre, una vez por región, y solo
// después de haber reiniciado esa región al menos una vez. En un evento funciona si ese evento ya se ganó
// con oro alguna vez.
//   ⬆️ Toda la zona: sube parejo las estaciones, sus arrieros y la bodega de la zona (+1, +10 o lo que
//      alcance), empezando por lo más bajo.
//   🤖 Recomendada: compra una y otra vez la mejora recomendada (aunque sea de otra zona que la abastece, o
//      una investigación) mientras alcance el dinero.
import { ZONES_BY_ID } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { bulkUpgrade, maxLevel, upgradeCost } from './rules.js';
import { buyResearch, buyUpgrade, canPay, canPayRenown, quoteUpgrade, upgradeTarget } from './upgrades.js';
import { recommendUpgrade } from './analysis.js';
import { buyAction } from './events.js';
import { regionState } from './regions.js';

export const ZONE_BOOST_COST = 10; // ⭐, una vez por región
// «Recomendada»: hasta cuántas compras y cuánto tiempo pensando (calcular la recomendación cuesta) por toque.
const FOLLOW_MAX = 100;
const FOLLOW_MS = 400;

// --- El desbloqueo (en el perfil del jugador: profile.zoneBoost = [regiones]) ---

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

// Qué se muestra en la cadena: 'hidden' (aún no se ha reiniciado la región; en un evento, si no se puede
// usar), 'locked' (se puede comprar) o 'ready'.
//   root: la partida (con el perfil y las regiones); state: lo que se ve (la región o el tablero del evento).
export function zoneBoostStatus(root, state, zoneId) {
  const regionId = REGION_OF_ZONE[zoneId];
  const resets = regionState(root, regionId)?.legacy?.resets ?? 0;
  if (resets < 1) return 'hidden';
  const owned = hasZoneBoost(root.profile, regionId);
  if (state.event) return owned && root.profile?.medals?.[state.event.id]?.best === 'gold' ? 'ready' : 'hidden';
  return owned ? 'ready' : 'locked';
}

// --- ⬆️ Toda la zona ---

// Lo que se sube: las estaciones construidas de la zona (también la Compostera), los arrieros de las que
// los tienen y la bodega.
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
  return ids;
}

// El plan de compra: { items: [[id, niveles]], levels, cost, affordable, maxed }.
//   mode 1 | 10: cada cosa sube esos niveles (o hasta el tope); se compra todo o nada.
//   mode 'max': de a un nivel, siempre lo más bajo (y entre iguales, lo más barato), hasta que no alcance.
export function planZoneBoost(state, zoneId, mode) {
  const max = maxLevel(state);
  const targets = zoneBoostTargets(state, zoneId).map((id) => ({ id, ...upgradeTarget(state, id) }));
  const open = targets.filter((x) => x.holder.level < max);
  const plan = { items: [], levels: 0, cost: 0, affordable: false, maxed: open.length === 0 };
  if (plan.maxed) return plan;
  if (mode !== 'max') {
    for (const x of open) {
      const q = bulkUpgrade(x.base, x.growth, x.holder.level, mode, Infinity, max);
      plan.items.push([x.id, q.levels]);
      plan.levels += q.levels;
      plan.cost += q.cost;
    }
    plan.affordable = canPay(state, plan.cost);
    return plan;
  }
  const level = new Map(open.map((x) => [x.id, x.holder.level]));
  const bought = new Map();
  const budget = canPay(state, Infinity) ? Infinity : state.coins;
  for (;;) {
    let pick = null;
    let price = Infinity;
    for (const x of open) {
      const l = level.get(x.id);
      if (l >= max) continue;
      const c = upgradeCost(x.base, x.growth, l);
      if (!pick || l < level.get(pick.id) || (l === level.get(pick.id) && c < price)) {
        pick = x;
        price = c;
      }
    }
    if (!pick || plan.cost + price > budget) break;
    plan.cost += price;
    plan.levels++;
    level.set(pick.id, level.get(pick.id) + 1);
    bought.set(pick.id, (bought.get(pick.id) ?? 0) + 1);
  }
  plan.items = [...bought];
  plan.affordable = plan.levels > 0;
  // Lo que costaría el siguiente nivel (para decir cuánto falta cuando no alcanza para nada).
  if (!plan.affordable) {
    const low = open.reduce((a, b) => (b.holder.level < a.holder.level ? b : a));
    plan.next = upgradeCost(low.base, low.growth, low.holder.level);
  }
  return plan;
}

// Compra el plan. Cada mejora avisa marcada `bulk` (para no llenar la pantalla) y devuelve el plan, o null.
export function buyZoneBoost(state, zoneId, mode, bus) {
  const plan = planZoneBoost(state, zoneId, mode);
  if (!plan.affordable) return null;
  const bulk = { emit: (type, data) => bus.emit(type, { ...data, bulk: true }) };
  for (const [id, n] of plan.items) buyUpgrade(state, id, n, bulk);
  return plan;
}

// --- 🤖 Recomendada ---

// Compra la recomendada mientras alcance. Devuelve [[id, veces]] en el orden en que se compraron.
export function followRecommended(state, zoneId, bus, { max = FOLLOW_MAX, ms = FOLLOW_MS } = {}) {
  const bulk = { emit: (type, data) => bus.emit(type, { ...data, bulk: true }) };
  const quote = (id, mode) => quoteUpgrade(state, id, mode);
  const bought = new Map();
  const t0 = performance.now();
  for (let i = 0; i < max && performance.now() - t0 < ms; i++) {
    const rec = recommendUpgrade(state, quote, zoneId);
    if (!rec) break;
    const [kind, part] = rec.id.split(':');
    let ok;
    if (kind === 'research') ok = buyResearch(state, part, bulk);
    else if (kind === 'action') ok = buyAction(state, part, bulk);
    else ok = quote(rec.id, 1).affordable && buyUpgrade(state, rec.id, 1, bulk);
    if (!ok) break;
    bought.set(rec.id, (bought.get(rec.id) ?? 0) + 1);
  }
  return [...bought];
}
