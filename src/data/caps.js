// Counter caps (v5.9): every counter the game keeps stops at a maximum. Wherever a capped counter is
// shown, it reads as the maximum followed by «++» (see `capped`). Adjust the values here only.
//
// Big quantities share the coin cap: 999 Dc (999·10³³), the largest number written with a suffix.
const BIG = 999e33;

export const CAPS = {
  // Coins: balance and coins earned in the current run of a region (since v3.68.3).
  coins: BIG,
  // Sold, produced and imported per product, in the current run and summed over finished runs.
  stat: BIG,
  // Coins earned summed over finished runs of a region.
  lifetimeEarned: BIG,
  // Game years lived in a region (achievement «A whole life»). The calendar keeps running; only the
  // counter stops.
  years: 999,
  // Time played shown in the menu and on the ending screens, in hours.
  playHours: 9999,
  // Restarts of a region after its second ending (the ×2⁶⁰ production cap, since v3.68.3).
  resets: 60,
  // Medals of each kind (bronze, silver, gold) won in one event.
  medalsPerKind: 999,
  // Attempts at one event (its round).
  eventRound: 999,
  // Renown balance and Prestige (all Renown ever earned).
  renown: 99999,
  prestige: 999999,
  // Finished events kept in the history: only the last one.
  history: 1,
};

// Adds n to a counter without passing its cap.
export const capAdd = (value, n, max) => Math.min(max, (value ?? 0) + n);

// Text for a counter: the value, or the maximum followed by «++» once it has reached it.
export const capped = (value, max, format = String) => (value >= max ? `${format(max)}++` : format(value));
