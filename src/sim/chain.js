// La cadena de la zona: orden de las estaciones y su posición sobre el camino de las mulas.
import { ZONE1 } from '../data/zones/zone1_finca.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { pathLength, projectOnPath } from '../core/path.js';

export const CHAIN = ZONE1.chain;
export const ROAD_LENGTH = pathLength(ZONE1.muleRoad);

// Distancia (en casillas) desde el inicio del camino hasta la puerta de cada estación.
export const ROAD_POS = Object.fromEntries(
  CHAIN.map((id) => {
    if (id === ZONE1.farm.stationId) return [id, 0];
    const plot = ZONE1.plots.find((p) => p.stationId === id);
    return [id, projectOnPath(ZONE1.muleRoad, plot.x + 1.5, plot.y + 1.5)];
  }),
);
ROAD_POS.warehouse = ROAD_LENGTH;

export function isUnlocked(state, id) {
  return Boolean(state.stations[id]);
}

// Siguiente estación construida de la cadena (o null: el producto va a la bodega).
export function nextStation(state, id) {
  const next = CHAIN[CHAIN.indexOf(id) + 1];
  return next && isUnlocked(state, next) ? next : null;
}

// Primera estación de la cadena aún sin construir.
export function nextToUnlock(state) {
  return CHAIN.find((id) => !isUnlocked(state, id)) ?? null;
}

export function outputProduct(id) {
  return Object.keys(STATIONS_BY_ID[id].out)[0];
}

export function inputProduct(id) {
  const def = STATIONS_BY_ID[id];
  return def.in ? Object.keys(def.in)[0] : null;
}
