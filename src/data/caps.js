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
  // (v5.12) Per product in the current run of a region: sold 1 Oc («999Sp++»), produced and imported 1 No
  // («999Oc++»).
  run: { sold: 1e27, produced: 1e30, imported: 1e30 },
  // (v5.12) The whole game's products (Statistics › The whole game, ⚙️): sold 1 Dc («999No++»), produced 1000 Dc
  // («999Dc++»). Their own counters, which keep growing while a product sits at its run cap and never depend on one
  // region (see sim/totals.js). Each product summed over every run of its region (achievements) shares these caps.
  total: { sold: 1e33, produced: 1e36 },
  // Coins earned summed over finished runs of a region.
  lifetimeEarned: BIG,
  // Game years lived in a region (achievement «A whole life»). The calendar keeps running; only the
  // counter stops. (v5.10) 100, shown «99++».
  years: 100,
  // Time played shown in the menu and on the ending screens, in hours (the clock keeps running). From
  // the cap on it reads «∞» instead of «999 h++».
  playHours: 1000,
  // (v5.10) Time played in the current run of a region (Statistics and the ending screens), in hours: «∞».
  runHours: 100,
  // Restarts of a region after its second ending, the run number («Game 60») and the times the region
  // was completed or brought to its second ending. A fixed limit, shown without «++»: production stops
  // doubling at the same 60 (×2⁶⁰, MAX_LEGACY_RESETS in sim/modifiers.js); restarting is still allowed.
  resets: 60,
  // Medals of each kind (bronze, silver, gold) won in one event.
  // (v5.10) 10, shown «9++»; the region medal achievements ask for 10 per event at their last tier.
  medalsPerKind: 10,
  // Medals of each kind summed over every event (Statistics), shown «99++».
  medalsShown: 100,
  // Attempts at one event (its round). (v5.10) 30, shown «29++». The round does not change the challenge.
  eventRound: 30,
  // Renown balance and Prestige (all Renown ever earned).
  renown: 10000,
  prestige: 10000, // (v5.10) like the Renown balance
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
