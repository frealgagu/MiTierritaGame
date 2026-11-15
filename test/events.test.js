import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { EVENTS, EVENT_ACTIONS_BY_ID, EVENT_OF_ZONE, MEDALS } from '../src/data/events.js';
import { EVENT_COOLDOWN, boardObjective, buyAction, createEventState, endEvent, eventDef, eventObjective, eventProgress, eventStatus, finishEvent, medalFor, quoteAction, restartEvent, startEvent, supplyFraction, SUPPLY_TRICKLE } from '../src/sim/events.js';
import { createInitialState } from '../src/sim/state.js';
import { speedMult } from '../src/sim/modifiers.js';
import { restartState } from '../src/sim/legacy.js';
import { DAY_LENGTH } from '../src/sim/calendar.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { PRODUCTS } from '../src/data/products.js';
import { createStationState } from '../src/sim/production.js';

const YEAR = 16 * DAY_LENGTH;
const buildAll = (s) => {
  for (const id of EVENTS[0].stations) s.stations[id] ??= createStationState();
};

test('the events are well built', () => {
  for (const e of EVENTS) {
    for (const id of e.stations) assert.equal(STATIONS_BY_ID[id]?.zone, e.zone, `${e.id}: ${id}`);
    const o = e.objective;
    for (const p of Object.keys(o.items)) assert.ok(PRODUCTS[p]?.zone === e.zone || e.zone === 'pueblo', `${e.id}: ${p}`);
    assert.ok(o.medals[0] < o.medals[1], `${e.id}: gold asks for less time than silver`);
  }
  assert.deepEqual(Object.values(MEDALS).map((m) => m.renown), [4, 2, 1]);
});

// Completes the board goal (and, if buy, purchases all three event upgrades).
function complete(board, buy) {
  const obj = boardObjective(board);
  for (const [p, n] of Object.entries(obj.items)) board.stats[obj.kind][p] = n;
  if (!buy) return;
  board.coins = 1e15;
  for (const a of eventDef(board).actions) buyAction(board, a.id);
}

// Main save with Santander open: in Eje Cafetero, Finca, Trapiche, and Lechería have
// their event stations; in Santander, Guayabera has its own.
function twoRegions() {
  const game = new Game();
  const s = game.state;
  for (const z of ['trapiche', 'lecheria']) game.unlockZone(z);
  for (const def of EVENTS.filter((d) => ['finca', 'trapiche', 'lecheria'].includes(d.zone))) for (const id of def.stations) s.stations[id] ??= createStationState();
  const san = createInitialState(undefined, 'santander');
  san.clockOffset = 0;
  for (const id of EVENT_OF_ZONE.guayabera.stations) san.stations[id] ??= createStationState();
  s.regions = { santander: san };
  return { game, s, san };
}

test('two slots for the whole game, never from the same region (v3.30)', () => {
  const game = new Game();
  const s = game.state;
  assert.equal(eventStatus(s, 'finca').kind, 'locked', 'until their stations are built');
  assert.equal(eventStatus(s, 'trapiche'), null, 'closed zone');
  const two = twoRegions();
  two.game.step(0.1);
  assert.deepEqual(two.s.events.slots.map((x) => x?.zone), ['finca', 'guayabera']);
  assert.equal(eventStatus(two.s, 'finca').kind, 'available');
  assert.equal(eventStatus(two.s, 'guayabera').kind, 'available');
  assert.equal(eventStatus(two.s, 'trapiche').kind, 'waiting', 'the other slot cannot be from the Eje Cafetero');
  assert.equal(startEvent(two.s, 'trapiche'), null);
  assert.equal(two.san.events.boards.guayabera, undefined);
  assert.ok(startEvent(two.s, 'guayabera'));
  assert.ok(two.san.events.boards.guayabera, `the board goes in its region's game`);
});

test('on winning, the board stays open until finished; its slot stays empty for 2 years (v3.30)', () => {
  const { game, s } = twoRegions();
  game.step(0.1);
  const board = startEvent(s, 'finca');
  assert.equal(eventStatus(s, 'finca').kind, 'active');
  assert.equal(startEvent(s, 'finca'), board, 'continue the one in play');
  const first = boardObjective(board);
  complete(board, true);
  board.playTime = 60;
  const r = finishEvent(s, 'finca');
  assert.ok(r.done);
  assert.equal(r.medal, 'gold');
  assert.equal(s.profile.medals.broca.best, 'gold');
  // Won: stays open for viewing (and isn't won twice) until tapping «Finish».
  assert.equal(eventStatus(s, 'finca').kind, 'won');
  assert.equal(startEvent(s, 'finca'), board);
  assert.equal(finishEvent(s, 'finca'), null);
  assert.equal(restartEvent(s, 'finca'), null, 'once won it does not restart');
  assert.ok(endEvent(s, 'finca'));
  assert.equal(s.profile.renown, 4, 'finishing gives nothing more');
  // Its slot waits 2 years: nothing from Eje Cafetero spawns yet.
  game.step(0.1);
  assert.equal(eventStatus(s, 'finca').kind, 'waiting');
  assert.equal(eventStatus(s, 'trapiche').kind, 'waiting');
  assert.ok(Math.abs(eventStatus(s, 'trapiche').nextAt - (s.playTime + EVENT_COOLDOWN)) < 1);
  assert.equal(EVENT_COOLDOWN, 2 * YEAR);
  s.playTime += EVENT_COOLDOWN - 10;
  game.step(0.1);
  assert.equal(eventStatus(s, 'trapiche').kind, 'waiting', 'the 2 years have not passed yet');
  s.playTime += 20;
  game.step(0.1);
  // Time elapsed: Trapiche, never played yet, spawns before Finca; Guayabera stays on its own.
  assert.equal(eventStatus(s, 'trapiche').kind, 'available');
  assert.equal(eventStatus(s, 'finca').kind, 'waiting');
  assert.equal(eventStatus(s, 'guayabera').kind, 'available', 'the other slot went on with its own');
  // Next time Finca spawns it's the second playthrough, with the same challenge (v3.72: one per event).
  assert.equal(eventStatus(s, 'finca').round, 2);
  assert.deepEqual(eventObjective(EVENTS[0]), first);
});

test('restarting begins the same challenge from scratch; finishing without winning gives no medal and uses up the slot (v3.30)', () => {
  const { game, s } = twoRegions();
  game.step(0.1);
  const board = startEvent(s, 'finca');
  complete(board, false);
  board.playTime = 100;
  assert.ok(finishEvent(s, 'finca').secured);
  const fresh = restartEvent(s, 'finca');
  assert.notEqual(fresh, board);
  assert.equal(eventStatus(s, 'finca').board, fresh);
  assert.equal(fresh.playTime, 0);
  assert.equal(fresh.event.medal, undefined, 'the secured medal is erased');
  assert.equal(fresh.event.round, 1, 'the same challenge');
  assert.equal(fresh.coins, EVENTS[0].coins);
  assert.ok(endEvent(s, 'finca'));
  assert.equal(s.profile.renown, 0);
  assert.equal(s.profile.medals.broca, undefined);
  assert.equal(eventStatus(s, 'finca').round, 1, 'the challenge does not advance');
  assert.ok(s.events.slots.some((x) => x?.until !== undefined), 'its slot waits 2 years');
  game.step(0.1);
  assert.equal(eventStatus(s, 'trapiche').kind, 'waiting');
});

test('meeting the objective secures the medal; the event is won by having the three upgrades (v3.7)', () => {
  const game = new Game();
  const s = game.state;
  buildAll(s);
  const board = startEvent(s, 'finca');
  complete(board, false);
  board.playTime = 100;
  const r = finishEvent(s, 'finca');
  assert.ok(r.secured);
  assert.equal(r.medal, 'gold');
  assert.equal(s.profile.renown, 0, 'Renown arrives when it is won');
  // Time passes while buying upgrades: medal no longer changes.
  board.playTime = 5000;
  assert.equal(finishEvent(s, 'finca'), null);
  board.coins = 1e9;
  for (const a of EVENTS[0].actions) buyAction(board, a.id);
  const done = finishEvent(s, 'finca');
  assert.ok(done.done);
  assert.equal(done.medal, 'gold');
  assert.equal(done.time, 100);
  assert.equal(s.profile.renown, 4);
  assert.equal(eventStatus(s, 'finca').kind, 'won');
  endEvent(s, 'finca');
  assert.equal(eventStatus(s, 'finca').kind, 'waiting');
});

test('the medal depends on the board time', () => {
  const obj = { medals: [600, 900] };
  assert.equal(medalFor(obj, 600), 'gold');
  assert.equal(medalFor(obj, 601), 'silver');
  assert.equal(medalFor(obj, 5000), 'bronze');
});

test('the board has its own clock, without nights or seasons, and the borer slows the Cafetal', () => {
  const main = new Game();
  buildAll(main.state);
  const board = startEvent(main.state, 'finca');
  const game = new Game(board);
  assert.ok(Math.abs(speedMult(board, 'farm') - 0.4) < 1e-9);
  assert.equal(speedMult(board, 'wetmill'), 1);
  // 20 min of board time: nights pass on the main game clock, but the board never stops.
  for (let t = 0; t < 1200; t += 0.1) game.step(0.1);
  assert.notEqual(board.stations.farm.status, 'resting');
  assert.ok(board.stats.produced.cherry > 1200 * 0.5 * 0.4 * 0.8, `cherries: ${board.stats.produced.cherry}`);
  assert.equal(main.state.playTime, 0, 'the game does not advance with the board');
  assert.ok(eventProgress(board) >= 0);
});

test(`the event purchases go in order, are paid with the board's coins and remove the borer`, () => {
  const main = new Game();
  buildAll(main.state);
  const board = startEvent(main.state, 'finca');
  const [a, b, c] = EVENTS[0].actions.map((x) => x.id);
  board.coins = 1e9;
  assert.equal(quoteAction(board, b).reason, 'locked');
  assert.ok(buyAction(board, a));
  assert.ok(buyAction(board, b));
  assert.ok(buyAction(board, c));
  assert.ok(Math.abs(speedMult(board, 'farm') - 1) < 1e-9);
  assert.equal(quoteAction(board, a).reason, 'owned');
  assert.ok(EVENT_ACTIONS_BY_ID[a]);
  // Main game research upgrades do not apply on the event board.
  assert.equal(main.quoteResearch && new Game(board).quoteResearch('abono').reason, 'event');
});

test('Renown, medals and the board in play are not lost on restart, which adds 10 ⭐ (v3.12)', () => {
  const main = new Game();
  const s = main.state;
  s.profile.renown = 7;
  s.profile.medals.broca = { best: 'silver', count: { silver: 1 } };
  buildAll(s);
  assert.ok(startEvent(s, 'finca'));
  const next = restartState(s);
  assert.equal(next.profile.renown, 7 + 10);
  assert.deepEqual(next.profile.medals.broca, { best: 'silver', count: { silver: 1 } });
  assert.deepEqual(Object.keys(next.events.boards), ['finca']);
  assert.deepEqual(next.events.slots.map((x) => x?.zone), s.events.slots.map((x) => x?.zone));
});

test('the six boards start and advance toward their objective', () => {
  for (const def of EVENTS) {
    const board = createEventState(def, 1);
    assert.equal(board.coins, def.actions[0].cost, `${def.id}: it starts with enough for the first purchase`);
    const game = new Game(board);
    for (let t = 0; t < 180; t += 0.1) game.step(0.1);
    assert.ok(eventProgress(board) > 0 || Object.values(board.stats.produced).some((n) => n > 0), def.id);
    assert.ok(board.totalEarned > 0, `${def.id}: earns coins`);
  }
});

test('landslide: without the road only a trickle of panela arrives (v4.3.2) and with the purchases it all arrives again', () => {
  const def = EVENTS.find((e) => e.id === 'derrumbe');
  const board = createEventState(def, 1);
  assert.equal(board.stations.chocolate_table.imported.panela_powder, def.stock.panela_powder);
  assert.equal(supplyFraction(board, 'panela_powder'), SUPPLY_TRICKLE);
  assert.equal(supplyFraction(board, 'milk'), 1);
  const game = new Game(board);
  board.coins = 1e12;
  for (const a of def.actions) assert.ok(buyAction(board, a.id));
  assert.equal(supplyFraction(board, 'panela_powder'), 1);
  for (let t = 0; t < 10; t += 0.1) game.step(0.1);
  assert.ok(board.stations.chocolate_table.imported.panela_powder > 0);
});

test('fair: the objective asks for several products and counts each one up to what is asked', () => {
  const def = EVENTS.find((e) => e.id === 'feria');
  const main = new Game();
  main.state.zones.lecheria.unlocked = true;
  for (const id of def.stations) main.state.stations[id] = createStationState();
  const board = startEvent(main.state, 'lecheria');
  const obj = boardObjective(board);
  const [a, b] = Object.keys(obj.items);
  board.stats.sold[a] = obj.items[a] * 5; // extra doesn't count
  assert.ok(Math.abs(eventProgress(board) - obj.items[a] / Object.values(obj.items).reduce((x, y) => x + y)) < 1e-9);
  assert.equal(finishEvent(main.state, 'lecheria'), null);
  for (const [p, n] of Object.entries(obj.items)) board.stats.sold[p] = n;
  assert.ok(b);
  assert.ok(finishEvent(main.state, 'lecheria').secured);
  board.coins = 1e15;
  for (const a of def.actions) buyAction(board, a.id);
  assert.ok(finishEvent(main.state, 'lecheria').done);
});

test('with the region finished, after restarting the events of all its zones come out (v3.8)', async () => {
  const { refillSlots } = await import('../src/sim/events.js');
  const { claimGoal } = await import('../src/sim/goals.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game();
  const s = game.state;
  // Claiming Pueblo's final goal marks the region completed.
  const final = GOALS_BY_ZONE.pueblo.at(-1);
  assert.ok(final.final);
  s.zones.pueblo.unlocked = true;
  s.goals.claimed = GOALS_BY_ZONE.pueblo.slice(0, -1).map((g) => g.id);
  s.stats[final.type][final.product] = final.amount;
  assert.equal(s.regionDone, false);
  assert.ok(claimGoal(s, final.id, game.bus));
  assert.ok(s.regionDone && s.zones.pueblo.complete);
  const next = restartState(s);
  assert.ok(next.regionDone, 'it is kept on restart');
  assert.ok(restartState(next).regionDone, 'and in the following restarts');
  assert.deepEqual(Object.keys(next.zones).filter((z) => next.zones[z].unlocked), ['finca']);
  refillSlots(next);
  assert.deepEqual(next.events.slots.map((x) => x?.zone), [EVENTS[0].zone, undefined], 'the other slot, for another region');
  // Once Finca's is finished, the other slot picks one from an unopened zone.
  startEvent(next, EVENTS[0].zone);
  endEvent(next, EVENTS[0].zone);
  refillSlots(next);
  assert.equal(next.events.slots[1]?.zone, EVENTS[1].zone);
  assert.equal(eventStatus(next, EVENTS[1].zone).kind, 'available', 'even if the zone is not open');
  assert.equal(eventStatus(next, 'pueblo').kind, 'waiting');
  assert.ok(startEvent(next, EVENTS[1].zone), 'it can be played');
  // Without the region completed, only opened zones with their stations.
  const fresh = new Game().state;
  refillSlots(fresh);
  assert.equal(eventStatus(fresh, 'trapiche'), null);
});

test('on the board the event purchases are recommended, not the zone research (v3.8.2)', async () => {
  const { recommendUpgrade } = await import('../src/sim/analysis.js');
  const def = EVENTS[0];
  const game = new Game(createEventState(def, 1));
  const b = game.state;
  const quote = (id, mode) => game.quote(id, mode);
  b.coins = def.actions[0].cost;
  assert.equal(recommendUpgrade(b, quote, def.zone).id, `action:${def.actions[0].id}`);
  // Even with plenty of coins, zone research (like horseshoes) does not appear.
  b.coins = 1e12;
  for (const a of def.actions) b.research.push(a.id);
  const rec = recommendUpgrade(b, quote, def.zone);
  assert.ok(!rec?.id.startsWith('research:'), rec?.id);
  // With medal secured, the remaining purchase even without enough coins.
  b.research = [def.actions[0].id];
  b.coins = 0;
  b.event.medal = 'gold';
  assert.equal(recommendUpgrade(b, quote, def.zone).id, `action:${def.actions[1].id}`);
});

test('on an event board the maximum level is 50 (v3.10.1)', () => {
  const def = EVENTS[0];
  const game = new Game(createEventState(def, 1));
  const b = game.state;
  b.coins = 1e30;
  const id = def.stations[0];
  assert.ok(game.buy(id, 'max'));
  assert.equal(b.stations[id].level, 50);
  assert.ok(game.quote(id, 1).maxed);
  assert.ok(game.quote(`${id}:transport`, 'max').levels <= 50 - b.stations[id].transport.level);
  // In main save, up to 100.
  const g = new Game();
  g.state.coins = 1e30;
  assert.ok(g.buy('farm', 'max'));
  assert.equal(g.state.stations.farm.level, 100);
});

test('region prize: all its events in bronze, silver or gold give 5, 10 and 20 ⭐, once (v3.12)', async () => {
  const { checkMedalBonus, regionEvents } = await import('../src/sim/events.js');
  const p = { renown: 0, medals: {} };
  const set = (medal) => {
    for (const e of regionEvents('cafetero')) p.medals[e.id] = { best: medal, count: {} };
  };
  assert.deepEqual(checkMedalBonus(p), []);
  set('silver');
  assert.deepEqual(checkMedalBonus(p).map((b) => [b.region, b.medal, b.renown]), [['cafetero', 'bronze', 5], ['cafetero', 'silver', 10]]);
  assert.deepEqual(checkMedalBonus(p), [], 'only once');
  set('gold');
  assert.equal(checkMedalBonus(p)[0].renown, 20);
  assert.equal(p.renown, 35);
  assert.equal(p.renownTotal, 35);
});

test('every event has a challenge, and the six of each region are of different types (v3.72)', async () => {
  const { REGIONS } = await import('../src/data/regions.js');
  const { OBJECTIVE_TYPES } = await import('../src/data/events.js');
  // WIP regions (`wip`) don't have events yet; Bogotá, with a single zone, is handled separately (below). Nor
  // does the special zone (v5.4) yet.
  for (const r of REGIONS.filter((x) => !x.wip && !x.special && x.id !== 'bogota')) {
    const types = r.zones.map((z) => EVENT_OF_ZONE[z].objective.type);
    assert.deepEqual(types, OBJECTIVE_TYPES, r.id);
  }
  // Bogotá (v4.5), a single zone with six events: also one of each type.
  const { regionEvents } = await import('../src/sim/events.js');
  // (La Gran Feria, v4.6.1, is the seventh: spawns after the other six, which are one of each type.)
  assert.deepEqual(regionEvents('bogota').filter((e) => !e.after).map((e) => e.objective.type).sort(), [...OBJECTIVE_TYPES].sort());
  for (const e of EVENTS) assert.equal(e.objectives, undefined, e.id);
});

test('a board that was in play before v3.72 ends with the challenge it had', async () => {
  const { LEGACY_OBJECTIVES } = await import('../src/sim/legacyObjectives.js');
  const board = createEventState(EVENT_OF_ZONE.finca, 2);
  assert.deepEqual(boardObjective(board), EVENT_OF_ZONE.finca.objective);
  delete board.event.single; // as previously saved
  assert.deepEqual(boardObjective(board), LEGACY_OBJECTIVES.broca[1]);
  board.event.round = 4;
  assert.deepEqual(boardObjective(board), LEGACY_OBJECTIVES.broca[0]);
});

test('events without gold come out first and those with gold at the end (v3.72)', () => {
  const { game, s } = twoRegions();
  game.step(0.1);
  // Finca and Trapiche already played: Finca with gold, Trapiche with silver, and Finca longer ago.
  for (const id of ['broca', 'molienda', 'feria']) s.profile.medals[id] = { best: 'gold', count: { gold: 1 } };
  s.profile.medals.molienda.best = 'silver';
  s.events.last = { finca: 10, trapiche: 20, lecheria: 30 };
  s.events.count = { finca: 1, trapiche: 1, lecheria: 1 };
  s.events.slots = [null, { zone: 'guayabera' }];
  game.step(0.1);
  assert.equal(s.events.slots[0].zone, 'trapiche', 'the one without gold, even if the Finca has gone unplayed longer');
  // With all at gold, the one unplayed the longest spawns.
  s.profile.medals.molienda.best = 'gold';
  s.events.slots = [null, { zone: 'guayabera' }];
  game.step(0.1);
  assert.equal(s.events.slots[0].zone, 'finca');
});

// Events on demand (v4.7.3): with gold on all events in a region they no longer auto-spawn; for 20 ⭐ any can be played at will,
// with no slot or cooldown, though never more than two open boards.
test('with gold in the whole region events no longer come out on their own and, bought on demand, are played again (v4.7.3)', async () => {
  const { eventsOf, regionEvents, quoteOnDemand, buyOnDemand, startOnDemand, refillSlots } = await import('../src/sim/events.js');
  const game = new Game();
  const s = game.state;
  s.regionDone = true;
  for (const z of Object.keys(s.zones)) s.zones[z].unlocked = true;
  s.profile.medals = Object.fromEntries(regionEvents('cafetero').map((e) => [e.id, { best: 'gold', count: { gold: 1 } }]));
  refillSlots(s);
  assert.deepEqual(eventsOf(s).slots, [null, null], 'they no longer come out on their own');
  assert.equal(startOnDemand(s, 'finca'), null, 'without buying it is not played');
  s.profile.renown = 19;
  assert.equal(quoteOnDemand(s.profile, 'cafetero').reason, 'renown');
  s.profile.renown = 20;
  assert.ok(buyOnDemand(s.profile, 'cafetero'));
  assert.equal(s.profile.renown, 0);
  assert.ok(startOnDemand(s, 'finca'));
  assert.ok(startOnDemand(s, 'trapiche'));
  assert.equal(startOnDemand(s, 'lecheria'), null, 'at most two open');
});

test('events without waiting (v5.9): 100 ⭐ once; any ready event at any time, as many open at once as wanted', async () => {
  const { FREE_EVENTS_COST, buyFreeEvents, quoteFreeEvents } = await import('../src/sim/events.js');
  const { game, s } = twoRegions();
  game.step(0.1);
  s.profile.renown = FREE_EVENTS_COST - 1;
  assert.equal(quoteFreeEvents(s.profile).reason, 'renown');
  s.profile.renown = FREE_EVENTS_COST;
  assert.ok(buyFreeEvents(s.profile));
  assert.equal(s.profile.renown, 0);
  assert.equal(quoteFreeEvents(s.profile).reason, 'owned', 'bought once');
  // Three events of the same region and one of Santander, all open at once.
  for (const zone of ['finca', 'trapiche', 'lecheria', 'guayabera']) assert.equal(eventStatus(s, zone).kind, 'available', zone);
  const boards = ['finca', 'trapiche', 'lecheria', 'guayabera'].map((zone) => startEvent(s, zone));
  assert.ok(boards.every(Boolean), 'more than 2 open, and two of the same region');
  // Finishing one does not make it wait 2 years: it can be played again right away.
  const board = boards[0];
  complete(board, true);
  board.playTime = 60;
  assert.ok(finishEvent(s, 'finca').done);
  assert.ok(endEvent(s, 'finca'));
  game.step(0.1);
  assert.equal(eventStatus(s, 'finca').kind, 'available');
  assert.ok(startEvent(s, 'finca'));
});
