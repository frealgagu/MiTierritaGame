import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { joinTime, parseAmount, plainAmount, splitTime } from '../src/editor/numbers.js';
import { exportSave, importSave } from '../src/core/SaveSystem.js';
import { newGame, cafeOf } from './helpers/game.js';

test('the save editor reads numbers as the player writes them: suffixes, separators, scientific notation (v5.17)', () => {
  const es = (s) => parseAmount(s, ',');
  const en = (s) => parseAmount(s, '.');
  assert.equal(es('20K'), 20000);
  assert.equal(es('1,5Dc'), 1.5e33);
  assert.equal(es('1.5Dc'), 1.5e33, 'with a suffix a lone point is the decimal one in Spanish too');
  assert.equal(es('999Oc'), 999e27);
  assert.equal(es('1.234.567'), 1234567);
  assert.equal(es('1.234'), 1234, 'a lone point before three digits groups thousands in Spanish');
  assert.equal(es('2,5'), 2.5);
  assert.equal(en('1,234,567'), 1234567);
  assert.equal(en('2.5'), 2.5);
  assert.equal(es('1e30'), 1e30);
  assert.equal(es('3,41354e29'), 3.41354e29);
  assert.equal(es('1.234e30'), 1.234e30);
  assert.equal(es('-3'), -3);
  for (const bad of ['', 'abc', '12xx', '1..2', 'e5']) assert.ok(Number.isNaN(es(bad)), bad);
});

test('what the save editor writes back into a box reads again as the same number (v5.17)', () => {
  for (const [n, d] of [[0, ','], [2.5, ','], [999, '.'], [123456789, ','], [1e36, ','], [3.41354e29, ','], [1.5e33, '.']]) {
    assert.equal(parseAmount(plainAmount(n, d), d), n, `${n} in ${d}`);
  }
  assert.equal(plainAmount(3.413536957880123e29, ','), '3,41354e29', 'six significant digits at most');
  assert.deepEqual(splitTime(3 * 3600 + 25 * 60 + 7.4), { h: 3, m: 25, s: 7 });
  assert.equal(joinTime({ h: 156, m: 20, s: 3 }), 156 * 3600 + 20 * 60 + 3);
});

test('a save changed the way the editor does it exports and opens in the game (v5.17)', () => {
  const root = newGame();
  const cafe = cafeOf(root);
  root.profile.renown = 20000;
  root.profile.medals.broca = { best: 'gold', count: { gold: 3 } };
  root.events.count.finca = 4;
  cafe.coins = 1.5e33;
  cafe.stats.sold.coffee_bag = 1e27;
  cafe.keep.resets = 7;
  delete cafe.stations.farm.stopped;
  const back = importSave(exportSave(root));
  assert.ok(back);
  assert.equal(cafeOf(back).coins, 1.5e33);
  assert.equal(back.profile.keep.cafetero.resets, 7);
  assert.equal(back.events.count.finca, 4);
  assert.equal(back.profile.renown, 10000, 'the game brings values over a cap down to it on load');
});

test('the save editor is its own page, not part of the game or the app (v5.17)', () => {
  assert.ok(existsSync(new URL('../editor/index.html', import.meta.url)));
  const game = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!game.includes('editor'), 'the game does not link to it');
  const flow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(flow, /npm run build:editor/, 'the web publish builds it');
});
