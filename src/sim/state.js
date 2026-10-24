import { createStationState } from './production.js';
import { createRouteState } from './routes.js';
import { ROUTES } from '../data/routes.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { sourceOf } from './chain.js';

export const SAVE_VERSION = 9;

// Bodega, Willys y nivel del despacho de una zona.
export function createZoneState(unlocked = false) {
  return { unlocked, complete: false, dispatch: { level: 1 }, warehouse: {}, jeep: { phase: 'idle', t: 0, waited: 0, load: {} } };
}

// Partida nueva de una región (v3.0): sus zonas (la primera abierta, con su fuente) y sus rutas.
export function createInitialState(now = Date.now(), regionId = 'cafetero') {
  const region = REGIONS_BY_ID[regionId];
  const first = region.zones[0];
  return {
    version: SAVE_VERSION,
    region: regionId,
    coins: 0,
    totalEarned: 0,
    playTime: 0,
    savedAt: now,
    nextId: 1,
    // Estaciones de todas las zonas (los ids son únicos); aparecen al construirlas.
    stations: {
      [sourceOf(first)]: createStationState(),
    },
    // Por zona: desbloqueada, completada, despacho, bodega (productId -> unidades) y Willys.
    zones: Object.fromEntries(region.zones.map((z) => [z, createZoneState(z === first)])),
    // Rutas entre zonas de la región: nivel y vehículo (ver sim/routes.js).
    routes: Object.fromEntries(ROUTES.filter((r) => REGION_OF_ZONE[r.from] === regionId).map((r) => [r.id, createRouteState()])),
    mules: [], // { id, productId, amount, from, to, phase: 'go' | 'back', t, duration }
    stats: { produced: {}, sold: {}, imported: {} },
    hints: [], // avisos ya mostrados
    settings: { sound: true, music: true },
    research: [], // ids de investigaciones compradas
    goals: { claimed: [] }, // objetivos cobrados
    regionDone: false, // la última zona de la región ya se completó alguna vez (v3.8: no se pierde al reiniciar)
    mastered: false, // segundo final: todas las estaciones en el nivel 100
    legacy: { resets: 0, history: [] }, // reinicios con producción ×2 y partidas terminadas
    // Eventos (v2.0): el tablero de cada zona que está en juego y el último año en que se terminó.
    // v3.7: dos cupos por región, lo último jugado de cada zona y cuántas veces (ver sim/events.js).
    events: { boards: {}, slots: [null, null], last: {}, count: {} },
    // Lo que no se pierde al reiniciar (v2.0): Renombre ⭐, medallas y eventos terminados. Es del
    // jugador, no de la región: lo guarda solo la partida del Eje Cafetero.
    ...(regionId === 'cafetero' && { profile: { renown: 0, renownTotal: 0, medals: {}, history: [] } }),
  };
}

export function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}
