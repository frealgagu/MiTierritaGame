import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID, ALL_ZONES as ZONE_LIST } from '../data/zones/index.js';
import { muleCount, muleLoad, stationBufferCap, stationInputCap, stationOutputRate, stationRate, warehouseCapacity } from './rules.js';
import { sumValues } from './state.js';
import { BY_CHILDREN, BY_ROUTES, CHILDREN, FUEL_CHILDREN, ROAD_POS, chainOf, consumers, joinOf, perCycleOf, zoneOf, zoneUnlocked } from './chain.js';
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { ROUTE_STOCK, routeActive, routeCapacity, routeImport, routeRate, routeReserve, routeStations } from './routes.js';
import { inputSpace, stepFuel } from './production.js';
import { capMult, dispatchMult, muleSpeedMult, speedMult } from './modifiers.js';
import { resting } from './calendar.js';
import { addMule, countFleet, endFleet, fleetOf } from './fleet.js';

const MAX_IDLE = 6; // s: if anything waits in yard and no mule departs within this time, depart with partial load
// If full load doesn't fit downstream, mules wait for space; only when yard is near full
// do they leave partially (if at least a quarter fits) or divert to warehouse. Previously
// they left with crumbs, saturating roads while transport actually had capacity.
const PATIO_ALMOST_FULL = 0.8;
const MIN_PARTIAL = 0.25;
const MIN_LEG = 1; // s per trip segment
// Diversions only use warehouse while more than this fraction stays free: so cheap
// overflowing items never crowd out final-chain products.
export const DIVERT_RESERVE = 0.3;
// A byproduct nobody uses is sold too (v5.15), but only while the warehouse is under this share of its capacity: the
// rest of the room stays for what the mules bring, so cheap leftovers never crowd out the main products.
export const BY_SALE_FILL = 0.4;

// One-way trip seconds between two points on a zone chain.
// `to` may be another station or 'warehouse' (`from`'s zone warehouse).
export function legTime(from, to, speedMult = 1) {
  const zone = zoneOf(from);
  const pos = ROAD_POS[zone];
  return Math.max(MIN_LEG, Math.abs(pos[to] - pos[from]) / (ZONES_BY_ID[zone].muleSpeed * speedMult));
}

// Units currently en route to a station, or to a zone warehouse.
export function inTransit(state, to = 'warehouse', zoneId = 'finca') {
  const f = fleetOf(state);
  if (f) return (to === 'warehouse' ? f.toWarehouse[zoneId] : f.incoming[to]) ?? 0;
  return state.mules.reduce((n, m) => {
    if (m.phase !== 'go' || m.to !== to) return n;
    if (to === 'warehouse' && zoneOf(m.from) !== zoneId) return n;
    return n + m.amount;
  }, 0);
}

// How much a station's output is boosted (to size its mule loads).
export function productionMult(state, id) {
  return speedMult(state, id);
}

// Normal destination for a station's mules: next built station or warehouse. When splitting
// across branches, farthest destination: ensures load covers any of them.
export function normalDest(state, id) {
  const targets = consumers(state, id);
  if (!targets.length || exportsOf(state, id).length) return 'warehouse';
  return targets.reduce((far, c) => (legTime(id, c) > legTime(id, far) ? c : far));
}

// Routes carrying an intermediate output of this station elsewhere (pasteurized milk): station
// reserves a share for them like an extra branch. Mules drop it at warehouse for the route.
export function exportsOf(state, id) {
  return (ROUTES_OF[id] ?? []).filter((r) => routeActive(state, r.id));
}

// Routes eligible to carry each station's output (same zone and product), precomputed.
const ROUTES_OF = Object.fromEntries(
  Object.values(STATIONS_BY_ID)
    .filter((def) => CHILDREN[def.id]?.length)
    .map((def) => {
      const out = Object.keys(def.out)[0];
      return [def.id, ROUTES.filter((r) => r.from === def.zone && r.product === out)];
    }),
);

// Routes that will take this station's product but aren't open yet (milk route before
// Cacaotal opens): their reserved share sells meanwhile, which isn't a fault.
export function pendingRoutes(state, id) {
  return (ROUTES_OF[id] ?? []).filter((r) => !routeActive(state, r.id));
}

// Do downstream stations process less than this outputs? (Plus outbound routes taking its
// product.) Then surplus goes to warehouse the long way and, if haulers fall short,
// yard fills up: downstream is at fault, not mules. Returns lagging destinations.
export function slowConsumers(state, id) {
  const children = consumers(state, id);
  if (!children.length) return [];
  const def = STATIONS_BY_ID[id];
  const output = stationOutputRate(def, state.stations[id].level) * speedMult(state, id);
  const product = Object.keys(def.out)[0];
  const take = (c) => stationRate(STATIONS_BY_ID[c], state.stations[c].level) * speedMult(state, c) * perCycleOf(c, product);
  const capacity = children.reduce((n, c) => n + take(c), 0) + exportsOf(state, id).reduce((n, r) => n + routeRate(state, r.id), 0);
  if (capacity >= output * 0.98) return [];
  return children.filter((c) => state.stations[c].level === Math.min(...children.map((x) => state.stations[x].level)));
}

// Remaining units to stockpile in warehouse for a route (1.5 loads minus stocked and en-route).
export function exportSpace(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  const cap = ROUTE_STOCK * routeCapacity(state, routeId);
  const stock = state.zones[r.from].warehouse[r.product] ?? 0;
  const f = fleetOf(state);
  const coming = f
    ? f.toExport[`${r.from}|${r.product}`] ?? 0
    : state.mules.reduce((n, m) => (m.phase === 'go' && m.to === 'warehouse' && m.productId === r.product && zoneOf(m.from) === r.from ? n + m.amount : n), 0);
  return { space: cap - stock - coming, cap };
}

// Destinations for a station's mules: built stations and routes ('export:<route>'). `product`:
// cargo carried (on a combiner station, each input has its own buffer; v4.0).
const targetSpace = (state, t, product) => (t.startsWith('export:') ? exportSpace(state, t.slice(7)).space : inputSpace(state, t, joinOf(t, product) ? product : undefined));
const targetCap = (state, t) => (t.startsWith('export:') ? exportSpace(state, t.slice(7)).cap : stationInputCap(STATIONS_BY_ID[t], state.stations[t].level, capMult(state, t)));
const targetDest = (t) => (t.startsWith('export:') ? 'warehouse' : t);

// Per-mule capacity for a station's team (at current or given transport level).
export function teamLoad(state, id, level = state.stations[id].transport.level) {
  const def = STATIONS_BY_ID[id];
  return muleLoad(def, level, 2 * legTime(id, normalDest(state, id)), productionMult(state, id));
}

// Units/s hauled by a station's haulers to `dest`.
// To normal destination: 25 % above same-level station output
// (more with Horseshoes or Cableway). To warehouse on diversion: less, longer trip.
export function teamCapacity(state, id, dest = normalDest(state, id), level = state.stations[id].transport.level) {
  return (muleCount(level) * teamLoad(state, id, level)) / (2 * legTime(id, dest, muleSpeedMult(state)));
}

// Station mules currently out on a trip (outbound or returning).
export function busyMules(state, id) {
  const f = fleetOf(state);
  if (f) return f.busy[id] ?? 0;
  return state.mules.reduce((n, m) => (m.from === id ? n + 1 : n), 0);
}

export function warehouseCap(state, zoneId) {
  return warehouseCapacity(state.zones[zoneId].dispatch.level, dispatchMult(state, zoneId));
}

// Free space in zone warehouse factoring in en-route cargo.
// Route reserve sits on warehouse loading dock without crowding others (previously
// milk queued for Cacaotal could fill Lechería warehouse and stall the whole zone).
export function dockStock(state, zoneId) {
  const wh = state.zones[zoneId].warehouse;
  return Object.entries(routeReserve(state, zoneId)).reduce((n, [p, r]) => n + Math.min(wh[p] ?? 0, r), 0);
}

export function warehouseSpace(state, zoneId) {
  const wh = state.zones[zoneId].warehouse;
  return warehouseCap(state, zoneId) - (sumValues(wh) - dockStock(state, zoneId)) - inTransit(state, 'warehouse', zoneId);
}

// Haulers (v0.3): each station has mules. Travel to next station (or warehouse if
// next doesn't exist or lacks room), unload, return. If all out, goods stack in yard.
// At night no new pack departs (en-route mules finish their trip).
export function stepMules(state, dt, bus) {
  let finished = false;
  for (const m of state.mules) {
    m.t += dt;
    if (m.t < m.duration) continue;
    if (m.phase === 'go') {
      deliver(state, m);
      bus.emit('muleArrived', m);
      m.phase = 'back';
      m.t -= m.duration;
      m.amount = 0;
    }
    if (m.phase === 'back' && m.t >= m.duration) {
      m.done = true;
      finished = true;
    }
  }
  if (finished) state.mules = state.mules.filter((m) => !m.done);

  // Empty yard or all mules busy: nobody leaves (skip load math).
  if (resting(state)) return;
  countFleet(state);
  try {
    for (const zone of ZONE_LIST) {
      if (!zoneUnlocked(state, zone.id)) continue;
      for (const id of chainOf(zone.id)) if (state.stations[id]) dispatchFrom(state, id, dt, bus);
    }
  } finally {
    endFleet();
  }
}

function deliver(state, m) {
  const s = m.to !== 'warehouse' ? state.stations[m.to] : null;
  if (s && joinOf(m.to, m.productId)) (s.joined ??= {})[m.productId] = (s.joined[m.productId] ?? 0) + m.amount;
  else if (s) s.input += m.amount;
  else {
    const wh = state.zones[zoneOf(m.from)].warehouse;
    wh[m.productId] = (wh[m.productId] ?? 0) + m.amount;
  }
}

function dispatchFrom(state, id, dt, bus) {
  const s = state.stations[id];
  const def = STATIONS_BY_ID[id];
  const level = s.transport.level;
  s.sinceDeparture += dt;
  s.waiting = null;
  // A stopped station's mules stay home (v5.14); those already on the road finish their trip.
  if (s.stopped) return;
  // Empty yard or all mules busy: nobody leaves (skip load math).
  if (s.buffer <= 0) return;
  if (busyMules(state, id) >= muleCount(level)) {
    s.waiting = 'mules';
    return;
  }
  const load = teamLoad(state, id);
  const product = Object.keys(def.out)[0];
  const targets = [...consumers(state, id), ...exportsOf(state, id).map((r) => `export:${r.id}`)];

  // Multiple mules can depart simultaneously when cargo and free mules allow.
  while (s.buffer > 0) {
    if (busyMules(state, id) >= muleCount(level)) {
      s.waiting = 'mules';
      return;
    }
    if (s.buffer < load && s.sinceDeparture < MAX_IDLE) return;
    const amount = Math.min(s.buffer, load);
    const next = pickConsumer(state, targets, amount, product);
    if (next) {
      sendMule(state, id, targetDest(next), Math.min(amount, targetSpace(state, next, product)), bus);
      continue;
    }
    const almostFull = s.buffer >= PATIO_ALMOST_FULL * stationBufferCap(def, s.level, capMult(state, id));
    const partial = almostFull ? pickConsumer(state, targets, amount * MIN_PARTIAL, product) : null;
    if (partial) {
      sendMule(state, id, targetDest(partial), Math.min(amount, targetSpace(state, partial, product)), bus);
      continue;
    }
    // Some room available, less than full load: better wait than haul crumbs.
    if (!almostFull && targets.some((c) => targetSpace(state, c, product) > 0)) return;
    const zoneId = zoneOf(id);
    const reserve = targets.length ? DIVERT_RESERVE * warehouseCap(state, zoneId) : 0;
    const room = warehouseSpace(state, zoneId) - reserve;
    if (room <= 0) {
      s.waiting = 'space';
      return;
    }
    const diverted = Math.min(amount, room);
    sendMule(state, id, 'warehouse', diverted, bus);
    // Flag ↪ only on real diversions (at least half a load), not tiny leftovers or when
    // warehouse also feeds route (surplus goes on next route load), nor for
    // unopened route shares (sold meanwhile).
    const exporting = targets.some((t) => t.startsWith('export:')) || pendingRoutes(state, id).length > 0;
    if (targets.length && !exporting && diverted >= load * 0.5) s.lastDiverted = state.playTime;
  }
}

// Among target stations with room for `amount`, pick one with emptiest input
// (counting en-route cargo). Automatically feeds faster station more without manual split.
// A station whose input buffer holds less than a full load (branch lagging below
// parent) settles for half input free: delivers what fits, else it would starve forever.
// anything and would stall.
function pickConsumer(state, targets, amount, product) {
  let best = null;
  let bestFill = Infinity;
  for (const c of targets) {
    const space = targetSpace(state, c, product);
    const need = Math.min(amount, targetCap(state, c) * 0.5);
    if (space <= 0 || space < need - 1e-9) continue;
    const fill = 1 - space / targetCap(state, c);
    if (fill < bestFill) {
      best = c;
      bestFill = fill;
    }
  }
  return best;
}

function sendMule(state, from, to, amount, bus) {
  const s = state.stations[from];
  const productId = Object.keys(STATIONS_BY_ID[from].out)[0];
  s.buffer -= amount;
  s.sinceDeparture = 0;
  const mule = { id: state.nextId++, productId, amount, from, to, phase: 'go', t: 0, duration: legTime(from, to, muleSpeedMult(state)) };
  state.mules.push(mule);
  addMule(mule);
  bus.emit('muleDeparted', mule);
}

// Byproducts (v4.0): extra output alongside main product (Beneficiadero pulp) travels
// via chute, no mules. First to warehouse reserved for its routes (like
// primary outputs, v3.67); next to local consuming stations (primary, combined or as fuel),
// emptiest first; leftovers are sold at the warehouse (v5.15: every byproduct, not only those with a route; before,
// one without a route was thrown away once its yard filled). What does not fit in the warehouse stays in the
// byproduct yard and overflows when that is full.
export function stepByproducts(state) {
  for (const [id, src] of Object.entries(state.stations)) {
    if (!(src.byBuffer > 1e-9)) continue;
    const kids = (BY_CHILDREN[id] ?? []).filter((c) => state.stations[c] && !state.stations[c].stopped);
    const routes = BY_ROUTES[id] ?? [];
    const product = Object.keys(STATIONS_BY_ID[id].by)[0];
    const wh = state.zones[zoneOf(id)].warehouse;
    const toWarehouse = (n) => {
      wh[product] = (wh[product] ?? 0) + n;
      src.byBuffer -= n;
    };
    for (const r of routes) {
      if (!routeActive(state, r.id)) continue;
      const n = Math.min(src.byBuffer, exportSpace(state, r.id).space);
      if (n > 1e-9) toWarehouse(n);
    }
    const room = (c) => {
      const st = state.stations[c];
      const have = joinOf(c, product) ? st.joined?.[product] ?? 0 : st.input;
      return stationInputCap(STATIONS_BY_ID[c], st.level, capMult(state, c)) - have;
    };
    while (src.byBuffer > 1e-9 && kids.length) {
      const target = kids.reduce((best, c) => (room(c) > room(best) ? c : best));
      const move = Math.min(room(target), src.byBuffer);
      if (move <= 1e-9) break;
      const st = state.stations[target];
      if (joinOf(target, product)) (st.joined ??= {})[product] = (st.joined[product] ?? 0) + move;
      else st.input += move;
      src.byBuffer -= move;
    }
    // The station that burns it as fuel (Hornilla) takes its share before anything is sold.
    for (const c of FUEL_CHILDREN[id] ?? []) if (state.stations[c]) stepFuel(state, c);
    if (src.byBuffer > 1e-9) {
      const zoneId = zoneOf(id);
      const keep = routes.length ? DIVERT_RESERVE : 1 - BY_SALE_FILL;
      const n = Math.min(src.byBuffer, warehouseSpace(state, zoneId) - keep * warehouseCap(state, zoneId));
      if (n > 1e-9) toWarehouse(n);
    }
  }
  stepSideSurplus(state);
}

// A side station (Compostera) keeps its product in its own yard, where the zone spends it. With the yard full, what
// it goes on making is sold at the warehouse (v5.15) instead of halting it. (v5.16.3) It keeps working at its full
// pace while the warehouse has room for the surplus (`sideSaleRoom`, used by stepStation): until then it halted
// with a full yard and only made what the Finca spent, and in a big game the «one cycle short» left nothing to sell.
export const sideKeep = (state, id) => stationBufferCap(STATIONS_BY_ID[id], state.stations[id].level, capMult(state, id));
export function sideSaleRoom(state, id) {
  const zoneId = zoneOf(id);
  return Math.max(0, warehouseSpace(state, zoneId) - (1 - BY_SALE_FILL) * warehouseCap(state, zoneId));
}
function stepSideSurplus(state) {
  for (const id of Object.keys(state.stations)) sellSideSurplus(state, id);
}
// What a side station has over its full yard goes to the warehouse (run right after it works, too).
// (v5.18) Its routes come first (the Ruta del abono): what they will carry leaves the yard for the warehouse before the
// bonus spends any, since a source left without compost stops a whole zone.
const SIDE_ROUTES = Object.fromEntries(
  Object.values(STATIONS_BY_ID)
    .filter((def) => def.side)
    .map((def) => [def.id, ROUTES.filter((r) => r.from === def.zone && r.product === Object.keys(def.out)[0])]),
);
export function sellSideSurplus(state, id) {
  const st = state.stations[id];
  const def = STATIONS_BY_ID[id];
  if (!st || !def.side) return;
  for (const r of SIDE_ROUTES[id]) {
    if (!routeActive(state, r.id)) continue;
    // From the top half of the yard, so the chiva's big loads never empty it and the bonus never skips a beat
    // (what it does not spend would be left over); all of it if a station of the route is running out.
    const urgent = routeStations(state, r.id).some((s) => (state.stations[s].imported?.[r.product] ?? 0) < routeImport(r, s).perCycle);
    const spare = urgent ? st.buffer : st.buffer - sideKeep(state, id) / 2;
    const n = Math.min(spare, exportSpace(state, r.id).space);
    if (n <= 1e-9) continue;
    const wh = state.zones[zoneOf(id)].warehouse;
    wh[r.product] = (wh[r.product] ?? 0) + n;
    st.buffer -= n;
  }
  const extra = st.buffer - sideKeep(state, id);
  if (extra <= 0) return;
  const n = Math.min(extra, sideSaleRoom(state, id));
  if (n <= 0) return;
  const product = Object.keys(def.out)[0];
  const wh = state.zones[zoneOf(id)].warehouse;
  wh[product] = (wh[product] ?? 0) + n;
  st.buffer -= n;
}
