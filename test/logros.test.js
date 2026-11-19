import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOGROS } from '../src/data/logros.js';
import { checkLogros, metric } from '../src/sim/logros.js';
import { createInitialState } from '../src/sim/state.js';
import { restartRegion } from '../src/sim/legacy.js';
import { newGame } from './helpers/game.js';

test('achievements have growing levels and a prize per level', () => {
  for (const l of LOGROS) {
    assert.equal(l.tiers.length, l.reward.length, l.id);
    for (let k = 1; k < l.tiers.length; k++) assert.ok(l.tiers[k] > l.tiers[k - 1], l.id);
    assert.ok(l.text.includes('{n}'), l.id);
  }
});

test('each level pays out only once, and several at once if reached together', () => {
  const root = newGame();
  const s = root.regions.cafetero;
  assert.deepEqual(checkLogros(s, root.profile), []);
  s.stats.sold.coffee_bag = 200000;
  const won = checkLogros(s, root.profile);
  assert.deepEqual(won.map((w) => [w.logro.id, w.tier]), [['bolsas', 1], ['bolsas', 2]]);
  assert.equal(root.profile.renown, 3);
  assert.deepEqual(checkLogros(s, root.profile), []);
});

test('what earlier games did still counts on starting over', () => {
  const root = newGame();
  const p = root.profile;
  const s = root.regions.cafetero;
  s.stats.sold.coffee_bag = 600;
  s.totalEarned = 5e8;
  s.playTime = 3 * 16 * 480;
  s.zones.pueblo.complete = true;
  s.mastered = true;
  checkLogros(s, p);
  const next = restartRegion(root, 'cafetero');
  next.stats.sold.coffee_bag = 500;
  assert.equal(metric(next, 'sold:coffee_bag', p), 1100);
  assert.equal(metric(next, 'earned', p), 5e8);
  assert.equal(metric(next, 'endings', p), 1);
  assert.equal(metric(next, 'masteries', p), 1);
  assert.ok(Math.abs(metric(next, 'years', p) - 3) < 1e-9);
  const won = checkLogros(next, p).map((w) => w.logro.id);
  assert.ok(won.includes('bolsas'));
  assert.ok(!won.includes('pueblo'), 'it had already been paid in the previous game');
});

test('the medal achievements ask for 10 medals per event of their region at the last tier (v5.10)', async () => {
  const { LOGROS } = await import('../src/data/logros.js');
  const { EVENTS, EVENTS_BY_ID } = await import('../src/data/events.js');
  const { REGION_OF_ZONE } = await import('../src/data/regions.js');
  const { CAPS } = await import('../src/data/caps.js');
  for (const l of LOGROS) {
    const [kind, id] = l.metric.split(':');
    const events = kind === 'medals' ? EVENTS.filter((e) => REGION_OF_ZONE[e.zone] === l.region).length : kind === 'eventMedals' && EVENTS_BY_ID[id] ? 1 : 0;
    if (!events) continue;
    assert.deepEqual(l.tiers, [1 * events, 4 * events, 10 * events].map((n, i) => (kind === 'medals' ? n : [1, 4, 10][i])), l.id);
    assert.ok(l.tiers.at(-1) <= events * CAPS.medalsPerKind, `${l.id}: reachable with gold only`);
  }
});
