// Inter-zone routes (v1.2): a vehicle carries a product from origin zone warehouse to
// stations needing it elsewhere. Waits at origin warehouse, departs with station demand (or
// available stock after `maxWait` s), delivers at midpoint, returns.
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { stationImportCap, stationRate, TRANSPORT_MARGIN } from './rules.js';
import { speedMult } from './modifiers.js';
import { REGION_OF_ZONE, REGIONS_BY_ID } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// How much origin warehouse reserves for a route, in vehicle loads.
export const ROUTE_STOCK = 1.5;

export function createRouteState() {
  return { level: 1, phase: 'idle', t: 0, waited: 0, load: 0 };
}

// Import amount station `id` draws from route `r` (its entry in def.imports).
export const routeImport = (r, id) => STATIONS_BY_ID[id].imports.find((imp) => imp.route === r.id);

// Built stations supplied by the route.
export function routeStations(state, routeId) {
  return ROUTES_BY_ID[routeId].stations.filter((id) => state.stations[id]);
}

// Tractomulas (v4.5, Bogotá): routes with no in-save origin zone (`unlimited`), hauling endless
// cargo from another region without draining it. Only capped by route level.
// Route's owning region: origin zone's region or, for tractomulas, destination's.
export const routeRegion = (r) => REGION_OF_ZONE[r.from ?? r.to];
// Route origin label: origin zone or, for tractomulas, origin region ({ name, icon }).
export const routeOrigin = (r) => (r.unlimited ? REGIONS_BY_ID[r.origin] : ZONES_BY_ID[r.from]);

// Route operates once at least one target station is built (and origin zone is open).
export function routeActive(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  // Tractomulas (v4.5) don't run on event boards: external supply arrives like other boards
  // (sim/events.js, stepSupply), so pico y placa or strike still blocks them.
  if (r.unlimited) return !state.event && routeStations(state, routeId).length > 0;
  return routeStations(state, routeId).length > 0 && Boolean(state.zones[r.from]?.unlocked);
}

// Units/s of imported product consumed by station at full speed (at `level`, or current level).
export function stationImportRate(state, r, id, level = state.stations[id].level) {
  return stationRate(STATIONS_BY_ID[id], level) * speedMult(state, id) * routeImport(r, id).perCycle;
}

// Faster chivas (v4.2): with Renown per region, every 30 s then every 15 s (instead of 60 s).
// Each carries its fraction (half or quarter): same throughput per minute, arriving more often.
// Unchanged on event boards (there routes track station level).
export const chivaSpeed = (state) => (state.event ? 1 : state.chivas === 15 ? 4 : state.chivas === 30 ? 2 : 1);
export const tripTimeOf = (state, r) => r.tripTime / chivaSpeed(state);

// Units per trip: at equal level to supplied stations, 25 % more than what they consume
// across a round trip (including research multipliers, matching mule loads).
export function routeCapacity(state, routeId, level = state.routes[routeId].level) {
  const r = ROUTES_BY_ID[routeId];
  const perSecond = routeStations(state, routeId).reduce((n, id) => n + stationImportRate(state, r, id, level), 0);
  return perSecond * tripTimeOf(state, r) * TRANSPORT_MARGIN;
}

// Units per second capacity of the route.
export function routeRate(state, routeId, level) {
  return routeCapacity(state, routeId, level) / tripTimeOf(state, ROUTES_BY_ID[routeId]);
}

// Remaining input capacity at a destination station.
function stationSpace(state, r, id) {
  const def = STATIONS_BY_ID[id];
  const imp = routeImport(r, id);
  const cap = stationImportCap(def, state.stations[id].level, speedMult(state, id), imp);
  return Math.max(0, cap - (state.stations[id].imported[r.product] ?? 0));
}

// Combined remaining input capacity across destination stations, counting en-route cargo.
export function routeDemand(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  const route = state.routes[routeId];
  const space = routeStations(state, routeId).reduce((n, id) => n + stationSpace(state, r, id), 0);
  return space - (route.phase === 'go' ? route.load : 0);
}

// What a zone's Willys must leave in warehouse for outbound routes: one full load,
// including while Chiva is away (otherwise returning Chiva only saw the last few seconds).
export function routeReserve(state, zoneId) {
  const reserve = {};
  for (const r of ROUTES) {
    if (r.from !== zoneId || !routeActive(state, r.id)) continue;
    // 1.5 loads even if demand is currently lower: stock built up while Chiva makes a round trip.
    reserve[r.product] = (reserve[r.product] ?? 0) + ROUTE_STOCK * routeCapacity(state, r.id);
  }
  return reserve;
}

// Distributes load across destination stations weighted by remaining space.
function deliver(state, r, load) {
  const ids = routeStations(state, r.id);
  const spaces = ids.map((id) => stationSpace(state, r, id));
  const total = spaces.reduce((a, b) => a + b, 0);
  ids.forEach((id, k) => {
    const share = total > 0 ? (load * spaces[k]) / total : load / ids.length;
    const st = state.stations[id];
    st.imported[r.product] = (st.imported[r.product] ?? 0) + share;
  });
}

export function stepRoute(state, routeId, dt, bus) {
  const r = ROUTES_BY_ID[routeId];
  const route = state.routes[routeId];
  if (!routeActive(state, routeId)) return;
  const half = tripTimeOf(state, r) / 2;

  if (route.phase === 'idle') {
    // Tractomula always finds cargo (v4.5).
    const wh = r.unlimited ? null : state.zones[r.from].warehouse;
    const stock = r.unlimited ? Infinity : wh[r.product] ?? 0;
    const want = Math.min(routeCapacity(state, routeId), routeDemand(state, routeId));
    if (want <= 0.01) {
      route.waited = 0;
      return;
    }
    route.waited = stock > 0 ? route.waited + dt : 0;
    if (stock >= want || (stock > 0 && route.waited >= r.maxWait / chivaSpeed(state))) {
      route.load = Math.min(stock, want);
      if (wh) {
        wh[r.product] = stock - route.load;
        if (wh[r.product] <= 1e-9) delete wh[r.product];
      }
      route.phase = 'go';
      route.t = 0;
      route.waited = 0;
      bus.emit('routeDeparted', { route: routeId, load: route.load });
    }
    return;
  }

  route.t += dt;
  if (route.t < half) return;
  route.t -= half;
  if (route.phase === 'go') {
    deliver(state, r, route.load);
    state.stats.imported[r.product] = (state.stats.imported[r.product] ?? 0) + route.load;
    bus.emit('routeArrived', { route: routeId, load: route.load });
    route.load = 0;
    route.phase = 'back';
  } else {
    route.phase = 'idle';
    route.t = 0;
  }
}
