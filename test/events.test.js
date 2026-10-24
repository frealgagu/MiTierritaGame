import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { EVENTS, EVENT_ACTIONS_BY_ID, MEDALS } from '../src/data/events.js';
import { EVENT_COOLDOWN, boardObjective, buyAction, createEventState, eventDef, eventObjective, eventProgress, eventStatus, finishEvent, medalFor, quoteAction, startEvent, supplyFraction } from '../src/sim/events.js';
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

// Cumple el objetivo del tablero (y, si buy, compra las tres mejoras del evento).
function complete(board, buy) {
  const obj = boardObjective(board);
  for (const [p, n] of Object.entries(obj.items)) board.stats[obj.kind][p] = n;
  if (!buy) return;
  board.coins = 1e15;
  for (const a of eventDef(board).actions) buyAction(board, a.id);
}

test('cada región tiene dos cupos: los primeros eventos salen enseguida y el resto espera (v3.7)', () => {
  const game = new Game();
  const s = game.state;
  assert.equal(eventStatus(s, 'finca').kind, 'locked', 'hasta que estén construidas sus estaciones');
  assert.equal(eventStatus(s, 'trapiche'), null, 'zona cerrada');
  for (const z of ['trapiche', 'lecheria']) game.unlockZone(z);
  for (const def of EVENTS.filter((d) => ['finca', 'trapiche', 'lecheria'].includes(d.zone))) for (const id of def.stations) s.stations[id] ??= createStationState();
  game.step(0.1);
  assert.equal(eventStatus(s, 'finca').kind, 'available');
  assert.equal(eventStatus(s, 'trapiche').kind, 'available');
  assert.equal(eventStatus(s, 'lecheria').kind, 'waiting', 'los dos cupos están ocupados');
  assert.equal(startEvent(s, 'lecheria'), null);
});

test('al terminar un evento su cupo queda vacío 3 años; luego sale una zona que no se ha jugado (v3.7)', () => {
  const game = new Game();
  const s = game.state;
  for (const z of ['trapiche', 'lecheria']) game.unlockZone(z);
  for (const def of EVENTS.filter((d) => ['finca', 'trapiche', 'lecheria'].includes(d.zone))) for (const id of def.stations) s.stations[id] ??= createStationState();
  const board = startEvent(s, 'finca');
  assert.equal(eventStatus(s, 'finca').kind, 'active');
  assert.equal(startEvent(s, 'finca'), board, 'seguir el que está en juego');
  const first = boardObjective(board);
  complete(board, true);
  board.playTime = 60;
  const r = finishEvent(s, 'finca');
  assert.ok(r.done);
  assert.equal(r.medal, 'gold');
  assert.equal(s.profile.medals.broca.best, 'gold');
  // Su cupo espera 3 años: ni la Finca ni la Lechería salen todavía.
  game.step(0.1);
  assert.equal(eventStatus(s, 'finca').kind, 'waiting');
  assert.equal(eventStatus(s, 'lecheria').kind, 'waiting');
  assert.ok(Math.abs(eventStatus(s, 'lecheria').nextAt - (s.playTime + EVENT_COOLDOWN)) < 1);
  s.playTime += EVENT_COOLDOWN - 10;
  game.step(0.1);
  assert.equal(eventStatus(s, 'lecheria').kind, 'waiting', 'aún no pasan los 3 años');
  s.playTime += 20;
  game.step(0.1);
  // Pasaron: sale la Lechería, que nunca se ha jugado, antes que la Finca.
  assert.equal(eventStatus(s, 'lecheria').kind, 'available');
  assert.equal(eventStatus(s, 'finca').kind, 'waiting');
  assert.equal(eventStatus(s, 'trapiche').kind, 'available', 'el otro cupo siguió con lo suyo');
  // El reto de la Finca avanzó: la próxima vez será el 2.
  assert.equal(eventStatus(s, 'finca').round, 2);
  assert.notDeepEqual(eventObjective(EVENTS[0], 2), first);
});

test('cumplir el objetivo asegura la medalla; el evento termina al tener las tres mejoras (v3.7)', () => {
  const game = new Game();
  const s = game.state;
  buildAll(s);
  const board = startEvent(s, 'finca');
  complete(board, false);
  board.playTime = 100;
  const r = finishEvent(s, 'finca');
  assert.ok(r.secured);
  assert.equal(r.medal, 'gold');
  assert.equal(s.profile.renown, 0, 'el Renombre llega al terminar');
  // Pasa el tiempo comprando las mejoras: la medalla ya no cambia.
  board.playTime = 5000;
  assert.equal(finishEvent(s, 'finca'), null);
  board.coins = 1e9;
  for (const a of EVENTS[0].actions) buyAction(board, a.id);
  const done = finishEvent(s, 'finca');
  assert.ok(done.done);
  assert.equal(done.medal, 'gold');
  assert.equal(done.time, 100);
  assert.equal(s.profile.renown, 4);
  assert.equal(eventStatus(s, 'finca').kind, 'waiting');
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

test('el Renombre, las medallas y el tablero en juego no se pierden al reiniciar, que suma 10 ⭐ (v3.12)', () => {
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

test('los seis tableros arrancan y avanzan hacia su objetivo', () => {
  for (const def of EVENTS) {
    const board = createEventState(def, 1);
    assert.equal(board.coins, def.actions[0].cost, `${def.id}: empieza con lo de la primera compra`);
    const game = new Game(board);
    for (let t = 0; t < 180; t += 0.1) game.step(0.1);
    assert.ok(eventProgress(board) > 0 || Object.values(board.stats.produced).some((n) => n > 0), def.id);
    assert.ok(board.totalEarned > 0, `${def.id}: gana monedas`);
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
  assert.ok(finishEvent(main.state, 'lecheria').secured);
  board.coins = 1e15;
  for (const a of def.actions) buyAction(board, a.id);
  assert.ok(finishEvent(main.state, 'lecheria').done);
});

test('con la región terminada, tras reiniciar salen los eventos de todas sus zonas (v3.8)', async () => {
  const { refillSlots } = await import('../src/sim/events.js');
  const { claimGoal } = await import('../src/sim/goals.js');
  const { GOALS_BY_ZONE } = await import('../src/data/goals.js');
  const game = new Game();
  const s = game.state;
  // Cobrar el objetivo final del Pueblo deja la región terminada.
  const final = GOALS_BY_ZONE.pueblo.at(-1);
  assert.ok(final.final);
  s.zones.pueblo.unlocked = true;
  s.goals.claimed = GOALS_BY_ZONE.pueblo.slice(0, -1).map((g) => g.id);
  s.stats[final.type][final.product] = final.amount;
  assert.equal(s.regionDone, false);
  assert.ok(claimGoal(s, final.id, game.bus));
  assert.ok(s.regionDone && s.zones.pueblo.complete);
  const next = restartState(s);
  assert.ok(next.regionDone, 'se conserva al reiniciar');
  assert.ok(restartState(next).regionDone, 'y en los siguientes reinicios');
  assert.deepEqual(Object.keys(next.zones).filter((z) => next.zones[z].unlocked), ['finca']);
  refillSlots(next);
  assert.deepEqual(next.events.slots.map((x) => x?.zone), [EVENTS[0].zone, EVENTS[1].zone]);
  assert.equal(eventStatus(next, EVENTS[1].zone).kind, 'available', 'aunque la zona no esté abierta');
  assert.equal(eventStatus(next, 'pueblo').kind, 'waiting');
  assert.ok(startEvent(next, EVENTS[1].zone), 'se puede jugar');
  // Sin la región terminada, solo la zona abierta y con sus estaciones.
  const fresh = new Game().state;
  refillSlots(fresh);
  assert.equal(eventStatus(fresh, 'trapiche'), null);
});

test('en el tablero se recomiendan las compras del evento, no las investigaciones de la zona (v3.8.2)', async () => {
  const { recommendUpgrade } = await import('../src/sim/analysis.js');
  const def = EVENTS[0];
  const game = new Game(createEventState(def, 1));
  const b = game.state;
  const quote = (id, mode) => game.quote(id, mode);
  b.coins = def.actions[0].cost;
  assert.equal(recommendUpgrade(b, quote, def.zone).id, `action:${def.actions[0].id}`);
  // Con mucho dinero tampoco salen investigaciones de la zona (como las herraduras).
  b.coins = 1e12;
  for (const a of def.actions) b.research.push(a.id);
  const rec = recommendUpgrade(b, quote, def.zone);
  assert.ok(!rec?.id.startsWith('research:'), rec?.id);
  // Con la medalla asegurada, la compra que falta aunque no alcance el dinero.
  b.research = [def.actions[0].id];
  b.coins = 0;
  b.event.medal = 'gold';
  assert.equal(recommendUpgrade(b, quote, def.zone).id, `action:${def.actions[1].id}`);
});

test('en el tablero de un evento el nivel máximo es 50 (v3.10.1)', () => {
  const def = EVENTS[0];
  const game = new Game(createEventState(def, 1));
  const b = game.state;
  b.coins = 1e30;
  const id = def.stations[0];
  assert.ok(game.buy(id, 'max'));
  assert.equal(b.stations[id].level, 50);
  assert.ok(game.quote(id, 1).maxed);
  assert.ok(game.quote(`${id}:transport`, 'max').levels <= 50 - b.stations[id].transport.level);
  // En la partida, hasta 100.
  const g = new Game();
  g.state.coins = 1e30;
  assert.ok(g.buy('farm', 'max'));
  assert.equal(g.state.stations.farm.level, 100);
});
