// Zone chains: station ordering and position along mule road.
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { pathLength, projectOnPath } from '../core/path.js';
import { ROUTES } from '../data/routes.js';
import { EVENTS_BY_ID } from '../data/events.js';

export const zoneOf = (stationId) => STATIONS_BY_ID[stationId].zone;
export const chainOf = (zoneId) => ZONES_BY_ID[zoneId].chain;
export const sourceOf = (zoneId) => ZONES_BY_ID[zoneId].farm.stationId;

// ROAD_POS[zone][station | 'warehouse']: distance (in tiles) from start of road
// to door of each main-chain station.
export const ROAD_POS = Object.fromEntries(
  ZONE_LIST.map((zone) => {
    const pos = { warehouse: pathLength(zone.muleRoad) };
    for (const id of zone.chain) {
      if (id === zone.farm.stationId) pos[id] = 0;
      else {
        const plot = zone.plots.find((p) => p.stationId === id);
        // Door: road tile facing station (v3.29), or nearest tile to its center.
        pos[id] = projectOnPath(zone.muleRoad, ...(plot.door ?? [plot.x + 1.5, plot.y + 1.5]));
      }
    }
    return [zone.id, pos];
  }),
);

// Who feeds whom: supplier of a station is zone station whose main output matches
// its recipe input. Chain can branch (pasteurized milk feeds three stations).
export const PARENT = {};
export const CHILDREN = {};
for (const zone of ZONE_LIST) {
  for (const id of zone.chain) {
    CHILDREN[id] = [];
    const inputs = Object.keys(STATIONS_BY_ID[id].in ?? {});
    const parent = zone.chain.find((p) => p !== id && inputs.includes(Object.keys(STATIONS_BY_ID[p].out)[0]));
    if (parent) PARENT[id] = parent;
  }
  for (const [id, parent] of Object.entries(PARENT)) if (STATIONS_BY_ID[id].zone === zone.id) CHILDREN[parent].push(id);
}

// v4.0: the two new mechanics.
// · Dual-output station: byproduct (`by`, e.g. Beneficiadero pulp) travels by chute without
//   mules to zone stations taking it as input, continuing down its own chain.
//   BY_CHILDREN[station] = stations taking its byproduct; their PARENT is that station.
// · Combiner station: besides primary input (from PARENT), awaits secondary product from
//   same zone (`joins: [{ product, perCycle, from }]`). If maker's main output, its mules
//   deliver it (included in CHILDREN, splitting across consumers); if byproduct, via chute
//   (in BY_CHILDREN). JOIN_FROM[station][product] = source station.
// · Route carrying a byproduct (`product` of route) sends it down chute to warehouse (BY_ROUTES).
export const BY_CHILDREN = {};
export const JOIN_FROM = {};
const byProduct = (id) => Object.keys(STATIONS_BY_ID[id].by ?? {})[0];
for (const zone of ZONE_LIST) {
  const ids = [...new Set([...zone.chain, ...(zone.plots ?? []).map((p) => p.stationId)])];
  for (const id of ids) {
    const by = byProduct(id);
    if (!by) continue;
    BY_CHILDREN[id] = ids.filter((c) => c !== id && STATIONS_BY_ID[c].in?.[by] && STATIONS_BY_ID[c].fuel?.from !== id);
    for (const c of BY_CHILDREN[id]) PARENT[c] ??= id;
  }
  for (const id of zone.chain) {
    for (const j of STATIONS_BY_ID[id].joins ?? []) {
      const from = STATIONS_BY_ID[j.from];
      const main = from && Object.keys(from.out)[0] === j.product;
      if (from?.zone !== zone.id || (!main && byProduct(j.from) !== j.product)) throw new Error(`${id}: junta ${j.product} de ${j.from}, que no lo hace en su zona`);
      (JOIN_FROM[id] ??= {})[j.product] = j.from;
      // Primary output travels by maker's mules; byproduct travels via chute.
      if (main) CHILDREN[j.from].push(id);
      else (BY_CHILDREN[j.from] ??= []).push(id);
    }
  }
}

// Routes within zone taking each station's byproduct (v4.0: palm kernel from Prensa).
export const BY_ROUTES = Object.fromEntries(
  Object.keys(STATIONS_BY_ID)
    .filter((id) => byProduct(id))
    .map((id) => [id, ROUTES.filter((r) => r.from === STATIONS_BY_ID[id].zone && r.product === byProduct(id))])
    .filter(([, routes]) => routes.length),
);

// Input a station gets from `from`: primary input or combined input (v4.0).
export function suppliedProduct(id, from) {
  const join = (STATIONS_BY_ID[id].joins ?? []).find((j) => j.from === from);
  return join ? join.product : Object.keys(STATIONS_BY_ID[id].in ?? {})[0];
}

// Is `product` station's combined input (not primary)? And cycles consumption.
export const joinOf = (id, product) => (STATIONS_BY_ID[id].joins ?? []).find((j) => j.product === product) ?? null;
export function perCycleOf(id, product) {
  const def = STATIONS_BY_ID[id];
  return joinOf(id, product)?.perCycle ?? def.in?.[product] ?? Object.values(def.in ?? {})[0] ?? 0;
}

export function isUnlocked(state, id) {
  return Boolean(state.stations[id]);
}

export function zoneUnlocked(state, zoneId) {
  return Boolean(state.zones[zoneId]?.unlocked);
}

// A station the player stopped (v5.14): it neither produces nor sends out its mules, and nothing new is sent to it:
// what it would receive goes to the other stations that use it or is sold at the warehouse.
export const isStopped = (state, id) => Boolean(state.stations[id]?.stopped);

// Built stations fed by this one (empty if output goes to zone warehouse). A stopped one takes nothing (v5.14).
export function consumers(state, id) {
  return (CHILDREN[id] ?? []).filter((c) => isUnlocked(state, c) && !isStopped(state, c));
}

// Neighborhoods (v4.5, Bogotá): zone may have parallel build chains each in sequence
// (`zone.groups`: [{ id, name, stations, after? }]); gated neighborhoods unlock once prerequisites complete.
// Without neighborhoods, whole zone is one chain. (Since v4.6 no zone uses neighborhoods: Bogotá is a network.)
export const groupsOf = (zoneId) => ZONES_BY_ID[zoneId].groups ?? [{ id: zoneId, stations: chainOf(zoneId) }];
export const groupOf = (stationId) => groupsOf(zoneOf(stationId)).find((g) => g.stations.includes(stationId)) ?? null;
const groupDone = (state, zoneId, groupId) => groupsOf(zoneId).find((g) => g.id === groupId).stations.every((id) => isUnlocked(state, id));

// In network (v4.6, Bogotá: `zone.network`): zone stations feeding this one via primary or
// combined input (excluding external sources: tractomulas don't count).
export const suppliersOf = (id) => [...new Set([PARENT[id], ...Object.values(JOIN_FROM[id] ?? {})].filter(Boolean))];

// Stations currently buildable: first unbuilt of each open neighborhood; in network, all whose
// upstream supplier stations are built.
export function buildableStations(state, zoneId = 'finca') {
  if (!zoneUnlocked(state, zoneId)) return [];
  // On Bogotá event board (v4.7.1) only event stations count (others aren't built there,
  // nor shown or suggested).
  const ev = state.event && (ZONES_BY_ID[zoneId].network || ZONES_BY_ID[zoneId].groups) ? EVENTS_BY_ID[state.event.id] : null;
  if (ev) return ev.stations.filter((id) => zoneOf(id) === zoneId && !isUnlocked(state, id));
  if (ZONES_BY_ID[zoneId].network) return chainOf(zoneId).filter((id) => !isUnlocked(state, id) && suppliersOf(id).every((s) => isUnlocked(state, s)));
  const out = [];
  for (const g of groupsOf(zoneId)) {
    if ((g.after ?? []).some((other) => !groupDone(state, zoneId, other))) continue;
    const next = g.stations.find((id) => !isUnlocked(state, id));
    if (next) out.push(next);
  }
  return out;
}

// First unbuilt station in zone chain (with neighborhoods, cheapest buildable one).
export function nextToUnlock(state, zoneId = 'finca') {
  const list = buildableStations(state, zoneId);
  if (list.length <= 1) return list[0] ?? null;
  return list.reduce((best, id) => (STATIONS_BY_ID[id].unlockCost < STATIONS_BY_ID[best].unlockCost ? id : best));
}

// Unbuilt zone station outside main chain (v3.58): Finca's Compostera, optional branch;
// while unbuilt, zone isn't maxed.
export function nextSideToUnlock(state, zoneId) {
  if (!zoneUnlocked(state, zoneId)) return null;
  const chain = chainOf(zoneId);
  return ZONES_BY_ID[zoneId].plots.map((p) => p.stationId).find((id) => !chain.includes(id) && !isUnlocked(state, id)) ?? null;
}

// Built stations in a zone (main chain and branches).
export function builtStations(state, zoneId) {
  return Object.keys(state.stations).filter((id) => zoneOf(id) === zoneId);
}

// Fraction of `parent` output belonging to `id` at equal levels and upgrades
// (Quesera gets ¼ of Pasteurizadora milk). Derived from base rates.
export function branchShare(parent, id) {
  const p = STATIONS_BY_ID[parent];
  const def = STATIONS_BY_ID[id];
  const product = Object.keys(def.in)[0];
  return (def.in[product] / def.cycle) / (p.out[product] / p.cycle);
}
