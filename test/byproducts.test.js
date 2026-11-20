import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { PRODUCTS } from '../src/data/products.js';
import { STATIONS } from '../src/data/stations.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { BY_SALE_FILL, warehouseCap } from '../src/sim/transport.js';
import { sumValues } from '../src/sim/state.js';
import { CALENDAR } from '../src/sim/calendar.js';
import { newGame, cafeOf } from './helpers/game.js';

// Every byproduct is sold when nobody uses it (v5.15): before, one without a route was thrown away.
const run = (game, seconds) => {
  const on = CALENDAR.on;
  CALENDAR.on = false; // always daytime
  try {
    for (let t = 0; t < seconds; t += 0.5) game.step(0.5);
  } finally {
    CALENDAR.on = on;
  }
};
function cafe(stations, zones = []) {
  const game = new Game(cafeOf(newGame()));
  const s = game.state;
  s.coins = 1e12;
  for (const z of zones) game.unlockZone(z);
  for (const id of stations) assert.ok(game.unlock(id), `builds ${id}`);
  for (const st of Object.values(s.stations)) st.level = st.transport.level = 20;
  for (const z of Object.values(s.zones)) z.dispatch.level = 30;
  return { game, s };
}

test('every product has a price, and pulp, bagazo and compost sell for less than the main product (v5.15)', () => {
  for (const [id, p] of Object.entries(PRODUCTS)) assert.ok(p.value > 0, `${id} has no price`);
  for (const st of STATIONS.filter((x) => ['wetmill', 'cane_mill'].includes(x.id))) {
    assert.ok(PRODUCTS[Object.keys(st.by)[0]].value < PRODUCTS[Object.keys(st.out)[0]].value, `${st.id}: the byproduct is cheaper`);
  }
  assert.ok(PRODUCTS.compost.value < PRODUCTS.parchment.value);
});

test('with no Compostera the Beneficiadero sells its pulp; with it, the Compostera is fed first and the rest is sold', () => {
  const { game, s } = cafe(['wetmill', 'dryer']);
  run(game, 300);
  assert.ok(s.stats.sold.pulp > 10, 'pulp is sold');
  assert.ok(analyzeChain(s, 'finca').sold.some((l) => l.product === 'pulp' && l.units > 0), 'and the analysis counts that income');
  const soldAlone = s.stats.sold.pulp;
  const madeAlone = s.stats.produced.pulp;
  assert.ok(game.unlock('composter'));
  s.stations.composter.level = 20;
  run(game, 600);
  assert.ok(s.stats.produced.compost > 0, 'the Compostera gets its pulp');
  const sold = s.stats.sold.pulp - soldAlone;
  const made = s.stats.produced.pulp - madeAlone;
  assert.ok(sold > 0 && sold < made * 0.9, `only what is left over is sold (${sold} of ${made})`);
});

test('the Compostera keeps its yard for the Finca and sells the compost that no longer fits', () => {
  const { game, s } = cafe(['wetmill', 'dryer', 'composter']);
  s.stations.composter.level = 60; // far more compost than the coffee spends
  run(game, 1800);
  assert.ok(s.stations.composter.buffer > 0, 'the bonus is still on');
  assert.notEqual(s.stations.composter.status, 'blocked');
  assert.ok(s.stats.sold.compost > 0, 'the spare compost is sold');
});

test('the Hornilla takes its bagazo before any is sold', () => {
  const { game, s } = cafe(['cane_mill'], ['trapiche']);
  run(game, 300);
  assert.ok(s.stats.sold.bagasse > 10, 'with no Hornilla, the bagazo is sold');
  assert.ok(game.unlock('furnace'));
  s.stations.furnace.level = s.stations.furnace.transport.level = 20;
  const before = s.stats.sold.bagasse;
  run(game, 300);
  assert.ok(s.stations.furnace.fuel > 0, 'the Hornilla has fuel');
  assert.ok(s.stats.sold.bagasse > before, 'and what it does not burn is sold');
});

test('leftover byproducts never take more than their share of the warehouse', () => {
  const { game, s } = cafe(['wetmill', 'dryer']);
  s.zones.finca.dispatch.level = 1; // the Willys cannot keep up
  s.stations.wetmill.level = 80;
  s.stations.farm.level = s.stations.farm.transport.level = 80;
  run(game, 600);
  const wh = s.zones.finca.warehouse;
  assert.ok((wh.pulp ?? 0) <= BY_SALE_FILL * warehouseCap(s, 'finca') + 1e-6, `pulp holds ${wh.pulp} of ${warehouseCap(s, 'finca')}`);
  assert.ok(sumValues(wh) - (wh.pulp ?? 0) > 0, 'the main products still get in');
});
