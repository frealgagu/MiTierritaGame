// The whole game's save for tests (v5.13): Eje Cafetero is a region inside it, like the others.
import { createGameState } from '../../src/sim/state.js';
import { exportSave, importSave } from '../../src/core/SaveSystem.js';

export const newGame = (now = 0) => createGameState(now);
// Eje Cafetero's region save.
export const cafeOf = (root) => root.regions.cafetero;
// Saves and loads back through the text backup (every migration runs).
export const reload = (root) => importSave(exportSave(root));

// A format 9 save (until v5.12): Eje Cafetero's own, holding the player's profile, the game-wide event slots and the
// other regions (`regions`, here with Santander open), to check that older saves still load.
import { createInitialState } from '../../src/sim/state.js';
export function format9(now = 0, regions = ['santander']) {
  const root = { ...createInitialState(now, 'cafetero'), version: 9 };
  root.profile = { renown: 0, renownTotal: 0, medals: {}, history: [] };
  root.settings = { sound: true, music: true, zone: 'finca' };
  root.events = { boards: {}, slots: [null, null], last: {}, count: {}, global: true };
  root.regions = Object.fromEntries(regions.map((id) => [id, createInitialState(now, id)]));
  return root;
}
