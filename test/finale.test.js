import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOGROS } from '../src/data/logros.js';
import { REGIONS } from '../src/data/regions.js';
import { PEOPLE } from '../src/data/lore.js';
import { FINALE_LINES, FINALE_TEXT } from '../src/data/finale.js';
import { finaleButtonShown, finaleDue, finaleProgress, finaleUnlocked } from '../src/sim/finale.js';
import { openSpecial } from '../src/sim/regions.js';
import { newGame } from './helpers/game.js';
import en from '../src/i18n/en/content/finale.js';
import pt from '../src/i18n/pt/content/finale.js';
import fr from '../src/i18n/fr/content/finale.js';

test('the grand finale opens only with every achievement of every region at its last tier (v5.9)', () => {
  const profile = { logros: {} };
  assert.deepEqual(finaleProgress(profile), { have: 0, total: LOGROS.length, ready: false });
  for (const l of LOGROS) profile.logros[l.id] = l.tiers.length;
  const last = LOGROS.at(-1);
  profile.logros[last.id] = last.tiers.length - 1;
  assert.equal(finaleProgress(profile).have, LOGROS.length - 1);
  assert.ok(!finaleUnlocked(profile) && !finaleDue(profile));
  profile.logros[last.id] = last.tiers.length;
  assert.ok(finaleUnlocked(profile));
  assert.ok(finaleDue(profile), 'plays by itself the first time');
  profile.grandFinaleSeen = true;
  assert.ok(!finaleDue(profile), 'and only once');
  assert.ok(finaleUnlocked(profile), 'it can still be watched again');
});

test('every keeper of every region has a grand finale line, in every language (v5.9)', () => {
  const zones = REGIONS.filter((r) => !r.hidden).flatMap((r) => r.zones).filter((z) => PEOPLE[z]);
  assert.ok(zones.length >= 56);
  for (const z of zones) assert.ok(FINALE_LINES[z], `line for ${z}`);
  for (const [lang, c] of Object.entries({ en, pt, fr })) {
    assert.deepEqual(Object.keys(c.lines).sort(), Object.keys(FINALE_LINES).sort(), `${lang} lines`);
    assert.deepEqual(Object.keys(c.text).sort(), Object.keys(FINALE_TEXT).sort(), `${lang} texts`);
    for (const [k, v] of Object.entries(c.lines)) assert.ok(v.trim() && v !== FINALE_LINES[k], `${lang} ${k} translated`);
  }
});

test('the grand finale is one more achievement, paid once, outside the count it depends on (v5.9)', async () => {
  const { GRAN_FINAL_LOGRO } = await import('../src/data/logros.js');
  const { checkFinaleLogro } = await import('../src/sim/finale.js');
  assert.ok(!LOGROS.includes(GRAN_FINAL_LOGRO), 'not counted toward itself');
  const profile = { renown: 0, logros: {} };
  assert.deepEqual(checkFinaleLogro(profile), []);
  for (const l of LOGROS) profile.logros[l.id] = l.tiers.length;
  const won = checkFinaleLogro(profile);
  assert.equal(won.length, 1);
  assert.equal(won[0].logro.id, 'gran_final');
  assert.equal(profile.renown, GRAN_FINAL_LOGRO.reward[0]);
  assert.deepEqual(checkFinaleLogro(profile), [], 'only once');
  assert.equal(profile.renown, GRAN_FINAL_LOGRO.reward[0]);
  assert.ok(finaleUnlocked(profile), 'its own tier does not change the count');
});

test('the grand finale button shows once the special zone is finished, or with every achievement (v5.16)', () => {
  const root = newGame();
  assert.equal(finaleButtonShown(root), false, 'not at the start');
  const id = openSpecial(root, 0);
  assert.ok(id, 'the special zone opens');
  assert.equal(finaleButtonShown(root), false, 'open is not finished');
  root.regions[id].mastered = true;
  assert.equal(finaleButtonShown(root), true, 'its second ending shows the button');
  root.regions[id].mastered = false;
  root.regions[id].keep.resets = 1;
  assert.equal(finaleButtonShown(root), true, 'and it stays after restarting the special zone');
  // Without the special zone, every achievement is enough.
  const other = newGame();
  other.profile.logros = Object.fromEntries(LOGROS.map((l) => [l.id, l.tiers.length]));
  assert.equal(finaleButtonShown(other), true);
});
