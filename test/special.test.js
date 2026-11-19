import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createGameState, createInitialState } from '../src/sim/state.js';
import { SPECIAL_FROM, isOpen, openRegions, openSpecial, regionState, specialProgress } from '../src/sim/regions.js';
import { REGIONS_BY_ID, shownRegions } from '../src/data/regions.js';
import { RESEARCH } from '../src/data/research.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { chainOf, PARENT } from '../src/sim/chain.js';
import { capMult, dispatchMult, speedMult } from '../src/sim/modifiers.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Special zone (v5.4): a secret reward region with one linear chain and a ×32 research per station.
CALENDAR.on = false;
const SPECIAL = REGIONS_BY_ID.sanandres;

// Main save with every other region open and at its second ending (or reset).
function allReady() {
  const root = createGameState(0);
  for (const r of SPECIAL_FROM) {
    const st = (root.regions[r.id] ??= createInitialState(0, r.id));
    st.mastered = true;
  }
  return root;
}

test('the special zone is secret: no list names it until it opens', () => {
  const root = createGameState(0);
  assert.ok(!shownRegions(isOpen(root)).some((r) => r.id === 'sanandres'));
  assert.ok(openSpecial(root));
  assert.ok(shownRegions(isOpen(root)).some((r) => r.id === 'sanandres'));
  assert.equal(openSpecial(root), null, 'only once');
});

test('it opens when every other region has the second ending or a restart', () => {
  const root = allReady();
  assert.deepEqual(specialProgress(root), { n: SPECIAL_FROM.length, total: SPECIAL_FROM.length, ready: true });
  assert.ok(!SPECIAL.devOnly, 'since v5.5 it opens for real');
  // A reset counts as much as the second ending.
  root.regions.bogota.mastered = false;
  root.regions.bogota.keep.resets = 1;
  assert.deepEqual(openRegions(root), ['sanandres']);
  assert.equal(regionState(root, 'sanandres').zones.sanandres.unlocked, true);
  assert.deepEqual(openRegions(root), [], 'only once');
  // Missing one region, it waits.
  const other = allReady();
  other.regions.costa.mastered = false;
  assert.equal(specialProgress(other).n, SPECIAL_FROM.length - 1);
  assert.deepEqual(openRegions(other), []);
});

test('its event, the Green Moon Festival, boosts the whole island instead of slowing it down', async () => {
  const { EVENT_OF_ZONE } = await import('../src/data/events.js');
  const def = EVENT_OF_ZONE.sanandres;
  assert.equal(def.id, 'luna_verde');
  assert.equal(def.speed, undefined);
  assert.equal(def.coins, def.actions[0].cost);
  const mult = def.actions.reduce((n, a) => (assert.equal(a.effect.type, 'zoneSpeed'), n * a.effect.mult), 1);
  assert.ok(Math.abs(mult - 2) < 1e-9, `×${mult}`);
  assert.deepEqual(def.objective.medals, [1200, 1500]);
});

test('eight stations in a single chain, each with its ×32 at level 100', () => {
  const chain = chainOf('sanandres');
  assert.equal(chain.length, 8);
  chain.slice(1).forEach((id, k) => assert.equal(PARENT[id], chain[k], id));
  for (const id of chain) {
    const r = RESEARCH.filter((x) => x.requires === id);
    assert.equal(r.length, 1, id);
    assert.equal(r[0].stationLevel, 100);
    assert.equal(r[0].effect.mult, 32);
  }
  // Each station costs more to build than the one before.
  for (let k = 2; k < chain.length; k++) assert.ok(STATIONS_BY_ID[chain[k]].unlockCost > STATIONS_BY_ID[chain[k - 1]].unlockCost);
});

test('the ×32 needs the station and its mule drivers at 100, and multiplies the station, its yard and the warehouse', () => {
  const game = new Game(createInitialState(0, 'sanandres'));
  const s = game.state;
  s.coins = 1e30;
  const st = s.stations.aeropuerto_sai;
  st.level = 100;
  assert.equal(game.quoteResearch('vuelos_directos').reason, 'locked', 'the mule drivers are missing');
  st.transport.level = 100;
  const before = { speed: speedMult(s, 'aeropuerto_sai'), cap: capMult(s, 'aeropuerto_sai'), dispatch: dispatchMult(s, 'sanandres') };
  assert.ok(game.research('vuelos_directos'));
  assert.equal(speedMult(s, 'aeropuerto_sai') / before.speed, 32);
  assert.equal(capMult(s, 'aeropuerto_sai') / before.cap, 32);
  assert.equal(dispatchMult(s, 'sanandres') / before.dispatch, 32);
  // And what it makes is sold: everything the airport makes reaches the Willys.
  s.zones.sanandres.dispatch.level = 100;
  for (let t = 0; t < 120; t += 0.1) game.step(0.1);
  const sold0 = s.stats.sold.viajero ?? 0;
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  const rate = ((s.stats.sold.viajero ?? 0) - sold0) / 60;
  assert.ok(rate > 0.9 * 4096 * 32, `${rate} travelers/s`);
});
