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
    const from = regionState(root, region.unlock.region);
    const done = from?.regionDone && REGIONS_BY_ID[from.region ?? 'cafetero'].zones.at(-1) === region.unlock.zone;
    if (!from?.zones[region.unlock.zone]?.complete && !done) continue;
    const state = createInitialState(now, region.id);
    state.clockOffset = clockOf(root);
    state.settings = { zone: region.zones[0] };
    root.regions ??= {};
    root.regions[region.id] = state;
    opened.push(region.id);
  }
  return opened;
}

// Opened regions in order: [{ region, state }].
export const openRegionStates = (root) => REGIONS.map((region) => ({ region, state: regionState(root, region.id) })).filter((r) => r.state);
