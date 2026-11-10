// Cadenas de cada zona: orden de las estaciones y su posición sobre el camino de las mulas.
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { pathLength, projectOnPath } from '../core/path.js';
import { ROUTES } from '../data/routes.js';
import { EVENTS_BY_ID } from '../data/events.js';

export const zoneOf = (stationId) => STATIONS_BY_ID[stationId].zone;
export const chainOf = (zoneId) => ZONES_BY_ID[zoneId].chain;
export const sourceOf = (zoneId) => ZONES_BY_ID[zoneId].farm.stationId;

// ROAD_POS[zona][estación | 'warehouse']: distancia (en casillas) desde el inicio del camino
// hasta la puerta de cada estación de la cadena principal.
export const ROAD_POS = Object.fromEntries(
  ZONE_LIST.map((zone) => {
    const pos = { warehouse: pathLength(zone.muleRoad) };
    for (const id of zone.chain) {
      if (id === zone.farm.stationId) pos[id] = 0;
      else {
        const plot = zone.plots.find((p) => p.stationId === id);
        // La puerta: el punto del camino que da a la estación (v3.29), o el más cercano a su centro.
        pos[id] = projectOnPath(zone.muleRoad, ...(plot.door ?? [plot.x + 1.5, plot.y + 1.5]));
      }
    }
    return [zone.id, pos];
  }),
);

// Quién alimenta a quién: el proveedor de una estación es la de su zona cuyo producto principal
// está en su receta. La cadena puede ramificarse (la leche pasteurizada va a tres estaciones).
export const PARENT = {};
export const CHILDREN = {};
for (const zone of ZONE_LIST) {
  for (const id of zone.chain) {
    CHILDREN[id] = [];
    const inputs = Object.keys(STATIONS_BY_ID[id].in ?? {});
    const parent = zone.chain.find((p) => p !== id && inputs.includes(Object.keys(STATIONS_BY_ID[p].out)[0]));
    if (parent) PARENT[id] = parent;
  }
  for (const [id, parent] of Object.entries(PARENT)) if (STATIONS_BY_ID[id].zone === zone.id) CHILDREN[parent].push(id);
}

// v4.0: las dos mecánicas nuevas.
// · Estación con dos productos: su subproducto (`by`, como la pulpa del Beneficiadero) pasa por canaleta, sin
//   mulas, a las estaciones de su zona que lo usan de entrada, y desde ahí sigue su propia cadena.
//   BY_CHILDREN[estación] = las que reciben su subproducto; su PARENT es la estación del subproducto.
// · Estación que junta dos: además de su entrada (de PARENT), espera otro producto de una estación de su
//   misma zona (`joins: [{ product, perCycle, from }]`). Si es el producto principal de esa, se lo traen sus
//   mulas (la cuenta entre sus CHILDREN: reparten entre todas); si es su subproducto, la canaleta (entre sus
//   BY_CHILDREN). JOIN_FROM[estación][producto] = de dónde llega.
// · El subproducto que se lleva una ruta (`product` de la ruta) pasa por la canaleta a la bodega (BY_ROUTES).
export const BY_CHILDREN = {};
export const JOIN_FROM = {};
const byProduct = (id) => Object.keys(STATIONS_BY_ID[id].by ?? {})[0];
for (const zone of ZONE_LIST) {
  const ids = [...new Set([...zone.chain, ...(zone.plots ?? []).map((p) => p.stationId)])];
  for (const id of ids) {
    const by = byProduct(id);
    if (!by) continue;
    BY_CHILDREN[id] = ids.filter((c) => c !== id && STATIONS_BY_ID[c].in?.[by] && STATIONS_BY_ID[c].fuel?.from !== id);
    for (const c of BY_CHILDREN[id]) PARENT[c] ??= id;
  }
  for (const id of zone.chain) {
    for (const j of STATIONS_BY_ID[id].joins ?? []) {
      const from = STATIONS_BY_ID[j.from];
      const main = from && Object.keys(from.out)[0] === j.product;
      if (from?.zone !== zone.id || (!main && byProduct(j.from) !== j.product)) throw new Error(`${id}: junta ${j.product} de ${j.from}, que no lo hace en su zona`);
      (JOIN_FROM[id] ??= {})[j.product] = j.from;
      // Su producto principal lo traen las mulas de esa estación; su subproducto, la canaleta.
      if (main) CHILDREN[j.from].push(id);
      else (BY_CHILDREN[j.from] ??= []).push(id);
    }
  }
}

// Rutas de su zona que se llevan el subproducto de cada estación (v4.0: la almendra de palmiste de la Prensa).
export const BY_ROUTES = Object.fromEntries(
  Object.keys(STATIONS_BY_ID)
    .filter((id) => byProduct(id))
    .map((id) => [id, ROUTES.filter((r) => r.from === STATIONS_BY_ID[id].zone && r.product === byProduct(id))])
    .filter(([, routes]) => routes.length),
);

// Lo que una estación recibe de su proveedor `from`: su entrada principal o lo que junta (v4.0).
export function suppliedProduct(id, from) {
  const join = (STATIONS_BY_ID[id].joins ?? []).find((j) => j.from === from);
  return join ? join.product : Object.keys(STATIONS_BY_ID[id].in ?? {})[0];
}

// ¿`product` es lo que junta la estación (no su entrada principal)? Y cuánto gasta de él por ciclo.
export const joinOf = (id, product) => (STATIONS_BY_ID[id].joins ?? []).find((j) => j.product === product) ?? null;
export function perCycleOf(id, product) {
  const def = STATIONS_BY_ID[id];
  return joinOf(id, product)?.perCycle ?? def.in?.[product] ?? Object.values(def.in ?? {})[0] ?? 0;
}

export function isUnlocked(state, id) {
  return Boolean(state.stations[id]);
}

export function zoneUnlocked(state, zoneId) {
  return Boolean(state.zones[zoneId]?.unlocked);
}

// Estaciones construidas que reciben el producto de esta (vacío: va a la bodega de su zona).
export function consumers(state, id) {
  return (CHILDREN[id] ?? []).filter((c) => isUnlocked(state, c));
}

// Barrios (v4.5, Bogotá): una zona puede tener varias cadenas que se construyen a la vez, cada una en su orden
// (`zone.groups`: [{ id, name, stations, after? }]); un barrio con `after` se abre cuando esos barrios están completos.
// Sin barrios, la zona es uno solo: su cadena. (Desde la v4.6 ninguna zona tiene barrios: Bogotá es una red.)
export const groupsOf = (zoneId) => ZONES_BY_ID[zoneId].groups ?? [{ id: zoneId, stations: chainOf(zoneId) }];
export const groupOf = (stationId) => groupsOf(zoneOf(stationId)).find((g) => g.stations.includes(stationId)) ?? null;
const groupDone = (state, zoneId, groupId) => groupsOf(zoneId).find((g) => g.id === groupId).stations.every((id) => isUnlocked(state, id));

// En red (v4.6, Bogotá: `zone.network`): las estaciones de la zona que abastecen a esta, por su entrada o por lo que
// junta (sin la fuente de afuera: las tractomulas no cuentan).
export const suppliersOf = (id) => [...new Set([PARENT[id], ...Object.values(JOIN_FROM[id] ?? {})].filter(Boolean))];

// Las estaciones que ya se pueden construir: la primera que falta de cada barrio abierto; en red, todas las que ya
// tienen construidas las que las abastecen.
export function buildableStations(state, zoneId = 'finca') {
  if (!zoneUnlocked(state, zoneId)) return [];
  // En el tablero de un evento de Bogotá (v4.7.1) solo cuentan las estaciones del evento (las demás no se construyen ahí,
  // y no se muestran ni se sugieren).
  const ev = state.event && (ZONES_BY_ID[zoneId].network || ZONES_BY_ID[zoneId].groups) ? EVENTS_BY_ID[state.event.id] : null;
  if (ev) return ev.stations.filter((id) => zoneOf(id) === zoneId && !isUnlocked(state, id));
  if (ZONES_BY_ID[zoneId].network) return chainOf(zoneId).filter((id) => !isUnlocked(state, id) && suppliersOf(id).every((s) => isUnlocked(state, s)));
  const out = [];
  for (const g of groupsOf(zoneId)) {
    if ((g.after ?? []).some((other) => !groupDone(state, zoneId, other))) continue;
    const next = g.stations.find((id) => !isUnlocked(state, id));
    if (next) out.push(next);
  }
  return out;
}

// Primera estación de la cadena de una zona aún sin construir (con barrios, la más barata de las que se pueden).
export function nextToUnlock(state, zoneId = 'finca') {
  const list = buildableStations(state, zoneId);
  if (list.length <= 1) return list[0] ?? null;
  return list.reduce((best, id) => (STATIONS_BY_ID[id].unlockCost < STATIONS_BY_ID[best].unlockCost ? id : best));
}

// Lo que falta construir en la zona fuera de la cadena (v3.58): la Compostera de la Finca, que no es parte de
// la cadena y se puede dejar sin construir; mientras falte, la zona no está al máximo.
export function nextSideToUnlock(state, zoneId) {
  if (!zoneUnlocked(state, zoneId)) return null;
  const chain = chainOf(zoneId);
  return ZONES_BY_ID[zoneId].plots.map((p) => p.stationId).find((id) => !chain.includes(id) && !isUnlocked(state, id)) ?? null;
}

// Estaciones construidas de una zona (cadena principal y ramas).
export function builtStations(state, zoneId) {
  return Object.keys(state.stations).filter((id) => zoneOf(id) === zoneId);
}

// Qué parte de lo que produce `parent` le toca a la estación `id` cuando están al mismo nivel y con
// las mismas mejoras (la Quesera, ¼ de la leche de la Pasteurizadora). Sale de sus ritmos base.
export function branchShare(parent, id) {
  const p = STATIONS_BY_ID[parent];
  const def = STATIONS_BY_ID[id];
  const product = Object.keys(def.in)[0];
  return (def.in[product] / def.cycle) / (p.out[product] / p.cycle);
}
