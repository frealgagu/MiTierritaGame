// Rutas entre zonas (v1.2): un vehículo lleva un producto de la bodega de una zona a las estaciones que
// lo necesitan en otra. Espera en la bodega de origen, sale con lo que piden las estaciones (o con lo que
// haya tras `maxWait` s), lo reparte a mitad del viaje y vuelve.
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { stationImportCap, stationRate, TRANSPORT_MARGIN } from './rules.js';
import { speedMult } from './modifiers.js';

// Lo que la bodega de origen guarda para una ruta, en cargas del vehículo.
export const ROUTE_STOCK = 1.5;

export function createRouteState() {
  return { level: 1, phase: 'idle', t: 0, waited: 0, load: 0 };
}

// Lo que la estación `id` importa por la ruta `r` (su entrada de def.imports).
export const routeImport = (r, id) => STATIONS_BY_ID[id].imports.find((imp) => imp.route === r.id);

// Estaciones construidas que abastece la ruta.
export function routeStations(state, routeId) {
  return ROUTES_BY_ID[routeId].stations.filter((id) => state.stations[id]);
}

// La ruta funciona cuando existe alguna estación que abastece (y la zona de origen está abierta).
export function routeActive(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  return routeStations(state, routeId).length > 0 && Boolean(state.zones[r.from]?.unlocked);
}

// Unidades por segundo del producto que gasta una estación a toda marcha (a `level`, o a su nivel).
export function stationImportRate(state, r, id, level = state.stations[id].level) {
  return stationRate(STATIONS_BY_ID[id], level) * speedMult(state, id) * routeImport(r, id).perCycle;
}

// Unidades por viaje: a igual nivel que las estaciones que abastece, un 25 % más de lo que estas
// consumen en un viaje de ida y vuelta (contando sus investigaciones, como la carga de las mulas).
export function routeCapacity(state, routeId, level = state.routes[routeId].level) {
  const r = ROUTES_BY_ID[routeId];
  const perSecond = routeStations(state, routeId).reduce((n, id) => n + stationImportRate(state, r, id, level), 0);
  return perSecond * r.tripTime * TRANSPORT_MARGIN;
}

// Unidades por segundo que puede mover la ruta.
export function routeRate(state, routeId, level) {
  return routeCapacity(state, routeId, level) / ROUTES_BY_ID[routeId].tripTime;
}

// Cuánto le cabe todavía a una estación de destino.
function stationSpace(state, r, id) {
  const def = STATIONS_BY_ID[id];
  const imp = routeImport(r, id);
  const cap = stationImportCap(def, state.stations[id].level, speedMult(state, id), imp);
  return Math.max(0, cap - (state.stations[id].imported[r.product] ?? 0));
}

// Cuánto les cabe todavía a las estaciones de destino, contando lo que ya va en camino.
export function routeDemand(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  const route = state.routes[routeId];
  const space = routeStations(state, routeId).reduce((n, id) => n + stationSpace(state, r, id), 0);
  return space - (route.phase === 'go' ? route.load : 0);
}

// Lo que el Willys de una zona debe dejar en la bodega para las rutas que salen de ella: una carga,
// también mientras la Chiva va de viaje (si no, al volver solo encontraba lo de los últimos segundos).
export function routeReserve(state, zoneId) {
  const reserve = {};
  for (const r of ROUTES) {
    if (r.from !== zoneId || !routeActive(state, r.id)) continue;
    // Carga y media, aunque ahora pidan menos: lo que se junta mientras la Chiva va y viene.
    reserve[r.product] = (reserve[r.product] ?? 0) + ROUTE_STOCK * routeCapacity(state, r.id);
  }
  return reserve;
}

// Reparte la carga entre las estaciones de destino según el sitio que le queda a cada una.
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
