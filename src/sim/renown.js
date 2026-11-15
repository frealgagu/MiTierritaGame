// What Renown ⭐ buys (v2.2): album stickers and decoration. Lives in state.profile,
// preserved on reset. None of it alters economy.
import { CAPS, capAdd } from '../data/caps.js';
import { ALBUM, PAGE_BONUS, STICKERS_BY_ID, albumOf } from '../data/album.js';
import { canPayRenown } from './upgrades.js';
import { DECOR_BY_ID, DEFAULT_DECOR } from '../data/decor.js';

// Player profile with missing defaults filled in (pre-v2.2 saves).
export function profileOf(state) {
  const p = (state.profile ??= { renown: 0, medals: {}, history: [] });
  p.album ??= [];
  // Decoration belongs per region (v3.10): { region: { owned, chosen } }. Legacy belonged to Eje Cafetero.
  if (Array.isArray(p.decor?.owned)) p.decor = { cafetero: p.decor };
  p.decor ??= {};
  return p;
}

// Earned Renown (v3.11): adds to balance and lifetime total (`renownTotal`), never decreases
// when spent. All Renown awards go through here.
// (v5.9) Both stop at their caps.
export function gainRenown(profile, n) {
  profile.renown = capAdd(profile.renown, n, CAPS.renown);
  profile.renownTotal = capAdd(profile.renownTotal, n, CAPS.prestige);
}
// Renown granted per second-ending reset in any region.
export const RESTART_RENOWN = 10;

export const pageDone = (profile, pageId) => ALBUM.find((pg) => pg.id === pageId).stickers.every((s) => profile.album.includes(s.id));

export function quoteSticker(profile, id) {
  const s = STICKERS_BY_ID[id];
  if (profile.album.includes(id)) return { ok: false, reason: 'owned', cost: s.cost };
  if (!canPayRenown(profile, s.cost)) return { ok: false, reason: 'renown', cost: s.cost };
  return { ok: true, cost: s.cost };
}

// Places a sticker. Returns null on failure or { page, bonus } (bonus: ⭐ reward if page filled).
export function buySticker(profile, id) {
  const q = quoteSticker(profile, id);
  if (!q.ok) return null;
  profile.renown -= q.cost;
  profile.album.push(id);
  const page = STICKERS_BY_ID[id].page;
  const bonus = pageDone(profile, page) ? PAGE_BONUS : 0;
  gainRenown(profile, bonus);
  return { page, bonus };
}

const optionOf = (cat, opt) => DECOR_BY_ID[cat]?.options.find((o) => o.id === opt);
// Decoration state for a region (v3.10): owned and chosen, isolated per region.
export const decorOf = (profile, region = 'cafetero') => (profileOf({ profile }).decor[region] ??= { owned: [], chosen: {} });
export const ownsDecor = (profile, cat, opt, region = 'cafetero') => optionOf(cat, opt)?.cost === 0 || decorOf(profile, region).owned.includes(`${cat}:${opt}`);

export function quoteDecor(profile, cat, opt, region = 'cafetero') {
  const o = optionOf(cat, opt);
  if (ownsDecor(profile, cat, opt, region)) return { ok: false, reason: 'owned', cost: o.cost };
  if (!canPayRenown(profile, o.cost)) return { ok: false, reason: 'renown', cost: o.cost };
  return { ok: true, cost: o.cost };
}

// Buys (if needed) and equips a decoration option in a region. Returns whether equipped.
export function pickDecor(profile, cat, opt, region = 'cafetero') {
  const decor = decorOf(profile, region);
  if (!ownsDecor(profile, cat, opt, region)) {
    const q = quoteDecor(profile, cat, opt, region);
    if (!q.ok) return false;
    profile.renown -= q.cost;
    decor.owned.push(`${cat}:${opt}`);
  }
  decor.chosen[cat] = opt;
  return true;
}

// Equipped option per category in a region (default if none selected).
export function chosenDecor(profile, region = 'cafetero') {
  const out = {};
  for (const [cat, def] of Object.entries(DEFAULT_DECOR)) {
    const opt = profile ? decorOf(profile, region).chosen[cat] : null;
    out[cat] = optionOf(cat, opt && ownsDecor(profile, cat, opt, region) ? opt : def);
  }
  return out;
}

// Offline hours (v3.7): belong to player, not region. Apply equally across all regions (so
// country clock advances uniformly everywhere) and persist across resets. Starts at 2 h,
// each Renown level adds 2 h up to 24 h.
export const OFFLINE_BASE_HOURS = 2;
export const OFFLINE_STEP_HOURS = 2;
export const OFFLINE_COSTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // ⭐ per level
export const offlineLevel = (profile) => profile?.offlineLevel ?? 0;
export const offlineHours = (profile) => OFFLINE_BASE_HOURS + OFFLINE_STEP_HOURS * offlineLevel(profile);

export function quoteOffline(profile) {
  const cost = OFFLINE_COSTS[offlineLevel(profile)];
  if (cost === undefined) return { ok: false, reason: 'max' };
  if (!canPayRenown(profile, cost)) return { ok: false, reason: 'renown', cost };
  return { ok: true, cost };
}

export function buyOffline(profile) {
  const q = quoteOffline(profile);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  profile.offlineLevel = offlineLevel(profile) + 1;
  return true;
}

// Work shift (v3.8): 2-hour blocks added to 6–12 and 14–20 (see sim/calendar.js:
// EXTRA_BLOCKS). Each doubles prior cost. Since v3.10 stored per region (`workLevel`
// in region save, preserved on reset); paid using player Renown.
export const WORK_COSTS = [2, 4, 8, 16, 32, 64]; // ⭐ per block
export const workLevel = (region) => region?.workLevel ?? 0;

export function quoteWork(profile, region) {
  const cost = WORK_COSTS[workLevel(region)];
  if (cost === undefined) return { ok: false, reason: 'max' };
  if (!canPayRenown(profile, cost)) return { ok: false, reason: 'renown', cost };
  return { ok: true, cost };
}

export function buyWork(profile, region) {
  const q = quoteWork(profile, region);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  region.workLevel = workLevel(region) + 1;
  return true;
}

// Second Willys (v3.9): with region album complete (v3.10) bought with Renown per region. Every
// zone gets two independent Willys (doubles dispatch throughput). Belongs to region
// (`willys2`) and persists across resets.
export const WILLYS2_COST = 20;
// Whether a region's album (v3.10: per region) is complete.
export const albumDone = (profile, region = 'cafetero') => albumOf(region).length > 0 && albumOf(region).every((pg) => pageDone(profile, pg.id));

export function quoteWillys2(profile, region) {
  if (!region) return { ok: false, reason: 'region', cost: WILLYS2_COST };
  if (region.willys2) return { ok: false, reason: 'owned', cost: WILLYS2_COST };
  if (!albumDone(profile, region.region ?? 'cafetero')) return { ok: false, reason: 'album', cost: WILLYS2_COST };
  if (!canPayRenown(profile, WILLYS2_COST)) return { ok: false, reason: 'renown', cost: WILLYS2_COST };
  return { ok: true, cost: WILLYS2_COST };
}

export function buyWillys2(profile, region) {
  const q = quoteWillys2(profile, region);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  region.willys2 = true;
  return true;
}

// Faster chivas (v4.2): per region with Renown. First every 30 s (10 ⭐), then every 15 s (20 ⭐).
// Like second Willys, requires completed region album plus at least one region reset.
// Stored in region state (`chivas`: 30 or 15) and preserved on reset.
export const CHIVA_STEPS = [
  { every: 30, cost: 10 },
  { every: 15, cost: 20 },
];
export const chivaEvery = (region) => region?.chivas ?? 60;

export function quoteChivas(profile, region) {
  const step = CHIVA_STEPS.find((s) => s.every < chivaEvery(region));
  if (!region) return { ok: false, reason: 'region' };
  if (!step) return { ok: false, reason: 'max' };
  if (!albumDone(profile, region.region ?? 'cafetero')) return { ok: false, reason: 'album', ...step };
  if (!(region.legacy?.resets >= 1)) return { ok: false, reason: 'restart', ...step };
  if (!canPayRenown(profile, step.cost)) return { ok: false, reason: 'renown', ...step };
  return { ok: true, ...step };
}

export function buyChivas(profile, region) {
  const q = quoteChivas(profile, region);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  region.chivas = q.every;
  return true;
}

// Pets (v3.12): cats and parrots roaming each region map, purely cosmetic. Bought with
// Renown per region up to cap. Cats occasionally chase parrots.
export const PETS = {
  cats: { icon: '🐈', name: 'Gato', plural: 'Gatos', cost: 5, max: 10 }, // v4.0.2: previously 10 ⭐
  parrots: { icon: '🦜', name: 'Loro', plural: 'Loros', cost: 8, max: 5 },
};
export const petsOf = (profile, region = 'cafetero') => {
  const all = (profile.pets ??= {});
  return (all[region] ??= { cats: 0, parrots: 0 });
};

export function quotePet(profile, region, kind) {
  const def = PETS[kind];
  if (petsOf(profile, region)[kind] >= def.max) return { ok: false, reason: 'max', cost: def.cost };
  if (!canPayRenown(profile, def.cost)) return { ok: false, reason: 'renown', cost: def.cost };
  return { ok: true, cost: def.cost };
}

export function buyPet(profile, region, kind) {
  const q = quotePet(profile, region, kind);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  petsOf(profile, region)[kind] += 1;
  return true;
}
