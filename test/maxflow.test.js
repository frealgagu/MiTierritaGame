import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../src/data/regions.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { maxedRegion } from './helpers/maxed.js';

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
