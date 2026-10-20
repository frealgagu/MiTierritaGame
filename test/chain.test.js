import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { PARENT, ROAD_POS, chainOf } from '../src/sim/chain.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Siempre de día y sin temporada: se mira la cadena, no el reloj.
CALENDAR.on = false;

const CHAIN = chainOf('finca');

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('en cada zona, cada estación está después de su proveedor sobre el camino', () => {
  for (const zone of ZONE_LIST) {
    const pos = ROAD_POS[zone.id];
    for (const id of zone.chain) {
      if (PARENT[id]) assert.ok(pos[id] > pos[PARENT[id]], `${id} antes que ${PARENT[id]}`);
      assert.ok(pos.warehouse > pos[id], `bodega de ${zone.id} antes que ${id}`);
    }
    // El orden de construcción respeta quién alimenta a quién.
    for (const id of zone.chain) if (PARENT[id]) assert.ok(zone.chain.indexOf(PARENT[id]) < zone.chain.indexOf(id), id);
  }
});

test('solo se construye en orden y con monedas', () => {
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

test('el beneficiadero convierte cerezas en café lavado y se vende', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  run(game, 120);
  assert.ok((game.state.stats.produced.washed ?? 0) > 0, 'produjo café lavado');
  assert.ok((game.state.stats.sold.washed ?? 0) > 0, 'vendió café lavado');
});

test('si la siguiente estación no da abasto, el sobrante se desvía a la bodega', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.state.stations.farm.level = 40; // muchas más cerezas de las que procesa un beneficiadero nivel 1
  game.state.stations.farm.transport.level = 40;
  game.state.zones.finca.dispatch.level = 40;
  run(game, 90);
  assert.equal(game.state.stations.wetmill.status, 'working');
  assert.ok((game.state.stats.sold.cherry ?? 0) > 0, 'se vendieron cerezas desviadas');
  assert.ok(game.state.stations.farm.lastDiverted > 0);
  assert.equal(analyzeChain(game.state).bottleneck, 'wetmill');
});

test('una estación sin entrada espera', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.step(0.1);
  assert.equal(game.state.stations.wetmill.status, 'starved');
});

test('la cadena completa produce bolsas de café', () => {
  const game = new Game();
  game.state.coins = 1e9;
  for (const id of CHAIN.slice(1)) assert.ok(game.unlock(id), id);
  for (const id of CHAIN) game.state.stations[id].level = 30;
  game.state.zones.finca.dispatch.level = 30;
  run(game, 300);
  assert.ok((game.state.stats.sold.coffee_bag ?? 0) > 0, 'vendió bolsas');
});

test('lo desviado nunca llena la bodega: siempre queda sitio para el producto final', async () => {
  const { warehouseCapacity } = await import('../src/sim/rules.js');
  const { DIVERT_RESERVE } = await import('../src/sim/transport.js');
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.state.stations.farm.level = 60; // muchísimas cerezas desviadas
  game.state.stations.farm.transport.level = 60;
  game.state.stations.wetmill.transport.level = 30;
  run(game, 120);
  const cap = warehouseCapacity(game.state.zones.finca.dispatch.level);
  const cherries = game.state.zones.finca.warehouse.cherry ?? 0;
  assert.ok(cherries <= cap * (1 - DIVERT_RESERVE) + 1, `cerezas en bodega: ${cherries} de ${cap}`);
  assert.ok((game.state.stats.sold.washed ?? 0) > 0, 'el café lavado sigue llegando y vendiéndose');
});

test('lo que ya está en el nivel 100 no se señala como cuello de botella', async () => {
  const { recommendUpgrade } = await import('../src/sim/analysis.js');
  const game = new Game();
  game.state.coins = 1e15;
  for (const id of CHAIN.slice(1)) game.unlock(id);
  for (const st of Object.values(game.state.stations)) {
    st.level = 100;
    st.transport.level = 100;
  }
  game.state.zones.finca.dispatch.level = 100;
  // Todo al máximo y equilibrado: el cuello sería el Cafetal, que ya no se puede subir.
  assert.equal(analyzeChain(game.state).bottleneck, null);
  game.state.coins = 0; // sin dinero para investigaciones
  assert.equal(recommendUpgrade(game.state, (id, mode) => game.quote(id, mode)), null);
});
