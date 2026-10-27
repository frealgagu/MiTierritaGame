import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { stationRate } from '../src/sim/rules.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Pruebas de la cadena: siempre de día y sin temporada (el calendario se prueba en calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Partida con el Trapiche abierto.
function withTrapiche() {
  const game = new Game();
  game.unlockZone('trapiche');
  game.state.coins = 1e9;
  return game;
}

test('el Trapiche empieza cerrado y no se puede construir en él', () => {
  const game = new Game();
  game.state.coins = 1e9;
  assert.equal(game.state.zones.trapiche.unlocked, false);
  assert.equal(game.quoteUnlock('cane_mill').reason, 'zone');
  assert.equal(game.quoteResearch('motor').reason, 'zone');
});

test('al abrir el Trapiche, el Cañaduzal produce y se vende caña en su propia bodega', () => {
  const game = withTrapiche();
  game.state.coins = 0;
  run(game, 90);
  assert.ok((game.state.stats.sold.cane ?? 0) > 0, 'vendió caña');
  assert.ok((game.state.stats.sold.cherry ?? 0) > 0, 'la Finca sigue vendiendo a la vez');
});

test('la cadena del Trapiche produce panela pulverizada', () => {
  const game = withTrapiche();
  for (const id of chainOf('trapiche').slice(1)) assert.ok(game.unlock(id), id);
  for (const id of chainOf('trapiche')) {
    game.state.stations[id].level = 20;
    game.state.stations[id].transport.level = 20;
  }
  game.state.zones.trapiche.dispatch.level = 20;
  run(game, 300);
  assert.ok((game.state.stats.sold.panela_powder ?? 0) > 0);
});

test('el bagazo de la Molienda alimenta la Hornilla y la acelera ×2', () => {
  const setup = (withFuel) => {
    const game = withTrapiche();
    game.unlock('cane_mill');
    game.unlock('furnace');
    for (const id of ['canefield', 'cane_mill']) {
      game.state.stations[id].level = 40;
      game.state.stations[id].transport.level = 40;
    }
    game.state.stations.furnace.level = 5;
    game.state.stations.furnace.transport.level = 40;
    game.state.zones.trapiche.dispatch.level = 40;
    if (!withFuel) game.state.stations.cane_mill.byBuffer = -1e9; // nunca llega bagazo
    return game;
  };
  const fuel = setup(true);
  const none = setup(false);
  run(fuel, 200);
  run(none, 200);
  assert.ok(fuel.state.stations.furnace.fuel > 0 || fuel.state.stats.produced.melado > 0);
  const ratio = fuel.state.stats.produced.melado / none.state.stats.produced.melado;
  assert.ok(ratio > 1.6, `melado con bagazo / sin bagazo = ${ratio.toFixed(2)}`);
  // El análisis también cuenta el combustible: con la Molienda dando bagazo de sobra, ×2.
  const furnace = analyzeChain(fuel.state, 'trapiche').rows.find((r) => r.id === 'furnace');
  const base = stationRate(STATIONS_BY_ID.furnace, 5) * STATIONS_BY_ID.furnace.in.guarapo;
  assert.ok(Math.abs(furnace.capacity - 2 * base) < 1e-9, `capacidad ${furnace.capacity} vs base ${base}`);
});

test('cada zona tiene su bodega, su despacho y su recomendación', () => {
  const game = withTrapiche();
  assert.ok(game.buy('dispatch:trapiche', 1));
  assert.equal(game.state.zones.trapiche.dispatch.level, 2);
  assert.equal(game.state.zones.finca.dispatch.level, 1);
  const rec = recommendUpgrade(game.state, (id, mode) => game.quote(id, mode), 'trapiche');
  assert.ok(['canefield', 'canefield:transport', 'dispatch:trapiche'].includes(rec.id), rec.id);
});

test('una partida de la v1.0 se carga con las zonas y, si la Finca estaba completa, abre el Trapiche', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const v4 = {
    version: 4, coins: 5000, totalEarned: 9000, playTime: 9000, savedAt: Date.now(), nextId: 3,
    stations: { farm: { level: 30, input: 0, buffer: 0, progress: 0, sinceDeparture: 0, idle: 0, status: 'working', transport: { level: 30 } } },
    dispatch: { level: 12 }, warehouse: { cherry: 7 }, mules: [],
    jeep: { phase: 'idle', t: 0, waited: 0, load: {} }, stats: { produced: {}, sold: { coffee_bag: 1000 } },
    hints: [], settings: { sound: true }, research: ['abono'], goals: { claimed: ['g01', 'abono', 'final'] }, zoneComplete: true,
  };
  store.set('cafetal.save', JSON.stringify(v4));
  const state = loadGame();
  assert.equal(state.zones.finca.dispatch.level, 12);
  assert.equal(state.zones.finca.warehouse.cherry, 7);
  assert.equal(state.zones.finca.complete, true);
  assert.equal(state.zones.trapiche.unlocked, true);
  assert.ok(state.stations.canefield);
  assert.deepEqual(state.goals.claimed, ['g01', 'g05', 'final']);
  assert.equal(state.dispatch, undefined);
  const game = new Game(state);
  run(game, 60);
  assert.ok((game.state.stats.sold.cane ?? 0) > 0);
});

test('«Zona al máximo» solo cuando todo está al máximo: si no, se sugiere lo que falta subir (v3.54)', async () => {
  const { recommendUpgrade, pendingUpgrade } = await import('../src/sim/analysis.js');
  const { createInitialState } = await import('../src/sim/state.js');
  const { RESEARCH } = await import('../src/data/research.js');
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  const { chainOf } = await import('../src/sim/chain.js');
  const zones = REGIONS_BY_ID.costa.zones;
  const make = () => {
    const game = new Game(createInitialState(0, 'costa'));
    game.state.coins = 1e30;
    for (const z of zones) {
      game.unlockZone(z);
      for (const id of chainOf(z).slice(1)) game.unlock(id);
    }
    game.state.research = RESEARCH.filter((r) => zones.includes(r.zone)).map((r) => r.id);
    for (const z of zones) {
      for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 100;
      game.state.zones[z].dispatch.level = 100;
    }
    for (const r of Object.keys(game.state.routes)) game.state.routes[r].level = 100;
    return game;
  };
  const advice = (game) => {
    const q = (id, m) => game.quote(id, m);
    for (let t = 0; t < 30; t += 0.25) game.step(0.25);
    return recommendUpgrade(game.state, q, 'cienaga') ?? pendingUpgrade(game.state, q, 'cienaga');
  };
  // Todo al 100: de verdad está al máximo.
  assert.equal(advice(make()), null);
  // Un despacho en el 92 ya lleva todo, y la Freidora en el 1 no cambia lo que se vende: igual se sugieren.
  let game = make();
  game.state.zones.cienaga.dispatch.level = 92;
  assert.equal(advice(game)?.id, 'dispatch:cienaga');
  game = make();
  game.state.stations.fish_fryer.level = 1;
  assert.equal(advice(game)?.id, 'fish_fryer');
});

test('la Compostera sin construir: la Finca no está al máximo (v3.58)', async () => {
  const { nextSideToUnlock, nextToUnlock } = await import('../src/sim/chain.js');
  const game = new Game();
  const s = game.state;
  s.coins = 1e30;
  assert.equal(nextSideToUnlock(s, 'finca'), 'composter');
  for (const id of ['wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer']) game.unlock(id);
  assert.equal(nextToUnlock(s, 'finca'), null, 'la cadena está completa');
  assert.equal(nextSideToUnlock(s, 'finca'), 'composter', 'pero falta la Compostera');
  game.unlock('composter');
  assert.equal(nextSideToUnlock(s, 'finca'), null);
});
