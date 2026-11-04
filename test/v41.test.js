import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/sim/state.js';
import { unlockStation } from '../src/sim/upgrades.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { EVENT_CLOCK_MAX } from '../src/sim/events.js';
import { zoneMaxed } from '../src/sim/legacy.js';
import { buyZoneBoost, buyZoneBoostUnlock, followRecommended, planZoneBoost, zoneBoostStatus, ZONE_BOOST_COST } from '../src/sim/zoneBoost.js';
import { maxedRegion } from './helpers/maxed.js';

const bus = { emit: () => {} };

function finca(coins) {
  const s = createInitialState(0);
  s.coins = 1e12;
  for (const id of ZONES_BY_ID.finca.chain) unlockStation(s, id, bus);
  s.coins = coins;
  return s;
}

test('el reloj de los eventos dice ∞ pasado 999:59 (v4.1)', async () => {
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { formatClock } = await import('../src/ui/EventBar.js');
  assert.equal(formatClock(59 * 60 + 5), '59:05');
  assert.equal(formatClock(EVENT_CLOCK_MAX - 1), '999:58');
  assert.equal(formatClock(EVENT_CLOCK_MAX), '∞');
  assert.equal(formatClock(1000 * 60 + 30), '∞');
});

test('mejorar toda la zona: se ve tras reiniciar la región, cuesta 10 ⭐ y vale para la región (v4.1)', () => {
  const s = finca(0);
  assert.equal(zoneBoostStatus(s, s, 'finca'), 'hidden', 'sin reiniciar no se ve');
  s.legacy = { resets: 1 };
  assert.equal(zoneBoostStatus(s, s, 'finca'), 'locked');
  s.profile.renown = ZONE_BOOST_COST - 1;
  assert.equal(buyZoneBoostUnlock(s.profile, 'cafetero'), false, 'no alcanza el Renombre');
  s.profile.renown = ZONE_BOOST_COST + 2;
  assert.ok(buyZoneBoostUnlock(s.profile, 'cafetero'));
  assert.equal(s.profile.renown, 2);
  assert.equal(zoneBoostStatus(s, s, 'finca'), 'ready');
  assert.equal(zoneBoostStatus(s, s, 'trapiche'), 'ready', 'toda la región');
  assert.equal(buyZoneBoostUnlock(s.profile, 'cafetero'), false, 'una sola vez');
  // En un evento, solo si ese evento ya se ganó con oro.
  const board = { ...s, event: { id: 'broca' } };
  assert.equal(zoneBoostStatus(s, board, 'finca'), 'hidden');
  s.profile.medals = { broca: { best: 'silver' } };
  assert.equal(zoneBoostStatus(s, board, 'finca'), 'hidden');
  s.profile.medals.broca.best = 'gold';
  assert.equal(zoneBoostStatus(s, board, 'finca'), 'ready');
});

test('⬆️ +1 y +10 suben todo (estaciones, arrieros y bodega) o nada; Máx sube parejo lo que alcance', () => {
  const s = finca(0);
  const n = ZONES_BY_ID.finca.chain.length * 2 + 1;
  const one = planZoneBoost(s, 'finca', 1);
  assert.equal(one.items.length, n);
  assert.equal(one.levels, n);
  assert.equal(one.affordable, false);
  s.coins = one.cost;
  assert.ok(buyZoneBoost(s, 'finca', 1, bus));
  assert.equal(s.coins, 0);
  for (const id of ZONES_BY_ID.finca.chain) assert.deepEqual([s.stations[id].level, s.stations[id].transport.level], [2, 2], id);
  assert.equal(s.zones.finca.dispatch.level, 2);
  // Máx: nunca queda nada más de un nivel por encima de lo más bajo.
  s.coins = 5e6;
  const plan = buyZoneBoost(s, 'finca', 'max', bus);
  assert.ok(plan.levels > n);
  const levels = [...ZONES_BY_ID.finca.chain.flatMap((id) => [s.stations[id].level, s.stations[id].transport.level]), s.zones.finca.dispatch.level];
  assert.ok(Math.max(...levels) - Math.min(...levels) <= 1, levels.join(','));
  assert.ok(s.coins >= 0);
});

test('🤖 la recomendada se compra mientras alcance (v4.1)', () => {
  const s = finca(1e9);
  const bought = followRecommended(s, 'finca', bus);
  assert.ok(bought.length > 0);
  assert.ok(s.coins >= 0);
  const poor = finca(0);
  assert.deepEqual(followRecommended(poor, 'finca', bus), []);
});

test('una zona «al máximo»: todo en 100, sus investigaciones y sus objetivos (v4.1)', () => {
  const s = maxedRegion('tolima');
  assert.equal(zoneMaxed(s, 'chamba'), false, 'faltan los objetivos');
  for (const g of GOALS_BY_ZONE.chamba) s.goals.claimed.push(g.id);
  assert.ok(zoneMaxed(s, 'chamba'));
  s.stations.pot_modelers.transport.level = 99;
  assert.equal(zoneMaxed(s, 'chamba'), false, 'unos arrieros en 99');
  s.stations.pot_modelers.transport.level = 100;
  s.research = s.research.filter((id) => id !== RESEARCH.find((r) => r.zone === 'chamba').id);
  assert.equal(zoneMaxed(s, 'chamba'), false, 'falta una investigación');
});
