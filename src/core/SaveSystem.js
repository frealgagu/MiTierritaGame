import { createInitialState, SAVE_VERSION } from '../sim/state.js';
import { createSourceState, createStationState } from '../sim/production.js';
import { createRouteState } from '../sim/routes.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

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
    // v3.1: una zona ya completa abre la siguiente de su región si esta llegó en una versión nueva.
    for (const [id, z] of Object.entries(zones)) {
      const next = ZONES_BY_ID[id].next;
      if (!z.complete || !next || zones[next].unlocked) continue;
      zones[next].unlocked = true;
      stations[ZONES_BY_ID[next].farm.stationId] ??= createSourceState(ZONES_BY_ID[next].farm.stationId);
    }
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
  return finish(data, base, stations, zones, mules);
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
