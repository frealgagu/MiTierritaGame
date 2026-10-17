// Rutas entre zonas (v1.2): un vehículo lleva un producto de la bodega de una zona a la estación que
// lo necesita en otra. Espera en la bodega de origen, sale con lo que pide la estación (o con lo que
// haya tras `maxWait` s), lo entrega a mitad del viaje y vuelve.
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { stationImportCap, stationRate, TRANSPORT_MARGIN } from './rules.js';
import { speedMult } from './modifiers.js';

export function createRouteState() {
  return { level: 1, phase: 'idle', t: 0, waited: 0, load: 0 };
}

// La ruta funciona cuando existe la estación que abastece (y, por tanto, su zona está abierta).
export function routeActive(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  return Boolean(state.stations[r.station] && state.zones[r.from]?.unlocked);
}

// Unidades por viaje: a igual nivel que la estación, un 25 % más de lo que esta consume en un viaje
// de ida y vuelta (contando sus investigaciones de velocidad, como la carga de las mulas).
export function routeCapacity(state, routeId, level = state.routes[routeId].level) {
  const r = ROUTES_BY_ID[routeId];
  const def = STATIONS_BY_ID[r.station];
  return stationRate(def, level) * speedMult(state, r.station) * def.import.perCycle * r.tripTime * TRANSPORT_MARGIN;
}

// Unidades por segundo que puede mover la ruta.
export function routeRate(state, routeId, level) {
  return routeCapacity(state, routeId, level) / ROUTES_BY_ID[routeId].tripTime;
}

// Cuánto le cabe todavía a la estación de destino, contando lo que ya va en camino.
export function routeDemand(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  const st = state.stations[r.station];
  if (!st) return 0;
  const route = state.routes[routeId];
  const cap = stationImportCap(STATIONS_BY_ID[r.station], st.level, speedMult(state, r.station));
  return cap - (st.imported ?? 0) - (route.phase === 'go' ? route.load : 0);
}

// Lo que el Willys de una zona debe dejar en la bodega para las rutas que salen de ella.
export function routeReserve(state, zoneId) {
  const reserve = {};
  for (const r of ROUTES) {
    if (r.from !== zoneId || !routeActive(state, r.id) || state.routes[r.id].phase !== 'idle') continue;
    const want = Math.max(0, Math.min(routeCapacity(state, r.id), routeDemand(state, r.id)));
    reserve[r.product] = (reserve[r.product] ?? 0) + want;
  }
  return reserve;
}

export function stepRoute(state, routeId, dt, bus) {
  const r = ROUTES_BY_ID[routeId];
  const route = state.routes[routeId];
  if (!routeActive(state, routeId)) return;
  const half = r.tripTime / 2;

  if (route.phase === 'idle') {
    const wh = state.zones[r.from].warehouse;
    const stock = wh[r.product] ?? 0;
    const want = Math.min(routeCapacity(state, routeId), routeDemand(state, routeId));
    if (want <= 0.01) {
      route.waited = 0;
      return;
    }
    route.waited = stock > 0 ? route.waited + dt : 0;
    if (stock >= want || (stock > 0 && route.waited >= r.maxWait)) {
      route.load = Math.min(stock, want);
      wh[r.product] = stock - route.load;
      if (wh[r.product] <= 1e-9) delete wh[r.product];
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
    const st = state.stations[r.station];
    st.imported = (st.imported ?? 0) + route.load;
    state.stats.imported[r.product] = (state.stats.imported[r.product] ?? 0) + route.load;
    bus.emit('routeArrived', { route: routeId, load: route.load });
    route.load = 0;
    route.phase = 'back';
  } else {
    route.phase = 'idle';
    route.t = 0;
  }
}
