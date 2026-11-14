import { createStationState } from './production.js';
import { createRouteState, routeRegion } from './routes.js';
import { ROUTES } from '../data/routes.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { sourceOf } from './chain.js';

export const SAVE_VERSION = 9;

// Warehouse, Willys, and dispatch level of a zone.
export function createZoneState(unlocked = false) {
  return { unlocked, complete: false, dispatch: { level: 1 }, warehouse: {}, jeep: { phase: 'idle', t: 0, waited: 0, load: {} } };
}

// Fresh region save (v3.0): its zones (first open with its source) and routes.
export function createInitialState(now = Date.now(), regionId = 'cafetero') {
  const region = REGIONS_BY_ID[regionId];
  const first = region.zones[0];
  return {
    version: SAVE_VERSION,
    region: regionId,
    coins: 0,
    totalEarned: 0,
    playTime: 0,
    savedAt: now,
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
    hints: [], // already shown notices
    settings: { sound: true, music: true },
    research: [], // purchased research ids
    goals: { claimed: [] }, // objetivos cobrados
    regionDone: false, // region's final zone completed at least once (v3.8: preserved on reset)
    mastered: false, // second ending: all stations at level 100
    legacy: { resets: 0 }, // resets with ×2 production (up to 60, v4.0)
    // Events (v2.0): active zone boards and last completion timestamp.
    // Slots (v3.30: two game-wide, in root save), last played per zone, and
    // play count (see sim/events.js).
    events: { boards: {}, slots: [null, null], last: {}, count: {}, global: true },
    // Preserved across reset (v2.0): Renown ⭐, medals, finished events. Belongs to
    // player, not region: stored only in Eje Cafetero save.
    ...(regionId === 'cafetero' && { profile: { renown: 0, renownTotal: 0, medals: {}, history: [] } }),
  };
}

export function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}
