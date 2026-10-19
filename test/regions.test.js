import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState } from '../src/sim/state.js';
import { openRegions, regionState } from '../src/sim/regions.js';
import { restartState, stationsOf, checkMastery } from '../src/sim/legacy.js';
import { clockOf } from '../src/sim/calendar.js';
import { loadGame, saveGame } from '../src/core/SaveSystem.js';
import { REGIONS } from '../src/data/regions.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';

test('cada región tiene sus zonas y su partida empieza en la primera, con su fuente', () => {
  for (const r of REGIONS) {
    for (const z of r.zones) assert.equal(ZONES_BY_ID[z].region ?? 'cafetero', r.id, z);
    const s = createInitialState(0, r.id);
    assert.deepEqual(Object.keys(s.zones), r.zones);
    assert.equal(s.zones[r.zones[0]].unlocked, true);
    assert.ok(s.stations[ZONES_BY_ID[r.zones[0]].farm.stationId]);
  }
  assert.ok(!createInitialState(0, 'santander').profile, 'el perfil es del jugador: solo en la principal');
});

test('Santander se abre al completar el Pueblo, con el calendario del país', () => {
  const root = createInitialState(0);
  assert.deepEqual(openRegions(root), []);
  root.playTime = 50000;
  root.zones.pueblo.complete = true;
  assert.deepEqual(openRegions(root), ['santander']);
  assert.deepEqual(openRegions(root), [], 'solo una vez');
  const s = regionState(root, 'santander');
  assert.equal(s.region, 'santander');
  assert.equal(clockOf(s), 50000);
  // Avanza a la par: las dos partidas siguen en la misma fecha.
  const a = new Game(root);
  const b = new Game(s);
  for (let t = 0; t < 30; t += 0.1) {
    a.step(0.1);
    b.step(0.1);
  }
  assert.ok(Math.abs(clockOf(root) - clockOf(s)) < 1e-6);
  assert.ok(b.state.stats.produced.guava > 0, 'la Guayabera produce');
});

test('cada región tiene su segundo final y su reinicio, sin tocar las demás', () => {
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = regionState(root, 'santander');
  for (const id of stationsOf(s)) s.stations[id] = { ...(s.stations[id] ?? {}), level: 100, transport: { level: 100 } };
  assert.equal(checkMastery(s, { emit() {} }), false, 'sin el primer final de la región');
  s.zones.guayabera.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false, 'el final de la región es su última zona');
  s.zones.tabacal.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false);
  s.zones.fiquera.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false);
  s.zones.hato.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), true);
  s.playTime = 9000;
  const next = restartState(s);
  assert.equal(next.region, 'santander');
  assert.equal(next.legacy.resets, 1);
  assert.equal(clockOf(next), clockOf(s), 'el calendario sigue');
  assert.ok(!next.profile);
  // Reiniciar el Eje Cafetero conserva Santander.
  root.regions.santander = next;
  const root2 = restartState(root);
  assert.equal(root2.regions.santander, next);
  assert.equal(clockOf(root2), clockOf(root));
});

test('la partida se guarda y se carga con sus regiones', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.coins = 1234;
  saveGame(root);
  const back = loadGame();
  assert.equal(back.regions.santander.coins, 1234);
  assert.equal(back.regions.santander.region, 'santander');
  assert.deepEqual(Object.keys(back.regions.santander.zones), ['guayabera', 'tabacal', 'fiquera', 'hato']);
  assert.ok(back.profile);
});

test('una partida con la Guayabera ya completa abre el Tabacal al cargarse (v3.1)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = root.regions.santander;
  s.zones.guayabera.complete = true;
  delete s.zones.tabacal; // como se guardaba en la v3.0
  saveGame(root);
  const back = loadGame().regions.santander;
  assert.equal(back.zones.tabacal.unlocked, true);
  assert.ok(back.stations.tobacco_field);
});

test('el Tabacal se abre al completar la Guayabera y su cadena tuerce tabacos sin cuellos de botella', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { analyzeChain } = await import('../src/sim/analysis.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  assert.equal(game.state.zones.tabacal.unlocked, false);
  const final = GOALS_BY_ZONE.guayabera.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.guayabera.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.bocadillo_crate = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.tabacal.unlocked, true);
  game.state.coins = 1e12;
  for (const id of chainOf('tabacal').slice(1)) assert.ok(game.unlock(id), id);
  for (const id of chainOf('tabacal')) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
  game.state.zones.tabacal.dispatch.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 300; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.sold.cigar ?? 0) > 0, 'vende tabaco torcido');
  // A igual nivel la cadena cuadra: ninguna estación le quita el paso a la siguiente.
  const { rows } = analyzeChain(game.state, 'tabacal');
  for (const row of rows.filter((r) => r.children.length)) assert.ok(row.diverted < 1e-9, `${row.id} desvía ${row.diverted}/s`);
});

test('la Fiquera se abre con el Tabacal completo y arma tercios con el tabaco que llega por la ruta', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  game.unlockZone('tabacal');
  const final = GOALS_BY_ZONE.tabacal.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.tabacal.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.cigar = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.fiquera.unlocked, true);
  assert.ok(game.state.routes.tabaco, 'la Ruta del tabaco es de Santander');
  game.state.coins = 1e15;
  for (const z of ['tabacal', 'fiquera']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.tabaco.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.fermented_tobacco ?? 0) > 0, 'llega tabaco del Tabacal');
  for (const p of ['fique_sack', 'alpargatas', 'tobacco_bale']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('el Hato se abre con la Fiquera completa y hace fiambres con el bocadillo y la cabuya que llegan por las rutas', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  for (const z of ['tabacal', 'fiquera']) game.unlockZone(z);
  const final = GOALS_BY_ZONE.fiquera.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.fiquera.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.tobacco_bale = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.hato.unlocked, true);
  game.state.coins = 1e15;
  for (const z of ['guayabera', 'tabacal', 'fiquera', 'hato']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of Object.values(game.state.routes)) r.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['bocadillo_bijao', 'fique_fiber']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['almuerzo', 'fiambre']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});
