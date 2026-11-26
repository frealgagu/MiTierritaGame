import { test } from 'node:test';
import { PLAZA_STATIONS } from '../src/data/plaza.js';
import assert from 'node:assert/strict';
import { bulkUpgrade, dispatchCapacity, milestoneMultiplier, nextMilestone, stationRate, upgradeCost } from '../src/sim/rules.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { PRODUCTS } from '../src/data/products.js';
import { STATIONS } from '../src/data/stations.js';

test('milestones: level 10 ×2, 25 ×2, 50 ×4, 75 ×4 and 100 ×8', () => {
  assert.equal(milestoneMultiplier(9), 1);
  assert.equal(milestoneMultiplier(10), 2);
  assert.equal(milestoneMultiplier(25), 4);
  assert.equal(milestoneMultiplier(50), 16);
  assert.equal(milestoneMultiplier(75), 64);
  assert.equal(milestoneMultiplier(100), 512);
  assert.equal(nextMilestone(10), 25);
  assert.equal(nextMilestone(100), null);
});

test('the coffee field produces 1 cherry every 2 s at level 1', () => {
  assert.equal(stationRate(STATIONS_BY_ID.farm, 1), 0.5);
  assert.ok(stationRate(STATIONS_BY_ID.farm, 10) > 2 * stationRate(STATIONS_BY_ID.farm, 9));
});

test('costs grow 15 % per level', () => {
  assert.equal(upgradeCost(5, 1.15, 1), 5);
  assert.equal(upgradeCost(5, 1.15, 2), Math.ceil(5 * 1.15));
});

test('buy max is limited to the coins', () => {
  const q = bulkUpgrade(5, 1.15, 1, Infinity, 20);
  assert.ok(q.cost <= 20);
  assert.ok(q.levels >= 3);
  const ten = bulkUpgrade(5, 1.15, 95, 10);
  assert.equal(ten.levels, 5); // tope en nivel 100
});

test('the Willys carries 10 at level 1', () => {
  assert.equal(dispatchCapacity(1), 10);
  assert.equal(dispatchCapacity(10), (10 + 45) * 2);
});

test('full catalog: 381 products and 368 stations with valid recipes, plus La plaza de las fiestas\' 43 and 43 (v5.19, v5.21)', () => {
  assert.equal(Object.keys(PRODUCTS).length, 381 + 43);
  assert.equal(STATIONS.length, 368);
  assert.equal(PLAZA_STATIONS.length, 43);
  for (const s of [...STATIONS, ...PLAZA_STATIONS]) {
    for (const id of Object.keys({ ...s.in, ...s.out, ...s.by, ...s.boost })) {
      assert.ok(PRODUCTS[id], `${s.id} uses an unknown product: ${id}`);
    }
  }
});

test('at level 100 every station produces a power of 2 per second', async () => {
  const { STATIONS } = await import('../src/data/stations.js');
  const { ZONE_LIST } = await import('../src/data/zones/index.js');
  const { stationOutputRate, MAX_LEVEL } = await import('../src/sim/rules.js');
  assert.equal(MAX_LEVEL, 100);
  const playable = new Set(ZONE_LIST.flatMap((z) => [...z.chain, ...z.plots.map((p) => p.stationId)]));
  for (const def of STATIONS.filter((s) => playable.has(s.id))) {
    // Since v3.67, zones supplying two routes at once output ×1.5 at the end of their chain (the first
    // of each region) or ×1.25 (the second), so with everything maxed there is enough for all.
    const rate = stationOutputRate(def, 100);
    const ok = [1, 1.5, 1.25].some((k) => Math.abs(Math.log2(rate / k) - Math.round(Math.log2(rate / k))) < 1e-9);
    assert.ok(ok, `${def.id}: ${rate}/s at level 100`);
  }
});

test('conveyor belts come at a transport milestone', async () => {
  const { BELT_LEVEL, MILESTONES, hasBelt } = await import('../src/sim/rules.js');
  assert.ok(MILESTONES.includes(BELT_LEVEL));
  assert.equal(hasBelt(BELT_LEVEL - 1), false);
  assert.equal(hasBelt(BELT_LEVEL), true);
});

test('every research, event purchase, objective, station, product and route has a unique id', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const { GOALS } = await import('../src/data/goals.js');
  const { ROUTES } = await import('../src/data/routes.js');
  const { EVENTS } = await import('../src/data/events.js');
  const lists = {
    'investigaciones y compras de evento': [...RESEARCH.map((r) => r.id), ...EVENTS.flatMap((e) => e.actions.map((a) => a.id))],
    objetivos: GOALS.map((g) => g.id),
    estaciones: STATIONS.map((s) => s.id),
    rutas: ROUTES.map((r) => r.id),
  };
  for (const [name, ids] of Object.entries(lists)) {
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(repeated, [], `${name} repeated`);
  }
});

test(`the icon font covers all the game's own icons (v3.53)`, async () => {
  const { readFileSync } = await import('node:fs');
  const { ICON } = await import('../src/data/icons.js');
  const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf("font-family: 'MiTierrita Icons'"));
  const [, lo, hi] = block.match(/unicode-range: U\+([0-9A-F]+)-([0-9A-F]+)[,;]/);
  for (const [name, ch] of Object.entries(ICON)) {
    const cp = ch.codePointAt(0);
    assert.ok(cp >= parseInt(lo, 16) && cp <= parseInt(hi, 16), `${name}: U+${cp.toString(16)}`);
  }
});
