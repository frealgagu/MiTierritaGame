import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, routeFlow } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { stationImportRate } from '../src/sim/routes.js';
import { ROUTES_BY_ID } from '../src/data/routes.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Partida con las cinco zonas abiertas y todo construido al mismo nivel.
function withMaizal(level = 30) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e18;
  for (const z of ['trapiche', 'lecheria', 'cacaotal', 'maizal']) {
    game.unlockZone(z);
    for (const id of chainOf(z).slice(1)) assert.ok(game.unlock(id), id);
  }
  for (const id of chainOf('finca').slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) {
    st.level = level;
    st.transport.level = level;
  }
  for (const z of Object.values(s.zones)) z.dispatch.level = Math.max(40, level);
  for (const r of Object.values(s.routes)) r.level = level;
  return game;
}

test('a igual nivel, el queso y la mantequilla de la Lechería alcanzan justo para el Puesto de arepas', () => {
  const game = withMaizal();
  const s = game.state;
  for (const id of ['queso', 'mantequilla']) {
    const need = stationImportRate(s, ROUTES_BY_ID[id], 'arepa_stand');
    assert.ok(Math.abs(routeFlow(s, id) - need) < 1e-9, `${id}: ${routeFlow(s, id)} de ${need}`);
  }
  const stand = analyzeChain(s, 'maizal').rows.find((r) => r.id === 'arepa_stand');
  assert.equal(stand.importLimited, null);
  // Las arepas que hace el Budare son las que gasta el Puesto.
  const budare = analyzeChain(s, 'maizal').rows.find((r) => r.id === 'budare');
  assert.ok(Math.abs(stand.capacity - budare.output) < 1e-9);
});

test('si el Puesto de arepas, sus arrieros y las dos rutas se frenan entre sí, se recomienda lo más atrasado', () => {
  const game = withMaizal(40);
  const s = game.state;
  // Así quedó una partida casual de prueba: nada suelto (ni de dos en dos) rendía y se recomendaba la Piladora.
  s.stations.arepa_stand.level = 4;
  s.stations.arepa_stand.transport.level = 1;
  s.routes.queso.level = 2;
  s.routes.mantequilla.level = 2;
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'maizal');
  assert.equal(rec.id, 'arepa_stand:transport');
  assert.ok(rec.gain > 0);
});

test('el Puesto de arepas hace arepas de queso con lo que trae la Chiva', () => {
  const game = withMaizal();
  run(game, 600);
  assert.ok((game.state.stats.imported.cheese ?? 0) > 0, 'llegó queso');
  assert.ok((game.state.stats.imported.butter ?? 0) > 0, 'llegó mantequilla');
  assert.ok((game.state.stats.sold.cheese_arepa ?? 0) > 0, 'vendió arepas de queso');
});

test('al nivel 100 en las cinco zonas, con todas las investigaciones, ningún patio se llena', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const game = withMaizal(100);
  const s = game.state;
  for (const r of RESEARCH) s.research.push(r.id);
  run(game, 400);
  const blocked = {};
  for (let i = 0; i < 1000; i++) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.deepEqual(blocked, {});
});

test('una partida de la v1.3 con el Cacaotal completo abre el Maizal', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 7;
  for (const z of ['trapiche', 'lecheria', 'cacaotal']) old.zones[z] = { ...old.zones[z], unlocked: true, complete: true };
  delete old.zones.maizal;
  delete old.routes.queso;
  delete old.routes.mantequilla;
  const store = { 'cafetal.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.equal(s.zones.maizal.unlocked, true);
  assert.ok(s.stations.cornfield);
  assert.equal(s.routes.queso.level, 1);
});

test('lo que espera una ruta va en el andén: no llena la bodega ni para la zona', async () => {
  const { warehouseCap, warehouseSpace } = await import('../src/sim/transport.js');
  const { routeReserve } = await import('../src/sim/routes.js');
  const game = withMaizal();
  const s = game.state;
  // La Ruta de la leche a un nivel alto: carga y media de leche es más de lo que cabe en la bodega.
  s.routes.leche.level = 80;
  s.zones.lecheria.dispatch.level = 5;
  const milk = routeReserve(s, 'lecheria').milk;
  assert.ok(milk > warehouseCap(s, 'lecheria'), 'la reserva no cabría en la bodega');
  s.zones.lecheria.warehouse = { milk };
  s.mules = [];
  assert.equal(warehouseSpace(s, 'lecheria'), warehouseCap(s, 'lecheria'));
  // Y la Quesera sigue mandando queso a la bodega para la Ruta del queso.
  run(game, 300);
  assert.ok((s.stats.imported.cheese ?? 0) > 0, 'llegó queso al Maizal');
});
