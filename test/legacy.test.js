import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { ALL_STATIONS, maxedCount, restartState } from '../src/sim/legacy.js';
import { legacyMult } from '../src/sim/modifiers.js';
import { ZONE_LIST } from '../src/data/zones/index.js';

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
  s.zones.pueblo.complete = true;
  assert.equal(ALL_STATIONS.length, 38);
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
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = everything(100);
  const s = game.state;
  const events = [];
  game.bus.on('mastered', (e) => events.push(e));
  // Todo al nivel 100, pero el Pueblo sin completar: no cuenta.
  s.stations.export_dock.level = 99;
  assert.ok(game.buy('export_dock', 1));
  assert.equal(maxedCount(s), ALL_STATIONS.length);
  assert.equal(s.mastered, false);
  assert.equal(events.length, 0);
  // Se cumplen y cobran los objetivos del Pueblo; el último (exportar los contenedores) es el primer final.
  for (const g of GOALS_BY_ZONE.pueblo) s.goals.claimed.push(g.id);
  s.goals.claimed.pop();
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

test('sin límite de reinicios: a ×2⁴⁰ (más de un billón) el juego sigue funcionando', () => {
  let state = new Game().state;
  for (let k = 0; k < 40; k++) state = restartState(state);
  assert.equal(state.legacy.resets, 40);
  assert.equal(legacyMult(state), 2 ** 40);
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
  assert.equal(formatMult(2048), '×2.048');
  assert.equal(formatMult(2 ** 20), '×1.048.576');
  assert.equal(formatMult(2 ** 100), '×1,27No');
  assert.equal(formatMult(2 ** 200), '×1,61e60');
});
