import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, routeFlow } from '../src/sim/analysis.js';
import { CHILDREN, chainOf } from '../src/sim/chain.js';
import { routeCapacity } from '../src/sim/routes.js';

// Upgrades an entire zone (stations and haulers) to a target level.
function levelZone(game, zone, level) {
  for (const id of chainOf(zone)) {
    game.state.stations[id].level = level;
    game.state.stations[id].transport.level = level;
  }
}

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Save with all four zones open and everything built at the same level.
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

test('cacao paste is split between the Mesa and the Chocolatería, half each', () => {
  assert.deepEqual(CHILDREN.cacao_mill, ['chocolate_table', 'chocolatier']);
  const game = withCacaotal();
  const s = game.state;
  // With panela and milk to spare, only pasta distribution matters.
  levelZone(game, 'trapiche', 60);
  levelZone(game, 'lecheria', 60);
  for (const id of ['pasture', 'pasteurizer']) s.stations[id].level = 75;
  const a = analyzeChain(s, 'cacaotal');
  const row = (id) => a.rows.find((r) => r.id === id);
  const paste = row('cacao_mill').output;
  for (const id of ['chocolate_table', 'chocolatier']) assert.ok(Math.abs(row(id).capacity - paste / 2) < 1e-9, `${id}: ${row(id).capacity} of ${paste}`);
});

test('the Chocolatería needs panela and milk: if one is missing, it stops', () => {
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
  assert.ok((s.stats.produced.milk_chocolate ?? 0) > 0, 'with both, it works');
});

test('a route that supplies two stations splits the load between them', () => {
  const game = withCacaotal();
  const s = game.state;
  for (const id of ['chocolate_table', 'chocolatier']) s.stations[id].imported = {};
  s.zones.trapiche.warehouse = { panela_powder: 1000 };
  // The other panela route is already en route: this one takes what it needs.
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

test('two routes taking panela from the Trapiche split what there is', () => {
  const game = withCacaotal();
  const s = game.state;
  // Trapiche falls short: not enough for all three stations demanding panela.
  s.stations.pulverizer.level = 10;
  s.stations.pulverizer.transport.level = 10;
  const supply = analyzeChain(s, 'trapiche', { exports: false }).rows.at(-1).diverted;
  const both = routeFlow(s, 'panela') + routeFlow(s, 'panela_cacao');
  assert.ok(Math.abs(both - supply) < 1e-9, `${both} of ${supply}`);
  // The Cacaotal route supplies two stations: carries twice as much as the Lechería route.
  assert.ok(Math.abs(routeFlow(s, 'panela_cacao') - 2 * routeFlow(s, 'panela')) < 1e-9);
});

test('at the same level in every zone, routes carry just what the stations ask for', async () => {
  const { stationImportRate } = await import('../src/sim/routes.js');
  const { ROUTES_BY_ID } = await import('../src/data/routes.js');
  const game = withCacaotal();
  const s = game.state;
  // Pasteurizadora reserves a quarter of its milk for Chocolatería: none is bypassed.
  const lech = analyzeChain(s, 'lecheria');
  assert.ok(lech.rows.find((r) => r.id === 'pasteurizer').diverted < 1e-9);
  assert.ok(Math.abs(routeFlow(s, 'leche') - stationImportRate(s, ROUTES_BY_ID.leche, 'chocolatier')) < 1e-9, 'all the milk arrives');
  // Panela for Paila, Mesa, and Chocolatería is ¾ of Trapiche's output.
  const panela = routeFlow(s, 'panela') + routeFlow(s, 'panela_cacao');
  const made = analyzeChain(s, 'trapiche', { exports: false }).rows.at(-1).diverted;
  assert.ok(Math.abs(panela - made * 0.75) < 1e-9, `${panela} of ${made}`);
  // And in the simulation nobody stalls waiting for imports.
  run(game, 400);
  for (const id of ['arequipe_pot', 'chocolate_table', 'chocolatier']) {
    const st = s.stations[id];
    assert.ok(!(st.status === 'starved' && st.idle > 8), `${id} waiting for ${st.missing}`);
  }
});

test('a v1.2 save loads: imports become per product and the Cacaotal opens', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 6;
  old.zones.trapiche = { ...old.zones.trapiche, unlocked: true, complete: true };
  old.zones.lecheria = { ...old.zones.lecheria, unlocked: true, complete: true };
  delete old.zones.cacaotal;
  delete old.routes.panela_cacao;
  delete old.routes.leche;
  old.stations.arequipe_pot = { level: 20, input: 3, imported: 7, transport: { level: 20 } };
  const store = { 'mitierrita.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame().regions.cafetero;
  delete globalThis.localStorage;
  assert.deepEqual(s.stations.arequipe_pot.imported, { panela_powder: 7 });
  assert.equal(s.zones.cacaotal.unlocked, true);
  assert.ok(s.stations.cacao_grove);
  assert.equal(s.routes.leche.level, 1);
});

test('at level 100 in every zone, with all the research, no yard fills up', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const game = withCacaotal(100);
  const s = game.state;
  for (const r of RESEARCH) s.research.push(r.id);
  for (const z of Object.values(s.zones)) z.dispatch.level = 100;
  run(game, 400); // routes take a few trips to fill the stations
  const blocked = {};
  for (let i = 0; i < 1000; i++) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.deepEqual(blocked, {});
});
