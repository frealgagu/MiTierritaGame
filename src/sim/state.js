import { createStationState } from './production.js';
import { createRouteState } from './routes.js';
import { ROUTES } from '../data/routes.js';

export const SAVE_VERSION = 9;

// Bodega, Willys y nivel del despacho de una zona.
export function createZoneState(unlocked = false) {
  return { unlocked, complete: false, dispatch: { level: 1 }, warehouse: {}, jeep: { phase: 'idle', t: 0, waited: 0, load: {} } };
}

export function createInitialState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    coins: 0,
    totalEarned: 0,
    playTime: 0,
    savedAt: now,
    nextId: 1,
    // Estaciones de todas las zonas (los ids son únicos); aparecen al construirlas.
    stations: {
      farm: createStationState(),
    },
    // Por zona: desbloqueada, completada, despacho, bodega (productId -> unidades) y Willys.
    zones: { finca: createZoneState(true), trapiche: createZoneState(false), lecheria: createZoneState(false), cacaotal: createZoneState(false), maizal: createZoneState(false), pueblo: createZoneState(false) },
    // Rutas entre zonas: nivel y vehículo (ver sim/routes.js).
    routes: Object.fromEntries(ROUTES.map((r) => [r.id, createRouteState()])),
    mules: [], // { id, productId, amount, from, to, phase: 'go' | 'back', t, duration }
    stats: { produced: {}, sold: {}, imported: {} },
    hints: [], // avisos ya mostrados
    settings: { sound: true, music: true },
    research: [], // ids de investigaciones compradas
    goals: { claimed: [] }, // objetivos cobrados
    mastered: false, // segundo final: todas las estaciones en el nivel 100
    legacy: { resets: 0, history: [] }, // reinicios con producción ×2 y partidas terminadas
  };
}

export function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}
