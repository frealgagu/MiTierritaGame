import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { muleCount } from '../src/sim/rules.js';
import { busyMules } from '../src/sim/transport.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Chain tests: always daytime and no season (calendar is tested in calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('a station never uses more mules than it has', () => {
  const game = new Game();
  game.state.stations.farm.level = 30;
  for (let t = 0; t < 60; t += 0.1) {
    game.step(0.1);
    assert.ok(busyMules(game.state, 'farm') <= muleCount(1));
  }
});

test('the mules come back empty and are freed', () => {
  const game = new Game();
  const arrived = [];
  game.bus.on('muleArrived', (m) => arrived.push(m.id));
  run(game, 40);
  assert.ok(arrived.length >= 1);
  assert.ok(game.state.mules.every((m) => m.phase === 'go' || m.amount === 0));
});

test('at the same level, mule drivers carry everything their station makes (in the analysis)', () => {
  const cases = [
    () => {}, // only the cafetal: long trip to the warehouse
    (g) => ['wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer'].forEach((id) => g.unlock(id)),
    (g) => {
      ['wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer', 'composter'].forEach((id) => g.unlock(id));
      g.state.research.push('abono', 'despulpadora', 'secador');
    },
  ];
  for (const setup of cases) {
    for (const level of [1, 9, 10, 37, 80]) {
      const game = new Game();
      game.state.coins = 1e12;
      setup(game);
      for (const st of Object.values(game.state.stations)) {
        st.level = level;
        st.transport.level = level;
      }
      for (const row of analyzeChain(game.state).rows) {
        assert.ok(row.transport >= row.output * 1.2, `${row.id} lv ${level}: they carry ${row.transport} of ${row.output}`);
      }
    }
  }
});

test(`at the same level, the coffee field's yard does not fill for lack of mules (real simulation)`, () => {
  for (const research of [[], ['abono', 'despulpadora']]) {
    const game = new Game();
    game.state.research.push(...research);
    game.state.stations.farm.level = 30;
    game.state.stations.farm.transport.level = 30;
    game.state.zones.finca.dispatch.level = 80;
    run(game, 300);
    assert.notEqual(game.state.stations.farm.status, 'blocked', `with ${research.join(', ') || 'nothing'}`);
    const produced = game.state.stats.produced.cherry ?? 0;
    const sold = game.state.stats.sold.cherry ?? 0;
    assert.ok(sold > produced * 0.85, `sold ${sold} of ${produced} produced`);
  }
});

test(`mule drivers below the station's level are the bottleneck`, () => {
  const game = new Game();
  game.state.stations.farm.level = 30;
  game.state.stations.farm.transport.level = 15;
  game.state.zones.finca.dispatch.level = 80;
  assert.equal(analyzeChain(game.state).bottleneck, 'farm:transport');
});

test('upgrading the lagging mule drivers increases what is sold', () => {
  const slow = new Game();
  const fast = new Game();
  for (const g of [slow, fast]) {
    g.state.stations.farm.level = 20;
    g.state.zones.finca.dispatch.level = 40;
  }
  slow.state.stations.farm.transport.level = 5;
  fast.state.stations.farm.transport.level = 20;
  run(slow, 300);
  run(fast, 300);
  assert.ok(fast.state.coins > slow.state.coins * 1.5, `${fast.state.coins} vs ${slow.state.coins}`);
});

test('if the mule drivers cannot keep up, the yard fills for lack of mules', () => {
  const game = new Game();
  game.state.stations.farm.level = 50;
  game.state.zones.finca.dispatch.level = 50;
  run(game, 60);
  assert.equal(game.state.stations.farm.status, 'blocked');
  assert.equal(game.state.stations.farm.waiting, 'mules');
});

test(`if the Beneficiadero is behind, the Cafetal's full yard is its fault, not the mules'`, async () => {
  const { slowConsumers } = await import('../src/sim/transport.js');
  const game = new Game();
  const s = game.state;
  s.coins = 1e9;
  game.unlock('wetmill');
  s.stations.farm.level = 25;
  s.stations.farm.transport.level = 25;
  s.stations.wetmill.level = 10;
  for (let i = 0; i < 3000; i++) game.step(0.1);
  assert.equal(s.stations.farm.status, 'blocked');
  assert.deepEqual(slowConsumers(s, 'farm'), ['wetmill']);
  // With Beneficiadero matching Cafetal, nobody downstream is at fault anymore.
  s.stations.wetmill.level = 25;
  assert.deepEqual(slowConsumers(s, 'farm'), []);
});
