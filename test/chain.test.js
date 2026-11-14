import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { PARENT, ROAD_POS, chainOf } from '../src/sim/chain.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Always daytime and no season: tests the chain, not the clock.
CALENDAR.on = false;

const CHAIN = chainOf('finca');

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('in every zone, each station comes after its supplier along the road', () => {
  for (const zone of ZONE_LIST) {
    const pos = ROAD_POS[zone.id];
    for (const id of zone.chain) {
      if (PARENT[id]) assert.ok(pos[id] > pos[PARENT[id]], `${id} before ${PARENT[id]}`);
      assert.ok(pos.warehouse > pos[id], `warehouse of ${zone.id} before ${id}`);
    }
    // Build order respects who feeds whom.
    for (const id of zone.chain) if (PARENT[id]) assert.ok(zone.chain.indexOf(PARENT[id]) < zone.chain.indexOf(id), id);
  }
});

test('stations are built only in order and with coins', () => {
  const game = new Game();
  game.state.coins = 1e6;
  assert.equal(game.quoteUnlock('dryer').reason, 'order');
  assert.equal(game.unlock('dryer'), false);
  assert.ok(game.unlock('wetmill'));
  assert.equal(game.state.coins, 1e6 - 50);
  assert.ok(game.unlock('dryer'));
  game.state.coins = 0;
  assert.equal(game.quoteUnlock('huller').reason, 'coins');
});

test('the beneficiadero turns cherries into washed coffee and it is sold', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  run(game, 120);
  assert.ok((game.state.stats.produced.washed ?? 0) > 0, 'it made washed coffee');
  assert.ok((game.state.stats.sold.washed ?? 0) > 0, 'it sold washed coffee');
});

test('if the next station cannot keep up, the surplus is diverted to the warehouse', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.state.stations.farm.level = 40; // far more cherries than a level 1 beneficiadero can process
  game.state.stations.farm.transport.level = 40;
  game.state.zones.finca.dispatch.level = 40;
  run(game, 90);
  assert.equal(game.state.stations.wetmill.status, 'working');
  assert.ok((game.state.stats.sold.cherry ?? 0) > 0, 'diverted cherries were sold');
  assert.ok(game.state.stations.farm.lastDiverted > 0);
  assert.equal(analyzeChain(game.state).bottleneck, 'wetmill');
});

test('a station without input waits', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.step(0.1);
  assert.equal(game.state.stations.wetmill.status, 'starved');
});

test('the full chain makes coffee bags', () => {
  const game = new Game();
  game.state.coins = 1e9;
  for (const id of CHAIN.slice(1)) assert.ok(game.unlock(id), id);
  for (const id of CHAIN) game.state.stations[id].level = 30;
  game.state.zones.finca.dispatch.level = 30;
  run(game, 300);
  assert.ok((game.state.stats.sold.coffee_bag ?? 0) > 0, 'it sold bags');
});

test('diverted goods never fill the warehouse: there is always room for the final product', async () => {
  const { warehouseCapacity } = await import('../src/sim/rules.js');
  const { DIVERT_RESERVE } = await import('../src/sim/transport.js');
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.state.stations.farm.level = 60; // tons of bypassed cherries
  game.state.stations.farm.transport.level = 60;
  game.state.stations.wetmill.transport.level = 30;
  run(game, 120);
  const cap = warehouseCapacity(game.state.zones.finca.dispatch.level);
  const cherries = game.state.zones.finca.warehouse.cherry ?? 0;
  assert.ok(cherries <= cap * (1 - DIVERT_RESERVE) + 1, `cherries in the warehouse: ${cherries} of ${cap}`);
  assert.ok((game.state.stats.sold.washed ?? 0) > 0, 'washed coffee keeps arriving and selling');
});

test('what is already at level 100 is not flagged as a bottleneck', async () => {
  const { recommendUpgrade } = await import('../src/sim/analysis.js');
  const game = new Game();
  game.state.coins = 1e15;
  for (const id of CHAIN.slice(1)) game.unlock(id);
  for (const st of Object.values(game.state.stations)) {
    st.level = 100;
    st.transport.level = 100;
  }
  game.state.zones.finca.dispatch.level = 100;
  // Everything maxed and balanced: the bottleneck would be Cafetal, which cannot be upgraded further.
  assert.equal(analyzeChain(game.state).bottleneck, null);
  game.state.coins = 0; // with no money for research
  assert.equal(recommendUpgrade(game.state, (id, mode) => game.quote(id, mode)), null);
});
