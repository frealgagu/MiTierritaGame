import { createInitialState } from '../../src/sim/state.js';
import { createStationState } from '../../src/sim/production.js';
import { REGIONS } from '../../src/data/regions.js';
import { ZONES_BY_ID } from '../../src/data/zones/index.js';
import { RESEARCH } from '../../src/data/research.js';

// Una región con todo al máximo: sus zonas, estaciones, arrieros, despachos y rutas en el nivel 100 y todas
// sus investigaciones.
export function maxedRegion(regionId) {
  const region = REGIONS.find((r) => r.id === regionId);
  const s = createInitialState(0, regionId);
  for (const z of region.zones) {
    s.zones[z].unlocked = true;
    s.zones[z].dispatch.level = 100;
    const zone = ZONES_BY_ID[z];
    for (const id of [...zone.chain, ...zone.plots.map((p) => p.stationId)]) s.stations[id] = { ...createStationState(), level: 100, transport: { level: 100 } };
  }
  for (const r of Object.values(s.routes)) r.level = 100;
  for (const r of RESEARCH) if (region.zones.includes(r.zone)) s.research.push(r.id);
  return s;
}

