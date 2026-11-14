import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../src/data/events.js';
import { play } from '../tools/event-bots.js';

// Gold must be hard but achievable (v3.1.1): someone checking the board every 5 s and following one
// of two reasonable strategies (recommended upgrade, saving up to 2 min for the next event
// purchase, or whatever is affordable along the goal path, saving 30 s) achieves it on every goal.
// Medals are calibrated with tools/event-sim.js; if a simulation change puts them out of
// reach, this test catches it.
for (const def of EVENTS) {
  test(`${def.icon} ${def.name}: gold can be achieved`, () => {
    const gold = def.objective.medals[0];
    const times = [];
    for (const [style, save] of [['rec', 120], ['mix', 30]]) {
      times.push(play(def, 1, { style, save, every: 5, limit: gold + 60 }).t);
      if (times.at(-1) <= gold) return;
    }
    assert.fail(`el oro pide ${gold} s y los jugadores automáticos tardan ${times.join(' y ')} s`);
  });
}
