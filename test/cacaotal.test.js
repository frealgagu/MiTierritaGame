import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, routeFlow } from '../src/sim/analysis.js';
import { CHILDREN, chainOf } from '../src/sim/chain.js';
import { routeCapacity } from '../src/sim/routes.js';

// Sube una zona entera (estaciones y arrieros) a un nivel.
function levelZone(game, zone, level) {
  for (const id of chainOf(zone)) {
    game.state.stations[id].level = level;
    game.state.stations[id].transport.level = level;
  }
}

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Partida con las cuatro zonas abiertas y todo construido al mismo nivel.
function withCacaotal(level = 30) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e15;
  for (const z of ['trapiche', 'lecheria', 'cacaotal']) {
    game.unlockZone(z);
    for (const id of chainOf(z).slice(1)) assert.ok(game.unlock(id), id);
  }
  for (const id of Object.keys(s.stations)) {
    s.stations[id].level = level;
    s.stations[id].transport.level = level;
  }
  for (const z of Object.values(s.zones)) z.dispatch.level = 40;
  for (const r of Object.values(s.routes)) r.level = level;
  return game;
}

test('la pasta de cacao se reparte entre la Mesa y la Chocolatería, la mitad cada una', () => {
  assert.deepEqual(CHILDREN.cacao_mill, ['chocolate_table', 'chocolatier']);
  const game = withCacaotal();
  const s = game.state;
  // Con panela y leche de sobra, solo cuenta el reparto de la pasta.
  levelZone(game, 'trapiche', 60);
  levelZone(game, 'lecheria', 60);
  for (const id of ['pasture', 'pasteurizer']) s.stations[id].level = 75;
  const a = analyzeChain(s, 'cacaotal');
  const row = (id) => a.rows.find((r) => r.id === id);
  const paste = row('cacao_mill').output;
  for (const id of ['chocolate_table', 'chocolatier']) assert.ok(Math.abs(row(id).capacity - paste / 2) < 1e-9, `${id}: ${row(id).capacity} de ${paste}`);
});

test('la Chocolatería necesita panela y leche: si falta una, se para', () => {
  const game = withCacaotal();
  const s = game.state;
  const st = s.stations.chocolatier;
  st.input = 20;
  st.imported = { panela_powder: 50 };
  game.step(0.1);
  assert.equal(st.missing, 'milk');
  assert.equal(st.status, 'starved');
  st.imported = { panela_powder: 50, milk: 100 };
  run(game, 20);
  assert.ok((s.stats.produced.milk_chocolate ?? 0) > 0, 'con las dos, trabaja');
});

test('una ruta que abastece dos estaciones les reparte la carga', () => {
  const game = withCacaotal();
  const s = game.state;
  for (const id of ['chocolate_table', 'chocolatier']) s.stations[id].imported = {};
  s.zones.trapiche.warehouse = { panela_powder: 1000 };
  // La otra ruta de panela ya va en camino: esta se lleva lo que necesita.
  s.routes.panela.phase = 'back';
  run(game, 0.2);
  assert.equal(s.routes.panela_cacao.phase, 'go');
  const load = s.routes.panela_cacao.load;
  assert.ok(load > 0 && load <= routeCapacity(s, 'panela_cacao') + 1e-9);
  run(game, 31);
  const a = s.stations.chocolate_table.imported.panela_powder ?? 0;
  const b = s.stations.chocolatier.imported.panela_powder ?? 0;
  assert.ok(a > 0 && b > 0, `mesa ${a}, chocolatería ${b}`);
});

test('dos rutas que sacan panela del Trapiche se reparten lo que hay', () => {
  const game = withCacaotal();
  const s = game.state;
  // El Trapiche se queda corto: no alcanza para las tres estaciones que piden panela.
  s.stations.pulverizer.level = 10;
  s.stations.pulverizer.transport.level = 10;
  const supply = analyzeChain(s, 'trapiche', { exports: false }).rows.at(-1).diverted;
  const both = routeFlow(s, 'panela') + routeFlow(s, 'panela_cacao');
  assert.ok(Math.abs(both - supply) < 1e-9, `${both} de ${supply}`);
  // La ruta del Cacaotal abastece dos estaciones: se lleva el doble que la de la Lechería.
  assert.ok(Math.abs(routeFlow(s, 'panela_cacao') - 2 * routeFlow(s, 'panela')) < 1e-9);
});

test('a igual nivel en todas las zonas, las rutas llevan justo lo que piden las estaciones', async () => {
  const { stationImportRate } = await import('../src/sim/routes.js');
  const { ROUTES_BY_ID } = await import('../src/data/routes.js');
  const game = withCacaotal();
  const s = game.state;
  // La Pasteurizadora guarda un cuarto de su leche para la Chocolatería: no se desvía nada.
  const lech = analyzeChain(s, 'lecheria');
  assert.ok(lech.rows.find((r) => r.id === 'pasteurizer').diverted < 1e-9);
  assert.ok(Math.abs(routeFlow(s, 'leche') - stationImportRate(s, ROUTES_BY_ID.leche, 'chocolatier')) < 1e-9, 'llega toda la leche');
  // La panela de la Paila, la Mesa y la Chocolatería es ¾ de lo que da el Trapiche.
  const panela = routeFlow(s, 'panela') + routeFlow(s, 'panela_cacao');
  const made = analyzeChain(s, 'trapiche', { exports: false }).rows.at(-1).diverted;
  assert.ok(Math.abs(panela - made * 0.75) < 1e-9, `${panela} de ${made}`);
  // Y en la simulación nadie se queda esperando lo importado.
  run(game, 400);
  for (const id of ['arequipe_pot', 'chocolate_table', 'chocolatier']) {
    const st = s.stations[id];
    assert.ok(!(st.status === 'starved' && st.idle > 8), `${id} esperando ${st.missing}`);
  }
});

test('una partida de la v1.2 se carga: lo importado pasa a ir por producto y se abre el Cacaotal', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 6;
  old.zones.trapiche = { ...old.zones.trapiche, unlocked: true, complete: true };
  old.zones.lecheria = { ...old.zones.lecheria, unlocked: true, complete: true };
  delete old.zones.cacaotal;
  delete old.routes.panela_cacao;
  delete old.routes.leche;
  old.stations.arequipe_pot = { level: 20, input: 3, imported: 7, transport: { level: 20 } };
  const store = { 'cafetal.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.deepEqual(s.stations.arequipe_pot.imported, { panela_powder: 7 });
  assert.equal(s.zones.cacaotal.unlocked, true);
  assert.ok(s.stations.cacao_grove);
  assert.equal(s.routes.leche.level, 1);
});

test('al nivel 100 en todas las zonas, con todas las investigaciones, ningún patio se llena', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const game = withCacaotal(100);
  const s = game.state;
  for (const r of RESEARCH) s.research.push(r.id);
  for (const z of Object.values(s.zones)) z.dispatch.level = 100;
  run(game, 400); // las rutas tardan unos viajes en llenar las estaciones
  const blocked = {};
  for (let i = 0; i < 1000; i++) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.deepEqual(blocked, {});
});
