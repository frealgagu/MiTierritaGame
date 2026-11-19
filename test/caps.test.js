import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPS, capAdd, capped } from '../src/data/caps.js';
import { Game } from '../src/core/Game.js';
import { exportSave, importSave } from '../src/core/SaveSystem.js';
import { EVENTS, EVENT_OF_ZONE } from '../src/data/events.js';
import { boardObjective, buyAction, eventDef, finishEvent, endEvent, startEvent } from '../src/sim/events.js';
import { gainRenown } from '../src/sim/renown.js';
import { bankRun, metric } from '../src/sim/logros.js';
import { capCoins } from '../src/sim/modifiers.js';
import { createStationState } from '../src/sim/production.js';
import { cappedPlayTime, cappedRenown } from '../src/ui/capped.js';

test('a capped counter reads as its maximum followed by ++ (v5.9)', () => {
  assert.equal(capped(5, 10), '5');
  assert.equal(capped(10, 10), '9++');
  assert.equal(capped(12, 10), '9++');
  assert.equal(capAdd(8, 5, 10), 10);
  assert.equal(capAdd(undefined, 3, 10), 3);
  assert.ok(cappedRenown(CAPS.renown).endsWith('++'));
  assert.ok(!cappedRenown(5).endsWith('++'));
  assert.equal(cappedPlayTime(CAPS.playHours * 3600), '∞');
  assert.notEqual(cappedPlayTime(3600), '∞');
});

test('Renown, Prestige and per-product counters stop at their caps (v5.9)', () => {
  const profile = { renown: CAPS.renown - 2, renownTotal: CAPS.prestige - 1 };
  gainRenown(profile, 10);
  assert.equal(profile.renown, CAPS.renown);
  assert.equal(profile.renownTotal, CAPS.prestige);
  const s = new Game().state;
  s.stats.sold.coffee_bag = CAPS.stat * 3;
  s.stats.produced.cherry = CAPS.stat * 2;
  s.totalEarned = CAPS.coins * 2;
  capCoins(s);
  assert.equal(s.stats.sold.coffee_bag, CAPS.stat);
  assert.equal(s.stats.produced.cherry, CAPS.stat);
  assert.equal(s.totalEarned, CAPS.coins);
});

test('finished runs keep adding past the run cap up to the all-runs cap, and the years counter stops at its cap (v5.10)', () => {
  const s = new Game().state;
  s.stats.sold.coffee_bag = CAPS.stat;
  bankRun(s, s.profile);
  bankRun(s, s.profile);
  assert.equal(s.profile.lifetime.sold.coffee_bag, 2 * CAPS.stat, 'restarts count');
  assert.equal(metric(s, 'sold:coffee_bag'), 3 * CAPS.stat);
  s.profile.lifetime.sold.coffee_bag = CAPS.statTotal - 1;
  bankRun(s, s.profile);
  assert.equal(s.profile.lifetime.sold.coffee_bag, CAPS.statTotal);
  assert.equal(metric(s, 'sold:coffee_bag'), CAPS.statTotal);
  s.playTime = 1e12;
  assert.equal(metric(s, 'years'), CAPS.years);
});

test('the event history keeps only the last finished event, and medals per kind stop at their cap (v5.9)', () => {
  const game = new Game();
  const s = game.state;
  for (const id of EVENT_OF_ZONE.finca.stations) s.stations[id] ??= createStationState();
  const def = EVENTS.find((d) => d.zone === 'finca');
  s.profile.medals[def.id] = { best: 'gold', count: { gold: CAPS.medalsPerKind } };
  s.profile.history = [{ event: 'old', round: 1, medal: 'bronze', time: 1 }];
  game.step(0.1);
  const board = startEvent(s, 'finca');
  const obj = boardObjective(board);
  for (const [p, n] of Object.entries(obj.items)) board.stats[obj.kind][p] = n;
  board.coins = 1e15;
  for (const a of eventDef(board).actions) buyAction(board, a.id);
  board.playTime = 60;
  assert.ok(finishEvent(s, 'finca').done);
  endEvent(s, 'finca');
  assert.equal(s.profile.history.length, CAPS.history);
  assert.equal(s.profile.history.at(-1).event, def.id);
  assert.equal(s.profile.medals[def.id].count.gold, CAPS.medalsPerKind);
});

test('loading a save trims the history and brings counters down to their caps (v5.9)', () => {
  const s = new Game().state;
  s.profile.history = Array.from({ length: 50 }, (_, i) => ({ event: 'broca', round: i + 1, medal: 'gold', time: 60 }));
  s.profile.renown = CAPS.renown * 5;
  s.profile.renownTotal = CAPS.prestige * 5;
  s.profile.medals.broca = { best: 'gold', count: { gold: CAPS.medalsPerKind * 2 } };
  s.profile.lifetime = { sold: { coffee_bag: CAPS.statTotal * 4 }, produced: {}, earned: CAPS.lifetimeEarned * 4, playTime: 0 };
  const loaded = importSave(exportSave(s));
  assert.equal(loaded.profile.history.length, 1);
  assert.equal(loaded.profile.history[0].round, 50, 'the last one is kept');
  assert.equal(loaded.profile.renown, CAPS.renown);
  assert.equal(loaded.profile.renownTotal, CAPS.prestige);
  assert.equal(loaded.profile.medals.broca.count.gold, CAPS.medalsPerKind);
  assert.equal(loaded.profile.lifetime.sold.coffee_bag, CAPS.statTotal);
  assert.equal(loaded.profile.lifetime.earned, CAPS.lifetimeEarned);
});

test('a capped counter shows the number just below its cap followed by ++ (v5.9)', async () => {
  const { cappedCoins, cappedCount, cappedPrestige, cappedRenown } = await import('../src/ui/capped.js');
  assert.equal(cappedCoins(CAPS.coins), '999Dc++');
  assert.equal(cappedCount(CAPS.medalsPerKind, CAPS.medalsPerKind), '9++');
  assert.equal(cappedCount(CAPS.eventRound, CAPS.eventRound), '29++');
  assert.equal(cappedCount(CAPS.years, CAPS.years), '99++');
  assert.equal(cappedRenown(CAPS.renown), '9.999++');
  assert.equal(cappedPrestige(CAPS.prestige), '9.999++');
  assert.equal(cappedRenown(150), '150');
});

test('restarts, the run number and the completed / second-ending counts stop at 60 (v5.9)', async () => {
  const { restartState } = await import('../src/sim/legacy.js');
  const { legacyMult, MAX_LEGACY_RESETS } = await import('../src/sim/modifiers.js');
  let s = new Game().state;
  s.legacy = { resets: CAPS.resets - 1 };
  s = restartState(s);
  assert.equal(s.legacy.resets, 60);
  s = restartState(s);
  assert.equal(s.legacy.resets, 60, 'stays at 60');
  assert.equal(legacyMult(s), 2 ** MAX_LEGACY_RESETS);
  s.mastered = true;
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  const last = REGIONS_BY_ID.cafetero.zones.at(-1);
  s.zones[last] = { ...s.zones[last], complete: true };
  assert.equal(metric(s, 'masteries'), 60, 'not 61');
  assert.equal(metric(s, 'endings'), 60, 'not 61');
});

test('the v5.10 caps read as agreed: products 999Sp++ per run and 999Oc++ over every run, run time ∞ from 100 h', async () => {
  const { cappedStat, cappedStatTotal, cappedRunTime, cappedPlayTime } = await import('../src/ui/capped.js');
  assert.equal(cappedStat(CAPS.stat), '999Sp++');
  assert.equal(cappedStatTotal(CAPS.statTotal), '999Oc++');
  assert.equal(cappedRunTime(CAPS.runHours * 3600), '∞');
  assert.notEqual(cappedRunTime(99 * 3600), '∞');
  assert.notEqual(cappedPlayTime(CAPS.runHours * 3600), '∞', 'the whole game still goes to 1000 h');
});
