import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIESTAS, FIESTA_BONUS } from '../src/data/fiestas.js';
import { decorOn, easter, fiestaBonus, fiestaMult, fiestasOn, mainFiesta, nextFiesta, setFiestaDate, today } from '../src/sim/fiestas.js';
import { speedMult } from '../src/sim/modifiers.js';
import { createEventState } from '../src/sim/events.js';
import { EVENTS } from '../src/data/events.js';
import { newGame, cafeOf } from './helpers/game.js';

const day = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const ids = (s) => fiestasOn(day(s)).map((x) => x.fiesta.id).sort();

test('Easter and the fiestas that move with it (v5.17)', () => {
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  assert.equal(easter(2027).toDateString(), new Date(2027, 2, 28).toDateString());
  assert.equal(easter(2028).toDateString(), new Date(2028, 3, 16).toDateString());
  // Barranquilla: the week before Ash Wednesday (18 February 2026), Carnival Saturday to Tuesday inside it.
  assert.deepEqual(ids('2026-02-14'), ['barranquilla']);
  assert.deepEqual(ids('2026-02-17'), ['barranquilla']);
  assert.deepEqual(ids('2026-02-18'), []);
  // Holy Week: Palm Sunday to Easter Sunday.
  assert.deepEqual(ids('2026-03-29'), ['semana_santa']);
  assert.deepEqual(ids('2026-04-05'), ['semana_santa']);
  assert.deepEqual(ids('2026-04-06'), []);
});

test('fiestas on a weekday of their month: Mother\'s Day and Love and Friendship (v5.17)', () => {
  // Second Sunday of May 2026: the 10th (from Friday the 8th).
  assert.deepEqual(ids('2026-05-08'), ['dia_madre']);
  assert.deepEqual(ids('2026-05-10'), ['dia_madre']);
  assert.deepEqual(ids('2026-05-11'), []);
  // Third Saturday of September 2026: the 19th (Monday 14th to Sunday 20th).
  assert.deepEqual(ids('2026-09-14'), ['amor_amistad']);
  assert.deepEqual(ids('2026-09-20'), ['amor_amistad']);
  assert.deepEqual(ids('2026-09-21'), []);
});

test('December: lights, Velitas, Christmas, New Year\'s Eve and Epiphany, across the new year (v5.17)', () => {
  assert.deepEqual(ids('2026-11-30'), []);
  assert.deepEqual(ids('2026-12-01'), ['alumbrado']);
  assert.deepEqual(ids('2026-12-07'), ['alumbrado', 'velitas']);
  assert.deepEqual(ids('2026-12-24'), ['alumbrado', 'navidad']);
  assert.deepEqual(ids('2026-12-31'), ['alumbrado', 'ano_viejo']);
  assert.deepEqual(ids('2027-01-01'), ['alumbrado', 'ano_viejo']);
  assert.deepEqual(ids('2027-01-06'), ['alumbrado', 'negros_blancos', 'reyes']);
  assert.deepEqual(ids('2027-01-08'), []);
  // What the map shows: the manger stays from Christmas to Epiphany, the kings arrive on the 6th.
  assert.deepEqual([...decorOn(day('2026-12-07'))].sort(), ['candles', 'lights', 'tree']);
  assert.deepEqual([...decorOn(day('2026-12-27'))].sort(), ['lights', 'manger', 'tree']);
  assert.deepEqual([...decorOn(day('2026-12-31'))].sort(), ['fireworks', 'lights', 'manger', 'old_year', 'tree']);
  // (v5.21) It is also Negros y Blancos: streamers and talc.
  assert.deepEqual([...decorOn(day('2027-01-06'))].sort(), ['kings', 'lights', 'manger', 'streamers', 'talc', 'tree']);
  // Christmas is over on the 7th; the carnival of Pasto lasts until that day (v5.21), and then nothing.
  assert.deepEqual([...decorOn(day('2027-01-07'))].sort(), ['streamers', 'talc']);
  assert.equal(decorOn(day('2027-01-08')).size, 0);
});

test('the bonus: ×1.25 in a big fiesta, ×1.10 in one with decorations only, the largest when they overlap (v5.17)', () => {
  assert.equal(fiestaBonus(day('2026-03-03')), 1);
  assert.equal(fiestaBonus(day('2026-12-01')), FIESTA_BONUS.decor);
  assert.equal(fiestaBonus(day('2026-12-07')), FIESTA_BONUS.big);
  assert.equal(mainFiesta(day('2026-12-07')).fiesta.id, 'velitas', 'the most specific one');
  assert.equal(mainFiesta(day('2026-08-06')).fiesta.id, 'batalla_boyaca');
  assert.equal(FIESTA_BONUS.big, 1.25);
  assert.equal(FIESTA_BONUS.decor, 1.1);
  for (const f of FIESTAS) assert.ok(['big', 'decor'].includes(f.kind), f.id);
});

test('the next fiesta, also across the new year (v5.17)', () => {
  const next = nextFiesta(day('2026-11-22'));
  assert.equal(next.fiesta.id, 'alumbrado');
  assert.equal(next.days, 9);
  assert.equal(nextFiesta(day('2027-01-08')).fiesta.id, 'barranquilla');
  assert.equal(nextFiesta(day('2026-11-13')).fiesta.id, 'alumbrado');
});

test('the bonus raises every region\'s production like a season, but not on event boards (v5.17)', () => {
  const cafe = cafeOf(newGame());
  const board = createEventState(EVENTS.find((e) => e.zone === 'finca'), 1);
  // Tests run on a day with no fiesta, so their numbers do not change with the calendar.
  assert.equal(today().toDateString(), new Date(2026, 2, 3).toDateString());
  const base = speedMult(cafe, 'farm');
  const boardBase = speedMult(board, 'farm');
  try {
    setFiestaDate('2026-12-24');
    assert.equal(fiestaMult(cafe), 1.25);
    assert.ok(Math.abs(speedMult(cafe, 'farm') / base - 1.25) < 1e-9);
    assert.equal(fiestaMult(board), 1);
    assert.equal(speedMult(board, 'farm'), boardBase);
  } finally {
    setFiestaDate(null);
  }
  assert.equal(speedMult(cafe, 'farm'), base);
});

test('every fiesta has its icon, name and greeting, and a window inside the year (v5.17)', () => {
  assert.equal(new Set(FIESTAS.map((f) => f.id)).size, FIESTAS.length);
  for (const f of FIESTAS) {
    assert.ok(f.icon && f.name && f.greeting, f.id);
    assert.ok(f.greeting.startsWith(f.icon), `${f.id}: the greeting starts with its icon`);
  }
  // Every fiesta happens once in 2026 (from 1 January 2026 to 31 December 2026, by its first day).
  for (const f of FIESTAS) {
    let n = 0;
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      if (fiestasOn(new Date(d)).some((x) => x.fiesta === f && x.start.toDateString() === d.toDateString())) n++;
    }
    assert.equal(n, 1, `${f.id} starts once a year`);
  }
});
