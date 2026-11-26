// Season events (v5.19): each big fiesta with a plaza (data/plaza.js) opens a long event in La plaza de las fiestas
// on its real dates (the device's, sim/fiestas.js: today). They belong to no region and use no slot:
//   - an edition opens on the fiesta's first day and can be played until 30 days after its last (GRACE_DAYS), so
//     several can be pending at once; one not finished by then closes and comes back the next year;
//   - the board is like any event board (its own coins, levels and clock) and keeps running while the player is
//     away (it never pauses), but has no medals, upgrades or handicap;
//   - meeting the objective wins the fiesta's sticker (profile.fiestas) the first time; later years can be played
//     again with no prize. A full page of the «Fiestas de Colombia» album pays its Renown like any page.
// What the whole game keeps (root save): events.season = { boards: { fiesta: board }, done: { fiesta: 'YYYY-MM-DD' }
// (the first day of the last edition won), told: { fiesta: 'YYYY-MM-DD' } (the edition whose opening the zone's
// person already announced, ui/Chatter.js, v5.20) }, and profile.fiestas (the stickers).
import { FIESTAS_BY_ID, FIESTA_PAGES } from '../data/fiestas.js';
import { SEASON_EVENT_OF_FIESTA } from '../data/plaza.js';
import { PAGE_BONUS } from '../data/album.js';
import { createEventState, eventProgress, EVENT_CLOCK_MAX } from './events.js';
import { today, windowIn } from './fiestas.js';
import { gainRenown } from './renown.js';

export const GRACE_DAYS = 30;
const DAY = 24 * 3600 * 1000;

// 'YYYY-MM-DD' of a local date.
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Whole days from `a` to `b` (both local dates).
export const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY);

// The season event of a fiesta (every big one has one since v5.21), or null.
export const seasonEventOf = (fiestaId) => SEASON_EVENT_OF_FIESTA[fiestaId] ?? null;
// Fiestas with a season event, in calendar order.
export const seasonFiestas = () => Object.keys(SEASON_EVENT_OF_FIESTA).map((id) => FIESTAS_BY_ID[id]);

// The edition of a fiesta open on `date`: { start, end, until } (its days and the last day of grace), or null.
export function editionOf(fiestaId, date = today()) {
  const day = midnight(date);
  const fiesta = FIESTAS_BY_ID[fiestaId];
  for (const year of [day.getFullYear(), day.getFullYear() - 1]) {
    const [start, end] = windowIn(fiesta.dates, year);
    const until = addDays(end, GRACE_DAYS);
    if (day >= start && day <= until) return { start, end, until };
  }
  return null;
}

// The whole game's season events, filling missing defaults.
export function seasonOf(root) {
  const ev = (root.events ??= {});
  const s = (ev.season ??= {});
  s.boards ??= {};
  s.done ??= {};
  return s;
}
export const stickersOf = (profile) => (profile.fiestas ??= []);
export const hasSticker = (profile, fiestaId) => Boolean(profile?.fiestas?.includes(fiestaId));

// Status of a fiesta's season event on `date`:
//   null: no event (not its dates, or no event yet)
//   { kind: 'available' | 'active' | 'won' | 'completed', def, edition, board?, grace (after its last day), left
//     (days to play, counting today) }
// 'completed': this year's edition already won and closed.
export function seasonStatus(root, fiestaId, date = today()) {
  const def = seasonEventOf(fiestaId);
  if (!def) return null;
  const s = seasonOf(root);
  const board = s.boards[fiestaId];
  // An open board keeps its own edition (its dates), even if a new one would start.
  const edition = board ? boardEdition(board) : editionOf(fiestaId, date);
  if (!edition) return null;
  const grace = midnight(date) > edition.end;
  const left = daysBetween(date, edition.until) + 1;
  const base = { def, edition, grace, left, fiesta: FIESTAS_BY_ID[fiestaId] };
  if (board) return { ...base, kind: board.event.done ? 'won' : 'active', board };
  if (s.done[fiestaId] === ymd(edition.start)) return { ...base, kind: 'completed' };
  return { ...base, kind: 'available' };
}

// A board's edition, from what it saved when it opened.
function boardEdition(board) {
  const { start, end, until } = board.event.season;
  const parse = (x) => {
    const [y, m, d] = x.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  return { start: parse(start), end: parse(end), until: parse(until) };
}

// Every season event that can be played or seen on `date`, in calendar order of their editions.
export function seasonStatuses(root, date = today()) {
  return seasonFiestas()
    .map((f) => seasonStatus(root, f.id, date))
    .filter(Boolean)
    .sort((a, b) => a.edition.start - b.edition.start);
}

// Opens (or returns the open) board of a fiesta's event. null if it cannot be played today.
export function startSeason(root, fiestaId, date = today()) {
  const st = seasonStatus(root, fiestaId, date);
  if (!st || st.kind === 'completed') return null;
  if (st.board) return st.board;
  const board = createEventState(st.def, 1);
  const { start, end, until } = st.edition;
  // prize: whether it still gives the sticker (only the first win does).
  board.event.season = { fiesta: fiestaId, start: ymd(start), end: ymd(end), until: ymd(until), prize: !hasSticker(root.profile, fiestaId) };
  seasonOf(root).boards[fiestaId] = board;
  return board;
}

// 🔄 Restart: the same edition from scratch.
export function restartSeason(root, fiestaId) {
  const s = seasonOf(root);
  const old = s.boards[fiestaId];
  if (!old || old.event.done) return null;
  const board = createEventState(seasonEventOf(fiestaId), 1);
  board.event.season = { ...old.event.season };
  return (s.boards[fiestaId] = board);
}

// Closes a board: before winning, its progress is lost (it can be started again while its days last).
export function endSeason(root, fiestaId) {
  const s = seasonOf(root);
  if (!s.boards[fiestaId]) return false;
  delete s.boards[fiestaId];
  return true;
}

// Once the objective is met: the edition is won, and the sticker too if it is the first time. Returns null or
// { def, fiesta, time, sticker (newly won), bonus (Renown for a full page) }.
export function finishSeason(root, fiestaId) {
  const s = seasonOf(root);
  const board = s.boards[fiestaId];
  if (!board || board.event.done || eventProgress(board) < 1 - 1e-9) return null;
  board.event.done = true;
  board.event.time ??= Math.min(board.playTime, EVENT_CLOCK_MAX);
  s.done[fiestaId] = board.event.season.start;
  const profile = root.profile;
  const stickers = stickersOf(profile);
  const sticker = !stickers.includes(fiestaId);
  let bonus = 0;
  if (sticker) {
    stickers.push(fiestaId);
    const page = FIESTA_PAGES.find((p) => p.stickers.includes(fiestaId));
    if (page && page.stickers.every((id) => stickers.includes(id))) {
      bonus = PAGE_BONUS;
      gainRenown(profile, bonus);
    }
  }
  return { def: seasonEventOf(fiestaId), fiesta: FIESTAS_BY_ID[fiestaId], time: board.event.time, sticker, bonus };
}

// Boards whose days of grace ended without winning close (their edition comes back next year). Returns the
// fiestas whose board closed, so the game can say so.
export function sweepSeason(root, date = today()) {
  const s = seasonOf(root);
  const closed = [];
  for (const [id, board] of Object.entries(s.boards)) {
    if (board.event.done) continue;
    if (midnight(date) > boardEdition(board).until) {
      delete s.boards[id];
      closed.push(FIESTAS_BY_ID[id]);
    }
  }
  return closed;
}

// The next fiesta with a sticker (a big one) to begin after `date`:
// { fiesta, start, days, def }.
export function nextSeason(date = today()) {
  const day = midnight(date);
  let best = null;
  for (const page of FIESTA_PAGES) {
    for (const id of page.stickers) {
      const fiesta = FIESTAS_BY_ID[id];
      for (const year of [day.getFullYear(), day.getFullYear() + 1]) {
        const [start] = windowIn(fiesta.dates, year);
        if (start > day && (!best || start < best.start)) best = { fiesta, start };
      }
    }
  }
  return best && { ...best, days: daysBetween(day, best.start), def: seasonEventOf(best.fiesta.id) };
}

// (v5.21) The first day of a fiesta's edition open on `date` (in its days or its grace), else of its next one: the
// date the stickers' calendar shows under each sticker.
export function editionDay(fiestaId, date = today()) {
  const open = editionOf(fiestaId, date);
  if (open) return open.start;
  const day = midnight(date);
  const [start] = windowIn(FIESTAS_BY_ID[fiestaId].dates, day.getFullYear());
  return start >= day ? start : windowIn(FIESTAS_BY_ID[fiestaId].dates, day.getFullYear() + 1)[0];
}

// Season events that can be started now (for the Events button's badge).
export const seasonReady = (root, date = today()) => seasonStatuses(root, date).filter((st) => st.kind === 'available').length;
