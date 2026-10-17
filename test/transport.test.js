import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { muleCount } from '../src/sim/rules.js';
import { busyMules } from '../src/sim/transport.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('una estación nunca usa más mulas de las que tiene', () => {
  const game = new Game();
  game.state.stations.farm.level = 30;
  for (let t = 0; t < 60; t += 0.1) {
    game.step(0.1);
    assert.ok(busyMules(game.state, 'farm') <= muleCount(1));
  }
});

test('las mulas vuelven vacías y quedan libres', () => {
  const game = new Game();
  const arrived = [];
  game.bus.on('muleArrived', (m) => arrived.push(m.id));
  run(game, 40);
  assert.ok(arrived.length >= 1);
  assert.ok(game.state.mules.every((m) => m.phase === 'go' || m.amount === 0));
});

test('a igual nivel, los arrieros llevan todo lo que produce su estación (en el análisis)', () => {
  const cases = [
    () => {}, // solo el cafetal: viaje largo hasta la bodega
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
        assert.ok(row.transport >= row.output * 1.2, `${row.id} nv ${level}: llevan ${row.transport} de ${row.output}`);
      }
    }
  }
});

test('a igual nivel, el patio del cafetal no se llena por falta de mulas (simulación real)', () => {
  for (const research of [[], ['abono', 'despulpadora']]) {
    const game = new Game();
    game.state.research.push(...research);
    game.state.stations.farm.level = 30;
    game.state.stations.farm.transport.level = 30;
    game.state.zones.finca.dispatch.level = 80;
    run(game, 300);
    assert.notEqual(game.state.stations.farm.status, 'blocked', `con ${research.join(', ') || 'nada'}`);
    const produced = game.state.stats.produced.cherry ?? 0;
    const sold = game.state.stats.sold.cherry ?? 0;
    assert.ok(sold > produced * 0.85, `vendidas ${sold} de ${produced} producidas`);
  }
});

test('arrieros por debajo del nivel de la estación son el cuello de botella', () => {
  const game = new Game();
  game.state.stations.farm.level = 30;
  game.state.stations.farm.transport.level = 15;
  game.state.zones.finca.dispatch.level = 80;
  assert.equal(analyzeChain(game.state).bottleneck, 'farm:transport');
});

test('mejorar a los arrieros rezagados aumenta lo que se vende', () => {
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

test('si los arrieros no dan abasto, el patio se llena por falta de mulas', () => {
  const game = new Game();
  game.state.stations.farm.level = 50;
  game.state.zones.finca.dispatch.level = 50;
  run(game, 60);
  assert.equal(game.state.stations.farm.status, 'blocked');
  assert.equal(game.state.stations.farm.waiting, 'mules');
});
