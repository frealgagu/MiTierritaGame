import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Cada producto de una zona con su color (v4.0.2): colores bien distintos entre sí (no el del producto, que
// casi siempre es café o crema), en el orden de la cadena, para que dos seguidos nunca se parezcan. Fuera
// quedan el azul (lo importado), el rojo (lo que frena) y el gris (lo que falta construir).
// Desde la v4.3.1 lo usan los tubos de la cadena y las bandas del mapa, para que se correspondan.
export const PIPE_COLORS = ['#2f9e44', '#e8590c', '#7b3fb5', '#c99a06', '#0c8599', '#d6338a', '#8b5a2b', '#495057', '#82c91e'];

const cache = {};
export function productColors(zoneId) {
  if (cache[zoneId]) return cache[zoneId];
  const zone = ZONES_BY_ID[zoneId];
  const ids = [...new Set([...zone.chain, ...zone.plots.map((p) => p.stationId)])];
  const colorOf = {};
  for (const id of ids) {
    const def = STATIONS_BY_ID[id];
    for (const product of [...Object.keys(def.out ?? {}), ...Object.keys(def.by ?? {})]) {
      colorOf[product] ??= PIPE_COLORS[Object.keys(colorOf).length % PIPE_COLORS.length];
    }
  }
  return (cache[zoneId] = colorOf);
}
