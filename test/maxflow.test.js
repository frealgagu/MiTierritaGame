import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../src/data/regions.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { maxedRegion } from './helpers/maxed.js';

// Zero leaks (v3.67 in six regions; v4.0 in all, with byproducts and multi-input stations): with everything
// maxed, everything made by non-final zones of a region is taken by their routes, and those zones' Willys
// sell nothing. Nor is any byproduct discarded.
for (const region of REGIONS.filter((r) => !r.wip)) {
  test(`${region.name}: with everything at the maximum, only the last zone sells and nothing is wasted`, () => {
    const s = maxedRegion(region.id);
    for (const z of region.zones) {
      const a = analyzeChain(s, z);
      if (z !== region.zones.at(-1)) assert.ok(a.income < 1e-6, `${z} sells ${a.income} 💰/s`);
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
