import { EventBus } from './EventBus.js';
import { createInitialState } from '../sim/state.js';
import { stepComposter, stepFuel, stepStation } from '../sim/production.js';
import { ZONE_LIST } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { stepByproducts, stepMules } from '../sim/transport.js';
import { stepJeep } from '../sim/dispatch.js';
import { stepRoute } from '../sim/routes.js';
import { ROUTES } from '../data/routes.js';
import { capCoins, offlineCapSeconds } from '../sim/modifiers.js';
import { buyAllResearch, buyResearch, buyUpgrade, quoteResearch, quoteUnlock, quoteUpgrade, unlockStation } from '../sim/upgrades.js';
import { claimAllGoals, claimGoal, unlockZone } from '../sim/goals.js';
import { checkMastery } from '../sim/legacy.js';
import { stepAlerts } from '../sim/alerts.js';
import { clockOf, workOf, workSeconds } from '../sim/calendar.js';
import { boardObjective, eventItems, refillSlots, secureMedal, stepSupply } from '../sim/events.js';
import { buildAll, buyZoneBoost } from '../sim/zoneBoost.js';
import { count } from '../sim/totals.js';

export const TICK = 0.1; // s, simulation advances at 10 ticks/s
// s of game time actually simulated on resume; the rest is extrapolated. Until v3.65 this was 2 h: with a
// save already running, 30 min (nearly 4 game days) produces virtually the same (<1% diff) and opens
// 4x faster.
const MAX_SIMULATED = 30 * 60;

// Extrapolated portion of offline time.
const snapshot = (s) => ({ coins: s.coins, totalEarned: s.totalEarned, sold: { ...s.stats.sold }, produced: { ...s.stats.produced }, imported: { ...s.stats.imported }, counted: { ...s.counted } });
const INCOME_WINDOW = 60; // s window used to compute coins/s

export class Game {
  constructor(state = createInitialState()) {
    this.state = state;
    this.bus = new EventBus();
    this.accumulator = 0;
    this.incomeLog = [];
    this.timeScale = 1; // dev options: accelerates game time
    this.bus.on('sold', ({ coins }) => this.incomeLog.push({ t: this.state.playTime, coins }));
  }

  // Advances real elapsed time in fixed steps (multiplied by `timeScale`).
  update(dtSeconds) {
    this.accumulator += Math.min(dtSeconds, 1) * this.timeScale;
    while (this.accumulator >= TICK) {
      this.step(TICK);
      this.accumulator -= TICK;
    }
  }

  step(dt) {
    this.state.playTime += dt;
    // Byproducts travel down their chute (v4.0); then all unlocked zones produce simultaneously,
    // even though only one is visible.
    stepByproducts(this.state);
    for (const zone of ZONE_LIST) {
      if (!this.state.zones[zone.id]?.unlocked) continue;
      for (const id of zone.chain) {
        if (!this.state.stations[id]) continue;
        if (STATIONS_BY_ID[id].fuel) stepFuel(this.state, id);
        stepStation(this.state, id, dt, this.bus);
      }
    }
    stepComposter(this.state, dt, this.bus);
    stepMules(this.state, dt, this.bus);
    for (const zone of ZONE_LIST) if (this.state.zones[zone.id]?.unlocked) stepJeep(this.state, zone.id, dt, this.bus);
    for (const route of ROUTES) stepRoute(this.state, route.id, dt, this.bus);
    if (this.state.event) stepSupply(this.state, dt);
    else if ((this.state.region ?? 'cafetero') === 'cafetero') refillSlots(this.state); // event slots (v3.30: global across the whole game)
    // Map status alerts (waiting, full warehouse...) are only for visual display: during offline catch-up they are
    // unnecessary (they do not affect production) and skipping them speeds up launch (v3.65.1).
    if (!this.offline) stepAlerts(this.state, dt);
    capCoins(this.state);
  }

  // Offline earnings while closed: simulated in 1 s steps without visual effects (respecting
  // nights and seasons just like live play).   seconds: game seconds   cap: limit in seconds
  // Actually simulate up to MAX_SIMULATED s; the remainder is extrapolated from the second half of the
  // simulated run (coins, sales, production, imports), weighted by active work time in each stretch:
  // nights pause work and each season yields its multiplier.
  catchUp(seconds, cap = offlineCapSeconds(this.state)) {
    const run = this.catchUpSteps(seconds, cap);
    let r = run.next();
    while (!r.done) r = run.next();
    return r.value;
  }

  // Same catch-up, yielding periodically so the splash screen stays responsive and reports progress.
  //   onProgress(fraction from 0 to 1)
  async catchUpAsync(seconds, cap = offlineCapSeconds(this.state), onProgress = () => {}) {
    const run = this.catchUpSteps(seconds, cap);
    let r = run.next();
    let last = performance.now();
    while (!r.done) {
      // About 40 ms of computation per frame.
      if (performance.now() - last > 40) {
        onProgress(r.value);
        await new Promise((ok) => setTimeout(ok, 0));
        last = performance.now();
      }
      r = run.next();
    }
    onProgress(1);
    return r.value;
  }

  // Chunked catch-up: reports progress (0 to 1) every 60 steps and returns the summary at the end.
  *catchUpSteps(seconds, cap) {
    const total = Math.min(Math.max(seconds, 0), cap);
    const s = this.state;
    const before = s.coins;
    const simulated = Math.min(total, MAX_SIMULATED);
    this.bus.muted = true;
    this.offline = true;
    let mark = null;
    try {
      for (let t = 0; t < simulated; t += 1) {
        if (!mark && t >= simulated / 2) mark = { t: clockOf(s), ...snapshot(s) };
        this.step(1);
        if (t % 60 === 59) yield t / simulated;
      }
    } finally {
      this.bus.muted = false;
      this.offline = false;
    }
    const rest = total - simulated;
    if (rest > 0 && mark) {
      const now = clockOf(s);
      const measured = workSeconds(mark.t, now, workOf(this.state));
      const k = measured > 0 ? workSeconds(now, now + rest, workOf(this.state)) / measured : 0;
      const after = snapshot(s);
      s.coins += (after.coins - mark.coins) * k;
      s.totalEarned += (after.totalEarned - mark.totalEarned) * k;
      for (const kind of ['sold', 'produced', 'imported']) {
        for (const [id, n] of Object.entries(after[kind])) s.stats[kind][id] = n + (n - (mark[kind][id] ?? 0)) * k;
      }
      // (v5.12) The whole game's counts grow with the extrapolated part too.
      for (const kind of ['sold', 'produced']) count(s, kind, ((after.counted[kind] ?? 0) - (mark.counted[kind] ?? 0)) * k);
      s.playTime += rest;
      capCoins(s);
    }
    return { seconds: total, coins: s.coins - before };
  }

  // Event board that kept running in the background (v3.67.4, Leave mode): just like offline
  // progress, simulate up to MAX_SIMULATED s and extrapolate the rest from the second half rate
  // (event boards are always daytime). Uncapped: the board keeps producing; only its display clock stops
  // at 999:59. If the goal completes in the extrapolated window, the medal timestamp records that moment
  // based on the measured rate of each remaining product.
  // Returns { seconds, secured } (secured: whether the medal was earned while away).
  catchUpBoard(seconds) {
    const s = this.state;
    const total = Math.max(seconds, 0);
    const simulated = Math.min(total, MAX_SIMULATED);
    let secured = false;
    let mark = null;
    this.bus.muted = true;
    this.offline = true;
    try {
      for (let t = 0; t < simulated; t += 1) {
        if (!mark && t >= simulated / 2) mark = { t: s.playTime, ...snapshot(s) };
        this.step(Math.min(1, simulated - t));
        if (secureMedal(s)) secured = true;
      }
    } finally {
      this.bus.muted = false;
      this.offline = false;
    }
    const rest = total - simulated;
    const span = mark ? s.playTime - mark.t : 0;
    if (rest > 0 && span > 0) {
      const start = s.playTime;
      const after = snapshot(s);
      const kind = boardObjective(s).kind;
      // Time until remaining goal requirements finish at current rates (Infinity if any is stalled).
      let when = 0;
      for (const { product, have, need } of eventItems(s)) {
        if (have >= need) continue;
        const rate = ((after[kind][product] ?? 0) - (mark[kind][product] ?? 0)) / span;
        when = rate > 0 ? Math.max(when, (need - have) / rate) : Infinity;
      }
      const k = rest / span;
      s.coins += (after.coins - mark.coins) * k;
      s.totalEarned += (after.totalEarned - mark.totalEarned) * k;
      for (const kd of ['sold', 'produced', 'imported']) {
        for (const [id, n] of Object.entries(after[kd])) s.stats[kd][id] = n + (n - (mark[kd][id] ?? 0)) * k;
      }
      s.playTime += rest;
      capCoins(s);
      if (!s.event.medal && when <= rest && secureMedal(s, start + when)) secured = true;
    } else if (rest > 0) s.playTime += rest;
    return { seconds: total, secured };
  }

  incomePerSecond() {
    const now = this.state.playTime;
    this.incomeLog = this.incomeLog.filter((e) => now - e.t <= INCOME_WINDOW);
    const window = Math.min(INCOME_WINDOW, Math.max(now, 1));
    return this.incomeLog.reduce((n, e) => n + e.coins, 0) / window;
  }

  quote(id, mode) {
    return quoteUpgrade(this.state, id, mode);
  }

  buy(id, mode) {
    const bought = buyUpgrade(this.state, id, mode, this.bus);
    if (bought) checkMastery(this.state, this.bus);
    return bought;
  }

  // Bottom chain buttons (v4.1.1): build affordable stations in order and upgrade all to next milestone.
  buildAll(zoneId) {
    return buildAll(this.state, zoneId, this.bus);
  }

  boostZone(zoneId) {
    const plan = buyZoneBoost(this.state, zoneId, this.bus);
    if (plan) checkMastery(this.state, this.bus);
    return plan;
  }

  quoteUnlock(id) {
    return quoteUnlock(this.state, id);
  }

  unlock(id) {
    return unlockStation(this.state, id, this.bus);
  }

  quoteResearch(id) {
    return quoteResearch(this.state, id);
  }

  research(id) {
    const bought = buyResearch(this.state, id, this.bus);
    if (bought) checkMastery(this.state, this.bus); // (v3.12: second ending requires all of them)
    return bought;
  }

  // Buy all and Claim all (v3.57): each item emits with `bulk: true` to avoid flooding
  // notifications, followed by one summary toast at the end.
  researchAll(zoneId) {
    const bulk = { emit: (type, data) => this.bus.emit(type, { ...data, bulk: true }) };
    const bought = buyAllResearch(this.state, zoneId, bulk);
    if (bought.length) {
      checkMastery(this.state, this.bus);
      this.bus.emit('researchAll', { ids: bought });
    }
    return bought;
  }

  claimAllGoals(zoneId) {
    const bulk = { emit: (type, data) => this.bus.emit(type, { ...data, bulk: true }) };
    const done = claimAllGoals(this.state, zoneId, bulk);
    if (done.count) {
      checkMastery(this.state, this.bus);
      this.bus.emit('goalsClaimed', done);
    }
    return done;
  }

  claimGoal(id) {
    const claimed = claimGoal(this.state, id, this.bus);
    if (claimed) checkMastery(this.state, this.bus);
    return claimed;
  }

  unlockZone(id) {
    return unlockZone(this.state, id, this.bus);
  }
}
