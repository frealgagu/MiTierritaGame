import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { EVENTS, EVENT_ACTIONS_BY_ID, MEDALS } from '../src/data/events.js';
import { boardObjective, buyAction, createEventState, eventProgress, eventStatus, finishEvent, medalFor, quoteAction, startEvent, supplyFraction } from '../src/sim/events.js';
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

test('los eventos están bien armados', () => {
  for (const e of EVENTS) {
    for (const id of e.stations) assert.equal(STATIONS_BY_ID[id]?.zone, e.zone, `${e.id}: ${id}`);
    for (const o of e.objectives) {
      for (const p of Object.keys(o.items)) assert.ok(PRODUCTS[p]?.zone === e.zone || e.zone === 'pueblo', `${e.id}: ${p}`);
      assert.ok(o.medals[0] < o.medals[1], `${e.id}: el oro pide menos tiempo que la plata`);
    }
  }
  assert.deepEqual(Object.values(MEDALS).map((m) => m.renown), [4, 2, 1]);
});

test('el evento de una zona se juega una vez por año y el objetivo cambia de un año al otro', () => {
  const game = new Game();
  const s = game.state;
  assert.equal(eventStatus(s, 'finca').kind, 'locked', 'hasta que estén construidas sus estaciones');
  buildAll(s);
  assert.equal(eventStatus(s, 'finca').kind, 'available');
  assert.equal(eventStatus(s, 'trapiche'), null, 'zona cerrada');
  const board = startEvent(s, 'finca');
  assert.equal(eventStatus(s, 'finca').kind, 'active');
  assert.equal(startEvent(s, 'finca'), board, 'seguir el que está en juego');
  const first = boardObjective(board);
  for (const [p, n] of Object.entries(first.items)) board.stats[first.kind][p] = n;
  board.playTime = 60;
  const r = finishEvent(s, 'finca');
  assert.equal(r.medal, 'gold');
  assert.equal(s.profile.renown, 4);
  assert.equal(s.profile.medals.broca.best, 'gold');
  assert.equal(eventStatus(s, 'finca').kind, 'done');
  assert.equal(startEvent(s, 'finca'), null);
  s.playTime += YEAR;
  const next = startEvent(s, 'finca');
  assert.ok(next);
  assert.notDeepEqual(boardObjective(next), first);
});

test('la medalla depende del tiempo del tablero', () => {
  const obj = { medals: [600, 900] };
  assert.equal(medalFor(obj, 600), 'gold');
  assert.equal(medalFor(obj, 601), 'silver');
  assert.equal(medalFor(obj, 5000), 'bronze');
});

test('el tablero tiene su propio reloj, sin noches ni temporadas, y la broca frena el Cafetal', () => {
  const main = new Game();
  buildAll(main.state);
  const board = startEvent(main.state, 'finca');
  const game = new Game(board);
  assert.ok(Math.abs(speedMult(board, 'farm') - 0.4) < 1e-9);
  assert.equal(speedMult(board, 'wetmill'), 1);
  // 20 min de tablero: pasan noches en el reloj del juego, pero el tablero no para.
  for (let t = 0; t < 1200; t += 0.1) game.step(0.1);
  assert.notEqual(board.stations.farm.status, 'resting');
  assert.ok(board.stats.produced.cherry > 1200 * 0.5 * 0.4 * 0.8, `cerezas: ${board.stats.produced.cherry}`);
  assert.equal(main.state.playTime, 0, 'el juego no avanza con el tablero');
  assert.ok(eventProgress(board) >= 0);
});

test('las compras del evento van en orden, se pagan con las monedas del tablero y quitan la broca', () => {
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
  // Las investigaciones del juego no valen en el tablero.
  assert.equal(main.quoteResearch && new Game(board).quoteResearch('abono').reason, 'event');
});

test('el Renombre y las medallas no se pierden al reiniciar; el tablero en juego sí', () => {
  const main = new Game();
  const s = main.state;
  s.profile.renown = 7;
  s.profile.medals.broca = { best: 'silver', count: { silver: 1 } };
  buildAll(s);
  assert.ok(startEvent(s, 'finca'));
  const next = restartState(s);
  assert.equal(next.profile.renown, 7);
  assert.deepEqual(next.profile.medals.broca, { best: 'silver', count: { silver: 1 } });
  assert.deepEqual(next.events.boards, {});
});

test('los seis tableros arrancan y avanzan hacia su objetivo', () => {
  for (const def of EVENTS) {
    const board = createEventState(def, 1);
    const game = new Game(board);
    for (let t = 0; t < 180; t += 0.1) game.step(0.1);
    assert.ok(eventProgress(board) > 0 || Object.values(board.stats.produced).some((n) => n > 0), def.id);
    assert.ok(board.coins > 0, `${def.id}: gana monedas`);
  }
});

test('derrumbe: sin vía la panela no llega (solo la guardada) y con las compras vuelve a llegar', () => {
  const def = EVENTS.find((e) => e.id === 'derrumbe');
  const board = createEventState(def, 1);
  assert.equal(board.stations.chocolate_table.imported.panela_powder, def.stock.panela_powder);
  assert.equal(supplyFraction(board, 'panela_powder'), 0);
  assert.equal(supplyFraction(board, 'milk'), 1);
  const game = new Game(board);
  board.stations.chocolate_table.imported.panela_powder = 0;
  for (let t = 0; t < 10; t += 0.1) game.step(0.1);
  assert.equal(board.stations.chocolate_table.imported.panela_powder, 0);
  board.coins = 1e12;
  for (const a of def.actions) assert.ok(buyAction(board, a.id));
  assert.equal(supplyFraction(board, 'panela_powder'), 1);
  for (let t = 0; t < 10; t += 0.1) game.step(0.1);
  assert.ok(board.stations.chocolate_table.imported.panela_powder > 0);
});

test('feria: el objetivo pide varios productos y cuenta cada uno hasta lo pedido', () => {
  const def = EVENTS.find((e) => e.id === 'feria');
  const main = new Game();
  main.state.zones.lecheria.unlocked = true;
  for (const id of def.stations) main.state.stations[id] = createStationState();
  const board = startEvent(main.state, 'lecheria');
  const obj = boardObjective(board);
  const [a, b] = Object.keys(obj.items);
  board.stats.sold[a] = obj.items[a] * 5; // de más no cuenta
  assert.ok(Math.abs(eventProgress(board) - obj.items[a] / Object.values(obj.items).reduce((x, y) => x + y)) < 1e-9);
  assert.equal(finishEvent(main.state, 'lecheria'), null);
  for (const [p, n] of Object.entries(obj.items)) board.stats.sold[p] = n;
  assert.ok(b);
  assert.ok(finishEvent(main.state, 'lecheria'));
});
