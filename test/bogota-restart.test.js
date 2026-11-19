import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { restartState } from '../src/sim/legacy.js';
import { exportSave, importSave } from '../src/core/SaveSystem.js';
import { createInitialState } from '../src/sim/state.js';

const reload = (s) => importSave(exportSave(s));
function withBogota() {
  const root = reload(new Game().state);
  root.regions = { bogota: createInitialState(Date.now(), 'bogota') };
  root.profile.medals.festival_zona_g = { best: 'gold', count: { gold: 1 } };
  return reload(root);
}

test('restarting Eje Cafetero keeps Bogotá and its medals after reloading (v5.11 bug fix)', () => {
  let root = withBogota();
  root = reload(restartState(root));
  assert.ok(root.regions?.bogota, 'Bogotá is still there');
  assert.ok(root.profile.medals.festival_zona_g?.best, 'its medals too');
});

test('a save already restarted with the old bug (no flag) keeps a current Bogotá (v5.11)', () => {
  const root = withBogota();
  delete root.bogotaNet;
  const loaded = reload(root);
  assert.ok(loaded.regions?.bogota);
  assert.ok(loaded.profile.medals.festival_zona_g?.best);
  assert.equal(loaded.bogotaNet, true);
});

test('the v4.6 migration still wipes an old Bogotá (old goals) (v5.11)', () => {
  const root = withBogota();
  delete root.bogotaNet;
  root.regions.bogota.goals.claimed = ['bz01'];
  const loaded = reload(root);
  assert.equal(loaded.regions?.bogota, undefined);
  assert.equal(loaded.profile.medals.festival_zona_g, undefined);
});
