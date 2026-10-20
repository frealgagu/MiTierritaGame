// Segundo final (v1.6): todas las estaciones de todas las zonas de la región en el nivel 100, con el
// primer final ya logrado (la última zona completa: el Pueblo en el Eje Cafetero, desde la v1.7.12).
// Al lograrlo se puede volver a empezar la región con la producción multiplicada (ver modifiers.js:
// legacyMult). Desde la v3.0, cada región tiene el suyo.
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS_BY_ID, regionOf } from '../data/regions.js';
import { clockOf } from './calendar.js';
import { MAX_LEVEL } from './rules.js';
import { createInitialState } from './state.js';
import { legacyMult } from './modifiers.js';
import { bankRun } from './logros.js';
import { profileOf } from './renown.js';

const zoneStations = (z) => [...z.chain, ...z.plots.map((p) => p.stationId)];
// Estaciones jugables de todas las regiones: las cadenas y sus ramas (la Compostera).
export const ALL_STATIONS = [...new Set(ZONE_LIST.flatMap(zoneStations))];
// Las de una región (las que cuentan para su segundo final).
export const regionStations = (regionId) => [...new Set(REGIONS_BY_ID[regionId].zones.flatMap((z) => zoneStations(ZONES_BY_ID[z])))];
export const stationsOf = (state) => regionStations(regionOf(state).id);

// Cuántas estaciones de la región ya están en el nivel 100 (para el progreso del segundo final).
export const maxedCount = (state) => stationsOf(state).filter((id) => (state.stations[id]?.level ?? 0) >= MAX_LEVEL).length;
// La última zona de la región (su primer final).
export const finalZone = (state) => regionOf(state).zones.at(-1);

// Marca el segundo final la primera vez que todo llega al nivel 100 con el Pueblo ya completo (y avisa).
// Se mira al comprar y al cobrar un objetivo: se puede tener todo al 100 antes de exportar los
// contenedores del primer final, y entonces llega al cobrarlo.
export function checkMastery(state, bus) {
  if (state.mastered || !state.zones[finalZone(state)]?.complete || maxedCount(state) < stationsOf(state).length) return false;
  state.mastered = true;
  bus.emit('mastered', { playTime: state.playTime });
  return true;
}

// Partida nueva con la producción al doble de la anterior. Se conservan los ajustes, los avisos ya
// vistos, el registro de las partidas terminadas y el Renombre con las medallas.
// Desde la v3.0 reinicia solo su región: las demás siguen como estaban, y el calendario del país sigue
// corriendo (la partida nueva empieza en la fecha en que terminó la anterior).
export function restartState(state, now = Date.now()) {
  const region = regionOf(state);
  const next = createInitialState(now, region.id);
  const history = [...(state.legacy?.history ?? []), { mult: legacyMult(state), playTime: state.playTime, totalEarned: state.totalEarned }];
  next.legacy = { resets: (state.legacy?.resets ?? 0) + 1, history };
  next.clockOffset = clockOf(state);
  next.settings = { ...state.settings, zone: region.zones[0] };
  next.hints = [...(state.hints ?? [])];
  // Las otras regiones (solo la partida del Eje Cafetero las guarda) siguen igual.
  if (state.regions) next.regions = state.regions;
  // El segundo Willys de la región (v3.9) se queda.
  if (state.willys2) next.willys2 = true;
  // La región ya se terminó (v3.8): sus eventos siguen saliendo en todas sus zonas.
  next.regionDone = Boolean(state.regionDone || state.zones[region.zones.at(-1)]?.complete);
  // Lo que no se pierde (v2.0): Renombre, medallas, álbum, decoración y logros; y lo de esta partida
  // pasa al acumulado de los logros (v2.3). Solo la partida del Eje Cafetero guarda el perfil.
  // Los eventos (v3.7): los cupos que esperan sus 3 años y lo ya jugado siguen; el tablero en juego se
  // pierde y su cupo vuelve a llenarse cuando haya una zona lista.
  const ev = state.events ?? {};
  next.events = {
    boards: {},
    slots: [0, 1].map((i) => (ev.slots?.[i]?.until !== undefined ? ev.slots[i] : null)),
    last: { ...ev.last },
    count: { ...ev.count },
  };
  if (state.profile) {
    next.profile = structuredClone(state.profile);
    bankRun(state, profileOf(next));
  } else delete next.profile;
  return next;
}
