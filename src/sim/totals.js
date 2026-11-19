// The whole game's products (v5.12): sold and produced in every run of every region, as counters of their own. Each
// region's run keeps `counted` (everything it sold or produced, whatever the per-product cap of the run), and a
// restart banks it into the player's profile (`profile.totals`), so nothing depends on one region: restarting Eje
// Cafetero, or any other, keeps the totals. Event boards keep their own `counted`, which is not added (they are a game
// apart, as before). Caps in data/caps.js (CAPS.total).
import { CAPS, capAdd } from '../data/caps.js';
import { openRegionStates } from './regions.js';
import { profileOf } from './renown.js';
import { metric } from './logros.js';

const KINDS = ['sold', 'produced'];
const runCount = (state) => (state.counted ??= { sold: 0, produced: 0 });

// Adds to the run's count (called where a product is sold or produced).
export function count(state, kind, n) {
  const c = runCount(state);
  c[kind] = capAdd(c[kind], n, CAPS.total[kind]);
}

// On restart: the finished run's count goes to the player's totals.
export function bankTotals(state, profile) {
  profile.totals ??= { sold: 0, produced: 0 };
  for (const kind of KINDS) profile.totals[kind] = capAdd(profile.totals[kind], state.counted?.[kind] ?? 0, CAPS.total[kind]);
}

// What the whole game sold and produced (banked runs plus every region's current run) and earned.
export function gameTotals(root) {
  const profile = profileOf(root);
  const open = openRegionStates(root);
  const total = (kind) => Math.min(CAPS.total[kind], (profile.totals?.[kind] ?? 0) + open.reduce((n, { state }) => n + (state.counted?.[kind] ?? 0), 0));
  return {
    earned: Math.min(CAPS.lifetimeEarned, open.reduce((n, { state }) => n + metric(state, 'earned', profile), 0)),
    sold: total('sold'),
    produced: total('produced'),
  };
}
