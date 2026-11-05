import { test } from 'node:test';
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

test('⬆️ al próximo hito: lo más bajo y todo lo que esté por debajo de ese hito, solo si alcanza para todo (v4.1.1)', () => {
  const s = finca(0);
  const chain = ZONES_BY_ID.finca.chain;
  // Los niveles del ejemplo: 2, 15, 28, 88, 3, 8 (y lo demás —arrieros, bodega y el Empaque— en 100).
  [2, 15, 28, 88, 3, 8].forEach((n, i) => (s.stations[chain[i]].level = n));
  s.stations[chain[6]].level = 100;
  for (const id of chain) s.stations[id].transport.level = 100;
  s.zones.finca.dispatch.level = 100;
  const levels = () => chain.slice(0, 6).map((id) => s.stations[id].level);
  const steps = [];
  for (let i = 0; i < 6; i++) {
    const plan = planZoneBoost(s, 'finca');
    if (!plan) break;
    assert.equal(plan.affordable, false, 'sin dinero no se puede');
    s.coins = plan.cost;
    assert.ok(buyZoneBoost(s, 'finca', bus));
    assert.equal(s.coins, 0);
    steps.push(levels().join(','));
  }
  assert.deepEqual(steps, ['10,15,28,88,10,10', '25,25,28,88,25,25', '50,50,50,88,50,50', '75,75,75,88,75,75', '100,100,100,100,100,100']);
  assert.equal(planZoneBoost(s, 'finca'), null, 'todo en 100');
});

test('⬆️ también sube los arrieros, la bodega y las chivas que traen productos de otras zonas', () => {
  const s = finca(0);
  const targets = zoneBoostTargets(s, 'finca');
  assert.ok(targets.includes('farm:transport') && targets.includes('dispatch:finca'));
  // La Lechería recibe la panela del Trapiche (la chiva de la ruta, cuando ya está su Paila).
  for (const z of ['trapiche', 'lecheria']) {
    s.zones[z].unlocked = true;
    for (const id of ZONES_BY_ID[z].chain) s.stations[id] = createStationState();
  }
  assert.ok(zoneBoostTargets(s, 'lecheria').includes('route:panela'), 'la chiva del Trapiche a la Lechería');
  // En un evento la ruta va con su estación: no se cuenta.
  assert.equal(zoneBoostTargets({ ...s, event: { id: 'broca' } }, 'lecheria').includes('route:panela'), false);
});

test('🏗️ construir: las que alcance, en orden, sin subirlas de nivel (v4.1.1)', () => {
  const s = createInitialState(0);
  s.coins = 0;
  const chain = ZONES_BY_ID.finca.chain.filter((id) => !s.stations[id]);
  const first = previewBuild(s, 'finca');
  assert.equal(first.count, 0);
  assert.ok(first.next > 0, 'dice cuánto cuesta la siguiente');
  s.coins = 1e12;
  const all = previewBuild(s, 'finca');
  assert.ok(all.count >= chain.length);
  const built = buildAll(s, 'finca', bus);
  assert.equal(built.length, all.count);
  assert.deepEqual(built.slice(0, chain.length), chain, 'en el orden de la cadena');
  for (const id of built) assert.equal(s.stations[id].level, 1);
  assert.equal(previewBuild(s, 'finca'), null, 'ya no falta nada');
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
