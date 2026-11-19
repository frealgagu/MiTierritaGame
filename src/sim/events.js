// Events (v2.0, GDD §10.2). Each board is a separate save (like main state, containing only
// event zone) played with its own Game: coins, levels, and clock (`playTime`), which advances
// while on board (and in background after «🚪 Exit», v3.67.4). Persisted inside save under
// state.events.boards[zone]. On boards it is always daytime with no seasons.
//
// When events spawn (v3.30): 2 slots game-wide (until v3.29, 2 per region), stored in root
// save. Open slot picks an event from a ready zone (all stations built) in a region not
// occupying the other slot: never-played first, then non-gold (v3.72), then gold; tie-break
// longest unplayed. Event waits until played (no expiry). On win or forfeit, slot enters 2-year
// cooldown; both slots run independently.
// Each event has one challenge (v3.72; until v3.71, three rotating ones). `round` tracks attempt count.
// After win, board remains open for inspection (`event.done`) until «Finish» is tapped.
// After win, board remains open for inspection (`event.done`) until «Finish» is tapped.
//   principal: state.events = { boards, slots: [ { zone } | { until } | null ], last, count, global }
//   each region: state.events = { boards: { zone: board }, last: { zone: clock }, count: { zone: count } }
import { CAPS, capAdd } from '../data/caps.js';
import { EVENTS, EVENTS_BY_ID, EVENT_ACTIONS_BY_ID, EVENT_OF_ZONE, MEDALS, eventKey } from '../data/events.js';
import { createInitialState, createZoneState } from './state.js';
import { createStationState } from './production.js';
import { DAY_LENGTH, YEAR_DAYS, clockOf } from './calendar.js';
import { canPay, canPayRenown } from './upgrades.js';
import { stationImportCap, stationRate } from './rules.js';
import { effectsOf, speedMult } from './modifiers.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { JOIN_FROM, PARENT } from './chain.js';
import { PRODUCTS } from '../data/products.js';
import { WithArticle, withArticle } from '../data/lore.js';
import { gainRenown, profileOf } from './renown.js';
import { LEGACY_OBJECTIVES } from './legacyObjectives.js';
import { LANG, t } from '../i18n/index.js';
import { regionState, regionStates } from './regions.js';

export const EVENT_SLOTS = 2;
export const EVENT_COOLDOWN = 2 * YEAR_DAYS * DAY_LENGTH; // 2 game years (4 h 16 min; until v3.29, 3)
// Event clock caps at 999:59 and stops (v3.67.4); board keeps producing.
export const EVENT_CLOCK_MAX = 999 * 60 + 59;

export const eventDef = (board) => EVENTS_BY_ID[board.event.id];
// An event's challenge (v3.72: single one per event).
export const eventObjective = (def) => def.objective;
// Times played (pre-v3.7 saves stored year instead).
export const boardRound = (board) => board.event.round ?? board.event.year;
// Board challenge. One already in flight before v3.72 (without `single`) finishes using its
// round index among the old three.
export function boardObjective(board) {
  const def = eventDef(board);
  if (board.event.single) return def.objective;
  const old = LEGACY_OBJECTIVES[def.id];
  return old ? old[(boardRound(board) - 1) % old.length] : def.objective;
}

// A region save's events, filling missing defaults: open boards, last played and rounds per event.
export function eventsOf(state) {
  const ev = (state.events ??= {});
  ev.boards ??= {};
  ev.last ??= {};
  ev.count ??= {};
  return ev;
}
// The two game-wide slots (v3.30), in the whole game's save (v5.13; a lone region save keeps its own, in tests).
export const slotsOf = (root) => ((root.events ??= {}).slots ??= Array(EVENT_SLOTS).fill(null));

// Next challenge for zone (1, 2, 3…).
export const nextRound = (state, zoneId) => Math.min(CAPS.eventRound, (eventsOf(state).count[zoneId] ?? 0) + 1);
// Zone has event if open; once region completed at least once (v3.8), all its zones,
// even if not reopened yet after reset: already played.
const open = (state, zoneId) => zoneId in state.zones && (state.regionDone || Boolean(state.zones[zoneId].unlocked));
const ready = (state, def) => open(state, def.zone) && (state.regionDone || def.stations.every((id) => state.stations[id]));
// Event with `after` (v4.7: Gran Feria de Bogotá) spawns only after winning medals in prerequisites.
export const afterDone = (root, def) => !def.after || def.after.every((id) => root.profile?.medals?.[id]?.best);

// Region state for a zone, looked up from root. Passing region state directly restricts
// check to that region's zones.
// (v4.5) Functions here take event key (`zoneId`: zone id, except Bogotá; see data/events.js).
const zoneOfKey = (key) => EVENT_OF_ZONE[key]?.zone ?? key;
const regionOfKey = (key) => REGION_OF_ZONE[zoneOfKey(key)];
export function ownerOf(root, zoneId) {
  return regionState(root, regionOfKey(zoneId));
}
const statesOf = regionStates;

// Fills open slots and clears expired 2-year cooldowns. Called by root save each tick.
// paso (core/Game.js).
export function refillSlots(root) {
  if (root.event || hasFreeEvents(root.profile)) return;
  const slots = slotsOf(root);
  const now = clockOf(root);
  for (let i = 0; i < slots.length; i++) if (slots[i]?.until !== undefined && now >= slots[i].until) slots[i] = null;
  if (!slots.includes(null)) return;
  const boards = statesOf(root).flatMap((st) => Object.entries(eventsOf(st).boards));
  const playing = boards.filter(([, b]) => !b.event.done).map(([zone]) => zone);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]) continue;
    const held = slots.filter((x) => x?.zone).map((x) => x.zone);
    // Active boards without a slot (from pre-v3.30) still count: never more than 2 open at once.
    const loose = playing.filter((zone) => !held.includes(zone));
    if (held.length + loose.length >= slots.length) return;
    const busy = new Set([...held, ...boards.map(([zone]) => zone)]);
    const regions = new Set([...held, ...loose].map((key) => regionOfKey(key)));
    // Never-played first (in zone order), then non-gold, then gold
    // (v3.72); tie-break by longest unplayed.
    const medals = root.profile?.medals ?? {};
    const tier = (def, last) => (last === -Infinity ? 0 : medals[def.id]?.best === 'gold' ? 2 : 1);
    // (v4.7.3) Region with gold in all its events no longer auto-spawns events: played on demand (see startOnDemand).
    const next = EVENTS.filter((def) => !busy.has(eventKey(def)) && !regions.has(REGION_OF_ZONE[def.zone]) && !regionAllGold(root.profile, REGION_OF_ZONE[def.zone]))
      .map((def) => ({ def, owner: ownerOf(root, eventKey(def)) }))
      .filter(({ def, owner }) => owner && ready(owner, def) && afterDone(root, def))
      .map(({ def, owner }, k) => ({ def, k, last: eventsOf(owner).last[eventKey(def)] ?? -Infinity }))
      .map((x) => ({ ...x, tier: tier(x.def, x.last) }))
      .sort((x, y) => x.tier - y.tier || x.last - y.last || x.k - y.k)[0];
    if (!next) return;
    slots[i] = { zone: eventKey(next.def) };
  }
}

// --- Eventos a demanda (v4.7.3) ---
// With gold on all region events, auto-spawn stops: for 20 ⭐ Renown (once per region) any can
// replay anytime without waiting for slot or 2 years; still max 2 open boards at once.
export const ON_DEMAND_COST = 20;
export const regionAllGold = (profile, regionId) => regionEvents(regionId).length > 0 && regionEvents(regionId).every((e) => profile?.medals?.[e.id]?.best === 'gold');
export const hasOnDemand = (profile, regionId) => Boolean(profile?.onDemand?.includes(regionId));
export function quoteOnDemand(profile, regionId) {
  if (hasOnDemand(profile, regionId)) return { ok: false, reason: 'owned', cost: ON_DEMAND_COST };
  if (!regionAllGold(profile, regionId)) return { ok: false, reason: 'gold', cost: ON_DEMAND_COST };
  if (!canPayRenown(profile, ON_DEMAND_COST)) return { ok: false, reason: 'renown', cost: ON_DEMAND_COST };
  return { ok: true, cost: ON_DEMAND_COST };
}
export function buyOnDemand(profile, regionId) {
  if (!quoteOnDemand(profile, regionId).ok) return false;
  profile.renown -= ON_DEMAND_COST;
  (profile.onDemand ??= []).push(regionId);
  return true;
}
// Currently open unfinished boards across whole save.
export const openBoards = (root) => statesOf(root).flatMap((st) => Object.values(eventsOf(st).boards)).filter((b) => !b.event.done).length;
// Whether event can replay right now: gold on all + unlocked, not already open, slot cap available.
export function canPlayOnDemand(root, key) {
  const def = EVENT_OF_ZONE[key];
  const owner = def && ownerOf(root, key);
  if (!owner || eventsOf(owner).boards[key]) return false;
  const region = REGION_OF_ZONE[def.zone];
  return hasOnDemand(root.profile, region) && regionAllGold(root.profile, region) && (hasFreeEvents(root.profile) || openBoards(root) < EVENT_SLOTS);
}

// --- Events without waiting (v5.9) ---
// For 100 ⭐ Renown, once for the whole game: every ready event (all its stations built) can be played at
// any time, with no 2-year wait and no limit of 2 open at once (nor of one per region). Regions with gold in
// every event are included, so on-demand events are no longer needed.
export const FREE_EVENTS_COST = 100;
export const hasFreeEvents = (profile) => Boolean(profile?.freeEvents);
export function quoteFreeEvents(profile) {
  if (hasFreeEvents(profile)) return { ok: false, reason: 'owned', cost: FREE_EVENTS_COST };
  if (!canPayRenown(profile, FREE_EVENTS_COST)) return { ok: false, reason: 'renown', cost: FREE_EVENTS_COST };
  return { ok: true, cost: FREE_EVENTS_COST };
}
export function buyFreeEvents(profile) {
  if (!quoteFreeEvents(profile).ok) return false;
  profile.renown -= FREE_EVENTS_COST;
  profile.freeEvents = true;
  return true;
}
export function startOnDemand(root, key) {
  if (!canPlayOnDemand(root, key)) return null;
  const owner = ownerOf(root, key);
  return (eventsOf(owner).boards[key] = createEventState(EVENT_OF_ZONE[key], nextRound(owner, key)));
}

// When next 2-year cooldown expires (country clock), or null.
export function nextSlotAt(root) {
  const waits = slotsOf(root).filter((x) => x?.until !== undefined).map((x) => x.until);
  return waits.length ? Math.min(...waits) : null;
}

// Status of a zone's event: null (no event or zone closed), 'locked' (unlocks once all stations
// it uses are built), 'active' (in progress), 'won' (won, open for inspection until finished),
// 'available' (in slot: ready to play), or 'waiting' (awaiting free slot).
// 'waiting' (awaiting free slot).
//   root: main save   round: current challenge   board: open board if any
export function eventStatus(root, zoneId) {
  const def = EVENT_OF_ZONE[zoneId];
  const state = def && ownerOf(root, zoneId);
  if (!state || !open(state, def.zone)) return null;
  const board = eventsOf(state).boards[zoneId];
  if (board) return { kind: board.event.done ? 'won' : 'active', def, round: boardRound(board), board };
  if (!afterDone(root, def)) return { kind: 'locked', def, round: nextRound(state, zoneId), after: true };
  if (!ready(state, def)) return { kind: 'locked', def, round: nextRound(state, zoneId) };
  // (v5.9) Events without waiting: any ready event, at any time.
  if (hasFreeEvents(root.profile) || slotsOf(root).some((x) => x?.zone === zoneId)) return { kind: 'available', def, round: nextRound(state, zoneId) };
  return { kind: 'waiting', def, round: nextRound(state, zoneId), nextAt: nextSlotAt(root) };
}

export function createEventState(def, round) {
  // With zones of event's region (v3.6: also Santander ones).
  const s = createInitialState(undefined, REGION_OF_ZONE[def.zone]);
  delete s.events;
  delete s.profile;
  s.event = { id: def.id, zone: def.zone, key: eventKey(def), round, single: true };
  for (const z of Object.keys(s.zones)) s.zones[z] = createZoneState(z === def.zone);
  s.zones[def.zone].dispatch.level = def.level;
  s.stations = {};
  for (const id of def.stations) {
    const st = { ...createStationState(), level: def.level, transport: { level: def.level } };
    // Initial import reserve (for landslide, remaining panela before road closed).
    for (const imp of STATIONS_BY_ID[id].imports ?? []) if (def.stock?.[imp.product]) st.imported[imp.product] = def.stock[imp.product];
    s.stations[id] = st;
  }
  s.coins = def.coins;
  s.settings = { zone: def.zone };
  return s;
}

// Starts zone event (if in slot) and returns board state.
export function startEvent(root, zoneId) {
  refillSlots(root);
  const st = eventStatus(root, zoneId);
  if (!st) return null;
  if (st.kind === 'active' || st.kind === 'won') return st.board;
  if (st.kind !== 'available') return null;
  return (eventsOf(ownerOf(root, zoneId)).boards[zoneId] = createEventState(st.def, st.round));
}

// Dev option (v4.7.2): «instant events», cooldown frees in 1 s instead of 2 years.
let fastEvents = false;
export function setFastEvents(on, root = null) {
  fastEvents = Boolean(on);
  // Waiting cooldowns clear immediately.
  if (fastEvents && root) for (const x of slotsOf(root)) if (x?.until !== undefined) x.until = Math.min(x.until, clockOf(root) + 1);
}

// Event cooldown slot stays empty for 2 years (unslotted legacy boards free none).
function coolDown(root, zoneId) {
  const slots = slotsOf(root);
  const k = slots.findIndex((x) => x?.zone === zoneId);
  if (k >= 0) slots[k] = { until: clockOf(root) + (fastEvents ? 1 : EVENT_COOLDOWN) };
}

// 🔄 Restart (v3.30): same challenge from scratch (coins, levels, upgrades, clock, locked medal).
export function restartEvent(root, zoneId) {
  const ev = eventsOf(ownerOf(root, zoneId) ?? root);
  const board = ev.boards[zoneId];
  if (!board || board.event.done) return null;
  return (ev.boards[zoneId] = createEventState(eventDef(board), boardRound(board)));
}

// 🏁 Finish (v3.30). Before winning: closes without medal, slot waits 2 years, round stays
// unchanged. After winning: simply closes (medal and slot already awarded on win).
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

// Progress on each goal product: [{ product, have, need }].
export function eventItems(board) {
  const obj = boardObjective(board);
  return Object.entries(obj.items).map(([product, need]) => ({ product, need, have: Math.min(need, board.stats[obj.kind][product] ?? 0) }));
}

// Overall goal fraction complete (0 to 1).
export function eventProgress(board) {
  const items = eventItems(board);
  return items.reduce((n, i) => n + i.have, 0) / items.reduce((n, i) => n + i.need, 0);
}

// Path to goal (v3.1.1): stations making still-missing goal products plus all
// upstream ones, their haulers, and dispatch if selling is required. Recommended upgrade
// checks only this: maximizing coins favored pricier items over goal items (during
// landslide, Chocolatería hogged paste and panela away from chocolate de mesa).
export function objectiveUpgrades(board) {
  const def = eventDef(board);
  const obj = boardObjective(board);
  const missing = eventItems(board).filter((i) => i.have < i.need);
  const ids = new Set();
  for (const { product } of missing.length ? missing : eventItems(board)) {
    // Walk upstream and, on a combiner station (v4.0), also walk its secondary supplier.
    const walk = (id) => {
      if (!id || ids.has(id)) return;
      ids.add(id);
      walk(PARENT[id]);
      for (const from of Object.values(JOIN_FROM[id] ?? {})) walk(from);
    };
    walk(def.stations.find((s) => Object.keys(STATIONS_BY_ID[s].out)[0] === product));
  }
  return [...[...ids].flatMap((id) => [id, `${id}:transport`]), ...(obj.kind === 'sold' ? [`dispatch:${def.zone}`] : [])];
}

// Event clock reading: board playTime, capped at 999:59.
export const eventClock = (board) => Math.min(board.playTime ?? 0, EVENT_CLOCK_MAX);

// «🚪 Exit» (v3.67.4): board keeps running in background from `event.away` (country clock on
// exit); missed time catches up on re-entry (Game.catchUpBoard). Meanwhile displays live projection.
export const awaySeconds = (board, root) => (board.event.away === undefined ? 0 : Math.max(0, clockOf(root) - board.event.away));
export const boardClockNow = (board, root) => Math.min((board.playTime ?? 0) + awaySeconds(board, root), EVENT_CLOCK_MAX);

// Once goal is met, medal locks in with timestamp (`at`, board time unless
// given; up to 999:59). Returns true if newly locked.
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

// Region completion bonus (v3.12): bronze on all region events gives 5 ⭐; silver,
// 10 ⭐; gold on all, 20 ⭐. Each claimed once (profile.medalBonus[region]).
export const MEDAL_BONUS = { bronze: 5, silver: 10, gold: 20 };
export const regionEvents = (regionId) => EVENTS.filter((e) => REGION_OF_ZONE[e.zone] === regionId);
// How many events in region have at least that medal.
export const medalCount = (profile, regionId, medal) => regionEvents(regionId).filter((e) => ORDER.indexOf(profile?.medals?.[e.id]?.best) >= ORDER.indexOf(medal)).length;
export function checkMedalBonus(profile) {
  const won = [];
  profile.medalBonus ??= {};
  for (const regionId of new Set(Object.values(REGION_OF_ZONE))) {
    if (!regionEvents(regionId).length) continue; // (a region that doesn't have events yet)
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
// Were all three event upgrades bought?
export const allActionsBought = (board) => eventDef(board).actions.every((a) => board.research.includes(a.id));

// Winning an event takes two steps (v3.7):
//  1. Meeting goal locks in medal at that completion time.
//  2. Buying all three event upgrades wins it: awards medal and Renown and frees slot for
//     2 years. Board stays open to inspect (v3.30) until «Finish».
//     termine (endEvent).
// Returns null (nothing new), { secured } (medal just locked; upgrades remain), or { done }.
//   root: main save storing profile and slots
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
  rec.count[medal] = capAdd(rec.count[medal], 1, CAPS.medalsPerKind);
  // (v5.9) Only the last finished events are kept, so the save does not keep growing.
  profile.history = [...(profile.history ?? []), { event: def.id, round, medal, time }].slice(-CAPS.history);
  ev.last[zoneId] = clockOf(state);
  ev.count[zoneId] = Math.min(round, CAPS.eventRound);
  coolDown(root, zoneId);
  board.event.done = true;
  return { done: true, def, medal, time, renown, round };
}

// Speed factor event still removes from a station (1 = none): e.g. borer remaining after upgrades.
export function eventPenalty(board, stationId) {
  const base = eventDef(board).speed?.[stationId];
  if (!base) return 1;
  let mult = base;
  for (const id of board.research) {
    for (const e of effectsOf(EVENT_ACTIONS_BY_ID[id])) if (e.type === 'stationSpeed' && e.target === stationId) mult *= e.mult;
  }
  return mult;
}

// Fraction of station import demand arriving from outside (0 to 1).
// Even with road closed a trickle arrives (v4.3.2): like carrying on foot. So left idle
// event still finishes (late, with bronze); event upgrades remain key to faster medals.
export const SUPPLY_TRICKLE = 0.1;
export function supplyFraction(board, product) {
  let f = Math.max(eventDef(board).supply?.[product] ?? 0, SUPPLY_TRICKLE);
  for (const id of board.research) {
    for (const e of effectsOf(EVENT_ACTIONS_BY_ID[id])) if (e.type === 'supply' && e.product === product) f = Math.max(f, e.fraction);
  }
  return f;
}

// Active event bottlenecks (v3.12), per station with fraction (0 to 1): speed penalty
// (borer on Cafetal) and missing imports (panela during landslide). Rises with each
// event upgrade. [{ station, pct, product? }]
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

// External arrivals (no other zones or routes on board): each station gets its demand share
// at full speed plus 25 %, capped at free input space.
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

// Event upgrades: bought once each, in order.
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

// «🪲 Cafetal produces at 40 % due to borer» / «⛰️ Mesa de chocolate gets 0 % of
// panela due to landslide» (v3.12). short: «Cafetal at 40 %», for event bar.
export function handicapText(board, h, short = false) {
  const def = eventDef(board);
  const name = STATIONS_BY_ID[h.station].name;
  const pct = `${Math.round(h.pct * 100)} %`;
  if (short) return t('{what} al {pct}', { what: h.product ? `${PRODUCTS[h.product].icon} ${PRODUCTS[h.product].name.toLowerCase()}` : name, pct });
  const p = h.product && PRODUCTS[h.product].name.toLowerCase();
  // Spanish contracts «de el» and «a el» (v3.68: other languages use own patterns).
  if (LANG !== 'es') {
    const blame = def.blame ? t(' por culpa de {blame}', { blame: def.blame }) : '';
    if (h.product) return `${def.icon} ${t('A {station} le llega el {pct} de {p}{blame}.', { station: WithArticle(name), pct, p, blame })}`;
    return `${def.icon} ${t('{station} produce al {pct}{blame}.', { station: WithArticle(name), pct, blame })}`;
  }
  const blame = def.blame ? ` por culpa ${def.blame.startsWith('el ') ? `del ${def.blame.slice(3)}` : `de ${def.blame}`}` : '';
  if (h.product) {
    const to = withArticle(name);
    return `${def.icon} ${to.startsWith('el ') ? `Al ${to.slice(3)}` : `A ${to}`} le llega el ${pct} de ${p}${blame}.`;
  }
  return `${def.icon} ${WithArticle(name)} produce al ${pct}${blame}.`;
}
