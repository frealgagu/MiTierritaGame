import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { CAPS } from '../src/data/caps.js';
import { exportSave, importSave } from '../src/core/SaveSystem.js';
import { restartState } from '../src/sim/legacy.js';
import { createInitialState } from '../src/sim/state.js';
import { clockOf } from '../src/sim/calendar.js';
import { count, gameTotals } from '../src/sim/totals.js';
import { capCoins } from '../src/sim/modifiers.js';

const reload = (s) => importSave(exportSave(s));

test('the whole game counts what is produced, as it is produced (v5.12)', () => {
  const game = new Game();
  for (let i = 0; i < 600; i++) game.step(0.5);
  const s = game.state;
  const produced = Object.values(s.stats.produced).reduce((a, b) => a + b, 0);
  assert.ok(produced > 0);
  assert.equal(s.counted.produced, produced);
  assert.equal(gameTotals(s).produced, produced);
});

test('the whole game keeps counting while a product sits at its run cap (v5.12)', () => {
  const s = new Game().state;
  s.stats.sold.coffee_bag = CAPS.run.sold;
  s.stats.sold.coffee_bag += 1e26;
  count(s, 'sold', 1e26);
  capCoins(s);
  assert.equal(s.stats.sold.coffee_bag, CAPS.run.sold, 'the run counter stays at its cap');
  assert.equal(s.counted.sold, 1e26, 'the total keeps the sale');
});

test('restarting Eje Cafetero or another region keeps the totals and the time played (v5.12)', () => {
  let root = reload(new Game().state);
  root.regions = { santander: createInitialState(Date.now(), 'santander') };
  root.counted = { sold: 5e20, produced: 7e20 };
  root.regions.santander.counted = { sold: 1e20, produced: 2e20 };
  root.playTime = 3600 * 50;
  const before = gameTotals(root);
  const time = clockOf(root);
  root = reload(restartState(root));
  assert.deepEqual(gameTotals(root), before, 'after restarting Eje Cafetero');
  assert.equal(clockOf(root), time, 'the time played does not go back to 0');
  root.regions.santander = restartState(root.regions.santander, Date.now(), root.profile);
  root = reload(root);
  assert.deepEqual(gameTotals(root), before, 'after restarting Santander');
});

test('an older save starts its totals from what it already had (v5.12)', () => {
  const s = reload(new Game().state);
  delete s.counted;
  delete s.profile.totals;
  s.stats.sold = { coffee_bag: 30 };
  s.stats.produced = { cherry: 100, washed: 20 };
  s.profile.lifetime = { sold: { coffee_bag: 1000 }, produced: { cherry: 5000 }, earned: 0, playTime: 0 };
  const loaded = reload(s);
  assert.deepEqual(loaded.counted, { sold: 30, produced: 120 });
  assert.deepEqual(loaded.profile.totals, { sold: 1000, produced: 5000 });
  assert.deepEqual([gameTotals(loaded).sold, gameTotals(loaded).produced], [1030, 5120]);
});
