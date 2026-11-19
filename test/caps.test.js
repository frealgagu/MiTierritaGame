import { test } from 'node:test';
import { World } from '../src/core/World.js';
import { newGame, format9 } from './helpers/game.js';
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
  s.stats.sold.coffee_bag = CAPS.run.sold * 3;
  s.stats.produced.cherry = CAPS.run.produced * 2;
  s.totalEarned = CAPS.coins * 2;
  capCoins(s);
  assert.equal(s.stats.sold.coffee_bag, CAPS.run.sold);
  assert.equal(s.stats.produced.cherry, CAPS.run.produced);
  assert.equal(s.totalEarned, CAPS.coins);
});

test('finished runs keep adding past the run cap up to the all-runs cap, and the years counter stops at its cap (v5.10)', () => {
  const root = newGame();
  const s = root.regions.cafetero;
  const p = root.profile;
  s.stats.sold.coffee_bag = CAPS.run.sold;
  bankRun(s, p);
  bankRun(s, p);
  assert.equal(p.lifetime.sold.coffee_bag, 2 * CAPS.run.sold, 'restarts count');
  assert.equal(metric(s, 'sold:coffee_bag', p), 3 * CAPS.run.sold);
  p.lifetime.sold.coffee_bag = CAPS.total.sold - 1;
  bankRun(s, p);
  assert.equal(p.lifetime.sold.coffee_bag, CAPS.total.sold);
  assert.equal(metric(s, 'sold:coffee_bag', p), CAPS.total.sold);
  s.playTime = 1e12;
  assert.equal(metric(s, 'years', p), CAPS.years);
});

test('the event history keeps only the last finished event, and medals per kind stop at their cap (v5.9)', () => {
  const root = newGame();
  const game = new World(root);
  const cafe = root.regions.cafetero;
  for (const id of EVENT_OF_ZONE.finca.stations) cafe.stations[id] ??= createStationState();
  const def = EVENTS.find((d) => d.zone === 'finca');
  root.profile.medals[def.id] = { best: 'gold', count: { gold: CAPS.medalsPerKind } };
  root.profile.history = [{ event: 'old', round: 1, medal: 'bronze', time: 1 }];
  game.step(0.1);
  const board = startEvent(root, 'finca');
  const obj = boardObjective(board);
  for (const [p, n] of Object.entries(obj.items)) board.stats[obj.kind][p] = n;
  board.coins = 1e15;
  for (const a of eventDef(board).actions) buyAction(board, a.id);
  board.playTime = 60;
  assert.ok(finishEvent(root, 'finca').done);
  endEvent(root, 'finca');
  assert.equal(root.profile.history.length, CAPS.history);
  assert.equal(root.profile.history.at(-1).event, def.id);
  assert.equal(root.profile.medals[def.id].count.gold, CAPS.medalsPerKind);
});

test('loading a save trims the history and brings counters down to their caps (v5.9)', () => {
  const s = format9(0, []);
  s.profile.history = Array.from({ length: 50 }, (_, i) => ({ event: 'broca', round: i + 1, medal: 'gold', time: 60 }));
  s.profile.renown = CAPS.renown * 5;
  s.profile.renownTotal = CAPS.prestige * 5;
  s.profile.medals.broca = { best: 'gold', count: { gold: CAPS.medalsPerKind * 2 } };
  s.profile.lifetime = { sold: { coffee_bag: CAPS.total.sold * 4 }, produced: {}, earned: CAPS.lifetimeEarned * 4, playTime: 0 };
  const loaded = importSave(exportSave(s));
  assert.equal(loaded.profile.history.length, 1);
  assert.equal(loaded.profile.history[0].round, 50, 'the last one is kept');
  assert.equal(loaded.profile.renown, CAPS.renown);
  assert.equal(loaded.profile.renownTotal, CAPS.prestige);
  assert.equal(loaded.profile.medals.broca.count.gold, CAPS.medalsPerKind);
  assert.equal(loaded.profile.lifetime.sold.coffee_bag, CAPS.total.sold);
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
  const { restartRegion } = await import('../src/sim/legacy.js');
  const { legacyMult, MAX_LEGACY_RESETS } = await import('../src/sim/modifiers.js');
  const { newGame } = await import('./helpers/game.js');
  const root = newGame();
  root.regions.cafetero.keep.resets = CAPS.resets - 1;
  let s = restartRegion(root, 'cafetero');
  assert.equal(s.keep.resets, 60);
  s = restartRegion(root, 'cafetero');
  assert.equal(s.keep.resets, 60, 'stays at 60');
  assert.equal(legacyMult(s), 2 ** MAX_LEGACY_RESETS);
  s.mastered = true;
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  const last = REGIONS_BY_ID.cafetero.zones.at(-1);
  s.zones[last] = { ...s.zones[last], complete: true };
  assert.equal(metric(s, 'masteries', root.profile), 60, 'not 61');
  assert.equal(metric(s, 'endings', root.profile), 60, 'not 61');
});

test('the v5.12 product caps read as agreed, and run time ∞ from 100 h', async () => {
  const { cappedRun, cappedTotal, cappedRunTime, cappedPlayTime } = await import('../src/ui/capped.js');
  assert.equal(cappedRun('sold', CAPS.run.sold), '999Sp++');
  assert.equal(cappedRun('produced', CAPS.run.produced), '999Oc++');
  assert.equal(cappedTotal('sold', CAPS.total.sold), '999No++');
  assert.equal(cappedTotal('produced', CAPS.total.produced), '999Dc++');
  assert.equal(cappedRunTime(CAPS.runHours * 3600), '∞');
  assert.notEqual(cappedRunTime(99 * 3600), '∞');
  assert.notEqual(cappedPlayTime(CAPS.runHours * 3600), '∞', 'the whole game still goes to 1000 h');
});
