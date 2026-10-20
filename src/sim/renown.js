// En qué se gasta el Renombre ⭐ (v2.2): láminas del álbum y decoración. Todo vive en state.profile,
// que no se pierde al reiniciar. Nada de esto cambia la economía.
import { ALBUM, PAGE_BONUS, STICKERS_BY_ID } from '../data/album.js';
import { DECOR_BY_ID, DEFAULT_DECOR } from '../data/decor.js';

// El perfil de la partida, con lo que le falte (partidas de antes de la v2.2).
export function profileOf(state) {
  const p = (state.profile ??= { renown: 0, medals: {}, history: [] });
  p.album ??= [];
  p.decor ??= { owned: [], chosen: {} };
  return p;
}

export const pageDone = (profile, pageId) => ALBUM.find((pg) => pg.id === pageId).stickers.every((s) => profile.album.includes(s.id));

export function quoteSticker(profile, id) {
  const s = STICKERS_BY_ID[id];
  if (profile.album.includes(id)) return { ok: false, reason: 'owned', cost: s.cost };
  if (profile.renown < s.cost) return { ok: false, reason: 'renown', cost: s.cost };
  return { ok: true, cost: s.cost };
}

// Pega una lámina. Devuelve null si no se pudo o { page, bonus } (bonus: ⭐ de premio si llenó la página).
export function buySticker(profile, id) {
  const q = quoteSticker(profile, id);
  if (!q.ok) return null;
  profile.renown -= q.cost;
  profile.album.push(id);
  const page = STICKERS_BY_ID[id].page;
  const bonus = pageDone(profile, page) ? PAGE_BONUS : 0;
  profile.renown += bonus;
  return { page, bonus };
}

const optionOf = (cat, opt) => DECOR_BY_ID[cat]?.options.find((o) => o.id === opt);
export const ownsDecor = (profile, cat, opt) => optionOf(cat, opt)?.cost === 0 || profile.decor.owned.includes(`${cat}:${opt}`);

export function quoteDecor(profile, cat, opt) {
  const o = optionOf(cat, opt);
  if (ownsDecor(profile, cat, opt)) return { ok: false, reason: 'owned', cost: o.cost };
  if (profile.renown < o.cost) return { ok: false, reason: 'renown', cost: o.cost };
  return { ok: true, cost: o.cost };
}

// Compra (si hace falta) y elige una opción de decoración. Devuelve si quedó elegida.
export function pickDecor(profile, cat, opt) {
  if (!ownsDecor(profile, cat, opt)) {
    const q = quoteDecor(profile, cat, opt);
    if (!q.ok) return false;
    profile.renown -= q.cost;
    profile.decor.owned.push(`${cat}:${opt}`);
  }
  profile.decor.chosen[cat] = opt;
  return true;
}

// La opción elegida de cada categoría (la de siempre si no se ha elegido otra).
export function chosenDecor(profile) {
  const out = {};
  for (const [cat, def] of Object.entries(DEFAULT_DECOR)) {
    const opt = profile?.decor?.chosen?.[cat];
    out[cat] = optionOf(cat, opt && ownsDecor(profile, cat, opt) ? opt : def);
  }
  return out;
}

// Horas sin conexión (v3.7): son del jugador, no de una región. Valen igual para todas las regiones (así
// el calendario del país avanza lo mismo en todas) y no se pierden al reiniciar. Se empieza con 2 h y
// cada nivel, comprado con Renombre, suma 2 h más, hasta 24 h.
export const OFFLINE_BASE_HOURS = 2;
export const OFFLINE_STEP_HOURS = 2;
export const OFFLINE_COSTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // ⭐ de cada nivel
export const offlineLevel = (profile) => profile?.offlineLevel ?? 0;
export const offlineHours = (profile) => OFFLINE_BASE_HOURS + OFFLINE_STEP_HOURS * offlineLevel(profile);

export function quoteOffline(profile) {
  const cost = OFFLINE_COSTS[offlineLevel(profile)];
  if (cost === undefined) return { ok: false, reason: 'max' };
  if (profile.renown < cost) return { ok: false, reason: 'renown', cost };
  return { ok: true, cost };
}

export function buyOffline(profile) {
  const q = quoteOffline(profile);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  profile.offlineLevel = offlineLevel(profile) + 1;
  return true;
}

// La jornada (v3.8): bloques de 2 horas que se suman a la de 6 a 12 y de 14 a 20 (ver sim/calendar.js:
// EXTRA_BLOCKS). Cada uno cuesta el doble del anterior. Es del jugador: vale en todas las regiones.
export const WORK_COSTS = [2, 4, 8, 16, 32, 64]; // ⭐ de cada bloque
export const workLevel = (profile) => profile?.workLevel ?? 0;

export function quoteWork(profile) {
  const cost = WORK_COSTS[workLevel(profile)];
  if (cost === undefined) return { ok: false, reason: 'max' };
  if (profile.renown < cost) return { ok: false, reason: 'renown', cost };
  return { ok: true, cost };
}

export function buyWork(profile) {
  const q = quoteWork(profile);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  profile.workLevel = workLevel(profile) + 1;
  return true;
}

// El segundo Willys (v3.9): con el álbum lleno se compra con Renombre, por región. Cada zona de la región
// tiene desde entonces dos Willys que venden por su cuenta (el despacho vende el doble). Es de la
// región: se guarda en su partida (`willys2`) y no se pierde al reiniciarla.
export const WILLYS2_COST = 20;
export const albumDone = (profile) => ALBUM.every((pg) => pageDone(profile, pg.id));

export function quoteWillys2(profile, region) {
  if (!region) return { ok: false, reason: 'region', cost: WILLYS2_COST };
  if (region.willys2) return { ok: false, reason: 'owned', cost: WILLYS2_COST };
  if (!albumDone(profile)) return { ok: false, reason: 'album', cost: WILLYS2_COST };
  if (profile.renown < WILLYS2_COST) return { ok: false, reason: 'renown', cost: WILLYS2_COST };
  return { ok: true, cost: WILLYS2_COST };
}

export function buyWillys2(profile, region) {
  const q = quoteWillys2(profile, region);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  region.willys2 = true;
  return true;
}
