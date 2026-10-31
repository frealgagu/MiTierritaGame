// Eventos (v2.0, GDD §10.2). Cada tablero es una partida aparte (un estado como el del juego, con solo
// la zona del evento) que se juega con su propio Game: sus monedas, sus niveles y su reloj (su
// playTime), que avanza mientras se está en el tablero (y por detrás tras «🚪 Salir», v3.67.4). Se guarda dentro de la partida, en
// state.events.boards[zona]. En los tableros siempre es de día y no hay temporada.
//
// Cuándo hay evento (v3.30): 2 cupos para todo el juego (hasta la v3.29, 2 por región), que guarda la
// partida principal. Un cupo libre se llena con el evento de una zona lista (con todas sus estaciones
// construidas) de una región que no tenga ya el otro: primero las que nunca se han jugado, luego la que
// lleva más tiempo sin jugarse. El evento espera ahí hasta que se juegue (no se vence). Al ganarlo o al
// terminarlo sin ganar, ese cupo queda vacío 2 años del juego; los dos cupos van cada uno por su lado.
// El reto de cada zona avanza al ganarlo (1, 2, 3 y vuelve al 1).
// Tras ganarlo, el tablero sigue abierto para mirarlo (`event.done`) hasta que se toque «Terminar».
//   principal: state.events = { boards, slots: [ { zone } | { until } | null ], last, count, global }
//   cada región: state.events = { boards: { zona: tablero }, last: { zona: reloj }, count: { zona: veces } }
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
export const EVENT_COOLDOWN = 2 * YEAR_DAYS * DAY_LENGTH; // 2 años del juego (4 h 16 min; hasta la v3.29, 3)
// El reloj del evento llega hasta 999:59 y ahí se queda (v3.67.4); el tablero sigue produciendo.
export const EVENT_CLOCK_MAX = 999 * 60 + 59;

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

// La partida de la región de una zona, a partir de la principal (root). Con la partida de una región en
// vez de la principal, solo sus propias zonas.
export function ownerOf(root, zoneId) {
  const region = REGION_OF_ZONE[zoneId];
  if ((root.region ?? 'cafetero') === region) return root;
  return region === 'cafetero' ? null : root.regions?.[region] ?? null;
}
const statesOf = (root) => [root, ...Object.values(root.regions ?? {})];

// Llena los cupos libres y libera los que ya cumplieron sus 2 años. Lo llama la partida principal en cada
// paso (core/Game.js).
export function refillSlots(root) {
  if (root.event) return;
  const slots = eventsOf(root).slots;
  const now = clockOf(root);
  for (let i = 0; i < slots.length; i++) if (slots[i]?.until !== undefined && now >= slots[i].until) slots[i] = null;
  if (!slots.includes(null)) return;
  const boards = statesOf(root).flatMap((st) => Object.entries(eventsOf(st).boards));
  const playing = boards.filter(([, b]) => !b.event.done).map(([zone]) => zone);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]) continue;
    const held = slots.filter((x) => x?.zone).map((x) => x.zone);
    // Los tableros en juego sin cupo (de antes de la v3.30) también cuentan: nunca más de 2 a la vez.
    const loose = playing.filter((zone) => !held.includes(zone));
    if (held.length + loose.length >= slots.length) return;
    const busy = new Set([...held, ...boards.map(([zone]) => zone)]);
    const regions = new Set([...held, ...loose].map((zone) => REGION_OF_ZONE[zone]));
    // Primero las nunca jugadas (en el orden de las zonas), luego la que lleva más tiempo sin jugarse.
    const next = EVENTS.filter((def) => !busy.has(def.zone) && !regions.has(REGION_OF_ZONE[def.zone]))
      .map((def) => ({ def, owner: ownerOf(root, def.zone) }))
      .filter(({ def, owner }) => owner && ready(owner, def))
      .map(({ def, owner }, k) => ({ def, k, last: eventsOf(owner).last[def.zone] ?? -Infinity }))
      .sort((x, y) => x.last - y.last || x.k - y.k)[0];
    if (!next) return;
    slots[i] = { zone: next.def.zone };
  }
}

// Cuándo se libera el próximo cupo que está esperando sus 2 años (reloj del país), o null.
export function nextSlotAt(root) {
  const waits = eventsOf(root).slots.filter((x) => x?.until !== undefined).map((x) => x.until);
  return waits.length ? Math.min(...waits) : null;
}

// Qué pasa con el evento de una zona: null (sin evento o zona cerrada), 'locked' (se abre cuando estén
// construidas todas las estaciones que usa: así ya se conocen las piezas), 'active' (en juego), 'won'
// (ganado, abierto para mirarlo hasta que se termine), 'available' (tiene cupo: se puede jugar) o
// 'waiting' (espera a que se libere un cupo).
//   root: la partida principal   round: el reto que toca   board: el tablero, si está abierto
export function eventStatus(root, zoneId) {
  const def = EVENT_OF_ZONE[zoneId];
  const state = def && ownerOf(root, zoneId);
  if (!state || !open(state, zoneId)) return null;
  const board = eventsOf(state).boards[zoneId];
  if (board) return { kind: board.event.done ? 'won' : 'active', def, round: boardRound(board), board };
  if (!ready(state, def)) return { kind: 'locked', def, round: nextRound(state, zoneId) };
  if (eventsOf(root).slots.some((x) => x?.zone === zoneId)) return { kind: 'available', def, round: nextRound(state, zoneId) };
  return { kind: 'waiting', def, round: nextRound(state, zoneId), nextAt: nextSlotAt(root) };
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
export function startEvent(root, zoneId) {
  refillSlots(root);
  const st = eventStatus(root, zoneId);
  if (!st) return null;
  if (st.kind === 'active' || st.kind === 'won') return st.board;
  if (st.kind !== 'available') return null;
  return (eventsOf(ownerOf(root, zoneId)).boards[zoneId] = createEventState(st.def, st.round));
}

// El cupo del evento de la zona queda vacío 2 años (el de un tablero sin cupo no ocupa ninguno).
function coolDown(root, zoneId) {
  const slots = eventsOf(root).slots;
  const k = slots.findIndex((x) => x?.zone === zoneId);
  if (k >= 0) slots[k] = { until: clockOf(root) + EVENT_COOLDOWN };
}

// 🔄 Reiniciar (v3.30): el mismo reto desde cero (monedas, niveles, compras, reloj y la medalla asegurada).
export function restartEvent(root, zoneId) {
  const ev = eventsOf(ownerOf(root, zoneId) ?? root);
  const board = ev.boards[zoneId];
  if (!board || board.event.done) return null;
  return (ev.boards[zoneId] = createEventState(eventDef(board), boardRound(board)));
}

// 🏁 Terminar (v3.30). Sin ganarlo: se cierra sin medalla, su cupo queda vacío 2 años y el reto no avanza
// (la próxima vez sale el mismo). Ganado: solo se cierra (la medalla y el cupo ya se dieron al ganarlo).
export function endEvent(root, zoneId) {
  const owner = ownerOf(root, zoneId) ?? root;
  const ev = eventsOf(owner);
  const board = ev.boards[zoneId];
  if (!board) return false;
  if (!board.event.done) {
    ev.last[zoneId] = clockOf(owner);
    coolDown(root, zoneId);
  }
  delete ev.boards[zoneId];
  return true;
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

// Lo que marca el reloj del evento: su tiempo de juego, hasta 999:59.
export const eventClock = (board) => Math.min(board.playTime ?? 0, EVENT_CLOCK_MAX);

// «🚪 Salir» (v3.67.4): el tablero sigue corriendo por detrás desde `event.away` (el reloj del país al
// salir); lo que pasó se calcula al volver a entrar (Game.catchUpBoard). Mientras tanto, cuánto marcaría.
export const awaySeconds = (board, root) => (board.event.away === undefined ? 0 : Math.max(0, clockOf(root) - board.event.away));
export const boardClockNow = (board, root) => Math.min((board.playTime ?? 0) + awaySeconds(board, root), EVENT_CLOCK_MAX);

// Con el objetivo cumplido, la medalla queda asegurada con el tiempo de ese momento (`at`, el del tablero
// si no se dice otro; hasta 999:59). Devuelve true si se acaba de asegurar.
export function secureMedal(board, at = board.playTime) {
  if (board.event.medal || eventProgress(board) < 1 - 1e-9) return false;
  board.event.time = Math.min(at, EVENT_CLOCK_MAX);
  board.event.medal = medalFor(boardObjective(board), board.event.time);
  return true;
}

export function medalFor(obj, seconds) {
  if (seconds <= obj.medals[0]) return 'gold';
  if (seconds <= obj.medals[1]) return 'silver';
  return 'bronze';
}

const ORDER = ['bronze', 'silver', 'gold'];

// Premio por región (v3.12): al tener al menos bronce en todos los eventos de una región, 5 ⭐; al menos
// plata, 10 ⭐; oro en todos, 20 ⭐. Cada uno una sola vez (profile.medalBonus[región]).
export const MEDAL_BONUS = { bronze: 5, silver: 10, gold: 20 };
export const regionEvents = (regionId) => EVENTS.filter((e) => REGION_OF_ZONE[e.zone] === regionId);
// Cuántos eventos de la región tienen al menos esa medalla.
export const medalCount = (profile, regionId, medal) => regionEvents(regionId).filter((e) => ORDER.indexOf(profile?.medals?.[e.id]?.best) >= ORDER.indexOf(medal)).length;
export function checkMedalBonus(profile) {
  const won = [];
  profile.medalBonus ??= {};
  for (const regionId of new Set(Object.values(REGION_OF_ZONE))) {
    if (!regionEvents(regionId).length) continue; // (una región que todavía no tiene eventos)
    const have = (profile.medalBonus[regionId] ??= []);
    for (const medal of ORDER) {
      if (have.includes(medal) || medalCount(profile, regionId, medal) < regionEvents(regionId).length) continue;
      have.push(medal);
      gainRenown(profile, MEDAL_BONUS[medal]);
      won.push({ region: regionId, medal, renown: MEDAL_BONUS[medal] });
    }
  }
  return won;
}
// ¿Ya compró las tres mejoras del evento?
export const allActionsBought = (board) => eventDef(board).actions.every((a) => board.research.includes(a.id));

// El evento se gana en dos pasos (v3.7):
//  1. Al cumplir el objetivo, la medalla queda asegurada con el tiempo de ese momento.
//  2. Se gana cuando además están compradas las tres mejoras del evento: entonces se dan la medalla y el
//     Renombre y su cupo queda vacío 2 años. El tablero sigue abierto para mirarlo (v3.30) hasta que se
//     termine (endEvent).
// Devuelve null (nada nuevo), { secured } (se acaba de asegurar la medalla; faltan mejoras) o { done }.
//   root: la partida principal, que guarda el perfil y los cupos
export function finishEvent(root, zoneId) {
  const state = ownerOf(root, zoneId) ?? root;
  const ev = eventsOf(state);
  const board = ev.boards[zoneId];
  if (!board || board.event.done) return null;
  const def = eventDef(board);
  if (!board.event.medal) {
    if (!secureMedal(board)) return null;
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
  ev.last[zoneId] = clockOf(state);
  ev.count[zoneId] = round;
  coolDown(root, zoneId);
  board.event.done = true;
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
