// Cadenas de cada zona: orden de las estaciones y su posición sobre el camino de las mulas.
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { pathLength, projectOnPath } from '../core/path.js';

export const zoneOf = (stationId) => STATIONS_BY_ID[stationId].zone;
export const chainOf = (zoneId) => ZONES_BY_ID[zoneId].chain;
export const sourceOf = (zoneId) => ZONES_BY_ID[zoneId].farm.stationId;

// ROAD_POS[zona][estación | 'warehouse']: distancia (en casillas) desde el inicio del camino
// hasta la puerta de cada estación de la cadena principal.
export const ROAD_POS = Object.fromEntries(
  ZONE_LIST.map((zone) => {
    const pos = { warehouse: pathLength(zone.muleRoad) };
    for (const id of zone.chain) {
      if (id === zone.farm.stationId) pos[id] = 0;
      else {
        const plot = zone.plots.find((p) => p.stationId === id);
        pos[id] = projectOnPath(zone.muleRoad, plot.x + 1.5, plot.y + 1.5);
      }
    }
    return [zone.id, pos];
  }),
);

export function isUnlocked(state, id) {
  return Boolean(state.stations[id]);
}

export function zoneUnlocked(state, zoneId) {
  return Boolean(state.zones[zoneId]?.unlocked);
}

// Siguiente estación construida de la cadena (o null: el producto va a la bodega de su zona).
export function nextStation(state, id) {
  const chain = chainOf(zoneOf(id));
  const next = chain[chain.indexOf(id) + 1];
  return next && isUnlocked(state, next) ? next : null;
}

// Primera estación de la cadena de una zona aún sin construir.
export function nextToUnlock(state, zoneId = 'finca') {
  if (!zoneUnlocked(state, zoneId)) return null;
  return chainOf(zoneId).find((id) => !isUnlocked(state, id)) ?? null;
}

// Estaciones construidas de una zona (cadena principal y ramas).
export function builtStations(state, zoneId) {
  return Object.keys(state.stations).filter((id) => zoneOf(id) === zoneId);
}
