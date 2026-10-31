import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState } from '../src/sim/state.js';
import { openRegions, regionState } from '../src/sim/regions.js';
import { restartState, stationsOf, checkMastery } from '../src/sim/legacy.js';
import { clockOf } from '../src/sim/calendar.js';
import { loadGame, saveGame } from '../src/core/SaveSystem.js';
import { REGIONS, REGION_OF_ZONE } from '../src/data/regions.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';

test('cada región tiene sus zonas y su partida empieza en la primera, con su fuente', () => {
  for (const r of REGIONS) {
    for (const z of r.zones) assert.equal(ZONES_BY_ID[z].region ?? 'cafetero', r.id, z);
    const s = createInitialState(0, r.id);
    assert.deepEqual(Object.keys(s.zones), r.zones);
    assert.equal(s.zones[r.zones[0]].unlocked, true);
    assert.ok(s.stations[ZONES_BY_ID[r.zones[0]].farm.stationId]);
  }
  assert.ok(!createInitialState(0, 'santander').profile, 'el perfil es del jugador: solo en la principal');
});

test('Santander se abre al completar el Pueblo, con el calendario del país', () => {
  const root = createInitialState(0);
  assert.deepEqual(openRegions(root), []);
  root.playTime = 50060; // a las 15:00 (en plena jornada)
  root.zones.pueblo.complete = true;
  assert.deepEqual(openRegions(root), ['santander']);
  assert.deepEqual(openRegions(root), [], 'solo una vez');
  const s = regionState(root, 'santander');
  assert.equal(s.region, 'santander');
  assert.equal(clockOf(s), 50060);
  // Avanza a la par: las dos partidas siguen en la misma fecha.
  const a = new Game(root);
  const b = new Game(s);
  for (let t = 0; t < 30; t += 0.1) {
    a.step(0.1);
    b.step(0.1);
  }
  assert.ok(Math.abs(clockOf(root) - clockOf(s)) < 1e-6);
  assert.ok(b.state.stats.produced.guava > 0, 'la Guayabera produce');
});

test('cada región tiene su segundo final y su reinicio, sin tocar las demás', () => {
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = regionState(root, 'santander');
  for (const id of stationsOf(s)) s.stations[id] = { ...(s.stations[id] ?? {}), level: 100, transport: { level: 100 } };
  // (v3.12: también las rutas, los objetivos y las investigaciones de la región.)
  for (const r of Object.values(s.routes)) r.level = 100;
  s.goals.claimed = Object.keys(s.zones).flatMap((z) => GOALS_BY_ZONE[z].map((g) => g.id));
  s.research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === 'santander').map((r) => r.id);
  assert.equal(checkMastery(s, { emit() {} }), false, 'sin el primer final de la región');
  s.zones.guayabera.complete = true;
  assert.equal(checkMastery(s, { emit() {} }), false, 'el final de la región es su última zona');
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
  assert.equal(clockOf(next), clockOf(s), 'el calendario sigue');
  assert.ok(!next.profile);
  // Reiniciar el Eje Cafetero conserva Santander.
  root.regions.santander = next;
  const root2 = restartState(root);
  assert.equal(root2.regions.santander, next);
  assert.equal(clockOf(root2), clockOf(root));
});

test('la partida se guarda y se carga con sus regiones', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.regions.santander.coins = 1234;
  saveGame(root);
  const back = loadGame();
  assert.equal(back.regions.santander.coins, 1234);
  assert.equal(back.regions.santander.region, 'santander');
  assert.deepEqual(Object.keys(back.regions.santander.zones), ['guayabera', 'tabacal', 'fiquera', 'hato', 'hormigas', 'barichara']);
  assert.ok(back.profile);
});

test('una partida con la Guayabera ya completa abre el Tabacal al cargarse (v3.1)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = root.regions.santander;
  s.zones.guayabera.complete = true;
  delete s.zones.tabacal; // como se guardaba en la v3.0
  saveGame(root);
  const back = loadGame().regions.santander;
  assert.equal(back.zones.tabacal.unlocked, true);
  assert.ok(back.stations.tobacco_field);
});

test('el Tabacal se abre al completar la Guayabera y su cadena tuerce tabacos sin cuellos de botella', async () => {
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
  assert.ok((game.state.stats.sold.cigar ?? 0) > 0, 'vende tabaco torcido');
  // A igual nivel la cadena cuadra: ninguna estación le quita el paso a la siguiente. Desde la v3.67 el
  // tabaco fermentado sale un 25 % más que lo que tuerce la Torcedora: esa parte es la de la Ruta del tabaco
  // a la Fiquera (todavía cerrada), y mientras tanto se vende.
  const { rows } = analyzeChain(game.state, 'tabacal');
  for (const row of rows.filter((r) => r.children.length)) {
    const routeShare = row.id === 'tobacco_piles' ? row.output * 0.2 : 0;
    assert.ok(row.diverted < routeShare + 1e-6, `${row.id} desvía ${row.diverted}/s`);
  }
});

test('la Fiquera se abre con el Tabacal completo y arma tercios con el tabaco que llega por la ruta', async () => {
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
  assert.ok(game.state.routes.tabaco, 'la Ruta del tabaco es de Santander');
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
  assert.ok((game.state.stats.imported.fermented_tobacco ?? 0) > 0, 'llega tabaco del Tabacal');
  for (const p of ['fique_sack', 'alpargatas', 'tobacco_bale']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('el Hato se abre con la Fiquera completa y hace fiambres con el bocadillo y la cabuya que llegan por las rutas', async () => {
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
  for (const p of ['bocadillo_bijao', 'fique_fiber']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['almuerzo', 'fiambre']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('el Hormiguero solo cosecha en la entrada de aguas (×4) y la despensa abastece la cadena el resto del año', async () => {
  const { CALENDAR, DAY_LENGTH, SEASON_DAYS, START_HOUR } = await import('../src/sim/calendar.js');
  const { stationBufferCap } = await import('../src/sim/rules.js');
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const game = new Game(createInitialState(0, 'santander'));
  for (const z of ['tabacal', 'fiquera', 'hato', 'hormigas']) game.unlockZone(z);
  const ant = game.state.stations.anthill;
  const cap = stationBufferCap(STATIONS_BY_ID.anthill, 1);
  assert.equal(ant.buffer, cap, 'abre con la despensa llena');
  assert.ok(cap > 1000, 'la despensa guarda mucho más que un patio');
  game.state.coins = 1e12;
  game.unlock('ant_cleaner');
  const on = CALENDAR.on;
  CALENDAR.on = true;
  // Mediodía del primer día (verano): fuera de temporada no se cosecha, pero los arrieros llevan lo guardado.
  game.state.playTime = DAY_LENGTH * ((14 - START_HOUR) / 24);
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  assert.equal(ant.status, 'season');
  assert.equal(game.state.stats.produced.ant_queen ?? 0, 0, 'nada nuevo');
  assert.ok(ant.buffer < cap, 'la despensa baja');
  assert.ok((game.state.stats.produced.ant_clean ?? 0) > 0, 'la cadena sigue trabajando');
  // Mediodía de la entrada de aguas: cosecha ×4.
  game.state.playTime = DAY_LENGTH * (SEASON_DAYS + (14 - START_HOUR) / 24);
  ant.buffer = 0;
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  assert.equal(ant.status, 'working');
  const made = game.state.stats.produced.ant_queen;
  // 60 s a nivel 1 (0,5/s) en una temporada ×1, por 4.
  assert.ok(made > 100 && made < 130, `cosechó ${made}`);
  CALENDAR.on = on;
});

test('las Hormigas se abren con el Hato completo y venden recuerdos con los costales y las alpargatas de la Fiquera', async () => {
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
  for (const p of ['fique_sack', 'alpargatas']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.recuerdo ?? 0) > 0, 'vende recuerdos');
});

test('una partida de Santander con la Asociación de tejedoras guardada como «tejedoras» se carga con su id nuevo', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.research.push('tejedoras'); // las Tejedoras de fique del Pueblo: se quedan
  root.regions.santander.research.push('tejedoras');
  saveGame(root);
  const back = loadGame();
  assert.ok(back.research.includes('tejedoras'));
  // (v3.7: la Asociación de tejedoras ya no existe: sus horas pasaron al perfil y se devolvieron sus monedas.)
  assert.deepEqual(back.regions.santander.research, []);
});

test('al cargar una partida de la v3.6, las horas sin conexión pasan al perfil y se devuelven las monedas (v3.7)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  delete root.profile.offlineLevel;
  root.research.push('capataz', 'abono'); // 2 + 3 = 5 h
  const s = root.regions.santander;
  s.research.push('mayordomo_s', 'veguero', 'asociacion_tejedoras'); // 2 + 3 + 3 + 4 = 12 h
  s.coins = 0;
  saveGame(root);
  const back = loadGame();
  assert.equal(back.profile.offlineLevel, 5, 'arranca con las 12 h de Santander');
  assert.deepEqual(back.research, ['abono']);
  assert.deepEqual(back.regions.santander.research, []);
  assert.equal(back.regions.santander.coins, 10000 + 300000 + 3000000);
});

test('Barichara se abre con las Hormigas completas y arma excursiones con lo de toda la región', async () => {
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
  for (const p of ['bocadillo_crate', 'cigar', 'recuerdo', 'tobacco_bale', 'almuerzo', 'fiambre']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.excursion ?? 0) > 0, 'sale una excursión');
});

test('al cargar una partida de la v3.6, los eventos ya jugados pasan al sistema de cupos (v3.7)', async () => {
  const { eventStatus } = await import('../src/sim/events.js');
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.events = { boards: {}, done: { finca: 2 } };
  root.profile.history = [{ event: 'broca', year: 1, medal: 'gold', time: 600 }, { event: 'broca', year: 2, medal: 'silver', time: 900 }];
  saveGame(root);
  const back = loadGame();
  assert.equal(back.events.done, undefined);
  assert.deepEqual(back.events.slots, [null, null]);
  assert.equal(back.events.count.finca, 2, 'la broca ya se jugó dos veces: sigue el reto 3');
  assert.ok(back.events.last.finca >= 0);
  assert.equal(eventStatus(back, 'finca').round, 3);
});

test('una partida ya reiniciada o con la última zona completa carga con la región terminada (v3.8)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const old = restartState(root);
  delete old.regionDone;
  old.regions.santander.zones.barichara.complete = true;
  delete old.regions.santander.regionDone;
  saveGame(old);
  const back = loadGame();
  assert.equal(back.regionDone, true, 'ya se había reiniciado');
  assert.equal(back.regions.santander.regionDone, true, 'Barichara completa');
  saveGame(createInitialState(0));
  assert.equal(loadGame().regionDone, false);
});

test('con el Eje Cafetero ya terminado, Santander se abre aunque tras reiniciar el Pueblo no esté completo (v3.8.1)', () => {
  const root = createInitialState(0);
  root.regionDone = true;
  assert.deepEqual(openRegions(root), ['santander']);
  assert.ok(regionState(root, 'santander'));
  // Sin terminarla nunca, no.
  assert.deepEqual(openRegions(createInitialState(0)), []);
});

test('el segundo Willys: con el álbum lleno se compra por región, vende el doble y no se pierde al reiniciar (v3.9)', async () => {
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
  assert.ok(restartState(root).willys2, 'se conserva al reiniciar la región');
  // Otra región se compra aparte.
  root.zones.pueblo.complete = true;
  openRegions(root);
  assert.ok(!root.regions.santander.willys2);
  assert.ok(quoteWillys2(profile, root.regions.santander).ok);
  // Vende el doble: con la bodega llena salen los dos Willys.
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

test('álbum, decoración, logros y jornada son de cada región; el Renombre, del jugador (v3.10)', async () => {
  const { profileOf, pickDecor, chosenDecor, quoteWillys2, buySticker } = await import('../src/sim/renown.js');
  const { albumOf } = await import('../src/data/album.js');
  const { checkLogros, metric } = await import('../src/sim/logros.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const san = root.regions.santander;
  const p = profileOf(root);
  p.renown = 1000;
  // Decoración aparte.
  assert.ok(pickDecor(p, 'willys', 'azul', 'santander'));
  assert.equal(chosenDecor(p, 'santander').willys.id, 'azul');
  assert.equal(chosenDecor(p, 'cafetero').willys.id, 'verde');
  assert.ok(pickDecor(p, 'willys', 'azul', 'cafetero'), 'en el Eje Cafetero se compra aparte');
  assert.equal(p.renown, 1000 - 3 - 3);
  // El segundo Willys de Santander pide el álbum de Santander.
  for (const pg of albumOf('cafetero')) for (const st of pg.stickers) buySticker(p, st.id);
  assert.ok(quoteWillys2(p, root).ok);
  assert.equal(quoteWillys2(p, san).reason, 'album');
  for (const pg of albumOf('santander')) for (const st of pg.stickers) buySticker(p, st.id);
  assert.ok(quoteWillys2(p, san).ok);
  // Logros: cada región los suyos, con lo de su partida.
  san.stats.sold.bocadillo_crate = 1000;
  root.stats.sold.coffee_bag = 1000;
  const won = checkLogros(san, p).map((w) => w.logro.id);
  assert.ok(won.includes('s_bocadillo') && won.includes('s_album'), won.join());
  assert.ok(!won.includes('bolsas'), 'los del Eje Cafetero no se revisan con Santander');
  assert.equal(metric(san, 'pages', p), 6);
  // Al reiniciar Santander, lo de su partida pasa a su acumulado.
  const next = restartState(san, 0, p);
  assert.equal(metric(next, 'sold:bocadillo_crate', p), 1000);
  assert.equal(metric(root, 'sold:bocadillo_crate', p), 0);
});

test('una partida de la v3.9 pasa la decoración al Eje Cafetero y la jornada a cada región (v3.10)', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  root.profile.decor = { owned: ['willys:rojo'], chosen: { willys: 'rojo' } };
  root.profile.workLevel = 2;
  saveGame(root);
  const back = loadGame();
  assert.equal(back.workLevel, 2);
  assert.equal(back.regions.santander.workLevel, 2);
  assert.equal(back.profile.workLevel, undefined);
  return import('../src/sim/renown.js').then(({ chosenDecor }) => {
    assert.equal(chosenDecor(back.profile, 'cafetero').willys.id, 'rojo');
    assert.equal(chosenDecor(back.profile, 'santander').willys.id, 'verde');
  });
});

test('La Costa se abre al completar Barichara; con Cartagena completa queda terminada (v3.15, v3.21)', async () => {
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
  // Cada zona abre la siguiente (v3.16 a v3.20) y Cartagena, la última, termina la región.
  c.stats.sold = { rice_sack: 1e9, cocada: 1e9, fish_in_coconut: 1e9, bandeja_costena: 1e9, recuerdo_costa: 1e9, paseo_islas: 1e9 };
  for (const zone of ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']) {
    assert.ok(!c.regionDone, zone);
    c.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(c, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(c.zones[zone].complete, true);
  }
  assert.ok(c.regionDone);
  // Con todo lo suyo (v3.21): seis eventos, seis páginas de álbum y sus logros.
  assert.equal(regionEvents('costa').length, 6);
  assert.equal(albumOf('costa').length, 6);
  assert.ok(logrosOf('costa').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'costa').wip);
});

test('una Costa guardada con Cartagena completa (cuando estaba en obra) queda terminada al cargarse (v3.21)', () => {
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

test('La Ciénaga cocina pescado en coco con la leche que llega del Cocal (v3.17)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga']) game.unlockZone(z);
  assert.ok(game.state.routes.coco, 'la Ruta de la leche de coco es de la Costa');
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
  assert.ok((game.state.stats.imported.coconut_milk ?? 0) > 0, 'llega leche de coco del Cocal');
  for (const p of ['salted_fish', 'fried_fish', 'fish_in_coconut']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('La Quesera hace almuerzos y bandejas con el arroz del Arrozal y el pescado de la Ciénaga (v3.18)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga', 'quesera']) game.unlockZone(z);
  for (const r of ['arroz', 'pescado']) assert.ok(game.state.routes[r], `la ruta ${r} es de la Costa`);
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
  for (const p of ['rice_bag', 'clean_fish']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['almuerzo_costeno', 'bandeja_costena']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('El Sombrero arma recuerdos de la Costa con el pescado salado y el frito de la Ciénaga (v3.19)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'costa'));
  for (const z of ['cocal', 'cienaga', 'quesera', 'sombrero']) game.unlockZone(z);
  for (const r of ['salado', 'frito']) assert.ok(game.state.routes[r], `la ruta ${r} es de la Costa`);
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
  for (const p of ['salted_fish', 'fried_fish']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.recuerdo_costa ?? 0) > 0, 'vende recuerdos de la Costa');
});

test('Cartagena recibe lo de las cinco zonas de la Costa y despacha paseos a las islas (v3.20)', async () => {
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
  for (const p of ['rice_sack', 'cocada', 'fish_in_coconut', 'almuerzo_costeno', 'bandeja_costena', 'recuerdo_costa']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.produced.lonchera_paseo ?? 0) > 0, 'arma loncheras');
});

test('Boyacá se abre al completar Cartagena; con Villa de Leyva completa queda terminada (v3.22, v3.28)', async () => {
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
  // Cada zona abre la siguiente (v3.23 a v3.27) y Villa de Leyva, la última, termina la región.
  b.stats.sold = { criollas_box: 1e9, beer_crate: 1e9, jarra_cerveza: 1e9, canasta_amasijos: 1e9, recuerdo_boyaca: 1e9, excursion_fosil: 1e9 };
  for (const zone of ['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva']) {
    assert.ok(!b.regionDone, zone);
    b.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(b, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(b.zones[zone].complete, true);
  }
  assert.ok(b.regionDone);
  // Con todo lo suyo (v3.28): seis eventos, seis páginas de álbum y sus logros.
  assert.equal(regionEvents('boyaca').length, 6);
  assert.equal(albumOf('boyaca').length, 6);
  assert.ok(logrosOf('boyaca').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'boyaca').wip);
});

test('Ráquira llena jarras de barro con la cerveza que llega de la Cervecería (v3.24)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira']) game.unlockZone(z);
  assert.ok(game.state.routes.cerveza, 'la Ruta de la cerveza es de Boyacá');
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
  assert.ok((game.state.stats.imported.beer ?? 0) > 0, 'llega cerveza de la Cervecería');
  for (const p of ['olla_barro', 'matera', 'jarra_cerveza']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('Paipa sirve piquetes y canastas de amasijos con las papitas del Papal y el barro de Ráquira (v3.25)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira', 'paipa']) game.unlockZone(z);
  for (const r of ['papitas', 'barro']) assert.ok(game.state.routes[r], `la ruta ${r} es de Boyacá`);
  game.state.coins = 1e15;
  for (const z of ['papal', 'raquira', 'paipa']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['papitas', 'barro']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['criollas_bag', 'barro']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['piquete', 'canasta_amasijos']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('Las Ruanas arma recuerdos de Boyacá con las ollas y las materas de Ráquira (v3.26)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'boyaca'));
  for (const z of ['cerveceria', 'raquira', 'paipa', 'ruanas']) game.unlockZone(z);
  for (const r of ['ollas', 'materas']) assert.ok(game.state.routes[r], `la ruta ${r} es de Boyacá`);
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
  for (const p of ['olla_barro', 'matera']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.recuerdo_boyaca ?? 0) > 0, 'vende recuerdos de Boyacá');
});

test('Villa de Leyva recibe lo de las cinco zonas de Boyacá y despacha excursiones al Fósil (v3.27)', async () => {
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
  for (const p of ['criollas_box', 'beer_crate', 'jarra_cerveza', 'piquete', 'canasta_amasijos', 'recuerdo_boyaca']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.produced.fiambre_paseo ?? 0) > 0, 'arma fiambres del paseo');
});

test('La Guayabera con la plaza de Vélez: los viajes de las mulas duran lo mismo que en la Finca (v3.29)', async () => {
  const { legTime } = await import('../src/sim/transport.js');
  const g = ZONES_BY_ID.guayabera.chain;
  const f = ZONES_BY_ID.finca.chain;
  for (let i = 0; i < g.length; i++) {
    const next = (c) => c[i + 1] ?? 'warehouse';
    assert.equal(legTime(g[i], next(g)), legTime(f[i], next(f)), `${g[i]} → ${next(g)}`);
  }
});

test('al cargar una partida de la v3.29, los cupos pasan a ser dos para todo el juego (v3.30)', () => {
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
  assert.deepEqual(back.events.slots, [{ zone: 'guayabera' }, null], 'solo queda el que se está jugando');
  assert.equal(back.regions.santander.events.slots, undefined);
  assert.ok(back.regions.santander.events.boards.guayabera);
});

test('Los Llanos se abren al completar Villa de Leyva; con Villavicencio completo quedan terminados (v3.31, v3.37)', async () => {
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
  // Cada zona abre la siguiente (v3.32 a v3.36) y Villavicencio, la última, termina la región.
  l.stats.sold = { oil_box: 1e9, juice_box: 1e9, cachama_maracuya: 1e9, parranda_llanera: 1e9, recuerdo_llano: 1e9, excursion_cano: 1e9 };
  for (const zone of zones) {
    assert.ok(!l.regionDone, zone);
    l.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(l, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(l.zones[zone].complete, true);
  }
  assert.ok(l.regionDone);
  // Con todo lo suyo (v3.37): seis eventos, seis páginas de álbum y sus logros.
  assert.equal(regionEvents('llanos').length, 6);
  assert.equal(albumOf('llanos').length, 6);
  assert.ok(logrosOf('llanos').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'llanos').wip);
});

test('La Cachamera sirve la cachama al maracuyá con el jugo que llega del Frutal (v3.33)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera']) game.unlockZone(z);
  assert.ok(game.state.routes.jugo, 'la Ruta del jugo es de los Llanos');
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
  assert.ok((game.state.stats.imported.passion_juice ?? 0) > 0, 'llega jugo del Frutal');
  for (const p of ['pisillo', 'smoked_cachama', 'cachama_maracuya']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('El Hato llanero sirve el almuerzo y la parranda con el aceite de la Palma y la cachama de la Cachamera (v3.34)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera', 'hato_llanero']) game.unlockZone(z);
  for (const r of ['aceite', 'cachamas']) assert.ok(game.state.routes[r], `la ruta ${r} es de los Llanos`);
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
  for (const p of ['oil_bottle', 'clean_cachama']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['almuerzo_llanero', 'parranda_llanera']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('La Talabartería vende el Recuerdo del Llano con el pisillo y la cachama ahumada de la Cachamera (v3.35)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'llanos'));
  for (const z of ['frutal', 'cachamera', 'hato_llanero', 'talabarteria']) game.unlockZone(z);
  for (const r of ['pisillos', 'ahumadas']) assert.ok(game.state.routes[r], `la ruta ${r} es de los Llanos`);
  game.state.coins = 1e15;
  for (const z of ['cachamera', 'talabarteria']) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = 20;
    game.state.zones[z].dispatch.level = 20;
  }
  for (const r of ['pisillos', 'ahumadas']) game.state.routes[r].level = 20;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 900; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  for (const p of ['pisillo', 'smoked_cachama']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.recuerdo_llano ?? 0) > 0, 'vende recuerdos del Llano');
});

test('Villavicencio recibe lo de las cinco zonas de los Llanos y arma los morrales del viaje (v3.36)', async () => {
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
  for (const p of ['oil_box', 'juice_box', 'cachama_maracuya', 'almuerzo_llanero', 'parranda_llanera', 'recuerdo_llano']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.produced.fiambre_viaje ?? 0) > 0, 'arma morrales del viaje');
});

test('La Costa Pacífica se abre al completar Villavicencio; con Buenaventura completa queda terminada (v3.38, v3.44)', async () => {
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
  // Cada zona abre la siguiente (v3.39 a v3.43) y Buenaventura, la última, termina la región.
  c.stats.sold = { patacon_box: 1e9, alino_box: 1e9, tapao: 1e9, cazuela_mariscos: 1e9, recuerdo_pacifico: 1e9, excursion_ballenas: 1e9 };
  for (const zone of zones) {
    assert.ok(!c.regionDone, zone);
    c.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(c, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(c.zones[zone].complete, true);
  }
  assert.ok(c.regionDone);
  // Con todo lo suyo (v3.44): seis eventos, seis páginas de álbum y sus logros.
  assert.equal(regionEvents('pacifico').length, 6);
  assert.equal(albumOf('pacifico').length, 6);
  assert.ok(logrosOf('pacifico').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'pacifico').wip);
});

test('La Bahía sirve el tapao de pescado con el aliño que llega de la Azotea (v3.40)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia']) game.unlockZone(z);
  assert.ok(game.state.routes.alino, 'la Ruta del aliño es de la Costa Pacífica');
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
  assert.ok((game.state.stats.imported.alino ?? 0) > 0, 'llega aliño de la Azotea');
  for (const p of ['dried_fish', 'smoked_pargo', 'tapao']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('El Manglar sirve el arroz con piangua y la cazuela con los patacones del Platanal y el pargo de la Bahía (v3.41)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia', 'manglar']) game.unlockZone(z);
  for (const r of ['patacones', 'pargos']) assert.ok(game.state.routes[r], `la ruta ${r} es de la Costa Pacífica`);
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
  for (const p of ['patacon_bag', 'clean_pargo']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['arroz_piangua', 'cazuela_mariscos']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});


test('El Werregue vende el Recuerdo del Pacífico con el pescado seco y el pargo ahumado de la Bahía (v3.42)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'pacifico'));
  for (const z of ['azotea', 'bahia', 'manglar', 'werregue']) game.unlockZone(z);
  for (const r of ['secos', 'pargos_ahumados']) assert.ok(game.state.routes[r], `la ruta ${r} es de la Costa Pacífica`);
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
  for (const p of ['dried_fish', 'smoked_pargo']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.recuerdo_pacifico ?? 0) > 0, 'vende recuerdos del Pacífico');
});

test('Buenaventura recibe lo de las cinco zonas de la Costa Pacífica y arma las loncheras de la lancha (v3.43)', async () => {
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
  for (const p of ['patacon_box', 'alino_box', 'tapao', 'arroz_piangua', 'cazuela_mariscos', 'recuerdo_pacifico']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.produced.lonchera_lancha ?? 0) > 0, 'arma loncheras de la lancha');
});

test('El Amazonas se abre al completar Buenaventura; con Leticia completa queda terminado (v3.47, v3.53)', async () => {
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
  // Cada zona abre la siguiente (v3.48 a v3.52) y Leticia, la última, termina la región.
  a.stats.sold = { asai_box: 1e9, aji_box: 1e9, pirarucu_aji: 1e9, banquete_maloca: 1e9, recuerdo_amazonas: 1e9, excursion_delfines: 1e9 };
  for (const zone of zones) {
    assert.ok(!a.regionDone, zone);
    a.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(a, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(a.zones[zone].complete, true);
  }
  assert.ok(a.regionDone);
  // Con todo lo suyo (v3.53): seis eventos, seis páginas de álbum y sus logros.
  assert.equal(regionEvents('amazonas').length, 6);
  assert.equal(albumOf('amazonas').length, 6);
  assert.ok(logrosOf('amazonas').length >= 10);
  assert.ok(!REGIONS.find((r) => r.id === 'amazonas').wip);
});

test('El Lago sirve el pirarucú al ají negro con el ají negro que llega del Ajizal (v3.49)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago']) game.unlockZone(z);
  assert.ok(game.state.routes.ajinegro, 'la Ruta del ají negro es del Amazonas');
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
  assert.ok((game.state.stats.imported.aji_negro ?? 0) > 0, 'llega ají negro del Ajizal');
  for (const p of ['salted_pirarucu', 'moqueado', 'pirarucu_aji']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('La Casabería sirve el desayuno y el banquete con el asaí del Asaizal y el pirarucú del Lago (v3.50)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago', 'casaberia']) game.unlockZone(z);
  for (const r of ['bolsas_asai', 'pirarucus']) assert.ok(game.state.routes[r], `la ruta ${r} es del Amazonas`);
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
  for (const p of ['asai_bag', 'clean_pirarucu']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  for (const p of ['desayuno_amazonico', 'banquete_maloca']) assert.ok((game.state.stats.sold[p] ?? 0) > 0, `vende ${p}`);
});

test('La Yanchama vende el Recuerdo del Amazonas con el pirarucú salado y el moqueado del Lago (v3.51)', async () => {
  const { chainOf } = await import('../src/sim/chain.js');
  const { CALENDAR } = await import('../src/sim/calendar.js');
  const game = new Game(createInitialState(0, 'amazonas'));
  for (const z of ['ajizal', 'lago', 'casaberia', 'yanchama']) game.unlockZone(z);
  for (const r of ['pirarucus_salados', 'moqueados']) assert.ok(game.state.routes[r], `la ruta ${r} es del Amazonas`);
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
  for (const p of ['salted_pirarucu', 'moqueado']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.sold.recuerdo_amazonas ?? 0) > 0, 'vende recuerdos del Amazonas');
});

test('Leticia recibe lo de las cinco zonas del Amazonas y arma las provisiones de la canoa (v3.52)', async () => {
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
  for (const p of ['asai_box', 'aji_box', 'pirarucu_aji', 'desayuno_amazonico', 'banquete_maloca', 'recuerdo_amazonas']) assert.ok((game.state.stats.imported[p] ?? 0) > 0, `llega ${p}`);
  assert.ok((game.state.stats.produced.provision_canoa ?? 0) > 0, 'arma provisiones de la canoa');
});
