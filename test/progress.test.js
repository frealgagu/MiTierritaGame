import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { GOALS } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { activeGoals, goalProgress, goalText } from '../src/sim/goals.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { offlineCapSeconds } from '../src/sim/modifiers.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('una investigación pide su estación y se compra una sola vez', () => {
  const game = new Game();
  game.state.coins = 1e6;
  assert.equal(game.quoteResearch('abono').reason, 'locked');
  game.unlock('wetmill');
  assert.ok(game.research('abono'));
  assert.equal(game.quoteResearch('abono').reason, 'owned');
  assert.equal(game.research('abono'), false);
});

test('el abono duplica el cafetal en la simulación y en el análisis', () => {
  const plain = new Game();
  const boosted = new Game();
  for (const g of [plain, boosted]) g.state.stations.farm.transport.level = 40;
  boosted.state.research.push('abono');
  assert.ok(Math.abs(analyzeChain(boosted.state).rows[0].output - 2 * analyzeChain(plain.state).rows[0].output) < 1e-9);
  run(plain, 120);
  run(boosted, 120);
  assert.ok(boosted.state.stats.produced.cherry > 1.8 * plain.state.stats.produced.cherry);
});

test('el sello de calidad sube el precio de las bolsas', () => {
  const game = new Game();
  game.state.research.push('sello');
  game.state.zones.finca.warehouse.coffee_bag = 2;
  run(game, 12);
  assert.equal(game.state.coins, 2 * 250 * 1.5);
});

test('el capataz amplía las ganancias sin conexión a 6 h', () => {
  const game = new Game();
  assert.equal(offlineCapSeconds(game.state), 2 * 3600);
  game.state.research.push('capataz');
  assert.equal(offlineCapSeconds(game.state), 6 * 3600);
});

test('todas las investigaciones y objetivos apuntan a cosas que existen', () => {
  for (const r of RESEARCH) assert.ok(!r.requires || STATIONS_BY_ID[r.requires], r.id);
  const ids = new Set(RESEARCH.map((r) => r.id));
  for (const g of GOALS) {
    if (g.type === 'research') assert.ok(ids.has(g.research), g.id);
    if (g.type === 'unlock') assert.ok(STATIONS_BY_ID[g.station], g.id);
    assert.ok(goalText(g).length > 5, `texto de ${g.id}`);
  }
  assert.equal(new Set(GOALS.map((g) => g.id)).size, GOALS.length);
  assert.ok(GOALS.at(-1).final);
});

test('los objetivos se cobran en orden y dan su recompensa', () => {
  const game = new Game();
  assert.deepEqual(activeGoals(game.state).map((g) => g.id), ['g01', 'g02', 'g03']);
  assert.equal(game.claimGoal('g01'), false); // aún no se cumple
  game.state.stats.sold.cherry = 25;
  assert.ok(goalProgress(game.state, GOALS[0]).done);
  const before = game.state.coins;
  assert.ok(game.claimGoal('g01'));
  assert.equal(game.state.coins, before + 15);
  assert.equal(game.claimGoal('g01'), false);
  assert.deepEqual(activeGoals(game.state).map((g) => g.id), ['g02', 'g03', 'g04']);
  assert.equal(game.claimGoal('g10'), false); // no está entre los visibles
});

test('cobrar el último objetivo completa la zona', () => {
  const game = new Game();
  game.state.goals.claimed = GOALS.filter((g) => g.id.startsWith('g')).map((g) => g.id);
  game.state.stats.sold.coffee_bag = 1000;
  assert.ok(game.claimGoal('final'));
  assert.equal(game.state.zones.finca.complete, true);
  // …y abre el Trapiche con su Cañaduzal.
  assert.equal(game.state.zones.trapiche.unlocked, true);
  assert.ok(game.state.stations.canefield);
});

test('las ganancias sin conexión se parecen a las de jugar en vivo', () => {
  const setup = () => {
    const g = new Game();
    const s = g.state;
    s.coins = 1e9;
    for (const id of ['wetmill', 'dryer', 'huller', 'roaster']) g.unlock(id);
    for (const id of Object.keys(s.stations)) {
      s.stations[id].level = 20;
      s.stations[id].transport.level = 20;
    }
    s.zones.finca.dispatch.level = 20;
    s.coins = 0;
    return g;
  };
  const live = setup();
  const offline = setup();
  run(live, 1800);
  offline.catchUp(1800);
  const ratio = offline.state.coins / live.state.coins;
  assert.ok(ratio > 0.85 && ratio < 1.15, `sin conexión / en vivo = ${ratio.toFixed(2)}`);
});

test('la compostera convierte pulpa en compost que acelera el cafetal', () => {
  const game = new Game();
  game.state.coins = 1e6;
  assert.equal(game.quoteUnlock('composter').reason, 'order'); // pide el Beneficiadero
  game.unlock('wetmill');
  assert.ok(game.unlock('composter'));
  for (const id of ['farm', 'wetmill', 'composter']) game.state.stations[id].level = 15;
  // Arrieros y despacho de sobra para que nada frene la cosecha y se vea solo el efecto del compost.
  game.state.stations.farm.transport.level = 60;
  game.state.stations.wetmill.transport.level = 60;
  game.state.zones.finca.dispatch.level = 60;
  run(game, 240);
  assert.ok((game.state.stats.produced.compost ?? 0) > 0, 'produjo compost');
  // Con compost guardado, el Cafetal va a ×1,5.
  game.state.stations.composter.buffer = 10;
  const before = game.state.stats.produced.cherry;
  game.state.stations.farm.buffer = 0;
  run(game, 20);
  const boosted = game.state.stats.produced.cherry - before;
  game.state.stations.composter.buffer = 0;
  game.state.stations.composter.level = 1;
  game.state.stations.wetmill.byBuffer = 0;
  game.state.stations.composter.input = 0;
  const before2 = game.state.stats.produced.cherry;
  game.state.stations.farm.buffer = 0;
  run(game, 20);
  const plain = game.state.stats.produced.cherry - before2;
  assert.ok(boosted > plain * 1.3, `con compost ${boosted}, sin compost ${plain}`);
});

test('la compostera no tiene arrieros ni cuenta para «todas las estaciones»', async () => {
  const { recommendUpgrade } = await import('../src/sim/analysis.js');
  const game = new Game();
  game.state.coins = 1e6;
  game.unlock('wetmill');
  game.unlock('composter');
  const rec = recommendUpgrade(game.state, (id, mode) => game.quote(id, mode));
  assert.notEqual(rec.id, 'composter:transport');
});

test('ningún objetivo pide vender un producto intermedio (podría quedar imposible)', () => {
  // Las fuentes se venden sí o sí al empezar cada zona; los productos finales siempre llegan a la bodega.
  const finals = new Set(['cherry', 'coffee_bag', 'cane', 'panela_powder']);
  for (const g of GOALS) if (g.type === 'sold') assert.ok(finals.has(g.product), `${g.id} pide vender ${g.product}`);
});
