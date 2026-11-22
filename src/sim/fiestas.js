// Fiestas (v5.17, data/fiestas.js): which celebrations the device's date falls in, the next one, what the map shows
// and the production bonus. Everything is local time and needs no permission or connection.
//   The date can be fixed: the developer options simulate one (setFiestaDate), and the tests run on a day with no
//   fiesta unless they pass their own, so their numbers do not change with the calendar.
import { FIESTAS, FIESTA_BONUS } from '../data/fiestas.js';

const DAY = 24 * 3600 * 1000;
// Under `node --test` (NODE_TEST_CONTEXT), a day with no fiesta: 3 March 2026.
const TEST_DAY = typeof process !== 'undefined' && process.env?.NODE_TEST_CONTEXT ? new Date(2026, 2, 3, 12) : null;
let simulated = null;

// Developer option: a date (YYYY-MM-DD, or a Date) to use instead of today's; null goes back to the real one.
export function setFiestaDate(date) {
  if (!date) simulated = null;
  else if (date instanceof Date) simulated = date;
  else {
    const [y, m, d] = String(date).split('-').map(Number);
    simulated = y && m && d ? new Date(y, m - 1, d, 12) : null;
  }
  cache = null;
}
export const today = () => simulated ?? TEST_DAY ?? new Date();

// Easter Sunday of a year (anonymous Gregorian algorithm).
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// The window [first day, last day] of a date spec whose first day falls in `year`.
export function windowIn(dates, year) {
  if (dates.easter) {
    const e = easter(year);
    return [addDays(e, dates.easter[0]), addDays(e, dates.easter[1])];
  }
  if (dates.month) {
    const first = new Date(year, dates.month - 1, 1);
    const offset = (dates.weekday - first.getDay() + 7) % 7;
    const day = addDays(first, offset + 7 * (dates.nth - 1));
    return [addDays(day, -(dates.before ?? 0)), addDays(day, dates.after ?? 0)];
  }
  const [fm, fd] = dates.from;
  const [tm, td] = dates.to;
  const start = new Date(year, fm - 1, fd);
  // A window that ends in an earlier month ends the next year (1 December to 6 January).
  const end = new Date(tm < fm ? year + 1 : year, tm - 1, td);
  return [start, end];
}

// The window around `date` (its start, this year or the last), or null if `date` is outside it.
function windowAt(dates, date) {
  const day = midnight(date);
  for (const year of [day.getFullYear() - 1, day.getFullYear()]) {
    const [start, end] = windowIn(dates, year);
    if (day >= start && day <= end) return [start, end];
  }
  return null;
}

// The fiestas on `date`, each with its window: [{ fiesta, start, end }].
export function fiestasOn(date = today()) {
  return FIESTAS.map((fiesta) => ({ fiesta, w: windowAt(fiesta.dates, date) }))
    .filter((x) => x.w)
    .map(({ fiesta, w: [start, end] }) => ({ fiesta, start, end }));
}

// The next fiesta to begin after `date`: { fiesta, start, end, days } (days from `date` to its first day).
export function nextFiesta(date = today()) {
  const day = midnight(date);
  let best = null;
  for (const fiesta of FIESTAS) {
    for (const year of [day.getFullYear(), day.getFullYear() + 1]) {
      const [start, end] = windowIn(fiesta.dates, year);
      if (start > day && (!best || start < best.start)) best = { fiesta, start, end };
    }
  }
  return best && { ...best, days: Math.round((best.start - day) / DAY) };
}

// What the map shows on `date` (render/Fiesta.js): the decor of every fiesta it falls in.
export function decorOn(date = today()) {
  const out = new Set();
  for (const fiesta of FIESTAS) if (fiesta.decor && windowAt(fiesta.decorDates ?? fiesta.dates, date)) for (const d of fiesta.decor) out.add(d);
  return out;
}

// The fiesta whose bonus applies on `date` (the largest; among equals, the one with the shortest window, the most
// specific: the Velitas inside the Christmas lights), or null.
export function mainFiesta(date = today()) {
  const on = fiestasOn(date);
  if (!on.length) return null;
  const length = (x) => x.end - x.start;
  return on.sort((a, b) => FIESTA_BONUS[b.fiesta.kind] - FIESTA_BONUS[a.fiesta.kind] || length(a) - length(b))[0];
}

// Production bonus on `date`: ×1.25 during a big fiesta, ×1.10 during one with decorations only, else ×1.
export const fiestaBonus = (date = today()) => {
  const main = mainFiesta(date);
  return main ? FIESTA_BONUS[main.fiesta.kind] : 1;
};

// Today's fiesta and bonus, checked once a minute: the simulation asks on every tick and the HUD on every frame.
let cache = null;
export function current() {
  const now = Date.now();
  if (!cache || now - cache.at > 60_000) cache = { at: now, main: mainFiesta(), mult: fiestaBonus() };
  return cache;
}
// For the simulation (sim/modifiers.js: speedMult). Not on event boards.
export const fiestaMult = (state) => (state.event ? 1 : current().mult);
