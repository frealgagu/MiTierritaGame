import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIESTAS, FIESTAS_BY_ID, FIESTA_PAGES } from '../src/data/fiestas.js';
import { SEASON_EVENTS, PLAZA_ZONES } from '../src/data/plaza.js';
import { EVENTS } from '../src/data/events.js';
import { PAGE_BONUS } from '../src/data/album.js';
import { REGIONS } from '../src/data/regions.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { editionOf, endSeason, finishSeason, nextSeason, restartSeason, seasonOf, seasonReady, seasonStatus, startSeason, sweepSeason } from '../src/sim/seasonEvents.js';
import { eventItems, refillSlots, slotsOf } from '../src/sim/events.js';
import { decorOn, fiestaMult } from '../src/sim/fiestas.js';
import { Game } from '../src/core/Game.js';
import { play } from '../tools/event-bots.js';
import { newGame, reload } from './helpers/game.js';

const day = (y, m, d) => new Date(y, m - 1, d, 12);
// Meets a board's objective at once (as if it had played that long).
const meet = (board) => {
  for (const i of eventItems(board)) board.stats.produced[i.product] = i.need;
};

test('twelve big fiestas, one sticker each, on two pages of six; Semana Santa and the Feria de las Flores only decorate (v5.19)', () => {
  const big = FIESTAS.filter((f) => f.kind === 'big').map((f) => f.id);
  assert.equal(big.length, 12);
  assert.deepEqual(FIESTA_PAGES.map((p) => p.stickers.length), [6, 6]);
  assert.deepEqual(FIESTA_PAGES.flatMap((p) => p.stickers).sort(), [...big].sort());
  for (const id of big) assert.ok(FIESTAS_BY_ID[id].sticker, `${id} has its sticker text`);
  assert.equal(FIESTAS_BY_ID.semana_santa.kind, 'decor');
  assert.equal(FIESTAS_BY_ID.feria_flores.kind, 'decor');
  assert.equal(FIESTAS_BY_ID.amor_amistad.kind, 'big');
});

test('the plaza belongs to no region: its zones and events stay out of the main game lists (v5.19)', () => {
  assert.deepEqual(SEASON_EVENTS.map((e) => e.fiesta), ['velitas', 'navidad', 'negros_blancos']);
  for (const z of PLAZA_ZONES) assert.ok(!ZONE_LIST.includes(z));
  for (const r of REGIONS) for (const z of PLAZA_ZONES) assert.ok(!r.zones.includes(z.id));
  for (const e of SEASON_EVENTS) assert.ok(!EVENTS.includes(e));
});

test('an edition opens on the fiesta\'s first day and lasts 30 days after its last (v5.19)', () => {
  assert.equal(editionOf('velitas', day(2026, 12, 5)), null);
  const e = editionOf('velitas', day(2026, 12, 7));
  assert.deepEqual([e.start, e.end, e.until].map((d) => d.toDateString()), [day(2026, 12, 6), day(2026, 12, 8), day(2027, 1, 7)].map((d) => d.toDateString()));
  assert.ok(editionOf('velitas', day(2027, 1, 7)), 'the last day of grace');
  assert.equal(editionOf('velitas', day(2027, 1, 8)), null);
  // Christmas, playable until 24 January.
  assert.ok(editionOf('navidad', day(2027, 1, 24)));
  assert.equal(editionOf('navidad', day(2027, 1, 25)), null);
});

test('a season event: play it, win the sticker; next year again with no prize (v5.19)', () => {
  const root = newGame();
  const on = day(2026, 12, 7);
  assert.equal(seasonStatus(root, 'velitas', on).kind, 'available');
  assert.equal(seasonStatus(root, 'velitas', on).grace, false);
  assert.equal(seasonReady(root, on), 1);
  assert.equal(seasonStatus(root, 'navidad', on), null, 'Christmas has not started');
  const board = startSeason(root, 'velitas', on);
  assert.equal(board.event.season.prize, true);
  assert.equal(seasonStatus(root, 'velitas', on).kind, 'active');
  assert.equal(finishSeason(root, 'velitas'), null, 'not yet');
  meet(board);
  const r = finishSeason(root, 'velitas');
  assert.equal(r.sticker, true);
  assert.deepEqual(root.profile.fiestas, ['velitas']);
  assert.equal(seasonStatus(root, 'velitas', on).kind, 'won');
  endSeason(root, 'velitas');
  assert.equal(seasonStatus(root, 'velitas', day(2026, 12, 20)).kind, 'completed', 'once a year');
  assert.equal(startSeason(root, 'velitas', day(2026, 12, 20)), null);
  // The next year: again, with no prize.
  const again = startSeason(root, 'velitas', day(2027, 12, 6));
  assert.equal(again.event.season.prize, false);
  meet(again);
  assert.equal(finishSeason(root, 'velitas').sticker, false);
  assert.deepEqual(root.profile.fiestas, ['velitas']);
});

test('the days of grace: still playable after the fiesta; then the board closes and the event comes back next year (v5.19)', () => {
  const root = newGame();
  const st = seasonStatus(root, 'velitas', day(2026, 12, 20));
  assert.equal(st.kind, 'available');
  assert.equal(st.grace, true);
  assert.equal(st.left, 19, '20 December to 7 January');
  startSeason(root, 'velitas', day(2026, 12, 20));
  assert.deepEqual(sweepSeason(root, day(2027, 1, 7)), []);
  assert.deepEqual(sweepSeason(root, day(2027, 1, 8)).map((f) => f.id), ['velitas']);
  assert.equal(seasonOf(root).boards.velitas, undefined);
  assert.equal(seasonStatus(root, 'velitas', day(2027, 1, 8)), null);
  assert.equal(seasonStatus(root, 'velitas', day(2027, 12, 6)).kind, 'available');
  assert.deepEqual(root.profile.fiestas ?? [], []);
});

test('several season events at once, outside the event slots; restarting keeps the edition (v5.19)', () => {
  const root = newGame();
  startSeason(root, 'velitas', day(2026, 12, 7));
  startSeason(root, 'navidad', day(2026, 12, 20));
  assert.deepEqual(Object.keys(seasonOf(root).boards).sort(), ['navidad', 'velitas']);
  refillSlots(root);
  assert.ok(slotsOf(root).every((s) => !s?.zone?.startsWith?.('plaza')), 'no slot holds them');
  const old = seasonOf(root).boards.navidad;
  old.coins = 999;
  const fresh = restartSeason(root, 'navidad');
  assert.equal(fresh.coins, 0);
  assert.deepEqual(fresh.event.season, old.event.season);
});

test('a full page of fiesta stickers pays its Renown (v5.19)', () => {
  const root = newGame();
  root.profile.fiestas = ['batalla_boyaca', 'amor_amistad', 'halloween', 'cartagena', 'velitas'];
  const renown = root.profile.renown;
  const board = startSeason(root, 'navidad', day(2026, 12, 20));
  meet(board);
  assert.equal(finishSeason(root, 'navidad').bonus, PAGE_BONUS);
  assert.equal(root.profile.renown, renown + PAGE_BONUS);
});

test('season boards and stickers survive the save; no fiesta bonus on the board (v5.19)', () => {
  const root = newGame();
  startSeason(root, 'velitas', day(2026, 12, 7));
  root.profile.fiestas = ['halloween'];
  const back = reload(root);
  assert.ok(back.events.season.boards.velitas);
  assert.deepEqual(back.profile.fiestas, ['halloween']);
  assert.equal(fiestaMult(back.events.season.boards.velitas), 1);
});

test('the next season event: Velitas from late November, Negros y Blancos after Christmas, Barranquilla (no event yet) after it (v5.19)', () => {
  const n = nextSeason(day(2026, 11, 24));
  assert.equal(n.fiesta.id, 'velitas');
  assert.equal(n.days, 12);
  assert.ok(n.def);
  const after = nextSeason(day(2026, 12, 26));
  assert.equal(after.fiesta.id, 'negros_blancos');
  assert.ok(after.def, 'its event arrived in v5.21');
  const later = nextSeason(day(2027, 1, 10));
  assert.equal(later.fiesta.id, 'barranquilla');
  assert.equal(later.def, null);
});

test('Negros y Blancos (v5.21): its event from 2 January with 30 days of grace, and streamers and talc on the map', () => {
  const root = newGame();
  assert.equal(seasonStatus(root, 'negros_blancos', day(2027, 1, 1)), null);
  assert.equal(seasonStatus(root, 'negros_blancos', day(2027, 1, 2)).kind, 'available');
  assert.equal(seasonStatus(root, 'negros_blancos', day(2027, 2, 6)).grace, true);
  assert.equal(seasonStatus(root, 'negros_blancos', day(2027, 2, 7)), null);
  assert.deepEqual([...decorOn(day(2027, 1, 5))].filter((d) => ['streamers', 'talc'].includes(d)).sort(), ['streamers', 'talc']);
  assert.ok(!decorOn(day(2027, 1, 8)).has('talc'));
  const board = startSeason(root, 'negros_blancos', day(2027, 1, 3));
  assert.deepEqual(Object.keys(board.stations), ['nyb_disfraces', 'nyb_negros', 'nyb_blancos', 'nyb_desfile']);
  meet(board);
  assert.equal(finishSeason(root, 'negros_blancos').sticker, true);
});

test('a season board runs on its own and its stations balance: the Mesa de la novena waits on nobody (v5.19)', () => {
  const root = newGame();
  const board = startSeason(root, 'navidad', day(2026, 12, 20));
  const g = new Game(board);
  for (let t = 0; t < 600; t += 0.5) g.step(0.5);
  assert.ok(board.stats.produced.novena > 100);
  assert.ok(board.stats.produced.natilla - board.stats.produced.novena < 30, 'natilla and buñuelos both reach the table');
});

// Long events (v5.19): someone following the recommended upgrade every 5 s meets the objective in about 3 hours.
for (const def of SEASON_EVENTS) {
  test(`${def.icon} ${def.id}: about three hours played attentively (v5.19)`, () => {
    const { t } = play(def, 1, { style: 'rec', save: 0, every: 5, limit: 4 * 3600 });
    assert.ok(t > 2.5 * 3600 && t < 3.5 * 3600, `${(t / 3600).toFixed(2)} h`);
  });
}
