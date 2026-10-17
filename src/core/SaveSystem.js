import { createInitialState, SAVE_VERSION } from '../sim/state.js';
import { createStationState } from '../sim/production.js';

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
  const base = createInitialState(data.savedAt);
  // v1/v2 → v3: estaciones con entrada, estado y arrieros; mulas con origen, destino y fase.
  const stations = {};
  for (const [id, st] of Object.entries(data.stations ?? {})) stations[id] = { ...createStationState(), ...st };
  delete stations.farm?.blocked;
  const mules = (data.mules ?? []).map(({ s0, s1, ...m }) => ({ from: 'farm', to: 'warehouse', phase: 'go', ...m }));
  return {
    ...base,
    ...data,
    stations: { ...base.stations, ...stations },
    mules,
    dispatch: { ...base.dispatch, ...data.dispatch },
    jeep: { ...base.jeep, ...data.jeep },
    stats: { ...base.stats, ...data.stats },
    version: SAVE_VERSION,
  };
}
