// Game calendar (v1.9): a day is 8 minutes; outside work hours stations pause completely
// (haulers finish active trip; Willys and chivas keep running). A year has
// 16 days in 4 seasons of 4 days (Colombian dry and rainy seasons), raising or
// lowering production of all stations simultaneously.
export const DAY_LENGTH = 480; // game s
export const START_HOUR = 8; // a new save starts in the morning
// Work shift (v3.8): 6 to 12 and 14 to 20, with lunch break in between. Renown ⭐ adds
// 2-hour blocks in this order (each doubles prior cost; see sim/renown.js) up to
// 24-hour work. Since v3.10 stored per region (`workLevel` in region state): functions
// below take block count (`extra`), or save via `workOf`.
export const BASE_WORK = [
  [6, 12],
  [14, 20],
];
export const EXTRA_BLOCKS = [
  [20, 22],
  [4, 6],
  [22, 24],
  [2, 4],
  [12, 14],
  [0, 2],
];
export const SEASON_DAYS = 4;
export const SEASONS = [
  { id: 'verano', icon: '☀️', name: 'Verano', short: 'Verano', mult: 1.2, text: 'tiempo seco: todo rinde más' },
  { id: 'entrada', icon: '🌦️', name: 'Entrada de aguas', short: 'Aguas', mult: 1, text: 'empiezan las lluvias' },
  { id: 'invierno', icon: '🌧️', name: 'Invierno', short: 'Invierno', mult: 0.8, text: 'con tanta lluvia todo va más despacio' },
  { id: 'veranillo', icon: '🌤️', name: 'Veranillo', short: 'Veranillo', mult: 1, text: 'escampa un poco' },
];
export const YEAR_DAYS = SEASON_DAYS * SEASONS.length;

// Chain tests (balancing, no full yards) disable calendar: always daytime
// without seasons. Calendar tests enable it.
export const CALENDAR = { on: true };
const NO_SEASON = { id: 'none', icon: '', name: '', mult: 1, text: '' };

// Hours elapsed since midnight on day zero.
const hoursAt = (playTime) => START_HOUR + (playTime / DAY_LENGTH) * 24;

export const hourOf = (playTime) => hoursAt(playTime) % 24;
// Zero-based day (first is 0).
export const dayOf = (playTime) => Math.floor(hoursAt(playTime) / 24);
export const yearOf = (playTime) => Math.floor(dayOf(playTime) / YEAR_DAYS) + 1;
export const seasonOf = (playTime) => (!CALENDAR.on ? NO_SEASON : SEASONS[Math.floor(dayOf(playTime) / SEASON_DAYS) % SEASONS.length]);
// Day within current season (1 to 4).
export const seasonDay = (playTime) => (dayOf(playTime) % SEASON_DAYS) + 1;

// Active schedule blocks given `extra` purchased blocks.
export const workBlocks = (extra = 0) => [...BASE_WORK, ...EXTRA_BLOCKS.slice(0, extra)];
// How many schedule blocks a save's region has (v3.10).
export const workOf = (state) => state?.workLevel ?? 0;
// Which hours (0 to 23) are active work hours for block count (blocks align to whole hours).
const HOURS = EXTRA_BLOCKS.map((_, n) => n)
  .concat(EXTRA_BLOCKS.length)
  .map((n) => Array.from({ length: 24 }, (_, h) => workBlocks(n).some(([a, b]) => h >= a && h < b)));
const workHours = (extra) => HOURS[Math.max(0, Math.min(EXTRA_BLOCKS.length, extra | 0))];

export function isWorkTime(playTime, extra = 0) {
  if (!CALENDAR.on) return true;
  return workHours(extra)[Math.floor(hourOf(playTime))];
}

// Hour (0 to 23) when work resumes next (current hour if already working).
export function nextWorkHour(playTime, extra = 0) {
  const now = Math.floor(hourOf(playTime));
  const hours = workHours(extra);
  for (let k = 0; k < 24; k++) if (hours[(now + k) % 24]) return (now + k) % 24;
  return now;
}

// For a save: rests at night and seasons scale production, except on event board
// (v2.0), which uses its own clock: always daytime and no seasons.
// Country-wide clock (v3.0): save play time plus elapsed country time at start
// (newly opened region, or new save after reset, stays synced to same calendar).
export const clockOf = (state) => (state.playTime ?? 0) + (state.clockOffset ?? 0);
export const resting = (state) => !state.event && !isWorkTime(clockOf(state), workOf(state));
export const seasonMult = (state) => (state.event ? 1 : seasonOf(clockOf(state)).mult);

// Instantaneous production multiplier: 0 at night; seasonal multiplier by day.
export const workFactor = (playTime, extra = 0) => (isWorkTime(playTime, extra) ? seasonOf(playTime).mult : 0);

// Effective output across span (`from` to `to` in game s), in equivalent normal-day seconds:
// integrates offline time beyond direct simulation in 5 s steps (shift hours and
// day boundaries align cleanly to 5 s multiples).
const STEP = 5;
export function workSeconds(from, to, extra = 0) {
  let total = 0;
  for (let t = from; t < to; t += STEP) total += workFactor(t + Math.min(STEP, to - t) / 2, extra) * Math.min(STEP, to - t);
  return total;
}

// Game seconds until work resumes (0 if currently working).
export function untilWork(playTime, extra = 0) {
  if (isWorkTime(playTime, extra)) return 0;
  const h = hourOf(playTime);
  const hours = (nextWorkHour(playTime, extra) - h + 24) % 24;
  return (hours / 24) * DAY_LENGTH;
}

// Whether current hour is lunch break (12 to 14 while unbought), for UI copy.
export const isLunch = (playTime, extra = 0) => {
  const h = hourOf(playTime);
  return h >= 12 && h < 14 && !isWorkTime(playTime, extra);
};
// «6:00», for UI copy.
export const hourLabel = (h) => `${h}:00`;
