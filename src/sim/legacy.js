// Segundo final (v1.6): todas las estaciones de todas las zonas de la región en el nivel 100, con el
// primer final ya logrado (la última zona completa: el Pueblo en el Eje Cafetero, desde la v1.7.12).
// Desde la v3.12 pide además los arrieros y las rutas entre zonas en el nivel 100, todos los objetivos
// cobrados y todas las investigaciones compradas (ver masteryParts).
// Al lograrlo se puede volver a empezar la región con la producción multiplicada (ver modifiers.js:
// legacyMult). Desde la v3.0, cada región tiene el suyo.
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS, REGIONS_BY_ID, regionOf } from '../data/regions.js';
import { clockOf } from './calendar.js';
import { MAX_LEVEL } from './rules.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { GOALS_BY_ZONE } from '../data/goals.js';
import { RESEARCH } from '../data/research.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { createInitialState } from './state.js';
import { MAX_LEGACY_RESETS, legacyMult } from './modifiers.js';
import { bankRun } from './logros.js';
import { RESTART_RENOWN, gainRenown, profileOf } from './renown.js';
import { tk } from '../i18n/index.js'; // las etiquetas se traducen donde se muestran (GoalsView)

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

// Lo que pide el segundo final (v3.12), con cuánto lleva de cada cosa: [{ id, icon, label, have, need }].
export function masteryParts(state) {
  const region = regionOf(state);
  const at100 = (level) => (level ?? 0) >= MAX_LEVEL;
  const stations = stationsOf(state);
  const carried = stations.filter((id) => !STATIONS_BY_ID[id].side); // la Compostera no tiene arrieros
  const routes = Object.keys(state.routes ?? {});
  const goals = region.zones.flatMap((z) => GOALS_BY_ZONE[z] ?? []);
  const research = RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === region.id);
  return [
    { id: 'stations', icon: '🏭', label: tk('Estaciones en el nivel 100'), have: stations.filter((id) => at100(state.stations[id]?.level)).length, need: stations.length },
    { id: 'transport', icon: '🐴', label: tk('Arrieros en el nivel 100'), have: carried.filter((id) => at100(state.stations[id]?.transport?.level)).length, need: carried.length },
    { id: 'routes', icon: '🚚', label: tk('Rutas entre zonas en el nivel 100'), have: routes.filter((id) => at100(state.routes[id]?.level)).length, need: routes.length },
    { id: 'goals', icon: '🎯', label: tk('Objetivos cobrados'), have: goals.filter((g) => state.goals.claimed.includes(g.id)).length, need: goals.length },
    { id: 'research', icon: '🔬', label: tk('Investigaciones compradas'), have: research.filter((r) => state.research.includes(r.id)).length, need: research.length },
  ];
}
export const masteryReady = (state) => masteryParts(state).every((p) => p.have >= p.need);

// Marca el segundo final la primera vez que se cumple todo con la última zona ya completa (y avisa).
// Se mira al comprar una mejora o una investigación y al cobrar un objetivo.
export function checkMastery(state, bus) {
  // (Una región a la que todavía le faltan zonas, wip, no tiene segundo final.)
  if (state.mastered || regionOf(state).wip || !state.zones[finalZone(state)]?.complete || !masteryReady(state)) return false;
  state.mastered = true;
  bus.emit('mastered', { playTime: state.playTime });
  return true;
}

// Partida nueva con la producción al doble de la anterior. Se conservan los ajustes, los avisos ya
// vistos, el registro de las partidas terminadas y el Renombre con las medallas.
// Desde la v3.0 reinicia solo su región: las demás siguen como estaban, y el calendario del país sigue
// corriendo (la partida nueva empieza en la fecha en que terminó la anterior).
// profile: el del jugador, para la partida de otra región (v3.10: lo de la partida que termina pasa al
// acumulado de los logros de esa región).
export function restartState(state, now = Date.now(), profile = null) {
  const region = regionOf(state);
  const next = createInitialState(now, region.id);
  // Los reinicios llegan hasta el tope del multiplicador (v4.0: ahí se quedan; antes se seguían sumando y se
  // guardaba un registro de cada partida, que crecía sin fin).
  next.legacy = { resets: Math.min(MAX_LEGACY_RESETS, (state.legacy?.resets ?? 0) + 1) };
  next.clockOffset = clockOf(state);
  next.settings = { ...state.settings, zone: region.zones[0] };
  next.hints = [...(state.hints ?? [])];
  // Las otras regiones (solo la partida del Eje Cafetero las guarda) siguen igual.
  if (state.regions) next.regions = state.regions;
  // El segundo Willys de la región (v3.9) y su jornada (v3.10) se quedan.
  if (state.willys2) next.willys2 = true;
  if (state.workLevel) next.workLevel = state.workLevel;
  // La región ya se terminó (v3.8): sus eventos siguen saliendo en todas sus zonas.
  next.regionDone = Boolean(state.regionDone || state.zones[region.zones.at(-1)]?.complete);
  // Lo que no se pierde (v2.0): Renombre, medallas, álbum, decoración y logros; y lo de esta partida
  // pasa al acumulado de los logros (v2.3). Solo la partida del Eje Cafetero guarda el perfil.
  // Los eventos siguen tal cual (v3.12): los tableros en juego, los cupos (con su evento o esperando sus
  // 2 años) y lo ya jugado. (Hasta la v3.11 el tablero en juego se perdía.)
  const ev = state.events ?? {};
  next.events = {
    boards: structuredClone(ev.boards ?? {}),
    slots: [0, 1].map((i) => ev.slots?.[i] ?? null),
    last: { ...ev.last },
    count: { ...ev.count },
    ...(ev.global ? { global: true } : {}),
  };
  // Cada reinicio da Renombre (v3.11).
  if (state.profile) {
    next.profile = structuredClone(state.profile);
    bankRun(state, profileOf(next));
    gainRenown(profileOf(next), RESTART_RENOWN);
  } else {
    delete next.profile;
    if (profile) {
      bankRun(state, profile);
      gainRenown(profile, RESTART_RENOWN);
    }
  }
  return next;
}

// La zona con que abre el juego (v3.72): la que se estaba viendo, si sigue abierta; si no (al volver a
// empezar una región se cierran sus zonas), la primera de su región; y si tampoco, la Finca. Hasta la v3.71
// volvía siempre a la Finca: al reiniciar otra región se terminaba en el Cafetal.
//   root: la partida principal (la del Eje Cafetero, con las otras regiones en root.regions)
export function startZone(root, zone) {
  const regionOfZone = (z) => REGIONS.find((r) => r.zones.includes(z));
  const stateOf = (r) => (r.id === (root.region ?? 'cafetero') ? root : root.regions?.[r.id]);
  const open = (z) => {
    const r = regionOfZone(z);
    return Boolean(r && stateOf(r)?.zones?.[z]?.unlocked);
  };
  if (open(zone)) return zone;
  const first = regionOfZone(zone)?.zones[0];
  return first && open(first) ? first : 'finca';
}
