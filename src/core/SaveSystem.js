import { CAPS } from '../data/caps.js';
import { createInitialState, SAVE_VERSION } from '../sim/state.js';
import { createSourceState, createStationState } from '../sim/production.js';
import { createRouteState } from '../sim/routes.js';
import { ROUTES } from '../data/routes.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { OFFLINE_BASE_HOURS, OFFLINE_COSTS, OFFLINE_STEP_HOURS } from '../sim/renown.js';
import { DAY_LENGTH, YEAR_DAYS } from '../sim/calendar.js';
import { EVENT_OF_ZONE, MEDALS } from '../data/events.js';
import { LOGROS_BY_ID } from '../data/logros.js';
import { ALBUM, PAGE_BONUS } from '../data/album.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { GOALS_BY_ID } from '../data/goals.js';
import { PRODUCTS } from '../data/products.js';
import { masteryReady } from '../sim/legacy.js';

const KEY = 'mitierrita.save';

export function saveGame(state) {
  state.savedAt = Date.now();
  try {
    // (v5.13) Never overwrite a save written by a newer version of the game (an outdated copy of the game opened
    // after an update): that save could not be opened here and would be lost. Its format is the first field.
    const stored = /^\{"version":(\d+)/.exec(localStorage.getItem(KEY) ?? '')?.[1];
    if (stored && Number(stored) > SAVE_VERSION) return false;
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// (v5.13) The save in this browser comes from a newer version of the game (see saveGame).
export function storedSaveTooNew() {
  try {
    const v = /^\{"version":(\d+)/.exec(localStorage.getItem(KEY) ?? '')?.[1];
    return Boolean(v) && Number(v) > SAVE_VERSION;
  } catch {
    return false;
  }
}

export function loadGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // no storage available: nothing to delete
  }
}

// Brings any save up to the current format (sim/state.js: SAVE_VERSION), step by step:
//   up to 9: the save was Eje Cafetero's own, holding the whole game's data and the other regions (v3.0 to v5.12).
//            Each region is brought up to date (migrateRegion), then the player's data (migrateProfile), then
//   9 -> 10: Eje Cafetero moves into `regions` like the others and the save becomes the whole game's (toFormat10).
//   10: each region and the player's data are brought up to date.
// A save from a newer format (a backup from an updated phone) is refused: null, see saveTooNew.
function migrate(data) {
  if (typeof data !== 'object' || data === null) return null;
  if ((data.version ?? 0) > SAVE_VERSION) return null;
  const regions = Object.fromEntries(Object.entries(data.regions ?? {}).map(([id, st]) => [id, migrateRegion(st)]));
  if (isGameSave(data)) {
    const game = { ...data, regions };
    game.playTime ??= 0;
    game.clockOffset ??= 0;
    game.settings ??= { sound: true, music: true, zone: 'finca' };
    game.events = { slots: data.events?.slots ?? [null, null], global: true };
    return migrateProfile(game);
  }
  const old = migrateRegion(data);
  old.regions = regions;
  return toFormat10(migrateProfile(old));
}

// Format 10 and later: the whole game's save (no stations of its own, regions inside).
const isGameSave = (data) => (data.version ?? 0) >= 10 && !data.stations && Boolean(data.regions);

// Region saves of a save in either shape (a format 9 save is itself Eje Cafetero's).
const regionSaves = (save) => (save.stations ? [save, ...Object.values(save.regions ?? {})] : Object.values(save.regions ?? {}));

// 9 -> 10 (v5.13): what belongs to the whole game stays in the save; everything else was Eje Cafetero's own and
// becomes its region save, like any other region. The country clock carries on: the save and Eje Cafetero keep
// the same playTime and clockOffset, so every clock still shows the same date.
function toFormat10(old) {
  const { version, savedAt, profile, settings = {}, events = {}, regions = {}, bogotaNet, ...cafetero } = old;
  const { slots, global, ...regionEvents } = events;
  const zone = REGIONS_BY_ID.cafetero.zones.includes(settings.zone) ? settings.zone : REGIONS_BY_ID.cafetero.zones[0];
  return {
    version: SAVE_VERSION,
    savedAt,
    playTime: cafetero.playTime ?? 0,
    clockOffset: cafetero.clockOffset ?? 0,
    profile,
    settings,
    events: { slots: slots ?? [null, null], global: true },
    regions: { cafetero: { version: SAVE_VERSION, savedAt, ...cafetero, region: 'cafetero', clockOffset: cafetero.clockOffset ?? 0, events: regionEvents, settings: { zone } }, ...regions },
    bogotaNet: bogotaNet ?? true,
  };
}

// A save written by a newer version of the game (format above SAVE_VERSION): it cannot be opened here.
export function saveTooNew(text) {
  try {
    return (JSON.parse(decodeURIComponent(escape(atob(text.trim())))).version ?? 0) > SAVE_VERSION;
  } catch {
    return false;
  }
}

// One region's save brought up to date (any format).
function migrateRegion(data) {
  // Each region is stored as a separate sub-state (v3.0).
  const region = data.region ?? 'cafetero';
  const base = createInitialState(data.savedAt, region);
  // v1/v2 -> v3: stations gain input buffer, status, and carriers; mules gain origin, destination, and phase.
  const stations = {};
  for (const [id, st] of Object.entries(data.stations ?? {})) stations[id] = { ...createStationState(), ...st };
  delete stations.farm?.blocked;
  // v6 -> v7: route imports stored per product (a station can import multiple goods).
  for (const [id, st] of Object.entries(stations)) {
    if (typeof st.imported === 'number') {
      const imp = STATIONS_BY_ID[id]?.imports?.[0];
      st.imported = imp ? { [imp.product]: st.imported } : {};
    }
  }
  const mules = (data.mules ?? []).map(({ s0, s1, ...m }) => ({ from: 'farm', to: 'warehouse', phase: 'go', ...m }));
  // v4 -> v5: dispatch, warehouse, and Willys become per-zone; completing Finca unlocks Trapiche.
  const zones = {};
  for (const [id, z] of Object.entries(base.zones)) zones[id] = { ...z, ...data.zones?.[id] };
  if (region !== 'cafetero') {
    // v3.2-v3.4: La Fiquera's weavers guild used id 'tejedoras', colliding with
    // Pueblo's fique weavers (v3.5: distinct IDs).
    if (region === 'santander' && data.research?.includes('tejedoras')) data.research = data.research.map((id) => (id === 'tejedoras' ? 'asociacion_tejedoras' : id));
    // v3.1: an already-completed zone unlocks the next one in its region if added in a newer update.
    for (const [id, z] of Object.entries(zones)) {
      const next = ZONES_BY_ID[id].next;
      if (!z.complete || !next || zones[next].unlocked) continue;
      zones[next].unlocked = true;
      stations[ZONES_BY_ID[next].farm.stationId] ??= createSourceState(ZONES_BY_ID[next].farm.stationId);
    }
    // v3.21: an in-progress region (La Costa) is marked complete if its final zone was already finished.
    const def = REGIONS_BY_ID[region];
    if (def && !def.wip && zones[def.zones.at(-1)]?.complete) data.regionDone = true;
    return finish(data, base, stations, zones, mules);
  }
  if (!data.zones) {
    zones.finca = {
      ...zones.finca,
      complete: Boolean(data.zoneComplete),
      dispatch: { ...zones.finca.dispatch, ...data.dispatch },
      warehouse: { ...data.warehouse },
      jeep: { ...zones.finca.jeep, ...data.jeep },
    };
  }
  if (zones.finca.complete && !zones.trapiche.unlocked) {
    zones.trapiche.unlocked = true;
    stations.canefield ??= createStationState();
  }
  // v5 -> v6: Lecheria and inter-zone routes; completing Trapiche unlocks Lecheria.
  if (zones.trapiche.complete && !zones.lecheria.unlocked) {
    zones.lecheria.unlocked = true;
    stations.pasture ??= createStationState();
  }
  // v6 -> v7: Cacaotal; completing Lecheria unlocks it.
  if (zones.lecheria.complete && !zones.cacaotal.unlocked) {
    zones.cacaotal.unlocked = true;
    stations.cacao_grove ??= createStationState();
  }
  // v7 -> v8: Maizal; completing Cacaotal unlocks it.
  if (zones.cacaotal.complete && !zones.maizal.unlocked) {
    zones.maizal.unlocked = true;
    stations.cornfield ??= createStationState();
  }
  // v8 -> v9: Pueblo; completing Maizal unlocks it.
  if (zones.maizal.complete && !zones.pueblo.unlocked) {
    zones.pueblo.unlocked = true;
    stations.coffee_house ??= createStationState();
  }
  return finish(data, base, stations, zones, mules);
}

// Legacy research items that added offline hours (before v3.7), with their costs and hours.
const OLD_OFFLINE_RESEARCH = {
  capataz: [10000, 3], trapichero: [300000, 3], ordeno_programado: [3000000, 4], vigilante: [8000000, 4], vecina: [60000000, 4], administrador: [2500000000, 4],
  mayordomo_s: [10000, 3], veguero: [300000, 3], asociacion_tejedoras: [3000000, 4], vaquero: [8000000, 4], cuidandera: [60000000, 4], administradora: [2500000000, 4],
};

// v4.5 -> v4.6: Bogota changed from neighborhoods to a connected network with new recipes. Prior Bogota progress is
// wiped as if never started (no refund): its state, events, medals, stickers, and logros. Anyone viewing Bogota returns to
// Zipaquira. Runs once (`bogotaNet`).
// (v5.11) Restarting Eje Cafetero used to drop the `bogotaNet` flag (a fresh root save), so the next load wiped a
// current Bogota and the medals of six of its events. The flag is now part of every new root save, and a Bogota is only
// wiped when it really is the old one: a claimed goal or a product that no longer exists (the old goals were bz01…).
const sumOf = (obj) => Object.values(obj ?? {}).reduce((a, b) => a + b, 0);

const OLD_BOGOTA_EVENTS = ['aguacero_chorro', 'navidad_septima', 'festival_zona_g', 'pico_placa', 'ventarron_usaquen', 'paro_camionero'];
const isOldBogota = (st) =>
  (st.goals?.claimed ?? []).some((id) => !GOALS_BY_ID[id]) ||
  ['sold', 'produced'].some((kind) => Object.keys(st.stats?.[kind] ?? {}).some((id) => !PRODUCTS[id]));
function resetOldBogota(root) {
  if (root.bogotaNet) return;
  root.bogotaNet = true;
  if (!root.regions?.bogota || !isOldBogota(root.regions.bogota)) return;
  delete root.regions.bogota;
  if (root.settings?.zone === 'bogota') root.settings.zone = 'zipaquira';
  const p = root.profile;
  if (p) {
    for (const id of OLD_BOGOTA_EVENTS) delete p.medals?.[id];
    if (p.history) p.history = p.history.filter((h) => !OLD_BOGOTA_EVENTS.includes(h.event));
    const bogotaStickers = new Set(ALBUM.filter((pg) => pg.region === 'bogota').flatMap((pg) => pg.stickers.map((s) => s.id)));
    if (p.album) p.album = p.album.filter((id) => !bogotaStickers.has(id));
    for (const id of Object.keys(p.logros ?? {})) if (id.startsWith('bg_')) delete p.logros[id];
  }
  const ev = root.events;
  if (ev?.slots) ev.slots = ev.slots.map((x) => (x?.zone && OLD_BOGOTA_EVENTS.includes(x.zone) ? null : x));
}

// Player profile migrations (applied on the main save after migrating all regions).
function migrateProfile(root) {
  resetOldBogota(root);
  const all = regionSaves(root);
  // v3.6 -> v3.7: offline hours move to the profile. Nobody loses hours: profile starts with the
  // highest regional total, and coins spent on those removed research items are refunded.
  if (root.profile && root.profile.offlineLevel === undefined) {
    let best = OFFLINE_BASE_HOURS;
    for (const st of all) {
      const hours = OFFLINE_BASE_HOURS + (st.research ?? []).reduce((n, id) => n + (OLD_OFFLINE_RESEARCH[id]?.[1] ?? 0), 0);
      best = Math.max(best, hours);
      for (const id of st.research ?? []) if (OLD_OFFLINE_RESEARCH[id]) st.coins += OLD_OFFLINE_RESEARCH[id][0];
      st.research = (st.research ?? []).filter((id) => !OLD_OFFLINE_RESEARCH[id]);
    }
    root.profile.offlineLevel = Math.min(OFFLINE_COSTS.length, Math.ceil((best - OFFLINE_BASE_HOURS) / OFFLINE_STEP_HOURS));
  }
  // v3.10 -> v3.11: lifetime Renown earned (never decreases on spend). Reconstructed from recorded
  // progress: event medals, achievement levels, and completed album pages
  // (earlier restarts did not grant Renown).
  if (root.profile && root.profile.renownTotal === undefined) {
    const p = root.profile;
    const medals = (p.history ?? []).reduce((n, h) => n + (MEDALS[h.medal]?.renown ?? 0), 0);
    const logros = Object.entries(p.logros ?? {}).reduce((n, [id, tier]) => n + (LOGROS_BY_ID[id]?.reward.slice(0, tier).reduce((a, b) => a + b, 0) ?? 0), 0);
    const pages = ALBUM.filter((pg) => pg.stickers.every((s) => (p.album ?? []).includes(s.id))).length * PAGE_BONUS;
    // Never less than currently held Renown.
    p.renownTotal = Math.max(p.renown ?? 0, medals + logros + pages);
  }
  // v3.9 -> v3.10: workday length becomes per-region. Nobody loses hours: each region starts with the
  // blocks the player owned. (Per-region decor is handled by profileOf.)
  if (root.profile?.workLevel) {
    for (const st of all) st.workLevel = Math.max(st.workLevel ?? 0, root.profile.workLevel);
    delete root.profile.workLevel;
  }
  // v3.6 -> v3.7: events switch from yearly triggers to global slots. Completed years (`done`: zone -> year) map to
  // `last` (start of that year) and `count` (from profile records); active boards occupy slots.
  // v3.7 -> v3.8: permanently mark a region as completed once its final zone is finished or restarted.
  const history = root.profile?.history ?? [];
  for (const st of all) {
    const ev = (st.events ??= {});
    ev.boards ??= {};
    if (!ev.slots) {
      ev.slots = [null, null];
      Object.keys(ev.boards).slice(0, 2).forEach((zone, i) => (ev.slots[i] = { zone }));
    }
    ev.last ??= {};
    ev.count ??= {};
    for (const [zone, year] of Object.entries(ev.done ?? {})) {
      ev.last[zone] ??= (year - 1) * YEAR_DAYS * DAY_LENGTH;
      ev.count[zone] ??= Math.max(1, history.filter((h) => h.event === EVENT_OF_ZONE[zone]?.id).length);
    }
    delete ev.done;
    // v3.12: second ending now requires carriers, routes, goals, and research as well. Previously awarded
    const last = REGIONS_BY_ID[st.region ?? 'cafetero'].zones.at(-1);
    st.regionDone = Boolean(st.regionDone || st.zones?.[last]?.complete || st.legacy?.resets > 0);
    // mastery is revoked if incomplete and re-granted once finished.
    // v3.29 -> v3.30: two global event slots for the entire game on main save (previously two per
    if (st.mastered && !masteryReady(st)) st.mastered = false;
  }
  // region). Active boards remain (first two occupy slots; extras do not refill slots until
  // finished); unstarted queued events and per-region cooldowns are cleared.
  // Common fields across all regions: routes, goals, and remaining state.
  if (!root.events.global) {
    root.events.global = true;
    const playing = all.flatMap((st) => Object.keys(st.events.boards));
    root.events.slots = [null, null];
    playing.slice(0, 2).forEach((zone, i) => (root.events.slots[i] = { zone }));
  }
  for (const st of all) if (st !== root) delete st.events.slots;
  for (const st of all) if (st !== root) delete st.events.global;
  // v5.9: counters stop at their caps (data/caps.js), and the event history keeps only the last event.
  // Runs after the older migrations above, which still read the whole history.
  const p = root.profile;
  // (v5.12) The whole game's totals start from every finished run already banked in the regions' totals.
  if (p && !p.totals) {
    const lives = [p.lifetime, ...Object.values(p.lifetimes ?? {})].filter(Boolean);
    p.totals = Object.fromEntries(['sold', 'produced'].map((k) => [k, Math.min(CAPS.total[k], lives.reduce((n, life) => n + sumOf(life[k]), 0))]));
  }
  if (p) {
    p.history = (p.history ?? []).slice(-CAPS.history);
    p.renown = Math.min(CAPS.renown, p.renown ?? 0);
    p.renownTotal = Math.min(CAPS.prestige, p.renownTotal ?? 0);
    for (const rec of Object.values(p.medals ?? {})) for (const k in rec.count ?? {}) rec.count[k] = Math.min(CAPS.medalsPerKind, rec.count[k]);
    for (const life of [p.lifetime, ...Object.values(p.lifetimes ?? {})]) {
      if (!life) continue;
      for (const kind of ['sold', 'produced']) for (const id in life[kind] ?? {}) life[kind][id] = Math.min(CAPS.total[kind], life[kind][id]);
      life.earned = Math.min(CAPS.lifetimeEarned, life.earned ?? 0);
    }
  }
  for (const st of all) for (const z in st.events?.count ?? {}) st.events.count[z] = Math.min(CAPS.eventRound, st.events.count[z]);
  return root;
}

// v4.0: new routes added to earlier regions (bagasse, palm kernel, hides) supply an existing
function finish(data, base, stations, zones, mules) {
  const routes = {};
  for (const id of Object.keys(base.routes)) routes[id] = { ...createRouteState(), ...data.routes?.[id] };
  // station; start them at that station level so existing saves do not stall.
  // Before v1.0.1 research goals stored the research ID directly.
  for (const r of ROUTES) {
    if (r.release !== '4.0' || !routes[r.id] || !data.routes || data.routes[r.id]) continue;
    routes[r.id].level = Math.max(1, ...r.stations.map((id) => stations[id]?.level ?? 0));
  }
  // v4.0: cap restarts at 60 and drop the per-run history log.
  const OLD_GOAL_IDS = { abono: 'g05', herraduras: 'g12', sello: 'g26' };
  const claimed = (data.goals?.claimed ?? []).map((id) => OLD_GOAL_IDS[id] ?? id);
  const { dispatch, warehouse, jeep, zoneComplete, ...rest } = data;
  return {
    ...base,
    ...rest,
    stations: { ...base.stations, ...stations },
    zones,
    routes,
    mules,
    stats: { ...base.stats, ...data.stats },
    // (v5.12) A run saved before its own count starts from what its products add up to.
    counted: data.counted ?? { sold: sumOf(data.stats?.sold), produced: sumOf(data.stats?.produced) },
    // Other regions, each with its own independent game state.
    legacy: { resets: Math.min(CAPS.resets, data.legacy?.resets ?? 0) },
    goals: { ...base.goals, ...data.goals, claimed },
    // (v5.11) Only what the save says: a new save has it from the start, an old one gets it from resetOldBogota.
    bogotaNet: data.bogotaNet,
    version: SAVE_VERSION,
  };
}

// Returns parsed state or null if the text is invalid.
export function exportSave(state) {
  state.savedAt = Date.now();
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

// Decimal separator: Spanish uses comma (2,50M); English uses dot (2.50M) (v3.68, set per language).
export function importSave(text) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    // Eje Cafetero's farm and coins: in the save itself up to format 9, in its region save from format 10.
    const cafetero = isGameSave(data) ? data.regions.cafetero : data;
    if (!cafetero?.stations?.farm || typeof cafetero.coins !== 'number') return null;
    return migrate(data);
  } catch {
    return null;
  }
}
