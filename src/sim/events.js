// Eventos (v2.0, GDD §10.2). Cada tablero es una partida aparte (un estado como el del juego, con solo
// la zona del evento) que se juega con su propio Game: sus monedas, sus niveles y su reloj (su
// playTime), que avanza solo mientras se está en el tablero. Se guarda dentro de la partida, en
// state.events.boards[zona]. En los tableros siempre es de día y no hay temporada.
//
// Cuándo hay evento (v3.7): cada región tiene 2 cupos. Un cupo libre se llena con el evento de una zona
// lista (con todas sus estaciones construidas): primero las que nunca se han jugado, luego la que lleva
// más tiempo sin jugarse. El evento espera ahí hasta que se juegue (no se vence). Al terminarlo, ese cupo
// queda vacío 3 años del juego; los dos cupos van cada uno por su lado. El reto de cada zona avanza al
// terminarlo (1, 2, 3 y vuelve al 1).
//   state.events = { boards: { zona: tablero }, slots: [ { zone } | { until } | null ], last: { zona: reloj }, count: { zona: veces } }
import { EVENTS, EVENTS_BY_ID, EVENT_ACTIONS_BY_ID, EVENT_OF_ZONE, MEDALS } from '../data/events.js';
import { createInitialState, createZoneState } from './state.js';
import { createStationState } from './production.js';
import { DAY_LENGTH, YEAR_DAYS, clockOf } from './calendar.js';
import { canPay } from './upgrades.js';
import { stationImportCap, stationRate } from './rules.js';
import { effectsOf, speedMult } from './modifiers.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { PARENT } from './chain.js';
import { PRODUCTS } from '../data/products.js';
import { WithArticle, withArticle } from '../data/lore.js';
import { gainRenown, profileOf } from './renown.js';

export const EVENT_SLOTS = 2;
export const EVENT_COOLDOWN = 3 * YEAR_DAYS * DAY_LENGTH; // 3 años del juego (6 h 24 min)

export const eventDef = (board) => EVENTS_BY_ID[board.event.id];
// El reto n.º `round` de un evento: van en orden y vuelven a empezar.
export const eventObjective = (def, round) => def.objectives[(round - 1) % def.objectives.length];
// (Los tableros de antes de la v3.7 guardaban el año en vez del reto.)
export const boardRound = (board) => board.event.round ?? board.event.year;
export const boardObjective = (board) => eventObjective(eventDef(board), boardRound(board));

// Los eventos de la partida, con lo que les falte.
export function eventsOf(state) {
  const ev = (state.events ??= {});
  ev.boards ??= {};
  ev.slots ??= Array(EVENT_SLOTS).fill(null);
  ev.last ??= {};
  ev.count ??= {};
  return ev;
}

// El próximo reto de la zona (1, 2, 3…).
export const nextRound = (state, zoneId) => (eventsOf(state).count[zoneId] ?? 0) + 1;
// Una zona tiene evento si está abierta; con la región ya terminada alguna vez (v3.8), todas sus zonas,
// aunque tras reiniciar todavía no se hayan abierto: ya se jugaron.
const open = (state, zoneId) => zoneId in state.zones && (state.regionDone || Boolean(state.zones[zoneId].unlocked));
const ready = (state, def) => open(state, def.zone) && (state.regionDone || def.stations.every((id) => state.stations[id]));

// Llena los cupos libres y libera los que ya cumplieron sus 3 años. Se llama en cada paso de la partida.
export function refillSlots(state) {
  if (state.event) return;
  const ev = eventsOf(state);
  const now = clockOf(state);
  let free = false;
  for (let i = 0; i < ev.slots.length; i++) {
    const slot = ev.slots[i];
    if (slot?.until !== undefined && now >= slot.until) ev.slots[i] = null;
    if (!ev.slots[i]) free = true;
  }
  if (!free) return;
  for (let i = 0; i < ev.slots.length; i++) {
    if (ev.slots[i]) continue;
    const taken = new Set([...ev.slots.map((x) => x?.zone), ...Object.keys(ev.boards)]);
    // Primero las nunca jugadas (en el orden de las zonas), luego la que lleva más tiempo sin jugarse.
    const next = EVENTS.filter((def) => !taken.has(def.zone) && ready(state, def))
      .map((def, k) => ({ def, k, last: ev.last[def.zone] ?? -Infinity }))
      .sort((a, b) => a.last - b.last || a.k - b.k)[0];
    if (!next) return;
    ev.slots[i] = { zone: next.def.zone };
  }
}

// Cuándo se libera el próximo cupo que está esperando sus 3 años (reloj del país), o null.
export function nextSlotAt(state) {
  const waits = eventsOf(state).slots.filter((x) => x?.until !== undefined).map((x) => x.until);
  return waits.length ? Math.min(...waits) : null;
}

// Qué pasa con el evento de una zona: null (sin evento o zona cerrada), 'locked' (se abre cuando estén
// construidas todas las estaciones que usa: así ya se conocen las piezas), 'active' (en juego),
// 'available' (tiene cupo: se puede jugar) o 'waiting' (espera a que se libere un cupo de la región).
//   round: el reto que toca   board: el tablero, si está en juego
export function eventStatus(state, zoneId) {
  const def = EVENT_OF_ZONE[zoneId];
  if (!def || !open(state, zoneId)) return null;
  const ev = eventsOf(state);
  const board = ev.boards[zoneId];
  if (board) return { kind: 'active', def, round: boardRound(board), board };
  if (!ready(state, def)) return { kind: 'locked', def, round: nextRound(state, zoneId) };
  if (ev.slots.some((x) => x?.zone === zoneId)) return { kind: 'available', def, round: nextRound(state, zoneId) };
  return { kind: 'waiting', def, round: nextRound(state, zoneId), nextAt: nextSlotAt(state) };
}

export function createEventState(def, round) {
  // Con las zonas de la región del evento (v3.6: también los de Santander).
  const s = createInitialState(undefined, REGION_OF_ZONE[def.zone]);
  delete s.events;
  delete s.profile;
  s.event = { id: def.id, zone: def.zone, round };
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

// Empieza el evento de la zona (si tiene cupo) y devuelve su tablero.
export function startEvent(state, zoneId) {
  refillSlots(state);
  const st = eventStatus(state, zoneId);
  if (!st) return null;
  if (st.kind === 'active') return st.board;
  if (st.kind !== 'available') return null;
  return (eventsOf(state).boards[zoneId] = createEventState(st.def, st.round));
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

// Lo que lleva al objetivo (v3.1.1): las estaciones que hacen los productos que todavía faltan y todas
// las anteriores, con sus arrieros, y el despacho si hay que venderlos. La mejora recomendada del tablero
// mira solo esto: buscar más monedas llevaba a subir lo que vale más y no lo que se pide (en el
// derrumbe, la Chocolatería se quedaba con la pasta y la panela del chocolate de mesa).
export function objectiveUpgrades(board) {
  const def = eventDef(board);
  const obj = boardObjective(board);
  const missing = eventItems(board).filter((i) => i.have < i.need);
  const ids = new Set();
  for (const { product } of missing.length ? missing : eventItems(board)) {
    let id = def.stations.find((s) => Object.keys(STATIONS_BY_ID[s].out)[0] === product);
    while (id) {
      ids.add(id);
      id = PARENT[id];
    }
  }
  return [...[...ids].flatMap((id) => [id, `${id}:transport`]), ...(obj.kind === 'sold' ? [`dispatch:${def.zone}`] : [])];
}

export function medalFor(obj, seconds) {
  if (seconds <= obj.medals[0]) return 'gold';
  if (seconds <= obj.medals[1]) return 'silver';
  return 'bronze';
}

const ORDER = ['bronze', 'silver', 'gold'];
// ¿Ya compró las tres mejoras del evento?
export const allActionsBought = (board) => eventDef(board).actions.every((a) => board.research.includes(a.id));

// El evento se gana en dos pasos (v3.7):
//  1. Al cumplir el objetivo, la medalla queda asegurada con el tiempo de ese momento.
//  2. Termina cuando además están compradas las tres mejoras del evento: entonces se dan la medalla y el
//     Renombre, el tablero se cierra y su cupo queda vacío 3 años.
// Devuelve null (nada nuevo), { secured } (se acaba de asegurar la medalla; faltan mejoras) o { done }.
//   state: la partida de la región del evento   root: la que guarda el perfil (la del Eje Cafetero)
export function finishEvent(state, zoneId, root = state) {
  const ev = eventsOf(state);
  const board = ev.boards[zoneId];
  if (!board) return null;
  const def = eventDef(board);
  if (!board.event.medal) {
    if (eventProgress(board) < 1) return null;
    board.event.medal = medalFor(boardObjective(board), board.playTime);
    board.event.time = board.playTime;
    if (!allActionsBought(board)) return { secured: true, def, medal: board.event.medal, time: board.event.time };
  }
  if (!allActionsBought(board)) return null;
  const { medal, time } = board.event;
  const round = boardRound(board);
  const profile = profileOf(root);
  const renown = MEDALS[medal].renown;
  gainRenown(profile, renown);
  const rec = (profile.medals[def.id] ??= { best: null, count: {} });
  if (ORDER.indexOf(medal) > ORDER.indexOf(rec.best)) rec.best = medal;
  rec.count[medal] = (rec.count[medal] ?? 0) + 1;
  profile.history.push({ event: def.id, round, medal, time });
  const now = clockOf(state);
  ev.last[zoneId] = now;
  ev.count[zoneId] = round;
  // Su cupo queda vacío 3 años (el de un tablero de antes de la v3.7 sin cupo no ocupa ninguno).
  const k = ev.slots.findIndex((x) => x?.zone === zoneId);
  if (k >= 0) ev.slots[k] = { until: now + EVENT_COOLDOWN };
  delete ev.boards[zoneId];
  return { done: true, def, medal, time, renown, round };
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

// Lo que frena el evento ahora (v3.12), estación por estación, con cuánto rinde (de 0 a 1): la velocidad
// que le quita (la broca al Cafetal) y lo que no le llega de afuera (la panela con el derrumbe). Sube con
// cada compra del evento. [{ station, pct, product? }]
export function eventHandicaps(board) {
  if (!board?.event) return [];
  const def = eventDef(board);
  const out = [];
  for (const [station, base] of Object.entries(def.speed ?? {})) {
    let f = base;
    for (const id of board.research) {
      for (const e of effectsOf(EVENT_ACTIONS_BY_ID[id])) if (e.type === 'stationSpeed' && e.target === station) f *= e.mult;
    }
    out.push({ station, pct: Math.min(1, f) });
  }
  for (const [product, base] of Object.entries(def.supply ?? {})) {
    if (base >= 1) continue;
    const pct = supplyFraction(board, product);
    for (const station of def.stations) if (STATIONS_BY_ID[station].imports?.some((imp) => imp.product === product)) out.push({ station, pct, product });
  }
  return out;
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

// «🪲 El Cafetal produce al 40 % por culpa de la broca» / «⛰️ A la Mesa de chocolate le llega el 0 % de
// la panela por culpa del derrumbe» (v3.12). short: «Cafetal al 40 %», para la barra del evento.
export function handicapText(board, h, short = false) {
  const def = eventDef(board);
  const name = STATIONS_BY_ID[h.station].name;
  const pct = `${Math.round(h.pct * 100)} %`;
  if (short) return h.product ? `${PRODUCTS[h.product].icon} ${PRODUCTS[h.product].name.toLowerCase()} al ${pct}` : `${name} al ${pct}`;
  const blame = def.blame ? ` por culpa ${def.blame.startsWith('el ') ? `del ${def.blame.slice(3)}` : `de ${def.blame}`}` : '';
  if (h.product) {
    const to = withArticle(name);
    return `${def.icon} ${to.startsWith('el ') ? `Al ${to.slice(3)}` : `A ${to}`} le llega el ${pct} de ${PRODUCTS[h.product].name.toLowerCase()}${blame}.`;
  }
  return `${def.icon} ${WithArticle(name)} produce al ${pct}${blame}.`;
}
