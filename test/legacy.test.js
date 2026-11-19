import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { masteryParts, masteryReady, maxedCount, restartRegion, stationsOf } from '../src/sim/legacy.js';
import { gameWith, newGame } from './helpers/game.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { REGION_OF_ZONE } from '../src/data/regions.js';
import { legacyMult } from '../src/sim/modifiers.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Chain tests: always daytime and no season (calendar is tested in calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// All six zones open, everything built at the same level.
function everything(level, resets = 0) {
  const game = new Game();
  const s = game.state;
  s.keep.resets = resets;
  s.coins = 1e30;
  for (const z of ZONE_LIST.slice(1)) game.unlockZone(z.id);
  for (const z of ZONE_LIST) for (const id of chainOf(z.id).slice(1)) game.unlock(id);
  game.unlock('composter');
  for (const st of Object.values(s.stations)) {
    st.level = level;
    st.transport.level = level;
  }
  for (const z of Object.values(s.zones)) z.dispatch.level = level;
  for (const r of Object.values(s.routes)) r.level = level;
  return game;
}

// Everything else the second ending requires (v3.12): all goals and all Eje research
// Cafetero.
function allClaimed(s) {
  s.goals.claimed = Object.keys(s.zones).flatMap((z) => GOALS_BY_ZONE[z].map((g) => g.id));
  s.research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === 'cafetero').map((r) => r.id);
}

test('each restart doubles production: ×1, ×2, ×4, ×8', () => {
  const income = [0, 1, 2, 3].map((resets) => {
    const s = everything(30, resets).state;
    assert.equal(legacyMult(s), 2 ** resets);
    return analyzeChain(s, 'finca').rows.find((r) => r.id === 'packer').output;
  });
  for (let k = 1; k < income.length; k++) assert.ok(Math.abs(income[k] / income[k - 1] - 2) < 1e-9, `${income[k]} / ${income[k - 1]}`);
});

test('with ×8 production the chain still balances: at level 100 no yard fills up', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const game = everything(100, 3);
  const s = game.state;
  for (const r of RESEARCH) s.research.push(r.id);
  run(game, 400);
  const blocked = {};
  for (let i = 0; i < 1000; i++) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.deepEqual(blocked, {});
});

test('the second ending comes on raising the last station to level 100', () => {
  const game = everything(100);
  const s = game.state;
  allClaimed(s);
  s.zones.pueblo.complete = true;
  assert.equal(stationsOf(s).length, 38, 'the Eje Cafetero ones');
  s.stations.export_dock.level = 99;
  assert.equal(maxedCount(s), 37);
  const events = [];
  game.bus.on('mastered', (e) => events.push(e));
  assert.ok(game.buy('farm:transport', 1) || true); // other purchases don't trigger it
  assert.equal(events.length, 0);
  assert.ok(game.buy('export_dock', 1));
  assert.equal(events.length, 1);
  assert.equal(s.mastered, true);
  // Only once.
  game.buy('dispatch:pueblo', 1);
  assert.equal(events.length, 1);
});

test(`without the first ending there is no second: it comes on collecting the Pueblo's containers`, async () => {
  const game = everything(100);
  const s = game.state;
  allClaimed(s);
  const events = [];
  game.bus.on('mastered', (e) => events.push(e));
  // Everything at level 100, but Pueblo incomplete: doesn't count.
  s.stations.export_dock.level = 99;
  assert.ok(game.buy('export_dock', 1));
  assert.equal(maxedCount(s), stationsOf(s).length);
  assert.equal(s.mastered, false);
  assert.equal(events.length, 0);
  // Claims Pueblo's final goal (exporting containers), the first ending.
  s.goals.claimed = s.goals.claimed.filter((id) => id !== GOALS_BY_ZONE.pueblo.at(-1).id);
  const final = GOALS_BY_ZONE.pueblo.at(-1);
  s.stats.sold[final.product] = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(s.zones.pueblo.complete, true);
  assert.equal(s.mastered, true);
  assert.equal(events.length, 1);
});

test('starting over: everything from scratch, with production doubled and the previous settings', () => {
  const game = everything(100, 1);
  const s = game.state;
  const root = gameWith(s);
  s.keep.resets = 1;
  s.mastered = true;
  s.playTime = 36000;
  s.totalEarned = 1e20;
  s.hints.push('wetmill');
  const next = restartRegion(root, 'cafetero');
  assert.equal(next.keep.resets, 2);
  assert.equal(legacyMult(next), 4);
  assert.deepEqual(Object.keys(root.profile.keep.cafetero).sort(), ['done', 'resets'], 'no game log (v4.0)');
  assert.equal(next.coins, 0);
  assert.equal(next.playTime, 0);
  assert.equal(next.mastered, false);
  assert.deepEqual(Object.keys(next.stations), ['farm']);
  assert.equal(next.zones.trapiche.unlocked, false);
  assert.deepEqual(next.research, []);
  assert.equal(next.settings, undefined, 'the settings belong to the whole game (v5.13)');
  assert.ok(next.hints.includes('wetmill'));
  // And Finca produces double... of double.
  const g = new Game(next);
  run(g, 60);
  assert.ok(g.state.coins > 0);
});

test('a v1.5 save loads without a multiplier and without the second ending', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  delete old.legacy;
  delete old.mastered;
  const store = { 'mitierrita.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame().regions.cafetero;
  delete globalThis.localStorage;
  assert.equal(legacyMult(s), 1);
  assert.equal(s.mastered, false);
});

test('Mastery ×4 with the whole zone at 75 and Supremacy ×8 with all of it at 100', async () => {
  const { speedMult } = await import('../src/sim/modifiers.js');
  const game = everything(74);
  const s = game.state;
  assert.equal(game.quoteResearch('maestria_finca').reason, 'locked');
  for (const id of ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer', 'composter']) s.stations[id].level = 75;
  assert.ok(game.research('maestria_finca'));
  assert.equal(speedMult(s, 'packer'), 4);
  assert.equal(speedMult(s, 'cane_mill'), 1, 'only its zone');
  assert.equal(game.quoteResearch('supremacia_finca').reason, 'locked');
  for (const id of ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer', 'composter']) s.stations[id].level = 100;
  assert.ok(game.research('supremacia_finca'));
  assert.equal(speedMult(s, 'farm'), 32);
});

test('the multiplier goes up to ×2⁶⁰: you can keep restarting, but it no longer doubles or counts (v3.56, v3.68.3, v4.0)', async () => {
  const { nextLegacyMult } = await import('../src/sim/modifiers.js');
  const root = newGame();
  let state;
  for (let k = 0; k < 59; k++) state = restartRegion(root, 'cafetero');
  assert.equal(legacyMult(state), 2 ** 59);
  assert.equal(nextLegacyMult(state), 2 ** 60);
  state = restartRegion(root, 'cafetero');
  assert.equal(legacyMult(state), 2 ** 60);
  assert.equal(nextLegacyMult(state), 2 ** 60, 'it no longer doubles');
  for (let k = 0; k < 8; k++) state = restartRegion(root, 'cafetero');
  assert.equal(state.keep.resets, 60, 'restarts stay at the cap (v4.0)');
  assert.equal(legacyMult(state), 2 ** 60);
  const game = new Game(state);
  run(game, 60);
  assert.ok(Number.isFinite(game.state.coins) && game.state.coins > 0, `coins: ${game.state.coins}`);
  // And with everything built, it still balances (after startup, no yard fills up).
  const big = everything(60, 40);
  run(big, 400);
  const blocked = {};
  for (let i = 0; i < 500; i++) {
    big.step(0.1);
    for (const [id, st] of Object.entries(big.state.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.ok(Number.isFinite(big.state.coins));
  assert.deepEqual(blocked, {});
});

test('huge numbers are readable: suffixes up to Dc and then scientific notation', async () => {
  const { formatMult, formatNumber } = await import('../src/core/format.js');
  assert.equal(formatNumber(2.5e6), '2,50M');
  assert.equal(formatNumber(4.2e33), '4,20Dc');
  assert.equal(formatNumber(4.2e40), '4,20e40');
  assert.equal(formatMult(512), '×512');
  assert.equal(formatMult(2048), '×2,05K');
  assert.equal(formatMult(2 ** 20), '×1,05M');
  assert.equal(formatMult(2 ** 32), '×4,29B');
  assert.equal(formatMult(2 ** 60), '×1,15Qi');
  assert.equal(formatMult(2 ** 100), '×1,27No');
  assert.equal(formatMult(2 ** 200), '×1,61e60');
});

test('the second ending also asks for mule drivers, routes, objectives and research (v3.12)', () => {
  const game = everything(100);
  const s = game.state;
  allClaimed(s);
  s.zones.pueblo.complete = true;
  assert.ok(masteryReady(s));
  const missing = (fn) => {
    const backup = structuredClone(s);
    fn();
    const ready = masteryReady(s);
    Object.assign(s, backup);
    return ready;
  };
  assert.equal(missing(() => (s.stations.farm.transport.level = 99)), false, 'the mule drivers');
  assert.equal(missing(() => (s.routes[Object.keys(s.routes)[0]].level = 99)), false, 'the routes');
  assert.equal(missing(() => s.goals.claimed.pop()), false, 'the objectives');
  assert.equal(missing(() => s.research.pop()), false, 'the research');
  assert.ok(masteryReady(s));
  assert.deepEqual(masteryParts(s).map((p) => p.id), ['stations', 'transport', 'routes', 'goals', 'research']);
});

test('«Collect all» and «Buy all» (v3.57)', async () => {
  const { claimableGoals, activeGoals } = await import('../src/sim/goals.js');
  const { previewAllResearch } = await import('../src/sim/upgrades.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const { RESEARCH } = await import('../src/data/research.js');
  // Goals: counts all completed ones (not only the three visible) and claims them, except the finale.
  const game = everything(100);
  const s = game.state;
  s.stats.sold = Object.fromEntries(Object.keys(s.stats.sold ?? {}).map((k) => [k, 0]));
  for (const g of GOALS_BY_ZONE.finca) if (g.type === 'sold' || g.type === 'produced') (s.stats[g.type] ??= {})[g.product] = 1e12;
  const ready = claimableGoals(s, 'finca');
  assert.ok(ready.length > 3, `met: ${ready.length}`);
  assert.ok(!ready.some((g) => g.final), 'not the ending, while it is not visible');
  const coins = s.coins;
  const { count, reward } = game.claimAllGoals('finca');
  assert.equal(count, ready.length);
  assert.equal(s.coins, coins + reward);
  assert.ok(!s.zones.finca.complete, 'the ending is collected separately');
  assert.ok(activeGoals(s, 'finca').every((g) => g.final || !claimableGoals(s, 'finca').includes(g)));
  // Research: from cheapest to most expensive as far as coins go, excluding Maestría and Supremacía.
  const fresh = everything(100);
  const st = fresh.state;
  st.research = [];
  const cheap = RESEARCH.filter((r) => r.zone === 'finca' && !r.minLevel).sort((a, b) => a.cost - b.cost);
  st.coins = cheap[0].cost + cheap[1].cost + cheap[2].cost;
  assert.deepEqual(previewAllResearch(st, 'finca'), { count: 3, cost: st.coins });
  const bought = fresh.researchAll('finca');
  assert.deepEqual(bought, cheap.slice(0, 3).map((r) => r.id));
  assert.equal(st.coins, 0);
  st.coins = 1e30;
  fresh.researchAll('finca');
  assert.ok(cheap.every((r) => st.research.includes(r.id)), 'all of them');
  assert.ok(!st.research.some((id) => RESEARCH.find((r) => r.id === id).minLevel), 'without Mastery or Supremacy');
});

test('coins have a ceiling of 1000 Dc, shown as 999Dc++ (v3.68.3, v5.9)', async () => {
  const { MAX_COINS } = await import('../src/sim/modifiers.js');
  const { cappedCoins } = await import('../src/ui/capped.js');
  const game = new Game();
  game.state.coins = 5e40;
  game.state.totalEarned = 5e40;
  game.step(0.1);
  assert.equal(game.state.coins, MAX_COINS);
  assert.equal(game.state.totalEarned, MAX_COINS);
  assert.equal(cappedCoins(MAX_COINS), '999Dc++');
  game.state.coins = 1e30;
  game.step(0.1);
  assert.ok(game.state.coins < MAX_COINS, 'below the ceiling nothing changes');
});

test('on starting another region over, the game opens in it and not in the Cafetal (v3.72)', async () => {
  const { startZone } = await import('../src/sim/legacy.js');
  const { createInitialState, createGameState } = await import('../src/sim/state.js');
  const root = createGameState(0);
  root.regions.cafetero.zones.trapiche.unlocked = true;
  root.regions.santander = createInitialState(0, 'santander');
  // Santander freshly reset: only its first zone open; Barichara was being viewed.
  assert.equal(startZone(root, 'barichara'), 'guayabera');
  assert.equal(startZone(root, 'guayabera'), 'guayabera');
  assert.equal(startZone(root, 'trapiche'), 'trapiche');
  assert.equal(startZone(root, 'lecheria'), 'finca', 'closed zone of the Eje Cafetero: its first one');
  assert.equal(startZone(root, 'arrozal'), 'finca', 'region not opened yet: the Finca');
});
