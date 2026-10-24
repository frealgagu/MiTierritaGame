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
  // A igual nivel la cadena cuadra: ninguna estación le quita el paso a la siguiente.
  const { rows } = analyzeChain(game.state, 'tabacal');
  for (const row of rows.filter((r) => r.children.length)) assert.ok(row.diverted < 1e-9, `${row.id} desvía ${row.diverted}/s`);
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

test('La Costa se abre al completar Barichara y, mientras le falten zonas, no se termina (v3.15)', async () => {
  const { claimGoal } = await import('../src/sim/goals.js');
  const { albumDone, profileOf } = await import('../src/sim/renown.js');
  const { checkMedalBonus } = await import('../src/sim/events.js');
  const root = createInitialState(0);
  root.zones.pueblo.complete = true;
  openRegions(root);
  const s = regionState(root, 'santander');
  assert.deepEqual(openRegions(root), []);
  s.zones.barichara.complete = true;
  assert.deepEqual(openRegions(root), ['costa']);
  const c = regionState(root, 'costa');
  assert.deepEqual(Object.keys(c.zones), ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']);
  // Cada zona abre la siguiente (v3.16 a v3.20); completar la última zona que tiene por ahora no termina la
  // región: no hay segundo final.
  c.stats.sold = { rice_sack: 1e9, cocada: 1e9, fish_in_coconut: 1e9, bandeja_costena: 1e9, recuerdo_costa: 1e9, paseo_islas: 1e9 };
  for (const zone of ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena']) {
    c.goals.claimed.push(...GOALS_BY_ZONE[zone].filter((g) => !g.final).map((g) => g.id));
    claimGoal(c, GOALS_BY_ZONE[zone].find((g) => g.final).id, { emit() {} });
    assert.equal(c.zones[zone].complete, true);
  }
  assert.equal(c.zones.cartagena.unlocked, true);
  assert.ok(!c.regionDone);
  for (const id of stationsOf(c)) c.stations[id] = { ...(c.stations[id] ?? {}), level: 100, transport: { level: 100 } };
  c.research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === 'costa').map((r) => r.id);
  assert.equal(checkMastery(c, { emit() {} }), false);
  // Sin álbum ni eventos todavía: ni álbum lleno ni premio de medallas.
  const p = profileOf(root);
  assert.equal(albumDone(p, 'costa'), false);
  checkMedalBonus(p);
  assert.ok(!p.medalBonus.costa);
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
