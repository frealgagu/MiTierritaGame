// Calendario del juego (v1.9): un día son 8 minutos; fuera de la jornada las estaciones paran del todo
// (los arrieros terminan su viaje; el Willys y las chivas siguen). El año
// tiene 16 días en 4 temporadas de 4 días, las del país (secas y de lluvias), que suben o bajan la
// producción de todas las estaciones a la vez.
export const DAY_LENGTH = 480; // s de juego
export const START_HOUR = 8; // una partida nueva empieza por la mañana
// La jornada (v3.8): de 6 a 12 y de 14 a 20, con el almuerzo en medio. Con Renombre ⭐ se le suman
// bloques de 2 horas, en este orden (cada uno cuesta el doble del anterior; ver sim/renown.js), hasta
// trabajar las 24 horas. Es del jugador: vale en todas las regiones.
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

// Las pruebas de la cadena (que todo cuadre, que ningún patio se llene) apagan el calendario: siempre
// de día y sin temporada. Las del calendario lo prenden.
// `extra`: cuántos bloques de la jornada ha comprado el jugador (lo pone main.js desde el perfil).
export const CALENDAR = { on: true, extra: 0 };
const NO_SEASON = { id: 'none', icon: '', name: '', mult: 1, text: '' };

// Horas transcurridas desde la medianoche del primer día.
const hoursAt = (playTime) => START_HOUR + (playTime / DAY_LENGTH) * 24;

export const hourOf = (playTime) => hoursAt(playTime) % 24;
// Día desde 0 (el primero es el 0).
export const dayOf = (playTime) => Math.floor(hoursAt(playTime) / 24);
export const yearOf = (playTime) => Math.floor(dayOf(playTime) / YEAR_DAYS) + 1;
export const seasonOf = (playTime) => (!CALENDAR.on ? NO_SEASON : SEASONS[Math.floor(dayOf(playTime) / SEASON_DAYS) % SEASONS.length]);
// Día dentro de la temporada (1 a 4).
export const seasonDay = (playTime) => (dayOf(playTime) % SEASON_DAYS) + 1;

// Los bloques de la jornada con `extra` bloques comprados.
export const workBlocks = (extra = CALENDAR.extra) => [...BASE_WORK, ...EXTRA_BLOCKS.slice(0, extra)];
// Qué horas (de 0 a 23) son de trabajo, por cuántos bloques hay (los bloques empiezan en horas exactas).
const HOURS = EXTRA_BLOCKS.map((_, n) => n)
  .concat(EXTRA_BLOCKS.length)
  .map((n) => Array.from({ length: 24 }, (_, h) => workBlocks(n).some(([a, b]) => h >= a && h < b)));
const workHours = () => HOURS[Math.max(0, Math.min(EXTRA_BLOCKS.length, CALENDAR.extra | 0))];

export function isWorkTime(playTime) {
  if (!CALENDAR.on) return true;
  return workHours()[Math.floor(hourOf(playTime))];
}

// La hora (de 0 a 23) en que vuelve a empezar el trabajo (la de ahora si ya se está trabajando).
export function nextWorkHour(playTime) {
  const now = Math.floor(hourOf(playTime));
  const hours = workHours();
  for (let k = 0; k < 24; k++) if (hours[(now + k) % 24]) return (now + k) % 24;
  return now;
}

// Para una partida: de noche se descansa y cada temporada rinde lo suyo, salvo en el tablero de un
// evento (v2.0), que tiene su propio reloj: ahí siempre es de día y no hay temporada.
// El reloj del país (v3.0): el tiempo de juego de la partida más lo que ya había pasado cuando empezó
// (una región que se abre después, o la partida nueva tras un reinicio, siguen el mismo calendario).
export const clockOf = (state) => (state.playTime ?? 0) + (state.clockOffset ?? 0);
export const resting = (state) => !state.event && !isWorkTime(clockOf(state));
export const seasonMult = (state) => (state.event ? 1 : seasonOf(clockOf(state)).mult);

// Qué tanto se produce en este instante: 0 de noche; de día, lo de la temporada.
export const workFactor = (playTime) => (isWorkTime(playTime) ? seasonOf(playTime).mult : 0);

// Producción de un tramo (de `from` a `to`, en s de juego), en segundos «de día normal»: para sumar lo
// que pasa sin conexión más allá de lo que se simula. Se cuenta en pasos de 5 s (las horas de la
// jornada y los días caen justo en pasos de 5 s).
const STEP = 5;
export function workSeconds(from, to) {
  let total = 0;
  for (let t = from; t < to; t += STEP) total += workFactor(t + Math.min(STEP, to - t) / 2) * Math.min(STEP, to - t);
  return total;
}

// Segundos de juego hasta que vuelve a empezar la jornada (0 si ya se está trabajando).
export function untilWork(playTime) {
  if (isWorkTime(playTime)) return 0;
  const h = hourOf(playTime);
  const hours = (nextWorkHour(playTime) - h + 24) % 24;
  return (hours / 24) * DAY_LENGTH;
}

// Si la hora es la del almuerzo (de 12 a 14, mientras no se compre ese bloque), para los textos.
export const isLunch = (playTime) => {
  const h = hourOf(playTime);
  return h >= 12 && h < 14 && !isWorkTime(playTime);
};
// «6:00», para los textos.
export const hourLabel = (h) => `${h}:00`;
