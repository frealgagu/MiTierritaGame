import { createStationState } from './production.js';

export const SAVE_VERSION = 3;

export function createInitialState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    coins: 0,
    totalEarned: 0,
    playTime: 0,
    savedAt: now,
    nextId: 1,
    stations: {
      farm: createStationState(), // las demás estaciones aparecen al construirlas
    },
    dispatch: { level: 1 },
    warehouse: {}, // productId -> unidades en bodega
    mules: [], // { id, productId, amount, from, to, phase: 'go' | 'back', t, duration }
    jeep: { phase: 'idle', t: 0, waited: 0, load: {} },
    stats: { produced: {}, sold: {} },
    hints: [], // avisos ya mostrados
  };
}

export function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}
