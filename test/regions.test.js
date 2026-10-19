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
  assert.deepEqual(Object.keys(back.regions.santander.zones), ['guayabera']);
  assert.ok(back.profile);
});
