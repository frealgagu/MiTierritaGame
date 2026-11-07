import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID, ZONE_LIST } from '../data/zones/index.js';
import { muleCount, muleLoad, stationBufferCap, stationInputCap, stationOutputRate, stationRate, warehouseCapacity } from './rules.js';
import { sumValues } from './state.js';
import { BY_CHILDREN, BY_ROUTES, CHILDREN, ROAD_POS, chainOf, consumers, joinOf, perCycleOf, zoneOf, zoneUnlocked } from './chain.js';
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { ROUTE_STOCK, routeActive, routeCapacity, routeRate, routeReserve } from './routes.js';
import { inputSpace } from './production.js';
import { capMult, dispatchMult, muleSpeedMult, speedMult } from './modifiers.js';
import { resting } from './calendar.js';
import { addMule, countFleet, endFleet, fleetOf } from './fleet.js';

const MAX_IDLE = 6; // s: si hay algo en el patio y no sale una mula en este tiempo, sale con lo que haya
// Si la carga no cabe entera en la siguiente estación, las mulas esperan a que haya sitio; solo con el
// patio casi lleno salen con carga parcial (si cabe al menos un cuarto) o desvían a la bodega. Antes
// salían con migajas, todas quedaban en camino y el patio se llenaba aunque el transporte alcanzara.
const PATIO_ALMOST_FULL = 0.8;
const MIN_PARTIAL = 0.25;
const MIN_LEG = 1; // s por trayecto
// Los desvíos solo usan la bodega mientras quede más de esta fracción libre: así el producto
// barato que sobra nunca deja sin sitio al producto final de la cadena.
export const DIVERT_RESERVE = 0.3;

// Segundos de un trayecto (solo ida) entre dos puntos de la cadena de una zona.
// `to` puede ser otra estación o 'warehouse' (la bodega de la zona de `from`).
export function legTime(from, to, speedMult = 1) {
  const zone = zoneOf(from);
  const pos = ROAD_POS[zone];
  return Math.max(MIN_LEG, Math.abs(pos[to] - pos[from]) / (ZONES_BY_ID[zone].muleSpeed * speedMult));
}

// Unidades en camino hacia una estación, o hacia la bodega de una zona.
export function inTransit(state, to = 'warehouse', zoneId = 'finca') {
  const f = fleetOf(state);
  if (f) return (to === 'warehouse' ? f.toWarehouse[zoneId] : f.incoming[to]) ?? 0;
  return state.mules.reduce((n, m) => {
    if (m.phase !== 'go' || m.to !== to) return n;
    if (to === 'warehouse' && zoneOf(m.from) !== zoneId) return n;
    return n + m.amount;
  }, 0);
}

// Cuánto acelera la producción de una estación (para dimensionar la carga de sus mulas).
export function productionMult(state, id) {
  return speedMult(state, id);
}

// Destino normal de las mulas de una estación: la siguiente construida o la bodega. Si reparte entre
// varias (una rama), la más lejana: así la carga alcanza para cualquiera de ellas.
export function normalDest(state, id) {
  const targets = consumers(state, id);
  if (!targets.length || exportsOf(state, id).length) return 'warehouse';
  return targets.reduce((far, c) => (legTime(id, c) > legTime(id, far) ? c : far));
}

// Rutas que se llevan a otra zona un producto intermedio de esta estación (la leche pasteurizada): la
// estación les guarda una parte, como a una rama más. Sus mulas lo dejan en la bodega, de donde sale la ruta.
export function exportsOf(state, id) {
  return (ROUTES_OF[id] ?? []).filter((r) => routeActive(state, r.id));
}

// Rutas que pueden llevarse el producto de cada estación (de su zona y con su producto), calculadas una vez.
const ROUTES_OF = Object.fromEntries(
  Object.values(STATIONS_BY_ID)
    .filter((def) => CHILDREN[def.id]?.length)
    .map((def) => {
      const out = Object.keys(def.out)[0];
      return [def.id, ROUTES.filter((r) => r.from === def.zone && r.product === out)];
    }),
);

// Rutas que se llevarán el producto de esta estación pero aún no abren (la Ruta de la leche, antes
// de abrir el Cacaotal): la parte que les toca se vende mientras tanto, y eso no es un problema.
export function pendingRoutes(state, id) {
  return (ROUTES_OF[id] ?? []).filter((r) => !routeActive(state, r.id));
}

// ¿Las estaciones siguientes procesan menos de lo que esta produce? (Más las rutas que se llevan su
// producto.) Entonces lo que sobra va a la bodega por el camino largo y, si los arrieros no alcanzan,
// el patio se llena: la culpa es de las siguientes, no de las mulas. Devuelve las que van más lentas.
export function slowConsumers(state, id) {
  const children = consumers(state, id);
  if (!children.length) return [];
  const def = STATIONS_BY_ID[id];
  const output = stationOutputRate(def, state.stations[id].level) * speedMult(state, id);
  const product = Object.keys(def.out)[0];
  const take = (c) => stationRate(STATIONS_BY_ID[c], state.stations[c].level) * speedMult(state, c) * perCycleOf(c, product);
  const capacity = children.reduce((n, c) => n + take(c), 0) + exportsOf(state, id).reduce((n, r) => n + routeRate(state, r.id), 0);
  if (capacity >= output * 0.98) return [];
  return children.filter((c) => state.stations[c].level === Math.min(...children.map((x) => state.stations[x].level)));
}

// Lo que falta por dejar en la bodega para una ruta (carga y media, menos lo que ya hay o va en camino).
export function exportSpace(state, routeId) {
  const r = ROUTES_BY_ID[routeId];
  const cap = ROUTE_STOCK * routeCapacity(state, routeId);
  const stock = state.zones[r.from].warehouse[r.product] ?? 0;
  const f = fleetOf(state);
  const coming = f
    ? f.toExport[`${r.from}|${r.product}`] ?? 0
    : state.mules.reduce((n, m) => (m.phase === 'go' && m.to === 'warehouse' && m.productId === r.product && zoneOf(m.from) === r.from ? n + m.amount : n), 0);
  return { space: cap - stock - coming, cap };
}

// Destinos de las mulas de una estación: estaciones construidas y rutas ('export:<ruta>'). `product`: lo que
// llevan (en una estación que junta dos, cada producto tiene su propio espacio; v4.0).
const targetSpace = (state, t, product) => (t.startsWith('export:') ? exportSpace(state, t.slice(7)).space : inputSpace(state, t, joinOf(t, product) ? product : undefined));
const targetCap = (state, t) => (t.startsWith('export:') ? exportSpace(state, t.slice(7)).cap : stationInputCap(STATIONS_BY_ID[t], state.stations[t].level, capMult(state, t)));
const targetDest = (t) => (t.startsWith('export:') ? 'warehouse' : t);

// Carga de cada mula del equipo de una estación (a su nivel de arrieros o al indicado).
export function teamLoad(state, id, level = state.stations[id].transport.level) {
  const def = STATIONS_BY_ID[id];
  return muleLoad(def, level, 2 * legTime(id, normalDest(state, id)), productionMult(state, id));
}

// Unidades por segundo que mueven los arrieros de una estación hasta `dest`.
// Hacia su destino normal: un 25 % más de lo que produce la estación al mismo nivel
// (más con Herraduras o Cable aéreo). Hacia la bodega en un desvío: menos, el viaje es más largo.
export function teamCapacity(state, id, dest = normalDest(state, id), level = state.stations[id].transport.level) {
  return (muleCount(level) * teamLoad(state, id, level)) / (2 * legTime(id, dest, muleSpeedMult(state)));
}

// Mulas de una estación que están en camino (ida o vuelta).
export function busyMules(state, id) {
  const f = fleetOf(state);
  if (f) return f.busy[id] ?? 0;
  return state.mules.reduce((n, m) => (m.from === id ? n + 1 : n), 0);
}

export function warehouseCap(state, zoneId) {
  return warehouseCapacity(state.zones[zoneId].dispatch.level, dispatchMult(state, zoneId));
}

// Espacio libre en la bodega de una zona contando lo que ya viene en camino.
// Lo que espera una ruta va en el andén de la bodega: no le quita sitio al resto (antes, la leche
// guardada para el Cacaotal podía llenar la bodega de la Lechería y parar toda la zona).
export function dockStock(state, zoneId) {
  const wh = state.zones[zoneId].warehouse;
  return Object.entries(routeReserve(state, zoneId)).reduce((n, [p, r]) => n + Math.min(wh[p] ?? 0, r), 0);
}

export function warehouseSpace(state, zoneId) {
  const wh = state.zones[zoneId].warehouse;
  return warehouseCap(state, zoneId) - (sumValues(wh) - dockStock(state, zoneId)) - inTransit(state, 'warehouse', zoneId);
}

// Arrieros (v0.3): cada estación tiene sus mulas. Van a la siguiente estación (o a la bodega si
// la siguiente no existe o no tiene sitio), entregan y vuelven. Si todas están en camino, el
// producto se acumula en el patio.
export function stepMules(state, dt, bus) {
  let finished = false;
  for (const m of state.mules) {
    m.t += dt;
    if (m.t < m.duration) continue;
    if (m.phase === 'go') {
      deliver(state, m);
      bus.emit('muleArrived', m);
      m.phase = 'back';
      m.t -= m.duration;
      m.amount = 0;
    }
    if (m.phase === 'back' && m.t >= m.duration) {
      m.done = true;
      finished = true;
    }
  }
  if (finished) state.mules = state.mules.filter((m) => !m.done);

  // De noche no sale ninguna recua (las que van de camino terminan su viaje).
  if (resting(state)) return;
  countFleet(state);
  try {
    for (const zone of ZONE_LIST) {
      if (!zoneUnlocked(state, zone.id)) continue;
      for (const id of chainOf(zone.id)) if (state.stations[id]) dispatchFrom(state, id, dt, bus);
    }
  } finally {
    endFleet();
  }
}

function deliver(state, m) {
  const s = m.to !== 'warehouse' ? state.stations[m.to] : null;
  if (s && joinOf(m.to, m.productId)) (s.joined ??= {})[m.productId] = (s.joined[m.productId] ?? 0) + m.amount;
  else if (s) s.input += m.amount;
  else {
    const wh = state.zones[zoneOf(m.from)].warehouse;
    wh[m.productId] = (wh[m.productId] ?? 0) + m.amount;
  }
}

function dispatchFrom(state, id, dt, bus) {
  const s = state.stations[id];
  const def = STATIONS_BY_ID[id];
  const level = s.transport.level;
  s.sinceDeparture += dt;
  s.waiting = null;
  // Sin producto en el patio, o con todas las mulas fuera, no sale nadie: no hace falta calcular la carga.
  if (s.buffer <= 0) return;
  if (busyMules(state, id) >= muleCount(level)) {
    s.waiting = 'mules';
    return;
  }
  const load = teamLoad(state, id);
  const product = Object.keys(def.out)[0];
  const targets = [...consumers(state, id), ...exportsOf(state, id).map((r) => `export:${r.id}`)];

  // Pueden salir varias mulas en el mismo instante si hay producto y mulas libres.
  while (s.buffer > 0) {
    if (busyMules(state, id) >= muleCount(level)) {
      s.waiting = 'mules';
      return;
    }
    if (s.buffer < load && s.sinceDeparture < MAX_IDLE) return;
    const amount = Math.min(s.buffer, load);
    const next = pickConsumer(state, targets, amount, product);
    if (next) {
      sendMule(state, id, targetDest(next), Math.min(amount, targetSpace(state, next, product)), bus);
      continue;
    }
    const almostFull = s.buffer >= PATIO_ALMOST_FULL * stationBufferCap(def, s.level, capMult(state, id));
    const partial = almostFull ? pickConsumer(state, targets, amount * MIN_PARTIAL, product) : null;
    if (partial) {
      sendMule(state, id, targetDest(partial), Math.min(amount, targetSpace(state, partial, product)), bus);
      continue;
    }
    // Hay sitio, pero no para una carga entera: mejor esperar que salir con migajas.
    if (!almostFull && targets.some((c) => targetSpace(state, c, product) > 0)) return;
    const zoneId = zoneOf(id);
    const reserve = targets.length ? DIVERT_RESERVE * warehouseCap(state, zoneId) : 0;
    const room = warehouseSpace(state, zoneId) - reserve;
    if (room <= 0) {
      s.waiting = 'space';
      return;
    }
    const diverted = Math.min(amount, room);
    sendMule(state, id, 'warehouse', diverted, bus);
    // El aviso ↪ solo para desvíos de verdad (al menos media carga), no por un sobrante suelto ni cuando
    // la bodega es también donde espera la ruta (lo que llega de más ahí se lo lleva la siguiente carga),
    // ni cuando es la parte de una ruta que aún no abre (se vende mientras tanto).
    const exporting = targets.some((t) => t.startsWith('export:')) || pendingRoutes(state, id).length > 0;
    if (targets.length && !exporting && diverted >= load * 0.5) s.lastDiverted = state.playTime;
  }
}

// Entre las estaciones que reciben el producto y tienen sitio para `amount`, la de la entrada más vacía
// (contando lo que ya va en camino). Así la que trabaja más rápido recibe más, sin repartir a mano.
// A una estación cuya entrada no alcanza para una carga entera (una rama por debajo del nivel de la
// anterior) le basta con tener media entrada libre: se le lleva lo que quepa. Si no, nunca recibiría
// nada y se quedaría parada.
function pickConsumer(state, targets, amount, product) {
  let best = null;
  let bestFill = Infinity;
  for (const c of targets) {
    const space = targetSpace(state, c, product);
    const need = Math.min(amount, targetCap(state, c) * 0.5);
    if (space <= 0 || space < need - 1e-9) continue;
    const fill = 1 - space / targetCap(state, c);
    if (fill < bestFill) {
      best = c;
      bestFill = fill;
    }
  }
  return best;
}

function sendMule(state, from, to, amount, bus) {
  const s = state.stations[from];
  const productId = Object.keys(STATIONS_BY_ID[from].out)[0];
  s.buffer -= amount;
  s.sinceDeparture = 0;
  const mule = { id: state.nextId++, productId, amount, from, to, phase: 'go', t: 0, duration: legTime(from, to, muleSpeedMult(state)) };
  state.mules.push(mule);
  addMule(mule);
  bus.emit('muleDeparted', mule);
}

// Subproductos (v4.0): lo que una estación saca además de su producto (la pulpa del Beneficiadero) pasa por
// una canaleta, sin mulas. Primero a la bodega, lo que guarda para las rutas que se lo llevan (como las
// estaciones con su producto, v3.67); luego a las estaciones de su zona que lo usan (de entrada o para
// juntarlo), primero a la de entrada más vacía; y si sobra y tiene ruta (abierta o no), a la bodega a
// venderse. Lo que nadie usa se queda en su patio de subproductos y, lleno, se desecha.
export function stepByproducts(state) {
  for (const [id, src] of Object.entries(state.stations)) {
    if (!(src.byBuffer > 1e-9)) continue;
    const kids = (BY_CHILDREN[id] ?? []).filter((c) => state.stations[c]);
    const routes = BY_ROUTES[id] ?? [];
    if (!kids.length && !routes.length) continue;
    const product = Object.keys(STATIONS_BY_ID[id].by)[0];
    const wh = state.zones[zoneOf(id)].warehouse;
    const toWarehouse = (n) => {
      wh[product] = (wh[product] ?? 0) + n;
      src.byBuffer -= n;
    };
    for (const r of routes) {
      if (!routeActive(state, r.id)) continue;
      const n = Math.min(src.byBuffer, exportSpace(state, r.id).space);
      if (n > 1e-9) toWarehouse(n);
    }
    const room = (c) => {
      const st = state.stations[c];
      const have = joinOf(c, product) ? st.joined?.[product] ?? 0 : st.input;
      return stationInputCap(STATIONS_BY_ID[c], st.level, capMult(state, c)) - have;
    };
    while (src.byBuffer > 1e-9 && kids.length) {
      const target = kids.reduce((best, c) => (room(c) > room(best) ? c : best));
      const move = Math.min(room(target), src.byBuffer);
      if (move <= 1e-9) break;
      const st = state.stations[target];
      if (joinOf(target, product)) (st.joined ??= {})[product] = (st.joined[product] ?? 0) + move;
      else st.input += move;
      src.byBuffer -= move;
    }
    if (routes.length && src.byBuffer > 1e-9) {
      const n = Math.min(src.byBuffer, warehouseSpace(state, zoneOf(id)) - DIVERT_RESERVE * warehouseCap(state, zoneOf(id)));
      if (n > 1e-9) toWarehouse(n);
    }
  }
}
