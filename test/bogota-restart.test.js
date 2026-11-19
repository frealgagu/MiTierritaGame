import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restartState } from '../src/sim/legacy.js';
import { exportSave, importSave } from '../src/core/SaveSystem.js';
import { createInitialState } from '../src/sim/state.js';
import { newGame, cafeOf, reload } from './helpers/game.js';

function withBogota() {
  const root = newGame(Date.now());
  root.regions.bogota = createInitialState(Date.now(), 'bogota');
  root.profile.medals.festival_zona_g = { best: 'gold', count: { gold: 1 } };
  return reload(root);
}
// A format 9 save (until v5.12): Eje Cafetero's own, holding the player's data and the other regions.
function format9(bogota = createInitialState(Date.now(), 'bogota')) {
  const old = { ...createInitialState(Date.now(), 'cafetero'), version: 9 };
  old.profile = { renown: 0, renownTotal: 0, medals: { festival_zona_g: { best: 'gold', count: { gold: 1 } } }, history: [] };
  old.events = { boards: {}, slots: [null, null], last: {}, count: {}, global: true };
  old.regions = { bogota };
  return old;
}

test('restarting Eje Cafetero keeps Bogotá and its medals after reloading (v5.11 bug fix)', () => {
  const root = withBogota();
  root.regions.cafetero = restartState(cafeOf(root), Date.now(), root.profile);
  const back = reload(root);
  assert.ok(back.regions?.bogota, 'Bogotá is still there');
  assert.ok(back.profile.medals.festival_zona_g?.best, 'its medals too');
});

test('a format 9 save already restarted with the old bug (no flag) keeps a current Bogotá (v5.11)', () => {
  const loaded = importSave(exportSave(format9()));
  assert.ok(loaded.regions?.bogota);
  assert.ok(loaded.profile.medals.festival_zona_g?.best);
  assert.equal(loaded.bogotaNet, true);
});

test('the v4.6 migration still wipes an old Bogotá (old goals) (v5.11)', () => {
  const bogota = createInitialState(Date.now(), 'bogota');
  bogota.goals.claimed = ['bz01'];
  const loaded = importSave(exportSave(format9(bogota)));
  assert.equal(loaded.regions?.bogota, undefined);
  assert.equal(loaded.profile.medals.festival_zona_g, undefined);
});
