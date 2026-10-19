// Eventos (v2.0, GDD §10.2). Cada tablero es una partida aparte (un estado como el del juego, con solo
// la zona del evento) que se juega con su propio Game: sus monedas, sus niveles y su reloj (su
// playTime), que avanza solo mientras se está en el tablero. Se guarda dentro de la partida, en
// state.events.boards[zona]. En los tableros siempre es de día y no hay temporada.
import { EVENTS_BY_ID, EVENT_ACTIONS_BY_ID, EVENT_OF_ZONE, MEDALS } from '../data/events.js';
import { createInitialState, createZoneState } from './state.js';
import { createStationState } from './production.js';
import { yearOf } from './calendar.js';
import { canPay } from './upgrades.js';

export const eventDef = (board) => EVENTS_BY_ID[board.event.id];
// El objetivo del año: van en orden y vuelven a empezar.
export const eventObjective = (def, year) => def.objectives[(year - 1) % def.objectives.length];
export const boardObjective = (board) => eventObjective(eventDef(board), board.event.year);

// Qué pasa con el evento de una zona: null (sin evento o zona cerrada), 'locked' (se abre cuando estén
// construidas en la partida todas las estaciones que usa: así ya se conocen las piezas), 'active' (en
// juego), 'done' (ya se terminó este año: vuelve el siguiente) o 'available'.
export function eventStatus(state, zoneId) {
  const def = EVENT_OF_ZONE[zoneId];
  if (!def || !state.zones[zoneId]?.unlocked) return null;
  const year = yearOf(state.playTime);
  const board = state.events?.boards?.[zoneId];
  if (!board && !def.stations.every((id) => state.stations[id])) return { kind: 'locked', def, year };
  if (board) return { kind: 'active', def, year: board.event.year, board };
  if ((state.events?.done?.[zoneId] ?? 0) >= year) return { kind: 'done', def, year };
  return { kind: 'available', def, year };
}

export function createEventState(def, year) {
  const s = createInitialState();
  delete s.events;
  delete s.profile;
  s.event = { id: def.id, zone: def.zone, year };
  for (const z of Object.keys(s.zones)) s.zones[z] = createZoneState(z === def.zone);
  s.zones[def.zone].dispatch.level = def.level;
  s.stations = {};
  for (const id of def.stations) s.stations[id] = { ...createStationState(), level: def.level, transport: { level: def.level } };
  s.coins = def.coins;
  s.settings = { zone: def.zone };
  return s;
}

// Empieza el evento de la zona (si se puede) y devuelve su tablero.
export function startEvent(state, zoneId) {
  const st = eventStatus(state, zoneId);
  if (!st) return null;
  if (st.kind === 'active') return st.board;
  if (st.kind !== 'available') return null;
  state.events ??= { boards: {}, done: {} };
  return (state.events.boards[zoneId] = createEventState(st.def, st.year));
}

export function eventProgress(board) {
  const obj = boardObjective(board);
  return board.stats[obj.kind][obj.product] ?? 0;
}

export function medalFor(obj, seconds) {
  if (seconds <= obj.medals[0]) return 'gold';
  if (seconds <= obj.medals[1]) return 'silver';
  return 'bronze';
}

const ORDER = ['bronze', 'silver', 'gold'];
// Termina el evento si ya se cumplió el objetivo: medalla, Renombre y el tablero se cierra hasta el año
// siguiente. Devuelve el resultado, o null si todavía no.
export function finishEvent(state, zoneId) {
  const board = state.events?.boards?.[zoneId];
  if (!board) return null;
  const obj = boardObjective(board);
  if (eventProgress(board) < obj.amount) return null;
  const time = board.playTime;
  const medal = medalFor(obj, time);
  const def = eventDef(board);
  const profile = (state.profile ??= { renown: 0, medals: {}, history: [] });
  const renown = MEDALS[medal].renown;
  profile.renown += renown;
  const rec = (profile.medals[def.id] ??= { best: null, count: {} });
  if (ORDER.indexOf(medal) > ORDER.indexOf(rec.best)) rec.best = medal;
  rec.count[medal] = (rec.count[medal] ?? 0) + 1;
  profile.history.push({ event: def.id, year: board.event.year, medal, time });
  state.events.done[zoneId] = board.event.year;
  delete state.events.boards[zoneId];
  return { def, medal, time, renown, year: board.event.year };
}

// Lo que el evento le quita todavía a una estación (1 = nada): la broca con las compras que ya se hicieron.
export function eventPenalty(board, stationId) {
  let mult = eventDef(board).speed?.[stationId] ?? 1;
  for (const id of board.research) {
    const e = EVENT_ACTIONS_BY_ID[id]?.effect;
    if (e?.type === 'stationSpeed' && e.target === stationId) mult *= e.mult;
  }
  return mult;
}

// Compras del evento: una vez cada una, en orden.
export function quoteAction(board, id) {
  const a = EVENT_ACTIONS_BY_ID[id];
  if (!a || a.event !== board.event.id) return { ok: false, reason: 'event', cost: 0 };
  if (board.research.includes(id)) return { ok: false, reason: 'owned', cost: a.cost };
  if (a.requires && !board.research.includes(a.requires)) return { ok: false, reason: 'locked', cost: a.cost };
  if (!canPay(board, a.cost)) return { ok: false, reason: 'coins', cost: a.cost };
  return { ok: true, cost: a.cost };
}

export function buyAction(board, id, bus) {
  const q = quoteAction(board, id);
  if (!q.ok) return false;
  board.coins -= q.cost;
  board.research.push(id);
  bus?.emit('research', { id });
  return true;
}
