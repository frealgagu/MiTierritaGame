// Regions (v3.0): Eje Cafetero is root save holding others under `regions`, each as a
// full save (with its `region`). All run concurrently, each with its own Game.
import { REGIONS, REGIONS_BY_ID } from '../data/regions.js';
import { createInitialState } from './state.js';
import { clockOf } from './calendar.js';

// Save for a region (root for Eje Cafetero), or null if not yet unlocked.
export function regionState(root, regionId) {
  if (regionId === 'cafetero') return root;
  return root.regions?.[regionId] ?? null;
}

// Unlocks regions whose condition is met (completing a zone in another region). Returns
// unlocked list. New region follows country calendar from unlock day onward.
// Unlock condition isn't lost on reset (v3.8.1): if origin region finished once
// (`regionDone`, its final zone), still counts even if not yet cleared in current run.
export function openRegions(root, now = Date.now()) {
  const opened = [];
  for (const region of REGIONS) {
    if (!region.unlock || region.hidden || regionState(root, region.id)) continue; // (v4.4.8) unreleased hidden regions
    if (region.special) {
      // (v5.4) The special zone: every other region with its second ending or a reset.
      if (region.devOnly || !specialProgress(root).ready) continue;
    } else {
      const from = regionState(root, region.unlock.region);
      const done = from?.regionDone && REGIONS_BY_ID[from.region ?? 'cafetero'].zones.at(-1) === region.unlock.zone;
      if (!from?.zones[region.unlock.zone]?.complete && !done) continue;
    }
    addRegion(root, region, now);
    opened.push(region.id);
  }
  return opened;
}

function addRegion(root, region, now) {
  const state = createInitialState(now, region.id);
  state.clockOffset = clockOf(root);
  state.settings = { zone: region.zones[0] };
  root.regions ??= {};
  root.regions[region.id] = state;
}

// Regions that count toward the special zone (v4.7.1; v5.4 moved here from ui/ZonesView.js): every released
// region but the special one itself. Each is ready with its second ending (everything at level 100) or once it
// has been reset.
export const SPECIAL_FROM = REGIONS.filter((r) => !r.hidden && !r.wip && !r.special);
export function specialProgress(root) {
  const n = SPECIAL_FROM.filter((r) => {
    const st = regionState(root, r.id);
    return st && (st.mastered || (st.legacy?.resets ?? 0) > 0);
  }).length;
  return { n, total: SPECIAL_FROM.length, ready: n === SPECIAL_FROM.length };
}

// Developer option (v5.4): opens the special zone right away, whatever its condition. Returns its id, or null
// if it was already open.
export function openSpecial(root, now = Date.now()) {
  const region = REGIONS.find((r) => r.special);
  if (!region || regionState(root, region.id)) return null;
  addRegion(root, region, now);
  return region.id;
}

// Whether a region has opened in this save (for `secret` regions, see data/regions.js: shownRegions).
export const isOpen = (root) => (regionId) => Boolean(regionState(root, regionId));

// Opened regions in order: [{ region, state }].
export const openRegionStates = (root) => REGIONS.map((region) => ({ region, state: regionState(root, region.id) })).filter((r) => r.state);
