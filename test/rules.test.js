import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bulkUpgrade, dispatchCapacity, milestoneMultiplier, nextMilestone, stationRate, upgradeCost } from '../src/sim/rules.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { PRODUCTS } from '../src/data/products.js';
import { STATIONS } from '../src/data/stations.js';

test('hitos duplican la velocidad', () => {
  assert.equal(milestoneMultiplier(9), 1);
  assert.equal(milestoneMultiplier(10), 2);
  assert.equal(milestoneMultiplier(25), 4);
  assert.equal(milestoneMultiplier(100), 32);
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

test('catálogo completo: 41 productos y 39 estaciones con recetas válidas', () => {
  assert.equal(Object.keys(PRODUCTS).length, 41);
  assert.equal(STATIONS.length, 39);
  for (const s of STATIONS) {
    for (const id of Object.keys({ ...s.in, ...s.out, ...s.by, ...s.boost })) {
      assert.ok(PRODUCTS[id], `${s.id} usa un producto desconocido: ${id}`);
    }
  }
});
