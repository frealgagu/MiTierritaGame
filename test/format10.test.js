import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { World } from '../src/core/World.js';
import { exportSave, importSave, saveTooNew } from '../src/core/SaveSystem.js';
import { GLOBAL_KEYS, REGION_KEYS, SAVE_VERSION, createInitialState } from '../src/sim/state.js';
import { restartRegion } from '../src/sim/legacy.js';
import { clockOf } from '../src/sim/calendar.js';
import { openSpecial } from '../src/sim/regions.js';
import { eventStatus, startEvent } from '../src/sim/events.js';
import { gameTotals } from '../src/sim/totals.js';
import { newGame, cafeOf, reload, format9 } from './helpers/game.js';

// A whole game with plenty in it: every kind of player data and three regions besides Eje Cafetero.
function fullGame() {
  const root = newGame(Date.now());
  for (const id of ['santander', 'bogota']) root.regions[id] = createInitialState(Date.now(), id);
  openSpecial(root);
  Object.assign(root.profile, { renown: 1234, renownTotal: 5678, freeEvents: true, onDemand: ['cafetero'], grandFinaleSeen: true, offlineLevel: 3 });
  root.profile.medals = { broca: { best: 'gold', count: { gold: 3 } }, festival_zona_g: { best: 'silver', count: { silver: 1 } } };
  root.profile.logros = { bolsas: 3, bg_cafe: 2 };
  root.profile.album = ['velez'];
  root.profile.totals = { sold: 1e20, produced: 5e20 };
  root.settings = { ...root.settings, musicVolume: 30, travel: 'direct', eventExit: 'leave', zone: 'trapiche' };
  root.events.slots = [{ zone: 'guayabera' }, { until: 999999 }];
  root.playTime = 50000;
  for (const st of Object.values(root.regions)) st.clockOffset = 50000;
  return reload(root);
}

test('the save is the whole game (format 10): Eje Cafetero is a region like the others (v5.13)', () => {
  const root = newGame();
  assert.equal(root.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 10);
  assert.equal(root.stations, undefined, 'no production of its own');
  assert.equal(cafeOf(root).region, 'cafetero');
  assert.equal(cafeOf(root).profile, undefined, 'the profile is not in a region');
  assert.deepEqual(Object.keys(root).sort(), [...GLOBAL_KEYS].sort());
  assert.deepEqual(Object.keys(cafeOf(root)), REGION_KEYS, 'a region save holds exactly the region keys');
});

test('restarting Eje Cafetero (or any region) leaves everything that belongs to the whole game as it was (v5.13)', () => {
  for (const region of ['cafetero', 'santander', 'bogota']) {
    const root = fullGame();
    const before = Object.fromEntries(GLOBAL_KEYS.filter((k) => k !== 'regions' && k !== 'savedAt').map((k) => [k, structuredClone(root[k])]));
    const others = Object.keys(root.regions).filter((id) => id !== region).map((id) => [id, JSON.stringify(root.regions[id])]);
    restartRegion(root, region);
    const back = reload(root);
    for (const [k, v] of Object.entries(before)) {
      if (k === 'profile') {
        // Only what a restart adds: Renown for restarting, the run banked into the totals and the region's restart
        // count in its own profile entry; every other region's entry stays as it was.
        const { renown, renownTotal, lifetime, lifetimes, totals, keep, ...rest } = back.profile;
        const { renown: r0, renownTotal: t0, lifetime: l0, lifetimes: ls0, totals: tt0, keep: k0, ...rest0 } = v;
        assert.deepEqual(rest, rest0, `${region}: profile`);
        assert.equal(renown, r0 + 10, `${region}: +10 Renown`);
        assert.deepEqual({ ...keep, [region]: undefined }, { ...k0, [region]: undefined }, `${region}: the other regions' entries`);
        assert.deepEqual({ ...keep[region], resets: 0 }, { ...k0[region], resets: 0 }, `${region}: its entry, but the count`);
      } else assert.deepEqual(back[k], v, `${region}: ${k}`);
    }
    for (const [id, json] of others) assert.equal(JSON.stringify(back.regions[id]), json, `${region}: ${id} untouched`);
    assert.equal(back.regions[region].keep.resets, 1);
    assert.equal(back.profile.keep[region].resets, 1);
  }
});

test('a format 9 save becomes format 10 without losing anything (v5.13)', () => {
  const old = format9(Date.now(), ['santander', 'bogota']);
  old.coins = 4321;
  old.stations.farm.level = 77;
  old.legacy = { resets: 5 };
  old.playTime = 1000;
  old.clockOffset = 200;
  old.regions.santander.clockOffset = 1200;
  old.profile.renown = 99;
  old.profile.medals.festival_zona_g = { best: 'gold', count: { gold: 1 } };
  old.settings = { sound: true, music: true, zone: 'guayabera', travel: 'direct' };
  old.events = { boards: {}, slots: [{ zone: 'finca' }, null], last: { finca: 5 }, count: { finca: 2 }, global: true };
  old.hints = ['wetmill'];
  const g = importSave(exportSave(old));
  assert.equal(g.version, 10);
  assert.equal(g.stations, undefined);
  const cafe = cafeOf(g);
  assert.equal(cafe.coins, 4321);
  assert.equal(cafe.stations.farm.level, 77);
  assert.equal(cafe.keep.resets, 5);
  assert.equal(g.profile.keep.cafetero.resets, 5);
  assert.deepEqual(cafe.hints, ['wetmill']);
  assert.deepEqual(cafe.events.count, { finca: 2 });
  assert.deepEqual(cafe.events.last, { finca: 5 });
  assert.equal(cafe.events.slots, undefined, 'the slots belong to the whole game');
  assert.deepEqual(g.events.slots, [{ zone: 'finca' }, null]);
  assert.equal(g.profile.renown, 99);
  assert.ok(g.profile.medals.festival_zona_g, 'Bogotá medals stay');
  assert.ok(g.regions.bogota && g.regions.santander);
  assert.equal(g.settings.travel, 'direct');
  assert.equal(g.settings.zone, 'guayabera');
  assert.equal(clockOf(g), 1200, 'the country clock carries on');
  assert.equal(clockOf(cafe), clockOf(g));
  assert.equal(eventStatus(g, 'finca')?.round, 3);
  // Loading it again changes nothing.
  const strip = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'savedAt' ? undefined : v)));
  assert.deepEqual(strip(reload(g)), strip(g));
});

test('a save from a newer format is refused instead of opening half-way (v5.13)', () => {
  const text = exportSave({ ...newGame(), version: SAVE_VERSION + 1 });
  assert.equal(importSave(text), null);
  assert.equal(saveTooNew(text), true);
  assert.equal(saveTooNew(exportSave(newGame())), false);
});

test('the country clock runs on its own and every region keeps the same date (v5.13)', () => {
  const root = newGame();
  root.regions.santander = createInitialState(0, 'santander');
  const world = new World(root);
  const games = Object.values(root.regions).map((st) => new Game(st));
  for (let i = 0; i < 100; i++) {
    world.step(0.5);
    for (const g of games) g.step(0.5);
  }
  assert.ok(Math.abs(clockOf(root) - 50) < 1e-9);
  for (const st of Object.values(root.regions)) assert.ok(Math.abs(clockOf(st) - clockOf(root)) < 1e-9, st.region);
  // Restarting Eje Cafetero does not move the clock back.
  restartRegion(root, 'cafetero', 0);
  assert.ok(Math.abs(clockOf(cafeOf(root)) - clockOf(root)) < 1e-9);
  assert.ok(Math.abs(clockOf(root) - 50) < 1e-9);
});

test('the game-wide event slots fill from the whole game, not from Eje Cafetero (v5.13)', () => {
  const root = fullGame();
  root.events.slots = [null, null];
  root.profile.freeEvents = false;
  const world = new World(root);
  world.step(0.1);
  assert.ok(root.events.slots.every((x) => x === null || x.zone || x.until !== undefined));
  assert.equal(cafeOf(root).events.slots, undefined);
  assert.equal(typeof startEvent, 'function');
  assert.ok(Number.isFinite(gameTotals(root).sold));
});

test('a save written by a newer version is never overwritten (v5.13)', async () => {
  const { saveGame, loadGame } = await import('../src/core/SaveSystem.js');
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const newer = JSON.stringify({ ...newGame(), version: SAVE_VERSION + 1 });
  mem['mitierrita.save'] = newer;
  assert.equal(loadGame(), null, 'it cannot be opened here');
  assert.equal(saveGame(newGame()), false);
  assert.equal(mem['mitierrita.save'], newer, 'and it stays as it was');
  delete mem['mitierrita.save'];
  assert.equal(saveGame(newGame()), true);
  assert.equal(loadGame().version, SAVE_VERSION);
  delete globalThis.localStorage;
});
