import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Distinct color per zone product (v4.0.2): high-contrast hues along chain order (not literal
// product color which is usually brown or cream), keeping neighbors distinct. Excludes blue
// (imports), red (bottleneck), and gray (unbuilt).
// Since v4.3.1 shared by chain pipes and map terrain bands so both match.
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
