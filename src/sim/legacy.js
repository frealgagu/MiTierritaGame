// Second ending (v1.6): all stations across all region zones at level 100, with first ending
// complete (final zone complete: Pueblo in Eje Cafetero, since v1.7.12).
// Since v3.12 also requires haulers and routes at level 100, all goals claimed,
// and all research bought (see masteryParts).
// Completing it allows resetting region with doubled production (see modifiers.js:
// legacyMult). Since v3.0, each region tracks its own.
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS, REGIONS_BY_ID, regionOf } from '../data/regions.js';
import { clockOf } from './calendar.js';
import { MAX_LEVEL } from './rules.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { GOALS_BY_ZONE } from '../data/goals.js';
import { RESEARCH } from '../data/research.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { createInitialState, linkRegion } from './state.js';
import { bankRun } from './logros.js';
import { RESTART_RENOWN, gainRenown } from './renown.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { tk } from '../i18n/index.js'; // labels translated where displayed (GoalsView)
import { CAPS } from '../data/caps.js';
import { regionState } from './regions.js';

const zoneStations = (z) => [...z.chain, ...z.plots.map((p) => p.stationId)];
// Playable stations across all regions: chains and branches (Compostera).
export const ALL_STATIONS = [...new Set(ZONE_LIST.flatMap(zoneStations))];
// Stations within one region (count toward its second ending).
export const regionStations = (regionId) => [...new Set(REGIONS_BY_ID[regionId].zones.flatMap((z) => zoneStations(ZONES_BY_ID[z])))];
export const stationsOf = (state) => regionStations(regionOf(state).id);

// How many region stations are already at level 100 (for second-ending progress).
export const maxedCount = (state) => stationsOf(state).filter((id) => (state.stations[id]?.level ?? 0) >= MAX_LEVEL).length;
// Final zone of region (its first ending).
export const finalZone = (state) => regionOf(state).zones.at(-1);

// Second-ending requirements (v3.12), with current vs. target: [{ id, icon, label, have, need }].
export function masteryParts(state) {
  const region = regionOf(state);
  const at100 = (level) => (level ?? 0) >= MAX_LEVEL;
  const stations = stationsOf(state);
  const carried = stations.filter((id) => !STATIONS_BY_ID[id].side); // Compostera has no haulers
  const routes = Object.keys(state.routes ?? {});
  const goals = region.zones.flatMap((z) => GOALS_BY_ZONE[z] ?? []);
  const research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === region.id);
  return [
    { id: 'stations', icon: '🏭', label: tk('Estaciones en el nivel 100'), have: stations.filter((id) => at100(state.stations[id]?.level)).length, need: stations.length },
    { id: 'transport', icon: '🐴', label: tk('Arrieros en el nivel 100'), have: carried.filter((id) => at100(state.stations[id]?.transport?.level)).length, need: carried.length },
    { id: 'routes', icon: '🚚', label: tk('Rutas entre zonas en el nivel 100'), have: routes.filter((id) => at100(state.routes[id]?.level)).length, need: routes.length },
    { id: 'goals', icon: '🎯', label: tk('Objetivos cobrados'), have: goals.filter((g) => state.goals.claimed.includes(g.id)).length, need: goals.length },
    { id: 'research', icon: '🔬', label: tk('Investigaciones compradas'), have: research.filter((r) => state.research.includes(r.id)).length, need: research.length },
  ];
}
// «Maxed» zone (v4.1, in zone list): its stations, haulers, warehouse, and inbound routes
// at level 100, plus all research and goals completed.
export function zoneMaxed(state, zoneId) {
  const at100 = (level) => (level ?? 0) >= MAX_LEVEL;
  for (const id of new Set(zoneStations(ZONES_BY_ID[zoneId]))) {
    const st = state.stations[id];
    if (!at100(st?.level) || (!STATIONS_BY_ID[id].side && !at100(st.transport?.level))) return false;
  }
  if (!at100(state.zones[zoneId]?.dispatch?.level)) return false;
  for (const [id, r] of Object.entries(state.routes ?? {})) if (ROUTES_BY_ID[id]?.to === zoneId && !at100(r.level)) return false;
  if ((GOALS_BY_ZONE[zoneId] ?? []).some((g) => !state.goals.claimed.includes(g.id))) return false;
  return RESEARCH.every((r) => r.zone !== zoneId || state.research.includes(r.id));
}
export const masteryReady = (state) => masteryParts(state).every((p) => p.have >= p.need);

// Marks second ending first time all requirements complete with final zone done (and notifies).
// Checked upon purchasing upgrade or research, or claiming a goal.
export function checkMastery(state, bus) {
  // (Region still missing zones, wip, has no second ending.)
  if (state.mastered || regionOf(state).wip || !state.zones[finalZone(state)]?.complete || !masteryReady(state)) return false;
  state.mastered = true;
  bus.emit('mastered', { playTime: state.playTime });
  return true;
}

// Restarts a region with doubled production (v1.6; since v3.0 only that region). (v5.13) Only the region's own save
// is replaced: the whole game's save (profile, settings, slots, country clock, the other regions) is not touched,
// and what the region keeps lives in its profile entry (`keep`: resets, done, second Willys, chivas, workday),
// which needs no copying. The finished run is banked into the profile (achievements and totals) and gives Renown
// (v3.11). The new run starts at the country's date, with the region's notices already seen and its events as they
// were (open boards, last played and rounds; v3.12).
//   root: the whole game's save   regionId: the region to restart   Returns the new region save.
export function restartRegion(root, regionId, now = Date.now()) {
  const state = root.regions[regionId];
  const region = REGIONS_BY_ID[regionId];
  const keep = state.keep;
  // Resets stop at the multiplier cap (v4.0); the region counts as finished from its first ending on (v3.8).
  keep.resets = Math.min(CAPS.resets, keep.resets + 1);
  keep.done = Boolean(keep.done || state.zones[region.zones.at(-1)]?.complete);
  bankRun(state, root.profile);
  gainRenown(root.profile, RESTART_RENOWN);
  const next = createInitialState(now, regionId);
  next.clockOffset = clockOf(root);
  next.hints = [...(state.hints ?? [])];
  const ev = state.events ?? {};
  next.events = { boards: structuredClone(ev.boards ?? {}), last: { ...ev.last }, count: { ...ev.count } };
  root.regions[regionId] = next;
  return linkRegion(root, regionId);
}

// Opening zone on load (v3.72): currently viewed zone if still open; otherwise (resetting
// closes region zones) first zone of that region; else Finca. Before v3.71 always
// returned to Finca: resetting another region dumped player back in Cafetal.
//   root: root save (Eje Cafetero, with other regions in root.regions)
export function startZone(root, zone) {
  const regionOfZone = (z) => REGIONS.find((r) => r.zones.includes(z));
  const stateOf = (r) => regionState(root, r.id);
  const open = (z) => {
    const r = regionOfZone(z);
    return Boolean(r && stateOf(r)?.zones?.[z]?.unlocked);
  };
  if (open(zone)) return zone;
  const first = regionOfZone(zone)?.zones[0];
  return first && open(first) ? first : 'finca';
}
