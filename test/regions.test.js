import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { newGame, cafeOf, format9 } from './helpers/game.js';
import { createInitialState } from '../src/sim/state.js';
import { openRegions, regionState } from '../src/sim/regions.js';
import { restartState, stationsOf, checkMastery } from '../src/sim/legacy.js';
import { clockOf } from '../src/sim/calendar.js';
import { loadGame, saveGame } from '../src/core/SaveSystem.js';
import { REGIONS, REGION_OF_ZONE } from '../src/data/regions.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';

test('every region has its zones and its game starts in the first one, with its source', () => {
  for (const r of REGIONS) {
    for (const z of r.zones) assert.equal(ZONES_BY_ID[z].region ?? 'cafetero', r.id, z);
    const s = createInitialState(0, r.id);
    assert.deepEqual(Object.keys(s.zones), r.zones);
    assert.equal(s.zones[r.zones[0]].unlocked, true);
    assert.ok(s.stations[ZONES_BY_ID[r.zones[0]].farm.stationId]);
  }
  assert.ok(!createInitialState(0, 'santander').profile, 'the profile belongs to the player: only in the main one');
});

test(`Santander opens upon completing the Pueblo, with the country's calendar`, () => {
  const root = createInitialState(0);
  assert.deepEqual(openRegions(root), []);
  root.playTime = 50060; // at 15:00 (mid-shift)
  root.zones.pueblo.complete = true;
  assert.deepEqual(openRegions(root), ['santander']);
  assert.deepEqual(openRegions(root), [], 'only once');
  const s = regionState(root, 'santander');
  assert.equal(s.region, 'santander');
  assert.equal(clockOf(s), 50060);
  // Advances in lockstep: both saves remain on the same date.
  const a = new Game(root);
  const b = new Game(s);
  for (let t = 0; t < 30; t += 0.1) {
    a.step(0.1);
    b.step(0.1);
  }
  assert.ok(Math.abs(clockOf(root) - clockOf(s)) < 1e-6);
  assert.ok(b.state.stats.produced.guava > 0, 'the Guayabera produces');
});

test('every region has its second ending and its restart, without touching the others', () => {
  const root = newGame();
  cafeOf(root).zones.pueblo.complete = true;
  openRegions(root);
  const s = regionState(root, 'santander');
  for (const id of stationsOf(s)) s.stations[id] = { ...(s.stations[id] ?? {}), level: 100, transport: { level: 100 } };
  // (v3.12: also the region's routes, goals, and research.)
  for (const r of Object.values(s.routes)) r.level = 100;
  s.goals.claimed = Object.keys(s.zones).flatMap((z) => GOALS_BY_ZONE[z].map((g) => g.id));
  s.research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === 'santander').map((r) => r.id);
  assert.equal(checkMastery(s, { emit() {} }), false, `without the region's first ending`);
  s.zones.guayabera.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false, `the region's ending is its last zone`);
  s.zones.tabacal.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false);
  s.zones.fiquera.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false);
  s.zones.hato.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false);
  s.zones.hormigas.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false);
  s.zones.barichara.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), true);
  s.playTime = 9000;
  const next = restartState(s);
  assert.equal(next.region, 'santander');
  assert.equal(next.legacy.resets, 1);
  assert.equal(clockOf(next), clockOf(s), 'the calendar continues');
  assert.ok(!next.profile);
  // Resetting Eje Cafetero preserves Santander, the profile and the country clock (v5.13: only its own save changes).
  root.regions.santander = next;
  const profile = root.profile;
  root.regions.cafetero = restartState(cafeOf(root), 0, root.profile);
  assert.equal(root.regions.santander, next);
  assert.equal(root.profile, profile);
  assert.equal(clockOf(cafeOf(root)), clockOf(root));
});

test('the game is saved and loaded with its regions', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = newGame();
  cafeOf(root).zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.coins = 1234;
  saveGame(root);
  const back = loadGame();
  assert.equal(back.regions.santander.coins, 1234);
  assert.equal(back.regions.santander.region, 'santander');
  assert.deepEqual(Object.keys(back.regions.santander.zones), ['guayabera', 'tabacal', 'fiquera', 'hato', 'hormigas', 'barichara']);
  assert.ok(back.profile);
});

test('a save with the Guayabera already complete opens the Tabacal on loading (v3.1)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = root.regions.santander;
  s.zones.guayabera.complete = true;
  delete s.zones.tabacal; // as saved in v3.0
  saveGame(root);
  const back = loadGame().regions.santander;
  assert.equal(back.zones.tabacal.unlocked, true);
  assert.ok(back.stations.tobacco_field);
});

test('the Tabacal opens upon completing the Guayabera and its chain rolls cigars without bottlenecks', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { analyzeChain } = await import('../src/sim/analysis.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  assert.equal(game.state.zones.tabacal.unlocked, false);
  const final = GOALS_BY_ZONE.guayabera.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.guayabera.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.bocadillo_crate = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.tabacal.unlocked, true);
  game.state.coins = 1e12;
  for (const id of chainOf('tabacal').slice(1)) assert.ok(game.unlock(id), id);
  for (const id of chainOf('tabacal')) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
  game.state.zones.tabacal.dispatch.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 300; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.sold.cigar ?? 0) > 0, 'it sells rolled cigars');
  // At equal levels the chain balances: no station starves the next. Since v3.67
  // fermented tobacco outputs 25 % more than Torcedora twists: that share belongs to the tobacco route
  // to Fiquera (still closed), and meanwhile it is sold.
  const { rows } = analyzeChain(game.state, 'tabacal');
  for (const row of rows.filter((r) => r.children.length)) {
    const routeShare = row.id === 'tobacco_piles' ? row.output * 0.2 : 0;
    assert.ok(row.diverted < routeShare + 1e-6, `${row.id} diverts ${row.diverted}/s`);
  }
});

test('the Fiquera opens with the Tabacal complete and packs bundles with the tobacco that comes by the route', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  game.unlockZone('tabacal');
  const final = GOALS_BY_ZONE.tabacal.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.tabacal.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.cigar = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.fiquera.unlocked, true);
  assert.ok(game.state.routes.tabaco, 'the Tobacco route belongs to Santander');
  game.state.coins = 1e15;
  for (const z of ['tabacal', 'fiquera']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.tabaco.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.fermented_tobacco ?? 0) > 0, 'tobacco arrives from the Tabacal');
  for (const p of ['fique_sack', 'alpargatas', 'tobacco_bale']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test('the Hato opens with the Fiquera complete and makes fiambres with the bocadillo and the fique that come by the routes', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  for (const z of ['tabacal', 'fiquera']) game.unlockZone(z);
  const final = GOALS_BY_ZONE.fiquera.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.fiquera.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.tobacco_bale = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.hato.unlocked, true);
  game.state.coins = 1e15;
  for (const z of ['guayabera', 'tabacal', 'fiquera', 'hato']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of Object.values(game.state.routes)) r.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['bocadillo_bijao', 'fique_fiber']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  for (const p of ['almuerzo', 'fiambre']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test('the Hormiguero only harvests at the start of the rains (×4) and the pantry supplies the chain the rest of the year', async () => {
  const { CALENDAR, DAY_LENGTH, SEASON_DAYS, START_HOUR } = await import('../src/sim/calendar.js');
  const { stationBufferCap } = await import('../src/sim/rules.js');
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const game = new Game(createInitialState(0, 'santander'));
  for (const z of ['tabacal', 'fiquera', 'hato', 'hormigas']) game.unlockZone(z);
  const ant = game.state.stations.anthill;
  const cap = stationBufferCap(STATIONS_BY_ID.anthill, 1);
  assert.equal(ant.buffer, cap, 'it opens with the pantry full');
  assert.ok(cap > 1000, 'the pantry holds much more than a yard');
  game.state.coins = 1e12;
  game.unlock('ant_cleaner');
  const on = CALENDAR.on;
  CALENDAR.on = true;
  // Noon of day one (dry season): out of season nothing is harvested, though haulers carry stored stock.
  game.state.playTime = DAY_LENGTH * ((14 - START_HOUR) / 24);
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  assert.equal(ant.status, 'season');
  assert.equal(game.state.stats.produced.ant_queen ?? 0, 0, 'nothing new');
  assert.ok(ant.buffer < cap, 'the pantry goes down');
  assert.ok((game.state.stats.produced.ant_clean ?? 0) > 0, 'the chain keeps working');
  // Noon of rainy onset: harvest ×4.
  game.state.playTime = DAY_LENGTH * (SEASON_DAYS + (14 - START_HOUR) / 24);
  ant.buffer = 0;
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  assert.equal(ant.status, 'working');
  const made = game.state.stats.produced.ant_queen;
  // 60 s at level 1 (0.5/s) in a ×1 season, times 4.
  assert.ok(made > 100 && made < 130, `it harvested ${made}`);
  CALENDAR.on = on;
});

test(`the Hormigas open with the Hato complete and sell souvenirs with the Fiquera's sacks and espadrilles`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  for (const z of ['tabacal', 'fiquera', 'hato']) game.unlockZone(z);
  const final = GOALS_BY_ZONE.hato.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.hato.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.fiambre = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.hormigas.unlocked, true);
  game.state.coins = 1e15;
  for (const z of ['guayabera', 'tabacal', 'fiquera', 'hato', 'hormigas']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of Object.values(game.state.routes)) r.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['fique_sack', 'alpargatas']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.recuerdo ?? 0) > 0, 'it sells souvenirs');
});

test(`a Santander save with the Weavers' association saved as «tejedoras» loads with its new id`, () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = format9();
  root.research.push('tejedoras'); // Pueblo's Tejedoras de fique: they remain
  root.regions.santander.research.push('tejedoras');
  saveGame(root);
  const back = loadGame();
  assert.ok(cafeOf(back).research.includes('tejedoras'));
  // (v3.7: Asociación de tejedoras no longer exists: its hours moved to profile and coins were refunded.)
  assert.deepEqual(back.regions.santander.research, []);
});

test('loading a v3.6 save, offline hours move to the profile and the coins are returned (v3.7)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = format9();
  root.research.push('capataz', 'abono'); // 2 + 3 = 5 h
  const s = root.regions.santander;
  s.research.push('mayordomo_s', 'veguero', 'asociacion_tejedoras'); // 2 + 3 + 3 + 4 = 12 h
  s.coins = 0;
  saveGame(root);
  const back = loadGame();
  assert.equal(back.profile.offlineLevel, 5, `it starts with Santander's 12 h`);
  assert.deepEqual(cafeOf(back).research, ['abono']);
  assert.deepEqual(back.regions.santander.research, []);
  assert.equal(back.regions.santander.coins, 10000 + 300000 + 3000000);
});

test('Barichara opens with the Hormigas complete and puts together tours with what the whole region makes', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game(createInitialState(0, 'santander'));
  for (const z of ['tabacal', 'fiquera', 'hato', 'hormigas']) game.unlockZone(z);
  const final = GOALS_BY_ZONE.hormigas.find((g) => g.final);
  game.state.goals.claimed.push(...GOALS_BY_ZONE.hormigas.filter((g) => !g.final).map((g) => g.id));
  game.state.stats.sold.recuerdo = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(game.state.zones.barichara.unlocked, true);
  game.state.coins = 1e18;
  for (const z of REGIONS[1].zones) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 30;
    game.state.zones[z].dispatch.level = 30;
  }
  for (const r of Object.values(game.state.routes)) r.level = 30;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 1500; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['bocadillo_crate', 'cigar', 'recuerdo', 'tobacco_bale', 'almuerzo', 'fiambre']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.excursion ?? 0) > 0, 'a tour leaves');
});

test('loading a v3.6 save, the events already played move to the slot system (v3.7)', async () => {
  const { eventStatus } = await import('../src/sim/events.js');
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = format9(0, []);
  root.events = { boards: {}, done: { finca: 2 } };
  root.profile.history = [{ event: 'broca', year: 1, medal: 'gold', time: 600 }, { event: 'broca', year: 2, medal: 'silver', time: 900 }];
  saveGame(root);
  const back = loadGame();
  assert.equal(cafeOf(back).events.done, undefined);
  assert.deepEqual(back.events.slots, [null, null]);
  assert.equal(cafeOf(back).events.count.finca, 2, 'the borer was already played twice: challenge 3 is next');
  assert.ok(cafeOf(back).events.last.finca >= 0);
  assert.equal(eventStatus(back, 'finca').round, 3);
});

test('a save already restarted or with the last zone complete loads with the region finished (v3.8)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const old = format9();
  old.legacy = { resets: 1 };
  delete old.regionDone;
  old.regions.santander.zones.barichara.complete = true;
  delete old.regions.santander.regionDone;
  saveGame(old);
  const back = loadGame();
  assert.equal(cafeOf(back).regionDone, true, 'it had already been restarted');
  assert.equal(back.regions.santander.regionDone, true, 'Barichara complete');
  saveGame(newGame());
  assert.equal(cafeOf(loadGame()).regionDone, false);
});

test('with the Eje Cafetero already finished, Santander opens even if after restarting the Pueblo is not complete (v3.8.1)', () => {
  const root = createInitialState(0);
  root.regionDone = true;
  assert.deepEqual(openRegions(root), ['santander']);
  assert.ok(regionState(root, 'santander'));
  // Without ever finishing it, no.
  assert.deepEqual(openRegions(createInitialState(0)), []);
});

test('the second Willys: with the album full it is bought per region, sells double and is not lost on restart (v3.9)', async () => {
  const { buyWillys2, quoteWillys2, WILLYS2_COST, profileOf } = await import('../src/sim/renown.js');
  const { ALBUM } = await import('../src/data/album.js');
  const { analyzeChain } = await import('../src/sim/analysis.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const root = createInitialState(0);
  const profile = profileOf(root);
  profile.renown = 100;
  assert.equal(quoteWillys2(profile, root).reason, 'album');
  profile.album = ALBUM.flatMap((pg) => pg.stickers.map((s) => s.id));
  assert.ok(buyWillys2(profile, root));
  assert.equal(profile.renown, 100 - WILLYS2_COST);
  assert.equal(quoteWillys2(profile, root).reason, 'owned');
  assert.ok(restartState(root).willys2, 'it is kept when restarting the region');
  // Another region is bought separately.
  root.zones.pueblo.complete = true;
  openRegions(root);
  assert.ok(!root.regions.santander.willys2);
  assert.ok(quoteWillys2(profile, root.regions.santander).ok);
  // Sells double: with a full warehouse both Willys depart.
  const on = CALENDAR.on;
  CALENDAR.on = false;
  try {
    const sell = (two) => {
      const g = new Game(createInitialState(0));
      g.state.willys2 = two;
      g.state.zones.finca.warehouse = { cherry: 1e6 };
      for (let t = 0; t < 120; t += 0.1) g.step(0.1);
      return g.state.stats.sold.cherry;
    };
    const one = sell(false);
    const two = sell(true);
    assert.ok(Math.abs(two / one - 2) < 0.05, `${one} → ${two}`);
    const s = createInitialState(0);
    const before = analyzeChain(s, 'finca').dispatch;
    s.willys2 = true;
    assert.ok(Math.abs(analyzeChain(s, 'finca').dispatch / before - 2) < 1e-9);
  } finally {
    CALENDAR.on = on;
  }
});

test('album, decoration, achievements and workday belong to each region; Renown, to the player (v3.10)', async () => {
  const { profileOf, pickDecor, chosenDecor, quoteWillys2, buySticker } = await import('../src/sim/renown.js');
  const { albumOf } = await import('../src/data/album.js');
  const { checkLogros, metric } = await import('../src/sim/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const san = root.regions.santander;
  const p = profileOf(root);
  p.renown = 1000;
  // Separate decoration.
  assert.ok(pickDecor(p, 'willys', 'azul', 'santander'));
  assert.equal(chosenDecor(p, 'santander').willys.id, 'azul');
  assert.equal(chosenDecor(p, 'cafetero').willys.id, 'verde');
  assert.ok(pickDecor(p, 'willys', 'azul', 'cafetero'), 'in the Eje Cafetero it is bought separately');
  assert.equal(p.renown, 1000 - 3 - 3);
  // Santander's second Willys requires Santander's album.
  for (const pg of albumOf('cafetero')) for (const st of pg.stickers) buySticker(p, st.id);
  assert.ok(quoteWillys2(p, root).ok);
  assert.equal(quoteWillys2(p, san).reason, 'album');
  for (const pg of albumOf('santander')) for (const st of pg.stickers) buySticker(p, st.id);
  assert.ok(quoteWillys2(p, san).ok);
  // Achievements: each region has its own, using its save's progress.
  san.stats.sold.bocadillo_crate = 1000;
  root.stats.sold.coffee_bag = 1000;
  const won = checkLogros(san, p).map((w) => w.logro.id);
  assert.ok(won.includes('s_bocadillo') && won.includes('s_album'), won.join());
  assert.ok(!won.includes('bolsas'), 'the Eje Cafetero ones are not checked with Santander');
  assert.equal(metric(san, 'pages', p), 6);
  // Resetting Santander moves its save stats into its lifetime totals.
  const next = restartState(san, 0, p);
  assert.equal(metric(next, 'sold:bocadillo_crate', p), 1000);
  assert.equal(metric(root, 'sold:bocadillo_crate', p), 0);
});

test('a v3.9 save moves the decoration to the Eje Cafetero and the workday to each region (v3.10)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = format9();
  root.profile.decor = { owned: ['willys:rojo'], chosen: { willys: 'rojo' } };
  root.profile.workLevel = 2;
  saveGame(root);
  const back = loadGame();
  assert.equal(cafeOf(back).workLevel, 2);
  assert.equal(back.regions.santander.workLevel, 2);
  assert.equal(back.profile.workLevel, undefined);
  return import('../src/sim/renown.js').then(({ chosenDecor }) => {
    assert.equal(chosenDecor(back.profile, 'cafetero').willys.id, 'rojo');
    assert.equal(chosenDecor(back.profile, 'santander').willys.id, 'verde');
  });
});

test('La Costa opens upon completing Barichara; with Cartagena complete it is finished (v3.15, v3.21)', async () => {
  const { claimGoal } = await import('../src/sim/goals.js');
  const { regionEvents } = await import('../src/sim/events.js');
  const { albumOf } = await import('../src/data/album.js');
  const { logrosOf } = await import('../src/data/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = regionState(root, 'santander');
  assert.deepEqual(openRegions(root), []);
  s.zones.barichara.complete = true;
  assert.deepEqual(openRegions(root), ['costa']);
  const c = regionState(root, 'costa');
  assert.deepEqual(Object.keys(c.zones), ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']);
  // Each zone opens the next (v3.16 to v3.20) and Cartagena, the last one, finishes the region.
  c.stats.sold = { rice_sack: 1e9, cocada: 1e9, fish_in_coconut: 1e9, bandeja_costena: 1e9, recuerdo_costa: 1e9, paseo_islas: 1e9 };
  for (const zone of ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']) {
    assert.ok(!c.regionDone, zone);
    c.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(c, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(c.zones[zone].complete, true);
  }
  assert.ok(c.regionDone);
  // With all its content (v3.21): six events, six album pages, and its achievements.
  assert.equal(regionEvents('costa').length, 6);
  assert.equal(albumOf('costa').length, 6);
  assert.ok(logrosOf('costa').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'costa').wip);
});

test('a saved Costa with Cartagena complete (when it was under construction) is finished on loading (v3.21)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.zones.barichara.complete = true;
  openRegions(root);
  const c = root.regions.costa;
  for (const z of Object.keys(c.zones)) c.zones[z] = { ...c.zones[z], unlocked: true, complete: true };
  c.regionDone = false;
  saveGame(root);
  assert.equal(loadGame().regions.costa.regionDone, true);
});

test('La Ciénaga cooks fish in coconut with the milk that comes from the Cocal (v3.17)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga']) game.unlockZone(z);
  assert.ok(game.state.routes.coco, 'the Coconut milk route belongs to the Costa');
  game.state.coins = 1e15;
  for (const z of ['cocal', 'cienaga']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.coco.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.coconut_milk ?? 0) > 0, 'coconut milk arrives from the Cocal');
  for (const p of ['salted_fish', 'fried_fish', 'fish_in_coconut']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`La Quesera makes lunches and platters with the Arrozal's rice and the Ciénaga's fish (v3.18)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga', 'quesera']) game.unlockZone(z);
  for (const r of ['arroz', 'pescado']) assert.ok(game.state.routes[r], `the ${r} route belongs to the Costa`);
  game.state.coins = 1e15;
  for (const z of ['arrozal', 'cienaga', 'quesera']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['arroz', 'pescado']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['rice_bag', 'clean_fish']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  for (const p of ['almuerzo_costeno', 'bandeja_costena']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`El Sombrero puts together Costa souvenirs with the Ciénaga's salted and fried fish (v3.19)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga', 'quesera', 'sombrero']) game.unlockZone(z);
  for (const r of ['salado', 'frito']) assert.ok(game.state.routes[r], `the ${r} route belongs to the Costa`);
  game.state.coins = 1e15;
  for (const z of ['cienaga', 'sombrero']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['salado', 'frito']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['salted_fish', 'fried_fish']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.recuerdo_costa ?? 0) > 0, 'it sells Costa souvenirs');
});

test('Cartagena receives what the five Costa zones make and dispatches trips to the islands (v3.20)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { ROUTES } = await import('../src/data/routes.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']) game.unlockZone(z);
  const toCartagena = ROUTES.filter((r) => r.to === 'cartagena').map((r) => r.id);
  assert.deepEqual(new Set(ROUTES.filter((r) => r.to === 'cartagena').map((r) => r.from)), new Set(['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero']));
  game.state.coins = 1e18;
  for (const z of ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 30;
    game.state.zones[z].dispatch.level = 30;
  }
  for (const r of Object.keys(game.state.routes)) game.state.routes[r].level = 30;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 1500; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const r of toCartagena) assert.ok(game.state.routes[r], r);
  for (const p of ['rice_sack', 'cocada', 'fish_in_coconut', 'almuerzo_costeno', 'bandeja_costena', 'recuerdo_costa']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.produced.lonchera_paseo ?? 0) > 0, 'it packs lunchboxes');
});

test('Boyacá opens upon completing Cartagena; with Villa de Leyva complete it is finished (v3.22, v3.28)', async () => {
  const { claimGoal } = await import('../src/sim/goals.js');
  const { regionEvents } = await import('../src/sim/events.js');
  const { albumOf } = await import('../src/data/album.js');
  const { logrosOf } = await import('../src/data/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.zones.barichara.complete = true;
  openRegions(root);
  assert.deepEqual(openRegions(root), []);
  root.regions.costa.zones.cartagena.complete = true;
  assert.deepEqual(openRegions(root), ['boyaca']);
  const b = regionState(root, 'boyaca');
  assert.deepEqual(Object.keys(b.zones), ['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva']);
  // Each zone opens the next (v3.23 to v3.27) and Villa de Leyva, the last one, finishes the region.
  b.stats.sold = { criollas_box: 1e9, beer_crate: 1e9, jarra_cerveza: 1e9, canasta_amasijos: 1e9, recuerdo_boyaca: 1e9, excursion_fosil: 1e9 };
  for (const zone of ['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva']) {
    assert.ok(!b.regionDone, zone);
    b.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(b, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(b.zones[zone].complete, true);
  }
  assert.ok(b.regionDone);
  // With all its content (v3.28): six events, six album pages, and its achievements.
  assert.equal(regionEvents('boyaca').length, 6);
  assert.equal(albumOf('boyaca').length, 6);
  assert.ok(logrosOf('boyaca').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'boyaca').wip);
});

test('Ráquira fills clay jugs with the beer that comes from the Cervecería (v3.24)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira']) game.unlockZone(z);
  assert.ok(game.state.routes.cerveza, 'the Beer route belongs to Boyacá');
  game.state.coins = 1e15;
  for (const z of ['cerveceria', 'raquira']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.cerveza.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.beer ?? 0) > 0, 'beer arrives from the Cervecería');
  for (const p of ['olla_barro', 'matera', 'jarra_cerveza']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`Paipa serves piquetes and baskets of amasijos with the Papal's potatoes and Ráquira's clay (v3.25), and its cows eat the Cervecería's spent grain (v4.0)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira', 'paipa']) game.unlockZone(z);
  for (const r of ['papitas', 'barro', 'bagazo']) assert.ok(game.state.routes[r], `the ${r} route belongs to Boyacá`);
  game.state.coins = 1e15;
  for (const z of ['papal', 'cerveceria', 'raquira', 'paipa']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['papitas', 'barro', 'bagazo']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['criollas_bag', 'barro', 'bagazo_cervecero']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  for (const p of ['piquete', 'canasta_amasijos']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`Las Ruanas puts together Boyacá souvenirs with Ráquira's pots and planters (v3.26)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira', 'paipa', 'ruanas']) game.unlockZone(z);
  for (const r of ['ollas', 'materas']) assert.ok(game.state.routes[r], `the ${r} route belongs to Boyacá`);
  game.state.coins = 1e15;
  for (const z of ['raquira', 'ruanas']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['ollas', 'materas']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['olla_barro', 'matera']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.recuerdo_boyaca ?? 0) > 0, 'it sells Boyacá souvenirs');
});

test('Villa de Leyva receives what the five Boyacá zones make and dispatches trips to the Fossil (v3.27)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { ROUTES } = await import('../src/data/routes.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva']) game.unlockZone(z);
  assert.deepEqual(new Set(ROUTES.filter((r) => r.to === 'villa_leyva').map((r) => r.from)), new Set(['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas']));
  game.state.coins = 1e18;
  for (const z of ['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 30;
    game.state.zones[z].dispatch.level = 30;
  }
  for (const r of Object.keys(game.state.routes)) game.state.routes[r].level = 30;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 1500; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['criollas_box', 'beer_crate', 'jarra_cerveza', 'piquete', 'canasta_amasijos', 'recuerdo_boyaca']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.produced.fiambre_paseo ?? 0) > 0, 'it packs picnic fiambres');
});

test(`La Guayabera with the Vélez plaza: the mules' trips last the same as in the Finca (v3.29)`, async () => {
  const { legTime } = await import('../src/sim/transport.js');
  const g = ZONES_BY_ID.guayabera.chain;
  const f = ZONES_BY_ID.finca.chain;
  for (let i = 0; i < g.length; i++) {
    const next = (c) => c[i + 1] ?? 'warehouse';
    assert.equal(legTime(g[i], next(g)), legTime(f[i], next(f)), `${g[i]} → ${next(g)}`);
  }
});

test('loading a v3.29 save, the slots become two for the whole game (v3.30)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  delete root.events.global;
  root.events.slots = [{ zone: 'finca' }, { until: 5000 }];
  const san = root.regions.santander;
  san.events.slots = [{ zone: 'guayabera' }, { zone: 'tabacal' }];
  san.events.boards.guayabera = { event: { id: 'mosca', zone: 'guayabera', round: 1 } };
  saveGame(root);
  const back = loadGame();
  assert.ok(back.events.global);
  assert.deepEqual(back.events.slots, [{ zone: 'guayabera' }, null], 'only the one being played remains');
  assert.equal(back.regions.santander.events.slots, undefined);
  assert.ok(back.regions.santander.events.boards.guayabera);
});

test('Los Llanos open upon completing Villa de Leyva; with Villavicencio complete they are finished (v3.31, v3.37)', async () => {
  const { claimGoal } = await import('../src/sim/goals.js');
  const { regionEvents } = await import('../src/sim/events.js');
  const { albumOf } = await import('../src/data/album.js');
  const { logrosOf } = await import('../src/data/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.zones.barichara.complete = true;
  openRegions(root);
  root.regions.costa.zones.cartagena.complete = true;
  openRegions(root);
  assert.deepEqual(openRegions(root), []);
  root.regions.boyaca.zones.villa_leyva.complete = true;
  assert.deepEqual(openRegions(root), ['llanos']);
  const l = regionState(root, 'llanos');
  const zones = ['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria', 'villavicencio'];
  assert.deepEqual(Object.keys(l.zones), zones);
  // Each zone opens the next (v3.32 to v3.36) and Villavicencio, the last one, finishes the region.
  l.stats.sold = { oil_box: 1e9, juice_box: 1e9, cachama_maracuya: 1e9, parranda_llanera: 1e9, recuerdo_llano: 1e9, excursion_cano: 1e9 };
  for (const zone of zones) {
    assert.ok(!l.regionDone, zone);
    l.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(l, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(l.zones[zone].complete, true);
  }
  assert.ok(l.regionDone);
  // With all its content (v3.37): six events, six album pages, and its achievements.
  assert.equal(regionEvents('llanos').length, 6);
  assert.equal(albumOf('llanos').length, 6);
  assert.ok(logrosOf('llanos').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'llanos').wip);
});

test('La Cachamera serves cachama with passion fruit using the juice that comes from the Frutal (v3.33)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera']) game.unlockZone(z);
  assert.ok(game.state.routes.jugo, 'the Juice route belongs to Los Llanos');
  game.state.coins = 1e15;
  for (const z of ['frutal', 'cachamera']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.jugo.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.passion_juice ?? 0) > 0, 'juice arrives from the Frutal');
  for (const p of ['pisillo', 'smoked_cachama', 'cachama_maracuya']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`El Hato llanero serves lunch and the parranda with the Palma's oil and the Cachamera's cachama (v3.34)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera', 'hato_llanero']) game.unlockZone(z);
  for (const r of ['aceite', 'cachamas']) assert.ok(game.state.routes[r], `the ${r} route belongs to Los Llanos`);
  game.state.coins = 1e15;
  for (const z of ['palma', 'cachamera', 'hato_llanero']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['aceite', 'cachamas']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['oil_bottle', 'clean_cachama']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  for (const p of ['almuerzo_llanero', 'parranda_llanera']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`La Talabartería sells the Llano souvenir with the Cachamera's pisillo and smoked cachama (v3.35) and the Hato llanero's hides (v4.0)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera', 'hato_llanero', 'talabarteria']) game.unlockZone(z);
  for (const r of ['pisillos', 'ahumadas', 'cueros']) assert.ok(game.state.routes[r], `the ${r} route belongs to Los Llanos`);
  game.state.coins = 1e15;
  for (const z of ['cachamera', 'hato_llanero', 'talabarteria']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['pisillos', 'ahumadas', 'cueros']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['pisillo', 'smoked_cachama', 'fresh_hide']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.recuerdo_llano ?? 0) > 0, 'it sells Llano souvenirs');
});

test('Villavicencio receives what the five Llanos zones make and packs the travel backpacks (v3.36)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { ROUTES } = await import('../src/data/routes.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera', 'hato_llanero', 'talabarteria', 'villavicencio']) game.unlockZone(z);
  assert.deepEqual(new Set(ROUTES.filter((r) => r.to === 'villavicencio').map((r) => r.from)), new Set(['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria']));
  game.state.coins = 1e18;
  for (const z of ['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria', 'villavicencio']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 30;
    game.state.zones[z].dispatch.level = 30;
  }
  for (const r of Object.keys(game.state.routes)) game.state.routes[r].level = 30;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 1500; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['oil_box', 'juice_box', 'cachama_maracuya', 'almuerzo_llanero', 'parranda_llanera', 'recuerdo_llano']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.produced.fiambre_viaje ?? 0) > 0, 'it packs travel backpacks');
});

test('La Costa Pacífica opens upon completing Villavicencio; with Buenaventura complete it is finished (v3.38, v3.44)', async () => {
  const { claimGoal } = await import('../src/sim/goals.js');
  const { regionEvents } = await import('../src/sim/events.js');
  const { albumOf } = await import('../src/data/album.js');
  const { logrosOf } = await import('../src/data/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.zones.barichara.complete = true;
  openRegions(root);
  root.regions.costa.zones.cartagena.complete = true;
  openRegions(root);
  root.regions.boyaca.zones.villa_leyva.complete = true;
  openRegions(root);
  assert.deepEqual(openRegions(root), []);
  root.regions.llanos.zones.villavicencio.complete = true;
  assert.deepEqual(openRegions(root), ['pacifico']);
  const c = regionState(root, 'pacifico');
  const zones = ['platanal', 'azotea', 'bahia', 'manglar', 'werregue', 'buenaventura'];
  assert.deepEqual(Object.keys(c.zones), zones);
  // Each zone opens the next (v3.39 to v3.43) and Buenaventura, the last one, finishes the region.
  c.stats.sold = { patacon_box: 1e9, alino_box: 1e9, tapao: 1e9, cazuela_mariscos: 1e9, recuerdo_pacifico: 1e9, excursion_ballenas: 1e9 };
  for (const zone of zones) {
    assert.ok(!c.regionDone, zone);
    c.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(c, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(c.zones[zone].complete, true);
  }
  assert.ok(c.regionDone);
  // With all its content (v3.44): six events, six album pages, and its achievements.
  assert.equal(regionEvents('pacifico').length, 6);
  assert.equal(albumOf('pacifico').length, 6);
  assert.ok(logrosOf('pacifico').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'pacifico').wip);
});

test('La Bahía serves fish tapao with the seasoning that comes from the Azotea (v3.40)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia']) game.unlockZone(z);
  assert.ok(game.state.routes.alino, 'the Seasoning route belongs to the Costa Pacífica');
  game.state.coins = 1e15;
  for (const z of ['azotea', 'bahia']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.alino.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.alino ?? 0) > 0, 'seasoning arrives from the Azotea');
  for (const p of ['dried_fish', 'smoked_pargo', 'tapao']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`El Manglar serves rice with piangua and the cazuela with the Platanal's patacones and the Bahía's snapper (v3.41)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia', 'manglar']) game.unlockZone(z);
  for (const r of ['patacones', 'pargos']) assert.ok(game.state.routes[r], `the ${r} route belongs to the Costa Pacífica`);
  game.state.coins = 1e15;
  for (const z of ['platanal', 'bahia', 'manglar']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['patacones', 'pargos']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['patacon_bag', 'clean_pargo']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  for (const p of ['arroz_piangua', 'cazuela_mariscos']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});


test(`El Werregue sells the Pacific souvenir with the Bahía's dried fish and smoked snapper (v3.42)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia', 'manglar', 'werregue']) game.unlockZone(z);
  for (const r of ['secos', 'pargos_ahumados']) assert.ok(game.state.routes[r], `the ${r} route belongs to the Costa Pacífica`);
  game.state.coins = 1e15;
  for (const z of ['bahia', 'werregue']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['secos', 'pargos_ahumados']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['dried_fish', 'smoked_pargo']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.recuerdo_pacifico ?? 0) > 0, 'it sells Pacific souvenirs');
});

test('Buenaventura receives what the five Costa Pacífica zones make and packs the boat lunchboxes (v3.43)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { ROUTES } = await import('../src/data/routes.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia', 'manglar', 'werregue', 'buenaventura']) game.unlockZone(z);
  assert.deepEqual(new Set(ROUTES.filter((r) => r.to === 'buenaventura').map((r) => r.from)), new Set(['platanal', 'azotea', 'bahia', 'manglar', 'werregue']));
  game.state.coins = 1e18;
  for (const z of ['platanal', 'azotea', 'bahia', 'manglar', 'werregue', 'buenaventura']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 30;
    game.state.zones[z].dispatch.level = 30;
  }
  for (const r of Object.keys(game.state.routes)) game.state.routes[r].level = 30;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 1500; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['patacon_box', 'alino_box', 'tapao', 'arroz_piangua', 'cazuela_mariscos', 'recuerdo_pacifico']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.produced.lonchera_lancha ?? 0) > 0, 'it packs boat lunchboxes');
});

test('El Amazonas opens upon completing Buenaventura; with Leticia complete it is finished (v3.47, v3.53)', async () => {
  const { claimGoal } = await import('../src/sim/goals.js');
  const { regionEvents } = await import('../src/sim/events.js');
  const { albumOf } = await import('../src/data/album.js');
  const { logrosOf } = await import('../src/data/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  for (const [region, zone] of [['santander', 'barichara'], ['costa', 'cartagena'], ['boyaca', 'villa_leyva'], ['llanos', 'villavicencio']]) {
    root.regions[region].zones[zone].complete = true;
    openRegions(root);
  }
  assert.deepEqual(openRegions(root), []);
  root.regions.pacifico.zones.buenaventura.complete = true;
  assert.deepEqual(openRegions(root), ['amazonas']);
  const a = regionState(root, 'amazonas');
  const zones = ['asaizal', 'ajizal', 'lago', 'casaberia', 'yanchama', 'leticia'];
  assert.deepEqual(Object.keys(a.zones), zones);
  assert.ok(a.zones.asaizal.unlocked);
  // Each zone opens the next (v3.48 to v3.52) and Leticia, the last one, finishes the region.
  a.stats.sold = { asai_box: 1e9, aji_box: 1e9, pirarucu_aji: 1e9, banquete_maloca: 1e9, recuerdo_amazonas: 1e9, excursion_delfines: 1e9 };
  for (const zone of zones) {
    assert.ok(!a.regionDone, zone);
    a.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(a, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(a.zones[zone].complete, true);
  }
  assert.ok(a.regionDone);
  // With all its content (v3.53): six events, six album pages, and its achievements.
  assert.equal(regionEvents('amazonas').length, 6);
  assert.equal(albumOf('amazonas').length, 6);
  assert.ok(logrosOf('amazonas').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'amazonas').wip);
});

test('El Lago serves pirarucú with black chili using the black chili that comes from the Ajizal (v3.49)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago']) game.unlockZone(z);
  assert.ok(game.state.routes.ajinegro, 'the Black chili route belongs to El Amazonas');
  game.state.coins = 1e15;
  for (const z of ['ajizal', 'lago']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  game.state.routes.ajinegro.level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 600; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.imported.aji_negro ?? 0) > 0, 'black chili arrives from the Ajizal');
  for (const p of ['salted_pirarucu', 'moqueado', 'pirarucu_aji']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`La Casabería serves breakfast and the banquet with the Asaizal's açaí and the Lago's pirarucú (v3.50)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago', 'casaberia']) game.unlockZone(z);
  for (const r of ['bolsas_asai', 'pirarucus']) assert.ok(game.state.routes[r], `the ${r} route belongs to El Amazonas`);
  game.state.coins = 1e15;
  for (const z of ['asaizal', 'lago', 'casaberia']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['bolsas_asai', 'pirarucus']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['asai_bag', 'clean_pirarucu']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  for (const p of ['desayuno_amazonico', 'banquete_maloca']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `it sells ${p}`);
});

test(`La Yanchama sells the Amazon souvenir with the Lago's salted and smoked pirarucú (v3.51)`, async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago', 'casaberia', 'yanchama']) game.unlockZone(z);
  for (const r of ['pirarucus_salados', 'moqueados']) assert.ok(game.state.routes[r], `the ${r} route belongs to El Amazonas`);
  game.state.coins = 1e15;
  for (const z of ['lago', 'yanchama']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['pirarucus_salados', 'moqueados']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['salted_pirarucu', 'moqueado']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.sold.recuerdo_amazonas ?? 0) > 0, 'it sells Amazon souvenirs');
});

test('Leticia receives what the five Amazonas zones make and packs the canoe provisions (v3.52)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const { ROUTES } = await import('../src/data/routes.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago', 'casaberia', 'yanchama', 'leticia']) game.unlockZone(z);
  assert.deepEqual(new Set(ROUTES.filter((r) => r.to === 'leticia').map((r) => r.from)), new Set(['asaizal', 'ajizal', 'lago', 'casaberia', 'yanchama']));
  game.state.coins = 1e18;
  for (const z of ['asaizal', 'ajizal', 'lago', 'casaberia', 'yanchama', 'leticia']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 30;
    game.state.zones[z].dispatch.level = 30;
  }
  for (const r of Object.keys(game.state.routes)) game.state.routes[r].level = 30;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 1500; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['asai_box', 'aji_box', 'pirarucu_aji', 'desayuno_amazonico', 'banquete_maloca', 'recuerdo_amazonas']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `${p} arrives`);
  assert.ok((game.state.stats.produced.provision_canoa ?? 0) > 0, 'it packs canoe provisions');
});
