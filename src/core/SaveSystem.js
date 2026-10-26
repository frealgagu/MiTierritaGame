import { createInitialState, SAVE_VERSION } from '../sim/state.js';
import { createSourceState, createStationState } from '../sim/production.js';
import { createRouteState } from '../sim/routes.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { OFFLINE_BASE_HOURS, OFFLINE_COSTS, OFFLINE_STEP_HOURS } from '../sim/renown.js';
import { DAY_LENGTH, YEAR_DAYS } from '../sim/calendar.js';
import { EVENT_OF_ZONE, MEDALS } from '../data/events.js';
import { LOGROS_BY_ID } from '../data/logros.js';
import { ALBUM, PAGE_BONUS } from '../data/album.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { masteryReady } from '../sim/legacy.js';

const KEY = 'cafetal.save';

export function saveGame(state) {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
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
    // sin almacenamiento: nada que borrar
  }
}

// Completa campos que falten con los valores por defecto (partidas de versiones anteriores).
function migrate(data) {
  if (typeof data !== 'object' || data === null) return null;
  if ((data.version ?? 0) > SAVE_VERSION) return null;
  // Cada región se guarda como una partida aparte dentro de la del Eje Cafetero (v3.0).
  const region = data.region ?? 'cafetero';
  const base = createInitialState(data.savedAt, region);
  // v1/v2 → v3: estaciones con entrada, estado y arrieros; mulas con origen, destino y fase.
  const stations = {};
  for (const [id, st] of Object.entries(data.stations ?? {})) stations[id] = { ...createStationState(), ...st };
  delete stations.farm?.blocked;
  // v6 → v7: lo importado por ruta se guarda por producto (una estación puede recibir varios).
  for (const [id, st] of Object.entries(stations)) {
    if (typeof st.imported === 'number') {
      const imp = STATIONS_BY_ID[id]?.imports?.[0];
      st.imported = imp ? { [imp.product]: st.imported } : {};
    }
  }
  const mules = (data.mules ?? []).map(({ s0, s1, ...m }) => ({ from: 'farm', to: 'warehouse', phase: 'go', ...m }));
  // v4 → v5: despacho, bodega y Willys pasan a ser por zona; la Finca completa abre el Trapiche.
  const zones = {};
  for (const [id, z] of Object.entries(base.zones)) zones[id] = { ...z, ...data.zones?.[id] };
  if (region !== 'cafetero') {
    // v3.2–v3.4: la Asociación de tejedoras de la Fiquera se guardaba como 'tejedoras', el mismo id de
    // las Tejedoras de fique del Pueblo (v3.5: ids únicos).
    if (region === 'santander' && data.research?.includes('tejedoras')) data.research = data.research.map((id) => (id === 'tejedoras' ? 'asociacion_tejedoras' : id));
    // v3.1: una zona ya completa abre la siguiente de su región si esta llegó en una versión nueva.
    for (const [id, z] of Object.entries(zones)) {
      const next = ZONES_BY_ID[id].next;
      if (!z.complete || !next || zones[next].unlocked) continue;
      zones[next].unlocked = true;
      stations[ZONES_BY_ID[next].farm.stationId] ??= createSourceState(ZONES_BY_ID[next].farm.stationId);
    }
    // v3.21: una región que estaba en obra (la Costa) queda terminada si ya tenía su última zona completa.
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
  // v5 → v6: la Lechería y las rutas entre zonas; el Trapiche completo abre la Lechería.
  if (zones.trapiche.complete && !zones.lecheria.unlocked) {
    zones.lecheria.unlocked = true;
    stations.pasture ??= createStationState();
  }
  // v6 → v7: el Cacaotal; la Lechería completa lo abre.
  if (zones.lecheria.complete && !zones.cacaotal.unlocked) {
    zones.cacaotal.unlocked = true;
    stations.cacao_grove ??= createStationState();
  }
  // v7 → v8: el Maizal; el Cacaotal completo lo abre.
  if (zones.cacaotal.complete && !zones.maizal.unlocked) {
    zones.maizal.unlocked = true;
    stations.cornfield ??= createStationState();
  }
  // v8 → v9: el Pueblo; el Maizal completo lo abre.
  if (zones.maizal.complete && !zones.pueblo.unlocked) {
    zones.pueblo.unlocked = true;
    stations.coffee_house ??= createStationState();
  }
  return migrateProfile(finish(data, base, stations, zones, mules));
}

// Investigaciones que sumaban horas sin conexión (hasta la v3.6), con lo que costaban y sus horas.
const OLD_OFFLINE_RESEARCH = {
  capataz: [10000, 3], trapichero: [300000, 3], ordeno_programado: [3000000, 4], vigilante: [8000000, 4], vecina: [60000000, 4], administrador: [2500000000, 4],
  mayordomo_s: [10000, 3], veguero: [300000, 3], asociacion_tejedoras: [3000000, 4], vaquero: [8000000, 4], cuidandera: [60000000, 4], administradora: [2500000000, 4],
};

// Lo del jugador que cambió de forma (sobre la partida principal ya migrada, con sus regiones).
function migrateProfile(root) {
  const all = [root, ...Object.values(root.regions ?? {})];
  // v3.6 → v3.7: las horas sin conexión pasan al perfil. Nadie pierde horas: el perfil arranca con las
  // de la región que más tenía, y se devuelven las monedas de esas investigaciones (ya no existen).
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
  // v3.10 → v3.11: el total de Renombre ganado (aunque ya se haya gastado). Se reconstruye con lo que
  // quedó registrado: las medallas de los eventos, los niveles de los logros y las páginas llenas del
  // álbum (los reinicios de antes no daban Renombre).
  if (root.profile && root.profile.renownTotal === undefined) {
    const p = root.profile;
    const medals = (p.history ?? []).reduce((n, h) => n + (MEDALS[h.medal]?.renown ?? 0), 0);
    const logros = Object.entries(p.logros ?? {}).reduce((n, [id, tier]) => n + (LOGROS_BY_ID[id]?.reward.slice(0, tier).reduce((a, b) => a + b, 0) ?? 0), 0);
    const pages = ALBUM.filter((pg) => pg.stickers.every((s) => (p.album ?? []).includes(s.id))).length * PAGE_BONUS;
    // Nunca menos de lo que se tiene ahora.
    p.renownTotal = Math.max(p.renown ?? 0, medals + logros + pages);
  }
  // v3.9 → v3.10: la jornada pasa a ser de cada región. Nadie pierde horas: cada región arranca con los
  // bloques que tenía el jugador. (La decoración por región la arregla profileOf.)
  if (root.profile?.workLevel) {
    for (const st of all) st.workLevel = Math.max(st.workLevel ?? 0, root.profile.workLevel);
    delete root.profile.workLevel;
  }
  // v3.6 → v3.7: los eventos ya no van por año sino por cupos. Lo ya jugado (`done`: zona → año) pasa a
  // `last` (el comienzo de ese año) y `count` (cuántas veces, del registro del perfil); los tableros en
  // juego ocupan los cupos.
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
    // v3.7 → v3.8: la región terminada alguna vez (su última zona completa, o ya reiniciada).
    const last = REGIONS_BY_ID[st.region ?? 'cafetero'].zones.at(-1);
    st.regionDone = Boolean(st.regionDone || st.zones?.[last]?.complete || st.legacy?.resets > 0);
    // v3.12: el segundo final pide más (arrieros, rutas, objetivos e investigaciones). Uno logrado con la
    // regla de antes se quita si todavía falta algo; vuelve a llegar al completarlo.
    if (st.mastered && !masteryReady(st)) st.mastered = false;
  }
  // v3.29 → v3.30: dos cupos de eventos para todo el juego, en la partida principal (antes, dos por
  // región). Los tableros en juego se quedan (los dos primeros ocupan los cupos; los demás no llenan cupo
  // hasta que se terminen); los disponibles sin empezar y las esperas de cada región se borran.
  if (!root.events.global) {
    root.events.global = true;
    const playing = all.flatMap((st) => Object.keys(st.events.boards));
    root.events.slots = [null, null];
    playing.slice(0, 2).forEach((zone, i) => (root.events.slots[i] = { zone }));
  }
  for (const st of all) if (st !== root) delete st.events.slots;
  return root;
}

// Lo común a todas las regiones: rutas, objetivos y el resto de los campos.
function finish(data, base, stations, zones, mules) {
  const routes = {};
  for (const id of Object.keys(base.routes)) routes[id] = { ...createRouteState(), ...data.routes?.[id] };
  // Hasta la v1.0.1 los objetivos de investigación se guardaban con el id de la investigación.
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
    goals: { ...base.goals, ...data.goals, claimed },
    // Las otras regiones, cada una con lo suyo.
    ...(data.regions && { regions: Object.fromEntries(Object.entries(data.regions).map(([id, st]) => [id, migrate(st)])) }),
    version: SAVE_VERSION,
  };
}

// Copia de seguridad en texto (para llevar la partida a otro dispositivo).
export function exportSave(state) {
  state.savedAt = Date.now();
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

// Devuelve la partida o null si el texto no es válido.
export function importSave(text) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    if (!data.stations?.farm || typeof data.coins !== 'number') return null;
    return migrate(data);
  } catch {
    return null;
  }
}
