export const SAVE_VERSION = 1;

export function createInitialState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    coins: 0,
    totalEarned: 0,
    playTime: 0,
    savedAt: now,
    nextId: 1,
    stations: {
      farm: { level: 1, buffer: 0, progress: 0, sinceDeparture: 0, blocked: false },
    },
    dispatch: { level: 1 },
    warehouse: {}, // productId -> unidades en bodega
    mules: [], // { id, productId, amount, t, duration }
    jeep: { phase: 'idle', t: 0, waited: 0, load: {} },
    stats: { produced: {}, sold: {} },
  };
}

export function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}
