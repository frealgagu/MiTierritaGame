import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../src/data/regions.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { maxedRegion } from './helpers/maxed.js';
import { STATIONS } from '../src/data/stations.js';

const BYPRODUCTS = new Set(STATIONS.flatMap((s) => Object.keys(s.by ?? {})));

// Zero leaks (v3.67 in six regions; v4.0 in all, with byproducts and multi-input stations): with everything
// maxed, everything made by non-final zones of a region is taken by their routes, and those zones' Willys
// sell nothing but (v5.15) the byproducts their own stations leave unused. Nor is any byproduct discarded.
for (const region of REGIONS.filter((r) => !r.wip)) {
  test(`${region.name}: with everything at the maximum, only the last zone sells and nothing is wasted`, () => {
    const s = maxedRegion(region.id);
    for (const z of region.zones) {
      const a = analyzeChain(s, z);
      const main = a.sold.filter((l) => !BYPRODUCTS.has(l.product) && l.units > 1e-6);
      if (z !== region.zones.at(-1)) assert.deepEqual(main.map((l) => l.product), [], `${z} sells ${a.income} 💰/s`);
      else assert.ok(a.income > 0, `${z} does not sell`);
      for (const row of a.rows) {
        assert.ok(!(row.byLost > 1e-6), `${row.id} wastes ${row.byLost}/s of by-product`);
        assert.ok(!row.joinLimited, `${row.id} waits for ${row.joinLimited}`);
        assert.ok(!row.importLimited, `${row.id} waits for the ${row.importLimited} route`);
        assert.ok(row.lost < 1e-6, `${row.id} loses ${row.lost}/s`);
      }
    }
  });
}
