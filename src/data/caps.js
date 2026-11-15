// Counter caps (v5.9): every counter that keeps growing stops at a round maximum. Once there, it is shown
// as the number just below followed by «++»: 1000 Dc reads «999Dc++», 100 reads «99++» (see `capped`).
// Fixed limits that are part of the game (levels, the ×2⁶⁰ multiplier, the event clock) are not here.
// Adjust the values here only.
//
// Big quantities share one cap: 1000 Dc (10³⁶), shown as «999Dc++», the largest number written with a suffix.
const BIG = 1e36;

export const CAPS = {
  // Coins: balance and coins earned in the current run of a region.
  coins: BIG,
  // Sold, produced and imported per product, in the current run and summed over finished runs.
  stat: BIG,
  // Coins earned summed over finished runs of a region.
  lifetimeEarned: BIG,
  // Game years lived in a region (achievement «A whole life»). The calendar keeps running; only the
  // counter stops.
  years: 1000,
  // Time played shown in the menu and on the ending screens, in hours (the clock keeps running). From
  // the cap on it reads «∞» instead of «999 h++».
  playHours: 1000,
  // Restarts of a region after its second ending, the run number («Game 60») and the times the region
  // was completed or brought to its second ending. A fixed limit, shown without «++»: production stops
  // doubling at the same 60 (×2⁶⁰, MAX_LEGACY_RESETS in sim/modifiers.js); restarting is still allowed.
  resets: 60,
  // Medals of each kind (bronze, silver, gold) won in one event.
  medalsPerKind: 100,
  // Attempts at one event (its round).
  eventRound: 100,
  // Renown balance and Prestige (all Renown ever earned).
  renown: 10000,
  prestige: 100000,
  // Finished events kept in the history: only the last one.
  history: 1,
};

// Adds n to a counter without passing its cap.
export const capAdd = (value, n, max) => Math.min(max, (value ?? 0) + n);

// What a capped counter shows: the number just below the cap (999 of each thousand for big ones, so
// 1000 Dc reads 999 Dc), followed by «++».
export const shownCap = (max) => (max >= 1e6 ? (max / 1000) * 999 : max - 1);

// Text for a counter: the value, or the number just below the cap followed by «++» once it is reached.
export const capped = (value, max, format = String) => (value >= max ? `${format(shownCap(max))}++` : format(value));
