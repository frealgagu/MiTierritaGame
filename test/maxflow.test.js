import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/sim/state.js';
import { createStationState } from '../src/sim/production.js';
import { REGIONS } from '../src/data/regions.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { RESEARCH } from '../src/data/research.js';
import { analyzeChain } from '../src/sim/analysis.js';

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

// Sin fugas (v3.67 en seis regiones; v4.0 en todas, con los subproductos y lo que se junta): con todo al
// máximo, todo lo que hacen las zonas que no son la última de su región se lo llevan sus rutas, y el Willys
// de esas zonas no vende nada. Tampoco se desecha ningún subproducto.
for (const region of REGIONS.filter((r) => !r.wip)) {
  test(`${region.name}: con todo al máximo, solo la última zona vende y nada se desecha`, () => {
    const s = maxedRegion(region.id);
    for (const z of region.zones) {
      const a = analyzeChain(s, z);
      if (z !== region.zones.at(-1)) assert.ok(a.income < 1e-6, `${z} vende ${a.income} 💰/s`);
      else assert.ok(a.income > 0, `${z} no vende`);
      for (const row of a.rows) {
        assert.ok(!(row.byLost > 1e-6), `${row.id} desecha ${row.byLost}/s de subproducto`);
        assert.ok(!row.joinLimited, `${row.id} espera ${row.joinLimited}`);
        assert.ok(!row.importLimited, `${row.id} espera la ruta ${row.importLimited}`);
        assert.ok(row.lost < 1e-6, `${row.id} pierde ${row.lost}/s`);
      }
    }
  });
}
