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

// Quién alimenta a quién: el proveedor de una estación es la de su zona cuyo producto principal
// está en su receta. La cadena puede ramificarse (la leche pasteurizada va a tres estaciones).
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

export function isUnlocked(state, id) {
  return Boolean(state.stations[id]);
}

export function zoneUnlocked(state, zoneId) {
  return Boolean(state.zones[zoneId]?.unlocked);
}

// Estaciones construidas que reciben el producto de esta (vacío: va a la bodega de su zona).
export function consumers(state, id) {
  return (CHILDREN[id] ?? []).filter((c) => isUnlocked(state, c));
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
