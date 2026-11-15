import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { EVENTS, eventKey } from '../src/data/events.js';
import { REGIONS, REGION_OF_ZONE } from '../src/data/regions.js';
import { CAPS } from '../src/data/caps.js';
import { FREE_EVENTS_COST, awaySeconds, boardObjective, buyAction, buyFreeEvents, endEvent, eventDef, eventStatus, finishEvent, startEvent } from '../src/sim/events.js';
import { clockOf } from '../src/sim/calendar.js';
import { maxedRegion } from './helpers/maxed.js';

// Every region that has events, with everything built and at level 100, so every event is ready.
function wholeCountry() {
  const root = maxedRegion('cafetero');
  const withEvents = REGIONS.filter((r) => r.id !== 'cafetero' && EVENTS.some((e) => REGION_OF_ZONE[e.zone] === r.id));
  root.regions = Object.fromEntries(withEvents.map((r) => [r.id, maxedRegion(r.id)]));
  return root;
}

// Meets the board goal and buys its three upgrades.
function win(board) {
  const obj = boardObjective(board);
  for (const [p, n] of Object.entries(obj.items)) board.stats[obj.kind][p] = n;
  board.coins = 1e30;
  for (const a of eventDef(board).actions) buyAction(board, a.id);
  board.playTime = 60;
}

// Nothing in a board is broken: coins and every counter are finite numbers, never negative.
function sane(board, key) {
  assert.ok(Number.isFinite(board.coins) && board.coins >= 0, `${key}: coins ${board.coins}`);
  assert.ok(Number.isFinite(board.playTime), `${key}: playTime ${board.playTime}`);
  for (const kind of ['sold', 'produced']) for (const [id, n] of Object.entries(board.stats[kind])) assert.ok(Number.isFinite(n) && n >= 0, `${key}: ${kind} ${id} = ${n}`);
}

test('with events without waiting, every event of the game runs at the same time without failing (v5.9)', () => {
  const root = wholeCountry();
  const game = new Game(root);
  game.step(0.1);
  root.profile.renown = FREE_EVENTS_COST;
  assert.ok(buyFreeEvents(root.profile));

  // 1. Every event opens at once (La Gran Feria waits for a medal in the other six of Bogotá).
  const first = EVENTS.filter((def) => !def.after);
  const boards = new Map();
  for (const def of first) {
    const key = eventKey(def);
    assert.equal(eventStatus(root, key)?.kind, 'available', key);
    const board = startEvent(root, key);
    assert.ok(board, key);
    boards.set(key, board);
  }
  assert.equal(boards.size, EVENTS.length - 1);

  // 2. All of them left running in the background (🚪 Leave) while the country clock moves 10 minutes.
  for (const board of boards.values()) board.event.away = clockOf(root);
  root.playTime += 600;
  game.step(0.1);

  // 3. Coming back to each one: it catches up on the 10 minutes, keeps running, and nothing breaks.
  for (const [key, board] of boards) {
    const away = awaySeconds(board, root);
    assert.ok(Math.abs(away - 600) < 1, `${key}: away ${away}`);
    delete board.event.away;
    const g = new Game(board);
    g.catchUpBoard(away);
    for (let i = 0; i < 20; i++) g.step(0.5);
    assert.ok(board.playTime >= 600, `${key}: board clock ${board.playTime}`);
    sane(board, key);
  }

  // 4. All won, one after another, with every board still open.
  for (const [key, board] of boards) {
    win(board);
    const r = finishEvent(root, key);
    assert.ok(r?.done, key);
  }
  // La Gran Feria opens now and is won too.
  for (const def of EVENTS.filter((d) => d.after)) {
    const key = eventKey(def);
    const board = startEvent(root, key);
    assert.ok(board, key);
    win(board);
    assert.ok(finishEvent(root, key)?.done, key);
    boards.set(key, board);
  }
  assert.ok(EVENTS.every((def) => root.profile.medals[def.id]?.best), 'a medal in every event');
  assert.equal(root.profile.history.length, CAPS.history, 'the history keeps only the last one');

  // 5. Closed, and every one can be played again right away, all at once.
  for (const key of boards.keys()) assert.ok(endEvent(root, key), key);
  game.step(0.1);
  for (const def of EVENTS) assert.equal(eventStatus(root, eventKey(def))?.kind, 'available', eventKey(def));
  for (const def of EVENTS) assert.ok(startEvent(root, eventKey(def)), eventKey(def));
  for (let i = 0; i < 10; i++) game.step(0.5);
  assert.ok(Number.isFinite(root.coins));
});
