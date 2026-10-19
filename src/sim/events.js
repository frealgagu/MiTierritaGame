// Eventos (v2.0, GDD §10.2). Cada tablero es una partida aparte (un estado como el del juego, con solo
// la zona del evento) que se juega con su propio Game: sus monedas, sus niveles y su reloj (su
// playTime), que avanza solo mientras se está en el tablero. Se guarda dentro de la partida, en
// state.events.boards[zona]. En los tableros siempre es de día y no hay temporada.
import { EVENTS_BY_ID, EVENT_ACTIONS_BY_ID, EVENT_OF_ZONE, MEDALS } from '../data/events.js';
import { createInitialState, createZoneState } from './state.js';
import { createStationState } from './production.js';
import { yearOf } from './calendar.js';
import { canPay } from './upgrades.js';
import { stationImportCap, stationRate } from './rules.js';
import { effectsOf, speedMult } from './modifiers.js';
import { STATIONS_BY_ID } from '../data/stations.js';

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
  for (const id of def.stations) {
    const st = { ...createStationState(), level: def.level, transport: { level: def.level } };
    // Lo guardado de los importados (con el derrumbe, la panela que quedó antes de que se tapara la vía).
    for (const imp of STATIONS_BY_ID[id].imports ?? []) if (def.stock?.[imp.product]) st.imported[imp.product] = def.stock[imp.product];
    s.stations[id] = st;
  }
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

// Cuánto lleva de cada producto del objetivo: [{ product, have, need }].
export function eventItems(board) {
  const obj = boardObjective(board);
  return Object.entries(obj.items).map(([product, need]) => ({ product, need, have: Math.min(need, board.stats[obj.kind][product] ?? 0) }));
}

// Qué tanto del objetivo está hecho (0 a 1).
export function eventProgress(board) {
  const items = eventItems(board);
  return items.reduce((n, i) => n + i.have, 0) / items.reduce((n, i) => n + i.need, 0);
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
  if (eventProgress(board) < 1) return null;
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
  const base = eventDef(board).speed?.[stationId];
  if (!base) return 1;
  let mult = base;
  for (const id of board.research) {
    for (const e of effectsOf(EVENT_ACTIONS_BY_ID[id])) if (e.type === 'stationSpeed' && e.target === stationId) mult *= e.mult;
  }
  return mult;
}

// Qué parte de lo que piden las estaciones llega de afuera por un importado (0 a 1).
export function supplyFraction(board, product) {
  let f = eventDef(board).supply?.[product] ?? 0;
  for (const id of board.research) {
    for (const e of effectsOf(EVENT_ACTIONS_BY_ID[id])) if (e.type === 'supply' && e.product === product) f = Math.max(f, e.fraction);
  }
  return f;
}

// Lo que llega de afuera (en el tablero no hay otras zonas ni rutas): a cada estación, su parte de lo
// que gasta a toda marcha, un 25 % más, sin pasar de lo que le cabe.
export function stepSupply(board, dt) {
  for (const [id, st] of Object.entries(board.stations)) {
    const def = STATIONS_BY_ID[id];
    for (const imp of def.imports ?? []) {
      const f = supplyFraction(board, imp.product);
      if (f <= 0) continue;
      const mult = speedMult(board, id);
      const cap = stationImportCap(def, st.level, mult, imp);
      const add = f * stationRate(def, st.level) * mult * imp.perCycle * 1.25 * dt;
      st.imported[imp.product] = Math.min(cap, (st.imported[imp.product] ?? 0) + add);
    }
  }
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
