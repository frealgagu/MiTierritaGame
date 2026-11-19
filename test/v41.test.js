import { test } from 'node:test';
import { profileOf } from '../src/sim/renown.js';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/sim/state.js';
import { unlockStation } from '../src/sim/upgrades.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { EVENT_CLOCK_MAX } from '../src/sim/events.js';
import { zoneMaxed } from '../src/sim/legacy.js';
import { buildAll, buyZoneBoost, buyZoneBoostUnlock, planZoneBoost, previewBuild, zoneBoostStatus, zoneBoostTargets, ZONE_BOOST_COST } from '../src/sim/zoneBoost.js';
import { createStationState } from '../src/sim/production.js';
import { maxedRegion } from './helpers/maxed.js';

const bus = { emit: () => {} };

function finca(coins) {
  const s = createInitialState(0);
  profileOf(s); // a lone region save carrying the player's profile
  s.coins = 1e12;
  for (const id of ZONES_BY_ID.finca.chain) unlockStation(s, id, bus);
  s.coins = coins;
  return s;
}

test('the event clock shows ∞ past 999:59 (v4.1)', async () => {
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { formatClock } = await import('../src/ui/EventBar.js');
  assert.equal(formatClock(59 * 60 + 5), '59:05');
  assert.equal(formatClock(EVENT_CLOCK_MAX - 1), '999:58');
  assert.equal(formatClock(EVENT_CLOCK_MAX), '∞');
  assert.equal(formatClock(1000 * 60 + 30), '∞');
});

test('upgrade the whole zone: it shows after restarting the region, costs 10 ⭐ and applies to the region (v4.1)', () => {
  const s = finca(0);
  assert.equal(zoneBoostStatus(s, s, 'finca'), 'hidden', 'without restarting it is not shown');
  s.legacy = { resets: 1 };
  assert.equal(zoneBoostStatus(s, s, 'finca'), 'locked');
  s.profile.renown = ZONE_BOOST_COST - 1;
  assert.equal(buyZoneBoostUnlock(s.profile, 'cafetero'), false, 'not enough Renown');
  s.profile.renown = ZONE_BOOST_COST + 2;
  assert.ok(buyZoneBoostUnlock(s.profile, 'cafetero'));
  assert.equal(s.profile.renown, 2);
  assert.equal(zoneBoostStatus(s, s, 'finca'), 'ready');
  assert.equal(zoneBoostStatus(s, s, 'trapiche'), 'ready', 'the whole region');
  assert.equal(buyZoneBoostUnlock(s.profile, 'cafetero'), false, 'only once');
  // In an event, only if that event was already won with gold.
  const board = { ...s, event: { id: 'broca' } };
  assert.equal(zoneBoostStatus(s, board, 'finca'), 'hidden');
  s.profile.medals = { broca: { best: 'silver' } };
  assert.equal(zoneBoostStatus(s, board, 'finca'), 'hidden');
  s.profile.medals.broca.best = 'gold';
  assert.equal(zoneBoostStatus(s, board, 'finca'), 'ready');
});

test('⬆️ to the next milestone: the lowest and everything below that milestone, only if there is enough for all (v4.1.1)', () => {
  const s = finca(0);
  const chain = ZONES_BY_ID.finca.chain;
  // Levels from the example: 2, 15, 28, 88, 3, 8 (and the rest —haulers, warehouse, and Empaque— at 100).
  [2, 15, 28, 88, 3, 8].forEach((n, i) => (s.stations[chain[i]].level = n));
  s.stations[chain[6]].level = 100;
  for (const id of chain) s.stations[id].transport.level = 100;
  s.zones.finca.dispatch.level = 100;
  const levels = () => chain.slice(0, 6).map((id) => s.stations[id].level);
  const steps = [];
  for (let i = 0; i < 6; i++) {
    const plan = planZoneBoost(s, 'finca');
    if (!plan) break;
    assert.equal(plan.affordable, false, 'without money it cannot be done');
    s.coins = plan.cost;
    assert.ok(buyZoneBoost(s, 'finca', bus));
    assert.equal(s.coins, 0);
    steps.push(levels().join(','));
  }
  assert.deepEqual(steps, ['10,15,28,88,10,10', '25,25,28,88,25,25', '50,50,50,88,50,50', '75,75,75,88,75,75', '100,100,100,100,100,100']);
  assert.equal(planZoneBoost(s, 'finca'), null, 'everything at 100');
});

test('⬆️ also raises the mule drivers, the warehouse and the chivas that bring products from other zones', () => {
  const s = finca(0);
  const targets = zoneBoostTargets(s, 'finca');
  assert.ok(targets.includes('farm:transport') && targets.includes('dispatch:finca'));
  // Lechería receives panela from Trapiche (the route's chiva, once its Paila is built).
  for (const z of ['trapiche', 'lecheria']) {
    s.zones[z].unlocked = true;
    for (const id of ZONES_BY_ID[z].chain) s.stations[id] = createStationState();
  }
  assert.ok(zoneBoostTargets(s, 'lecheria').includes('route:panela'), 'the chiva from the Trapiche to the Lechería');
  // In an event the route goes with its station: not counted.
  assert.equal(zoneBoostTargets({ ...s, event: { id: 'broca' } }, 'lecheria').includes('route:panela'), false);
});

test('🏗️ build: as many as affordable, in order, without raising their level (v4.1.1)', () => {
  const s = createInitialState(0);
  s.coins = 0;
  const chain = ZONES_BY_ID.finca.chain.filter((id) => !s.stations[id]);
  const first = previewBuild(s, 'finca');
  assert.equal(first.count, 0);
  assert.ok(first.next > 0, 'it says how much the next one costs');
  s.coins = 1e12;
  const all = previewBuild(s, 'finca');
  assert.ok(all.count >= chain.length);
  const built = buildAll(s, 'finca', bus);
  assert.equal(built.length, all.count);
  assert.deepEqual(built.slice(0, chain.length), chain, 'in chain order');
  for (const id of built) assert.equal(s.stations[id].level, 1);
  assert.equal(previewBuild(s, 'finca'), null, 'nothing is missing anymore');
});

test('a zone «at the maximum»: everything at 100, its research and its objectives (v4.1)', () => {
  const s = maxedRegion('tolima');
  assert.equal(zoneMaxed(s, 'chamba'), false, 'the objectives are missing');
  for (const g of GOALS_BY_ZONE.chamba) s.goals.claimed.push(g.id);
  assert.ok(zoneMaxed(s, 'chamba'));
  s.stations.pot_modelers.transport.level = 99;
  assert.equal(zoneMaxed(s, 'chamba'), false, 'some mule drivers at 99');
  s.stations.pot_modelers.transport.level = 100;
  s.research = s.research.filter((id) => id !== RESEARCH.find((r) => r.zone === 'chamba').id);
  assert.equal(zoneMaxed(s, 'chamba'), false, 'a research is missing');
});

test('🚌 more frequent chivas: with the album full and a restart, every 30 s and then 15 s, with the same flow (v4.2)', async () => {
  const { buyChivas, profileOf, quoteChivas } = await import('../src/sim/renown.js');
  const { routeCapacity, routeRate, stepRoute, tripTimeOf } = await import('../src/sim/routes.js');
  const { ROUTES_BY_ID } = await import('../src/data/routes.js');
  const { ALBUM } = await import('../src/data/album.js');
  const { restartState } = await import('../src/sim/legacy.js');
  const s = createInitialState(0);
  s.coins = 1e15;
  for (const z of ['trapiche', 'lecheria']) {
    s.zones[z].unlocked = true;
    for (const id of ZONES_BY_ID[z].chain) s.stations[id] = createStationState();
  }
  for (const id of ZONES_BY_ID.finca.chain) unlockStation(s, id, bus);
  const p = profileOf(s);
  p.renown = 100;
  assert.equal(quoteChivas(p, s).reason, 'album');
  p.album = ALBUM.filter((pg) => pg.region === 'cafetero').flatMap((pg) => pg.stickers.map((x) => x.id));
  assert.equal(quoteChivas(p, s).reason, 'restart');
  s.legacy = { resets: 1 };
  const rate = routeRate(s, 'panela');
  const cap = routeCapacity(s, 'panela');
  assert.equal(tripTimeOf(s, ROUTES_BY_ID.panela), 60);
  assert.deepEqual([quoteChivas(p, s).every, quoteChivas(p, s).cost], [30, 10]);
  assert.ok(buyChivas(p, s));
  assert.equal(tripTimeOf(s, ROUTES_BY_ID.panela), 30);
  assert.ok(Math.abs(routeCapacity(s, 'panela') - cap / 2) < 1e-9, 'half per trip');
  assert.ok(Math.abs(routeRate(s, 'panela') - rate) < 1e-9, 'the same flow');
  assert.deepEqual([quoteChivas(p, s).every, quoteChivas(p, s).cost], [15, 20]);
  assert.ok(buyChivas(p, s));
  assert.equal(p.renown, 70);
  assert.equal(tripTimeOf(s, ROUTES_BY_ID.panela), 15);
  assert.ok(Math.abs(routeCapacity(s, 'panela') - cap / 4) < 1e-9, 'a quarter per trip');
  assert.equal(quoteChivas(p, s).reason, 'max');
  // In an event it doesn't change.
  assert.equal(tripTimeOf({ ...s, event: { id: 'broca' } }, ROUTES_BY_ID.panela), 60);
  // Preserved when resetting the region.
  assert.equal(restartState(s).chivas, 15);
  void stepRoute;
});
