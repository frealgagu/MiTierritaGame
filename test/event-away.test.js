import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { EVENTS_BY_ID } from '../src/data/events.js';
import { EVENT_CLOCK_MAX, awaySeconds, boardClockNow, createEventState, eventClock, secureMedal } from '../src/sim/events.js';

// «🚪 Salir» (v3.67.4): el tablero sigue corriendo por detrás y al volver se calcula lo que pasó.

// Un tablero (la broca, si no se dice otro) con sus estaciones subidas `levels` niveles (y sin monedas).
function board(levels, id = 'broca') {
  const def = EVENTS_BY_ID[id];
  const g = new Game(createEventState(def, 1));
  g.state.coins = 1e12;
  for (const id of def.stations) for (const m of [id, `${id}:transport`]) for (let i = 0; i < levels; i++) g.buy(m, 1);
  g.state.coins = 0;
  return g;
}

// Paso a paso, el segundo en que se cumple el objetivo.
function exactMedalTime(g) {
  g.bus.muted = true;
  g.offline = true;
  for (let t = 0; t < 20000 && !g.state.event.medal; t++) {
    g.step(1);
    secureMedal(g.state);
  }
  return g.state.event.time;
}

test('el reloj del evento llega hasta 999:59 y ahí se queda; el tablero sigue', () => {
  assert.equal(EVENT_CLOCK_MAX, 999 * 60 + 59);
  const g = board(0);
  g.state.playTime = EVENT_CLOCK_MAX + 500;
  assert.equal(eventClock(g.state), EVENT_CLOCK_MAX);
  const before = g.state.stats.produced;
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const n = sum(before);
  g.update(1);
  g.update(1);
  assert.ok(sum(g.state.stats.produced) >= n, 'sigue produciendo');
});

test('mientras está fuera, el reloj que marcaría', () => {
  const g = board(0);
  const root = { playTime: 1000 };
  assert.equal(awaySeconds(g.state, root), 0);
  g.state.playTime = 300;
  g.state.event.away = 400;
  assert.equal(awaySeconds(g.state, root), 600);
  assert.equal(boardClockNow(g.state, root), 900);
  root.playTime = 1e6;
  assert.equal(boardClockNow(g.state, root), EVENT_CLOCK_MAX);
});

test('al volver, la medalla queda con el segundo en que se cumplió (simulado)', () => {
  const exact = exactMedalTime(board(15));
  assert.ok(exact < 1800, `se cumple dentro de lo simulado (${exact} s)`);
  const g = board(15);
  const r = g.catchUpBoard(5000);
  assert.equal(r.secured, true);
  assert.equal(g.state.event.time, exact);
  assert.equal(g.state.playTime, 5000);
});

test('al volver, la medalla queda con el segundo en que se cumplió (sumado al ritmo medido)', () => {
  const exact = exactMedalTime(board(0, 'turistas'));
  assert.ok(exact > 1800, `se cumple después de lo simulado (${exact} s)`);
  const g = board(0, 'turistas');
  const r = g.catchUpBoard(30000);
  assert.equal(r.secured, true);
  assert.ok(Math.abs(g.state.event.time - exact) <= 5, `${g.state.event.time} frente a ${exact}`);
  assert.equal(g.state.playTime, 30000);
});

test('más allá de 999:59, la medalla queda con 999:59', () => {
  const g = board(0);
  g.state.playTime = EVENT_CLOCK_MAX - 10;
  g.catchUpBoard(5000);
  assert.equal(g.state.event.medal, 'bronze');
  assert.equal(g.state.event.time, EVENT_CLOCK_MAX);
});
