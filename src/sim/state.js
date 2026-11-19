import { createStationState } from './production.js';
import { createRouteState, routeRegion } from './routes.js';
import { ROUTES } from '../data/routes.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { sourceOf } from './chain.js';

// Save format. Up to 9 the save was Eje Cafetero's own, holding the whole game's data and the other regions. 10
// (v5.13): the save is the whole game (`createGameState`) and every region, Eje Cafetero included, is a child in
// `regions`. core/SaveSystem.js converts older formats step by step and refuses newer ones.
export const SAVE_VERSION = 10;

// Warehouse, Willys, and dispatch level of a zone.
export function createZoneState(unlocked = false) {
  return { unlocked, complete: false, dispatch: { level: 1 }, warehouse: {}, jeep: { phase: 'idle', t: 0, waited: 0, load: {} } };
}

// What a region keeps when it restarts (v5.13), stored in the player's profile (`profile.keep[region]`) so a restart
// never has to copy it: resets (×2 production each, up to 60), done (its final zone was completed once), and what was
// bought with Renown for it: willys2 (second Willys), chivas (every 30 or 15 s), workLevel (2 h workday blocks).
export const newKeep = () => ({ resets: 0, done: false });
// A region save reaches its entry through `keep`, a link that is not saved (not enumerable): the data is saved once,
// in the profile. A region that is not in a whole game's save (an event board, a region built alone in a test) has
// its own empty entry.
const setKeep = (state, keep) => Object.defineProperty(state, 'keep', { value: keep, writable: true, configurable: true, enumerable: false });
export function linkRegion(root, regionId) {
  const keep = ((root.profile.keep ??= {})[regionId] ??= newKeep());
  setKeep(root.regions[regionId], keep);
  return root.regions[regionId];
}
export function linkRegions(root) {
  for (const id of Object.keys(root.regions)) linkRegion(root, id);
  return root;
}

// Fresh region save (v3.0): its zones (first open with its source) and routes. (v5.13) Only the region's own run:
// what the whole game shares lives in the whole game's save, and what the region keeps on restart in its `keep`.
export function createInitialState(now = Date.now(), regionId = 'cafetero') {
  const region = REGIONS_BY_ID[regionId];
  const first = region.zones[0];
  const state = {
    region: regionId,
    coins: 0,
    totalEarned: 0,
    playTime: 0, // this run's time; clockOffset aligns its clock with the country's (clockOf)
    clockOffset: 0,
    nextId: 1,
    // Stations across all zones (ids are unique); added when built.
    stations: {
      [sourceOf(first)]: createStationState(),
    },
    // Per zone: unlocked, completed, dispatch, warehouse (productId -> units), Willys.
    zones: Object.fromEntries(region.zones.map((z) => [z, createZoneState(z === first)])),
    // Inter-zone routes in region: level and vehicle state (see sim/routes.js).
    routes: Object.fromEntries(ROUTES.filter((r) => routeRegion(r) === regionId).map((r) => [r.id, createRouteState()])),
    mules: [], // { id, productId, amount, from, to, phase: 'go' | 'back', t, duration }
    stats: { produced: {}, sold: {}, imported: {} },
    // (v5.12) Everything sold and produced in this run, whatever the per-product caps (sim/totals.js).
    counted: { sold: 0, produced: 0 },
    hints: [], // already shown notices
    research: [], // purchased research ids
    goals: { claimed: [] }, // objetivos cobrados
    mastered: false, // second ending: all stations at level 100
    // Events (v2.0): the region's open boards, last played and rounds per event (see sim/events.js). The two
    // game-wide slots live in the whole game's save.
    events: { boards: {}, last: {}, count: {} },
  };
  setKeep(state, newKeep());
  return state;
}

// The whole game's save (format 10, v5.13). Everything that belongs to the player and not to a region lives here,
// so restarting a region (Eje Cafetero included) never touches it:
//   playTime + clockOffset: the country clock (clockOf), which never restarts; every region's clock matches it.
//   profile: Renown, Prestige, medals, achievements, album, decor, purchases, banked runs, the game's totals and what
//            each region keeps on restart (profile.keep).
//   settings: volumes, language, travel and event options, the zone being viewed.
//   events.slots: the two game-wide event slots.   regions: every open region's save, Eje Cafetero first.
//   bogotaNet: the v4.6 Bogotá migration is not needed (core/SaveSystem.js: resetOldBogota).
export const GLOBAL_KEYS = ['version', 'savedAt', 'playTime', 'clockOffset', 'profile', 'settings', 'events', 'regions', 'bogotaNet'];
// What a region save may hold (and nothing that belongs to the whole game).
// (A fixed list: computing it from createInitialState at load time would run before the modules it needs are ready.
// test/format10.test.js checks that both match.)
export const REGION_KEYS = ['region', 'coins', 'totalEarned', 'playTime', 'clockOffset', 'nextId', 'stations', 'zones', 'routes', 'mules', 'stats', 'counted', 'hints', 'research', 'goals', 'mastered', 'events'];
export function createGameState(now = Date.now()) {
  return linkRegions({
    version: SAVE_VERSION,
    savedAt: now,
    playTime: 0,
    clockOffset: 0,
    profile: { renown: 0, renownTotal: 0, medals: {}, history: [], album: [], decor: {}, keep: {} },
    settings: { sound: true, music: true, zone: 'finca' },
    events: { slots: [null, null], global: true },
    regions: { cafetero: createInitialState(now, 'cafetero') },
    bogotaNet: true,
  });
}

export function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}
