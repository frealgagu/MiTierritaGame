import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { masteryParts, masteryReady, maxedCount, restartState, stationsOf } from '../src/sim/legacy.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { REGION_OF_ZONE } from '../src/data/regions.js';
import { legacyMult } from '../src/sim/modifiers.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Pruebas de la cadena: siempre de día y sin temporada (el calendario se prueba en calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Las seis zonas abiertas, todo construido al mismo nivel.
function everything(level, resets = 0) {
  const game = new Game();
  const s = game.state;
  s.legacy.resets = resets;
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

// Lo demás que pide el segundo final (v3.12): todos los objetivos y todas las investigaciones del Eje
// Cafetero.
function allClaimed(s) {
  s.goals.claimed = Object.keys(s.zones).flatMap((z) => GOALS_BY_ZONE[z].map((g) => g.id));
  s.research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === 'cafetero').map((r) => r.id);
}

test('cada reinicio duplica la producción: ×1, ×2, ×4, ×8', () => {
  const income = [0, 1, 2, 3].map((resets) => {
    const s = everything(30, resets).state;
    assert.equal(legacyMult(s), 2 ** resets);
    return analyzeChain(s, 'finca').rows.find((r) => r.id === 'packer').output;
  });
  for (let k = 1; k < income.length; k++) assert.ok(Math.abs(income[k] / income[k - 1] - 2) < 1e-9, `${income[k]} / ${income[k - 1]}`);
});

test('con la producción ×8 la cadena sigue cuadrando: al nivel 100 ningún patio se llena', async () => {
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

test('el segundo final llega al subir la última estación al nivel 100', () => {
  const game = everything(100);
  const s = game.state;
  allClaimed(s);
  s.zones.pueblo.complete = true;
  assert.equal(stationsOf(s).length, 38, 'las del Eje Cafetero');
  s.stations.export_dock.level = 99;
  assert.equal(maxedCount(s), 37);
  const events = [];
  game.bus.on('mastered', (e) => events.push(e));
  assert.ok(game.buy('farm:transport', 1) || true); // otras compras no lo disparan
  assert.equal(events.length, 0);
  assert.ok(game.buy('export_dock', 1));
  assert.equal(events.length, 1);
  assert.equal(s.mastered, true);
  // Solo una vez.
  game.buy('dispatch:pueblo', 1);
  assert.equal(events.length, 1);
});

test('sin el primer final no hay segundo: llega al cobrar los contenedores del Pueblo', async () => {
  const game = everything(100);
  const s = game.state;
  allClaimed(s);
  const events = [];
  game.bus.on('mastered', (e) => events.push(e));
  // Todo al nivel 100, pero el Pueblo sin completar: no cuenta.
  s.stations.export_dock.level = 99;
  assert.ok(game.buy('export_dock', 1));
  assert.equal(maxedCount(s), stationsOf(s).length);
  assert.equal(s.mastered, false);
  assert.equal(events.length, 0);
  // Se cobra el último objetivo del Pueblo (exportar los contenedores), el primer final.
  s.goals.claimed = s.goals.claimed.filter((id) => id !== GOALS_BY_ZONE.pueblo.at(-1).id);
  const final = GOALS_BY_ZONE.pueblo.at(-1);
  s.stats.sold[final.product] = final.amount;
  assert.ok(game.claimGoal(final.id));
  assert.equal(s.zones.pueblo.complete, true);
  assert.equal(s.mastered, true);
  assert.equal(events.length, 1);
});

test('volver a empezar: todo desde cero, con la producción al doble y los ajustes de antes', () => {
  const game = everything(100, 1);
  const s = game.state;
  s.mastered = true;
  s.playTime = 36000;
  s.totalEarned = 1e20;
  s.settings.music = false;
  s.hints.push('wetmill');
  const next = restartState(s);
  assert.equal(next.legacy.resets, 2);
  assert.equal(legacyMult(next), 4);
  assert.deepEqual(next.legacy.history, [{ mult: 2, playTime: 36000, totalEarned: 1e20 }]);
  assert.equal(next.coins, 0);
  assert.equal(next.playTime, 0);
  assert.equal(next.mastered, false);
  assert.deepEqual(Object.keys(next.stations), ['farm']);
  assert.equal(next.zones.trapiche.unlocked, false);
  assert.deepEqual(next.research, []);
  assert.equal(next.settings.music, false);
  assert.equal(next.settings.zone, 'finca');
  assert.ok(next.hints.includes('wetmill'));
  // Y la Finca produce el doble... del doble.
  const g = new Game(next);
  run(g, 60);
  assert.ok(g.state.coins > 0);
});

test('una partida de la v1.5 se carga sin multiplicador y sin el segundo final', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  delete old.legacy;
  delete old.mastered;
  const store = { 'cafetal.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.equal(legacyMult(s), 1);
  assert.equal(s.mastered, false);
});

test('Maestría ×4 con toda la zona al 75 y Supremacía ×8 con toda al 100', async () => {
  const { speedMult } = await import('../src/sim/modifiers.js');
  const game = everything(74);
  const s = game.state;
  assert.equal(game.quoteResearch('maestria_finca').reason, 'locked');
  for (const id of ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer', 'composter']) s.stations[id].level = 75;
  assert.ok(game.research('maestria_finca'));
  assert.equal(speedMult(s, 'packer'), 4);
  assert.equal(speedMult(s, 'cane_mill'), 1, 'solo su zona');
  assert.equal(game.quoteResearch('supremacia_finca').reason, 'locked');
  for (const id of ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer', 'composter']) s.stations[id].level = 100;
  assert.ok(game.research('supremacia_finca'));
  assert.equal(speedMult(s, 'farm'), 32);
});

test('el multiplicador llega hasta ×2³²: se puede seguir reiniciando, pero ya no se duplica (v3.56)', async () => {
  const { nextLegacyMult } = await import('../src/sim/modifiers.js');
  let state = new Game().state;
  for (let k = 0; k < 31; k++) state = restartState(state);
  assert.equal(legacyMult(state), 2 ** 31);
  assert.equal(nextLegacyMult(state), 2 ** 32);
  state = restartState(state);
  assert.equal(legacyMult(state), 2 ** 32);
  assert.equal(nextLegacyMult(state), 2 ** 32, 'ya no se duplica');
  for (let k = 0; k < 8; k++) state = restartState(state);
  assert.equal(state.legacy.resets, 40, 'los reinicios se siguen contando');
  assert.equal(legacyMult(state), 2 ** 32);
  assert.equal(state.legacy.history.at(-1).mult, 2 ** 32);
  assert.equal(state.legacy.history.length, 40);
  const game = new Game(state);
  run(game, 60);
  assert.ok(Number.isFinite(game.state.coins) && game.state.coins > 0, `monedas: ${game.state.coins}`);
  // Y con todo construido, sigue cuadrando (después de arrancar, ningún patio se llena).
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

test('los números enormes se leen: sufijos hasta Dc y luego notación científica', async () => {
  const { formatMult, formatNumber } = await import('../src/core/format.js');
  assert.equal(formatNumber(2.5e6), '2,50M');
  assert.equal(formatNumber(4.2e33), '4,20Dc');
  assert.equal(formatNumber(4.2e40), '4,20e40');
  assert.equal(formatMult(512), '×512');
  assert.equal(formatMult(2048), '×2,05K');
  assert.equal(formatMult(2 ** 20), '×1,05M');
  assert.equal(formatMult(2 ** 32), '×4,29B');
  assert.equal(formatMult(2 ** 100), '×1,27No');
  assert.equal(formatMult(2 ** 200), '×1,61e60');
});

test('el segundo final pide también arrieros, rutas, objetivos e investigaciones (v3.12)', () => {
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
  assert.equal(missing(() => (s.stations.farm.transport.level = 99)), false, 'los arrieros');
  assert.equal(missing(() => (s.routes[Object.keys(s.routes)[0]].level = 99)), false, 'las rutas');
  assert.equal(missing(() => s.goals.claimed.pop()), false, 'los objetivos');
  assert.equal(missing(() => s.research.pop()), false, 'las investigaciones');
  assert.ok(masteryReady(s));
  assert.deepEqual(masteryParts(s).map((p) => p.id), ['stations', 'transport', 'routes', 'goals', 'research']);
});

test('«Cobrar todos» y «Comprar todas» (v3.57)', async () => {
  const { claimableGoals, activeGoals } = await import('../src/sim/goals.js');
  const { previewAllResearch } = await import('../src/sim/upgrades.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const { RESEARCH } = await import('../src/data/research.js');
  // Objetivos: cuenta todos los cumplidos (no solo los tres que se ven) y los cobra, menos el final.
  const game = everything(100);
  const s = game.state;
  s.stats.sold = Object.fromEntries(Object.keys(s.stats.sold ?? {}).map((k) => [k, 0]));
  for (const g of GOALS_BY_ZONE.finca) if (g.type === 'sold' || g.type === 'produced') (s.stats[g.type] ??= {})[g.product] = 1e12;
  const ready = claimableGoals(s, 'finca');
  assert.ok(ready.length > 3, `cumplidos: ${ready.length}`);
  assert.ok(!ready.some((g) => g.final), 'el final no, mientras no se vea');
  const coins = s.coins;
  const { count, reward } = game.claimAllGoals('finca');
  assert.equal(count, ready.length);
  assert.equal(s.coins, coins + reward);
  assert.ok(!s.zones.finca.complete, 'el final se cobra aparte');
  assert.ok(activeGoals(s, 'finca').every((g) => g.final || !claimableGoals(s, 'finca').includes(g)));
  // Investigaciones: de la más barata a la más cara hasta donde alcance, sin Maestría ni Supremacía.
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
  assert.ok(cheap.every((r) => st.research.includes(r.id)), 'todas');
  assert.ok(!st.research.some((id) => RESEARCH.find((r) => r.id === id).minLevel), 'sin Maestría ni Supremacía');
});
