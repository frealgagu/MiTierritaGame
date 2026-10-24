// En qué se gasta el Renombre ⭐ (v2.2): láminas del álbum y decoración. Todo vive en state.profile,
// que no se pierde al reiniciar. Nada de esto cambia la economía.
import { ALBUM, PAGE_BONUS, STICKERS_BY_ID, albumOf } from '../data/album.js';
import { DECOR_BY_ID, DEFAULT_DECOR } from '../data/decor.js';

// El perfil de la partida, con lo que le falte (partidas de antes de la v2.2).
export function profileOf(state) {
  const p = (state.profile ??= { renown: 0, medals: {}, history: [] });
  p.album ??= [];
  // La decoración es de cada región (v3.10): { región: { owned, chosen } }. La de antes era del Eje Cafetero.
  if (Array.isArray(p.decor?.owned)) p.decor = { cafetero: p.decor };
  p.decor ??= {};
  return p;
}

// Renombre ganado (v3.11): se suma al saldo y al total ganado de por vida (`renownTotal`), que no baja al
// gastar. Todo lo que da Renombre pasa por aquí.
export function gainRenown(profile, n) {
  profile.renown += n;
  profile.renownTotal = (profile.renownTotal ?? 0) + n;
}
// Lo que da cada reinicio (segundo final) de cualquier región.
export const RESTART_RENOWN = 10;

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
  gainRenown(profile, bonus);
  return { page, bonus };
}

const optionOf = (cat, opt) => DECOR_BY_ID[cat]?.options.find((o) => o.id === opt);
// La decoración de una región (v3.10): lo comprado y lo elegido, aparte en cada una.
export const decorOf = (profile, region = 'cafetero') => (profileOf({ profile }).decor[region] ??= { owned: [], chosen: {} });
export const ownsDecor = (profile, cat, opt, region = 'cafetero') => optionOf(cat, opt)?.cost === 0 || decorOf(profile, region).owned.includes(`${cat}:${opt}`);

export function quoteDecor(profile, cat, opt, region = 'cafetero') {
  const o = optionOf(cat, opt);
  if (ownsDecor(profile, cat, opt, region)) return { ok: false, reason: 'owned', cost: o.cost };
  if (profile.renown < o.cost) return { ok: false, reason: 'renown', cost: o.cost };
  return { ok: true, cost: o.cost };
}

// Compra (si hace falta) y elige una opción de decoración en una región. Devuelve si quedó elegida.
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

// La opción elegida de cada categoría en una región (la de siempre si no se ha elegido otra).
export function chosenDecor(profile, region = 'cafetero') {
  const out = {};
  for (const [cat, def] of Object.entries(DEFAULT_DECOR)) {
    const opt = profile ? decorOf(profile, region).chosen[cat] : null;
    out[cat] = optionOf(cat, opt && ownsDecor(profile, cat, opt, region) ? opt : def);
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
// EXTRA_BLOCKS). Cada uno cuesta el doble del anterior. Desde la v3.10 son de cada región (`workLevel` en
// su partida, que no se pierde al reiniciarla); se pagan con el Renombre del jugador.
export const WORK_COSTS = [2, 4, 8, 16, 32, 64]; // ⭐ de cada bloque
export const workLevel = (region) => region?.workLevel ?? 0;

export function quoteWork(profile, region) {
  const cost = WORK_COSTS[workLevel(region)];
  if (cost === undefined) return { ok: false, reason: 'max' };
  if (profile.renown < cost) return { ok: false, reason: 'renown', cost };
  return { ok: true, cost };
}

export function buyWork(profile, region) {
  const q = quoteWork(profile, region);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  region.workLevel = workLevel(region) + 1;
  return true;
}

// El segundo Willys (v3.9): con el álbum de la región lleno (v3.10) se compra con Renombre, por región. Cada zona de la región
// tiene desde entonces dos Willys que venden por su cuenta (el despacho vende el doble). Es de la
// región: se guarda en su partida (`willys2`) y no se pierde al reiniciarla.
export const WILLYS2_COST = 20;
// El álbum de una región (v3.10: cada una tiene el suyo) completo.
export const albumDone = (profile, region = 'cafetero') => albumOf(region).every((pg) => pageDone(profile, pg.id));

export function quoteWillys2(profile, region) {
  if (!region) return { ok: false, reason: 'region', cost: WILLYS2_COST };
  if (region.willys2) return { ok: false, reason: 'owned', cost: WILLYS2_COST };
  if (!albumDone(profile, region.region ?? 'cafetero')) return { ok: false, reason: 'album', cost: WILLYS2_COST };
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

// Mascotas (v3.12): gatos y loros que andan por el mapa de cada región, solo de adorno. Se compran con
// Renombre en cada región, hasta un máximo. Los gatos, de vez en cuando, persiguen a los loros.
export const PETS = {
  cats: { icon: '🐈', name: 'Gato', plural: 'Gatos', cost: 50, max: 10 },
  parrots: { icon: '🦜', name: 'Loro', plural: 'Loros', cost: 40, max: 5 },
};
export const petsOf = (profile, region = 'cafetero') => {
  const all = (profile.pets ??= {});
  return (all[region] ??= { cats: 0, parrots: 0 });
};

export function quotePet(profile, region, kind) {
  const def = PETS[kind];
  if (petsOf(profile, region)[kind] >= def.max) return { ok: false, reason: 'max', cost: def.cost };
  if (profile.renown < def.cost) return { ok: false, reason: 'renown', cost: def.cost };
  return { ok: true, cost: def.cost };
}

export function buyPet(profile, region, kind) {
  const q = quotePet(profile, region, kind);
  if (!q.ok) return false;
  profile.renown -= q.cost;
  petsOf(profile, region)[kind] += 1;
  return true;
}
