import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bulkUpgrade, dispatchCapacity, milestoneMultiplier, nextMilestone, stationRate, upgradeCost } from '../src/sim/rules.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { PRODUCTS } from '../src/data/products.js';
import { STATIONS } from '../src/data/stations.js';

test('hitos: nivel 10 ×2, 25 ×2, 50 ×4, 75 ×4 y 100 ×8', () => {
  assert.equal(milestoneMultiplier(9), 1);
  assert.equal(milestoneMultiplier(10), 2);
  assert.equal(milestoneMultiplier(25), 4);
  assert.equal(milestoneMultiplier(50), 16);
  assert.equal(milestoneMultiplier(75), 64);
  assert.equal(milestoneMultiplier(100), 512);
  assert.equal(nextMilestone(10), 25);
  assert.equal(nextMilestone(100), null);
});

test('el cafetal produce 1 cereza cada 2 s a nivel 1', () => {
  assert.equal(stationRate(STATIONS_BY_ID.farm, 1), 0.5);
  assert.ok(stationRate(STATIONS_BY_ID.farm, 10) > 2 * stationRate(STATIONS_BY_ID.farm, 9));
});

test('costes crecen 15 % por nivel', () => {
  assert.equal(upgradeCost(5, 1.15, 1), 5);
  assert.equal(upgradeCost(5, 1.15, 2), Math.ceil(5 * 1.15));
});

test('compra máx se limita a las monedas', () => {
  const q = bulkUpgrade(5, 1.15, 1, Infinity, 20);
  assert.ok(q.cost <= 20);
  assert.ok(q.levels >= 3);
  const ten = bulkUpgrade(5, 1.15, 95, 10);
  assert.equal(ten.levels, 5); // tope en nivel 100
});

test('el Willys lleva 10 a nivel 1', () => {
  assert.equal(dispatchCapacity(1), 10);
  assert.equal(dispatchCapacity(10), (10 + 45) * 2);
});

test('catálogo completo: 195 productos y 193 estaciones con recetas válidas', () => {
  assert.equal(Object.keys(PRODUCTS).length, 195);
  assert.equal(STATIONS.length, 193);
  for (const s of STATIONS) {
    for (const id of Object.keys({ ...s.in, ...s.out, ...s.by, ...s.boost })) {
      assert.ok(PRODUCTS[id], `${s.id} usa un producto desconocido: ${id}`);
    }
  }
});

test('al nivel 100 cada estación produce una potencia de 2 por segundo', async () => {
  const { STATIONS } = await import('../src/data/stations.js');
  const { ZONE_LIST } = await import('../src/data/zones/index.js');
  const { stationOutputRate, MAX_LEVEL } = await import('../src/sim/rules.js');
  assert.equal(MAX_LEVEL, 100);
  const playable = new Set(ZONE_LIST.flatMap((z) => [...z.chain, ...z.plots.map((p) => p.stationId)]));
  for (const def of STATIONS.filter((s) => playable.has(s.id))) {
    const rate = stationOutputRate(def, 100);
    const exp = Math.log2(rate);
    assert.ok(Math.abs(exp - Math.round(exp)) < 1e-9, `${def.id}: ${rate}/s al nivel 100`);
  }
});

test('las bandas eléctricas llegan en un hito de transporte', async () => {
  const { BELT_LEVEL, MILESTONES, hasBelt } = await import('../src/sim/rules.js');
  assert.ok(MILESTONES.includes(BELT_LEVEL));
  assert.equal(hasBelt(BELT_LEVEL - 1), false);
  assert.equal(hasBelt(BELT_LEVEL), true);
});

test('cada investigación, compra de evento, objetivo, estación, producto y ruta tiene un id único', async () => {
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
    assert.deepEqual(repeated, [], `${name} repetidas`);
  }
});
