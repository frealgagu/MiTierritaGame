// Automated event players (used by tools/event-sim.js to calibrate medals and
// test/events.test.js to verify that gold is achievable).
//   estilo  obj: upgrades the cheapest item on the path to the goal (stations, haulers, and if
//                selling is needed, dispatch)
//           rec: follows the «recommended upgrade» (which on the board looks only at the goal path)
//           mix: follows the recommendation if already affordable; otherwise like obj (doesn't save for rec)
//   ahorro  buys the next event upgrade as soon as affordable; if not enough yet but within
//           `save` seconds of income, waits to save up (0 = never waits)
//   every   how many seconds between decisions (1 = very attentive player; 30 = occasional checker)
import { Game } from '../src/core/Game.js';
import { createEventState, eventProgress, quoteAction, buyAction, objectiveUpgrades } from '../src/sim/events.js';
import { recommendUpgrade } from '../src/sim/analysis.js';

export const STYLES = ['obj', 'rec', 'mix'];
export const SAVES = [0, 30, 60, 120];

// Plays that year's goal and returns { t (seconds), bought (event purchases with timestamp), board }.
export function play(def, year, { style = 'rec', save = 30, every = 1, limit = 2 * 3600 } = {}) {
  const board = createEventState(def, year);
  const game = new Game(board);
  const cheapest = () => objectiveUpgrades(board).map((x) => [x, game.quote(x, 1)]).filter(([, q]) => q.affordable).sort((a, b) => a[1].cost - b[1].cost)[0]?.[0];
  const bought = [];
  let t = 0;
  // Decides at second zero too: the board starts with coins.
  for (;;) {
    for (let n = 0; n < 60; n++) {
      const next = def.actions.find((a) => !board.research.includes(a.id));
      if (next && quoteAction(board, next.id).ok) {
        buyAction(board, next.id);
        bought.push([next.id, t]);
        continue;
      }
      if (next && next.cost - board.coins < save * game.incomePerSecond()) break;
      let id = null;
      if (style === 'obj') id = cheapest();
      else {
        const r = recommendUpgrade(board, (x, mode) => game.quote(x, mode), def.zone);
        id = r && !r.id.startsWith('research:') && !r.id.startsWith('action:') && game.quote(r.id, 1).affordable ? r.id : null;
        if (style === 'mix' && !id) id = cheapest();
      }
      if (!id || !game.buy(id, 1)) break;
    }
    if (eventProgress(board) >= 1 || t >= limit) break;
    for (let k = 0; k < every * 10; k++) game.step(0.1);
    t += every;
  }
  return { t, bought, board };
}

// The fastest across all styles and saving thresholds, deciding every second: { t, style, save }.
export function bestRun(def, year, opts = {}) {
  let best = null;
  for (const style of STYLES) {
    for (const save of SAVES) {
      const { t } = play(def, year, { ...opts, style, save });
      if (!best || t < best.t) best = { t, style, save };
    }
  }
  return best;
}
