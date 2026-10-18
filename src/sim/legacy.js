// Segundo final (v1.6): todas las estaciones de todas las zonas en el nivel 100. Al lograrlo se puede
// volver a empezar desde la Finca con la producción multiplicada (ver modifiers.js: legacyMult).
import { ZONE_LIST } from '../data/zones/index.js';
import { MAX_LEVEL } from './rules.js';
import { createInitialState } from './state.js';
import { legacyMult } from './modifiers.js';

// Estaciones jugables: las cadenas de las seis zonas y sus ramas (la Compostera).
export const ALL_STATIONS = [...new Set(ZONE_LIST.flatMap((z) => [...z.chain, ...z.plots.map((p) => p.stationId)]))];

// Cuántas estaciones ya están en el nivel 100 (para el progreso del segundo final).
export const maxedCount = (state) => ALL_STATIONS.filter((id) => (state.stations[id]?.level ?? 0) >= MAX_LEVEL).length;

// Marca el segundo final la primera vez que todo llega al nivel 100 (y avisa).
export function checkMastery(state, bus) {
  if (state.mastered || maxedCount(state) < ALL_STATIONS.length) return false;
  state.mastered = true;
  bus.emit('mastered', { playTime: state.playTime });
  return true;
}

// Partida nueva con la producción al doble de la anterior. Se conservan los ajustes, los avisos ya
// vistos y el registro de las partidas terminadas.
export function restartState(state, now = Date.now()) {
  const next = createInitialState(now);
  const history = [...(state.legacy?.history ?? []), { mult: legacyMult(state), playTime: state.playTime, totalEarned: state.totalEarned }];
  next.legacy = { resets: (state.legacy?.resets ?? 0) + 1, history };
  next.settings = { ...state.settings, zone: 'finca' };
  next.hints = [...(state.hints ?? [])];
  return next;
}
