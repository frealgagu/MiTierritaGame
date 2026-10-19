import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOGROS } from '../src/data/logros.js';
import { checkLogros, metric } from '../src/sim/logros.js';
import { createInitialState } from '../src/sim/state.js';
import { restartState } from '../src/sim/legacy.js';

test('los logros tienen niveles crecientes y un premio por nivel', () => {
  for (const l of LOGROS) {
    assert.equal(l.tiers.length, l.reward.length, l.id);
    for (let k = 1; k < l.tiers.length; k++) assert.ok(l.tiers[k] > l.tiers[k - 1], l.id);
    assert.ok(l.text.includes('{n}'), l.id);
  }
});

test('cada nivel se paga una sola vez, y varios a la vez si se alcanzan juntos', () => {
  const s = createInitialState();
  assert.deepEqual(checkLogros(s), []);
  s.stats.sold.coffee_bag = 200000;
  const won = checkLogros(s);
  assert.deepEqual(won.map((w) => [w.logro.id, w.tier]), [['bolsas', 1], ['bolsas', 2]]);
  assert.equal(s.profile.renown, 3);
  assert.deepEqual(checkLogros(s), []);
});

test('lo de las partidas anteriores sigue contando al volver a empezar', () => {
  const s = createInitialState();
  s.stats.sold.coffee_bag = 600;
  s.totalEarned = 5e8;
  s.playTime = 3 * 16 * 480;
  s.zones.pueblo.complete = true;
  s.mastered = true;
  checkLogros(s);
  const next = restartState(s);
  next.stats.sold.coffee_bag = 500;
  assert.equal(metric(next, 'sold:coffee_bag'), 1100);
  assert.equal(metric(next, 'earned'), 5e8);
  assert.equal(metric(next, 'endings'), 1);
  assert.equal(metric(next, 'masteries'), 1);
  assert.ok(Math.abs(metric(next, 'years') - 3) < 1e-9);
  const won = checkLogros(next).map((w) => w.logro.id);
  assert.ok(won.includes('bolsas'));
  assert.ok(!won.includes('pueblo'), 'ya se había pagado en la partida anterior');
});
