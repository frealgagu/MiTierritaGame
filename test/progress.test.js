import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState } from '../src/sim/state.js';
import { GOALS } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { activeGoals, goalProgress, goalText } from '../src/sim/goals.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { offlineCapSeconds } from '../src/sim/modifiers.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Pruebas de la cadena: siempre de día y sin temporada (el calendario se prueba en calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('una investigación pide su estación y se compra una sola vez', () => {
  const game = new Game();
  game.state.coins = 1e6;
  assert.equal(game.quoteResearch('herraduras').reason, 'locked');
  game.unlock('wetmill');
  game.unlock('dryer');
  assert.ok(game.research('herraduras'));
  assert.equal(game.quoteResearch('herraduras').reason, 'owned');
});

test('las que duplican una estación piden esa estación y sus arrieros al nivel 25', () => {
  const game = new Game();
  game.state.coins = 1e12;
  const farm = game.state.stations.farm;
  farm.level = 25;
  assert.equal(game.quoteResearch('abono').reason, 'locked', 'faltan los arrieros');
  farm.transport.level = 25;
  farm.level = 24;
  assert.equal(game.quoteResearch('abono').reason, 'locked', 'falta la estación');
  farm.level = 25;
  assert.ok(game.research('abono'), 'ya no hace falta construir la siguiente');
  // La Compostera no tiene arrieros: le basta su nivel.
  game.unlock('wetmill');
  game.unlock('composter');
  game.state.stations.composter.level = 25;
  assert.ok(game.quoteResearch('beneficio_eco').ok);
  // Las demás siguen igual: la Herradura pide construir la Marquesina.
  assert.equal(game.quoteResearch('herraduras').reason, 'locked');
});

test('una investigación se compra una sola vez', () => {
  const game = new Game();
  game.state.coins = 1e6;
  game.state.stations.farm.level = 25;
  game.state.stations.farm.transport.level = 25;
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

test('las horas sin conexión son del jugador: 2 h y +2 h por nivel con Renombre, hasta 24 h (v3.7)', async () => {
  const { buyOffline, offlineHours, OFFLINE_COSTS } = await import('../src/sim/renown.js');
  const game = new Game();
  const profile = game.state.profile;
  assert.equal(offlineCapSeconds(game.state), 2 * 3600);
  assert.equal(buyOffline(profile), false, 'sin Renombre no se compra');
  profile.renown = 1000;
  for (let k = 0; k < OFFLINE_COSTS.length; k++) assert.ok(buyOffline(profile));
  assert.equal(buyOffline(profile), false, 'ya está al máximo');
  assert.equal(offlineHours(profile), 24);
  assert.equal(profile.renown, 1000 - OFFLINE_COSTS.reduce((a, b) => a + b, 0));
  // Una región (sin perfil propio) usa el del jugador.
  const santander = createInitialState(0, 'santander');
  assert.equal(offlineCapSeconds(santander, profile), 24 * 3600);
  // Ya no hay investigaciones que sumen horas.
  assert.ok(!RESEARCH.some((r) => r.effect.type === 'offlineHours'));
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
  game.state.stats.sold.coffee_bag = GOALS.find((g) => g.id === 'final').amount;
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

test('la compostera convierte pulpa en compost que sube el precio de la Finca sin acelerar nada', async () => {
  const { productionMult } = await import('../src/sim/transport.js');
  const { saleValue, productValue } = await import('../src/sim/modifiers.js');
  const game = new Game();
  game.state.coins = 1e6;
  assert.equal(game.quoteUnlock('composter').reason, 'order'); // pide el Beneficiadero
  game.unlock('wetmill');
  assert.ok(game.unlock('composter'));
  for (const id of ['farm', 'wetmill', 'composter']) game.state.stations[id].level = 15;
  game.state.stations.farm.transport.level = 60;
  game.state.stations.wetmill.transport.level = 60;
  game.state.zones.finca.dispatch.level = 60;
  run(game, 240);
  assert.ok((game.state.stats.produced.compost ?? 0) > 0, 'produjo compost');

  // Con compost, la Finca vende un 30 % más caro; el Trapiche no cambia.
  game.state.stations.composter.buffer = 10;
  assert.equal(saleValue(game.state, 'washed'), productValue(game.state, 'washed') * 1.3);
  assert.equal(saleValue(game.state, 'cane'), productValue(game.state, 'cane'));
  // Y no acelera el Cafetal: la cadena sigue igual de equilibrada.
  assert.equal(productionMult(game.state, 'farm'), 1);
  const before = game.state.stats.produced.cherry;
  game.state.stations.farm.buffer = 0;
  run(game, 20);
  const withCompost = game.state.stats.produced.cherry - before;
  game.state.stations.composter.buffer = 0;
  game.state.stations.composter.level = 1;
  game.state.stations.wetmill.byBuffer = 0;
  game.state.stations.composter.input = 0;
  assert.equal(saleValue(game.state, 'washed'), productValue(game.state, 'washed'), 'sin compost, sin bono');
  const before2 = game.state.stats.produced.cherry;
  game.state.stations.farm.buffer = 0;
  run(game, 20);
  const without = game.state.stats.produced.cherry - before2;
  assert.ok(Math.abs(withCompost - without) <= without * 0.1, `con compost ${withCompost}, sin compost ${without}`);

  // Subir el Cafetal no gasta el compost más rápido: se gasta según el café que lava el Beneficiadero.
  const { expectedCompostValue } = await import('../src/sim/analysis.js');
  game.state.stations.composter.level = 8;
  const sustained = expectedCompostValue(game.state);
  game.state.stations.farm.level = 60;
  assert.equal(expectedCompostValue(game.state), sustained);
  game.state.stations.composter.level = 15;
  assert.ok(Math.abs(expectedCompostValue(game.state) - 1.3) < 1e-9, 'a nivel parecido al Beneficiadero cubre todo');

  // Las ventas reales usan el bono.
  const g2 = new Game();
  g2.state.stations.composter = { ...g2.state.stations.farm, buffer: 1000 };
  g2.state.zones.finca.warehouse = { cherry: 10 };
  const coins = g2.state.coins;
  run(g2, 60);
  assert.ok(g2.state.coins - coins >= 10 * 1.3 - 1e-9, `vendió por ${g2.state.coins - coins}`);
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
  const finals = new Set(['cherry', 'coffee_bag', 'cane', 'panela_powder', 'raw_milk', 'butter', 'cheese', 'arequipe', 'cacao_pod', 'table_chocolate', 'milk_chocolate', 'corn_cob', 'arepa', 'cheese_arepa', 'breakfast', 'container', 'guava', 'bocadillo_crate', 'tobacco_leaf', 'cigar', 'fique_leaf', 'tobacco_bale', 'steer', 'almuerzo', 'fiambre', 'ant_queen', 'ant_cone', 'recuerdo', 'estadia', 'excursion', 'paddy', 'rice_sack', 'coconut', 'cocada']);
  for (const g of GOALS) if (g.type === 'sold') assert.ok(finals.has(g.product), `${g.id} pide vender ${g.product}`);
});

test('cada estación de cada cadena tiene exactamente una investigación que la acelera', async () => {
  const { ZONE_LIST } = await import('../src/data/zones/index.js');
  const boosted = new Set(RESEARCH.filter((r) => r.effect.type === 'stationSpeed').map((r) => r.effect.target));
  for (const zone of ZONE_LIST) {
    for (const id of zone.chain) {
      // La Hornilla ya tiene el bagazo, pero también debe tener su investigación.
      assert.ok(boosted.has(id), `${zone.id}: ${id} no tiene investigación de velocidad`);
      // Y solo una: con todas compradas, la cadena queda tan equilibrada como sin ninguna.
      const speedUps = RESEARCH.filter((r) => r.effect.type === 'stationSpeed' && r.effect.target === id);
      assert.equal(speedUps.length, 1, `${zone.id}: ${id} tiene ${speedUps.length} investigaciones de velocidad`);
    }
  }
});

test('con el Abono comprado y dinero para la Despulpadora, la recomienda', async () => {
  const { recommendUpgrade } = await import('../src/sim/analysis.js');
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.state.research.push('abono');
  for (const st of Object.values(game.state.stations)) {
    st.level = 25;
    st.transport.level = 25;
  }
  game.state.zones.finca.dispatch.level = 25;
  game.state.coins = 500;
  const rec = recommendUpgrade(game.state, (id, mode) => game.quote(id, mode), 'finca');
  assert.equal(rec.id, 'research:despulpadora');
  // Sin dinero para ella, recomienda subir el Beneficiadero (no deja al jugador ahorrando).
  game.state.coins = 50;
  assert.equal(recommendUpgrade(game.state, (id, mode) => game.quote(id, mode), 'finca').id, 'wetmill');
});
