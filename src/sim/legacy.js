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
import { createInitialState } from './state.js';
import { MAX_LEGACY_RESETS, legacyMult } from './modifiers.js';
import { bankRun } from './logros.js';
import { RESTART_RENOWN, gainRenown, profileOf } from './renown.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { tk } from '../i18n/index.js'; // labels translated where displayed (GoalsView)

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

// Fresh save with production doubled from previous. Keeps settings, seen notices,
// completed runs record, and Renown with medals.
// Since v3.0 resets only its own region: others stay untouched, country calendar keeps
// running (new run starts at the date previous run ended).
// profile: player's, for another region's save (v3.10: finished run counters merge into
// that region's achievement totals).
export function restartState(state, now = Date.now(), profile = null) {
  const region = regionOf(state);
  const next = createInitialState(now, region.id);
  // Resets cap at multiplier limit (v4.0: stay there; previously kept incrementing and
  // appended to an unbounded completed runs log).
  next.legacy = { resets: Math.min(MAX_LEGACY_RESETS, (state.legacy?.resets ?? 0) + 1) };
  next.clockOffset = clockOf(state);
  next.settings = { ...state.settings, zone: region.zones[0] };
  next.hints = [...(state.hints ?? [])];
  // Other regions (stored only in Eje Cafetero root save) stay intact.
  if (state.regions) next.regions = state.regions;
  // Region's second Willys (v3.9) and work shift (v3.10) persist.
  if (state.willys2) next.willys2 = true;
  if (state.chivas) next.chivas = state.chivas; // faster chivas (v4.2)
  if (state.workLevel) next.workLevel = state.workLevel;
  // Region already cleared once (v3.8): its events keep spawning across all zones.
  next.regionDone = Boolean(state.regionDone || state.zones[region.zones.at(-1)]?.complete);
  // Persistent across reset (v2.0): Renown, medals, album, decoration, achievements; current run
  // stats fold into achievements (v2.3). Only Eje Cafetero save holds profile.
  // Events stay untouched (v3.12): active boards, slots (with event or 2-year cooldown),
  // and history. (Until v3.11 active board was lost.)
  const ev = state.events ?? {};
  next.events = {
    boards: structuredClone(ev.boards ?? {}),
    slots: [0, 1].map((i) => ev.slots?.[i] ?? null),
    last: { ...ev.last },
    count: { ...ev.count },
    ...(ev.global ? { global: true } : {}),
  };
  // Each reset awards Renown (v3.11).
  if (state.profile) {
    next.profile = structuredClone(state.profile);
    bankRun(state, profileOf(next));
    gainRenown(profileOf(next), RESTART_RENOWN);
  } else {
    delete next.profile;
    if (profile) {
      bankRun(state, profile);
      gainRenown(profile, RESTART_RENOWN);
    }
  }
  return next;
}

// Opening zone on load (v3.72): currently viewed zone if still open; otherwise (resetting
// closes region zones) first zone of that region; else Finca. Before v3.71 always
// returned to Finca: resetting another region dumped player back in Cafetal.
//   root: root save (Eje Cafetero, with other regions in root.regions)
export function startZone(root, zone) {
  const regionOfZone = (z) => REGIONS.find((r) => r.zones.includes(z));
  const stateOf = (r) => (r.id === (root.region ?? 'cafetero') ? root : root.regions?.[r.id]);
  const open = (z) => {
    const r = regionOfZone(z);
    return Boolean(r && stateOf(r)?.zones?.[z]?.unlocked);
  };
  if (open(zone)) return zone;
  const first = regionOfZone(zone)?.zones[0];
  return first && open(first) ? first : 'finca';
}
