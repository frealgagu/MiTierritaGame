// Flujo teórico de la cadena para mostrar el cuello de botella (no afecta a la simulación).
import { STATIONS_BY_ID } from '../data/stations.js';
import { RESEARCH } from '../data/research.js';
import { MAX_LEVEL, dispatchRate, stationRate } from './rules.js';
import { chainOf, consumers, sourceOf, zoneOf } from './chain.js';
import { routeActive, routeRate, routeStations, stationImportRate } from './routes.js';
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { exportsOf, teamCapacity } from './transport.js';
import { COMPOST_VALUE, WASHED_PER_COMPOST, dispatchMult, productValue, speedMult } from './modifiers.js';
import { PRODUCTS } from '../data/products.js';

const LOSS = 0.02; // por debajo del 2 % no se considera cuello de botella
const MAX_ROUTE_DEPTH = 4; // zonas encadenadas por rutas que se miran como mucho

// Por estación (unidades/s):
//   incoming   lo que le llega        capacity  lo que puede procesar (en unidades de entrada)
//   output     lo que produce         toNext    lo que sus arrieros llevan a las siguientes
//   diverted   lo que se desvía a la bodega     lost  lo que no alcanza a salir (el patio se llena)
//   transport  capacidad de sus arrieros hacia la siguiente estación (o la bodega)
//   children   estaciones construidas que reciben su producto (una rama si son varias)
//   next       la primera de ellas (o null)     nextCapacity  lo que pueden procesar entre todas
//   exports    rutas a las que la estación guarda parte de su producto (la leche para el Cacaotal)
//   imported   para las estaciones con ruta: unidades/s que les llegan de cada importado { producto: u/s }
//   importLimited  la ruta cuyo producto frena a la estación (o null)
// Con `exports: false` no descuenta lo que sale por rutas (routeFlow lo usa para saber cuánto hay para
// enviar). `depth` corta la recursión entre zonas que se abastecen en cadena.
export function analyzeChain(state, zoneId = 'finca', { exports: withExports = true, depth = 0 } = {}) {
  const routes = depth < MAX_ROUTE_DEPTH;
  const ids = chainOf(zoneId).filter((id) => state.stations[id]);
  const rows = [];
  let toWarehouse = 0;
  const flows = []; // { product, units, value, leaf } que llegan a la bodega
  const byRate = {}; // subproducto que genera cada estación (por s), p. ej. bagazo de la Molienda
  const allocated = {}; // lo que cada estación recibe de su proveedor (por s)
  const exported = {}; // producto intermedio guardado para rutas (por s), que va a la bodega sin venderse

  // Precio de venta esperado: en la Finca, con el bono del compost que la Compostera puede sostener.
  const compost = zoneId === 'finca' ? expectedCompostValue(state) : 1;
  const value = (pid) => productValue(state, pid) * (PRODUCTS[pid].zone === 'finca' ? compost : 1);

  // Ciclos por segundo de una estación, con investigaciones y combustible.
  const cycleRate = (id) => {
    const def = STATIONS_BY_ID[id];
    let rate = stationRate(def, state.stations[id].level) * speedMult(state, id);
    if (def.fuel) {
      // El combustible acelera ×boost mientras alcance: si la estación de origen da menos, en proporción.
      const demand = rate * def.fuel.boost * def.fuel.perCycle;
      const supply = byRate[def.fuel.from] ?? 0;
      rate *= 1 + (def.fuel.boost - 1) * Math.min(1, demand > 0 ? supply / demand : 0);
    }
    return rate;
  };
  // Unidades/s de un importado que le llegan a una estación (su parte de lo que mueve la ruta).
  // Lo que mueve cada ruta se calcula una vez por análisis (mirar otra zona cuesta un análisis entero).
  const routeFlows = new Map();
  const flowOf = (routeId) => {
    if (!routeFlows.has(routeId)) routeFlows.set(routeId, routeFlow(state, routeId, depth + 1));
    return routeFlows.get(routeId);
  };
  const importOf = (id, imp) => (routes ? flowOf(imp.route) * routeShare(state, imp.route, id) : 0);
  // Unidades de su entrada principal que puede procesar por segundo (frenada por los importados si faltan).
  const capacityOf = (id) => {
    const def = STATIONS_BY_ID[id];
    const need = Object.values(def.in)[0];
    let cycles = cycleRate(id);
    for (const imp of def.imports ?? []) cycles = Math.min(cycles, importOf(id, imp) / imp.perCycle);
    return cycles * need;
  };
  // Lo que sale de esta zona por rutas (unidades/s por producto): no pasa por el Willys.
  const exports = {};
  if (withExports && routes) {
    for (const r of ROUTES) if (r.from === zoneId) exports[r.product] = (exports[r.product] ?? 0) + flowOf(r.id);
  }

  for (const id of ids) {
    const st = state.stations[id];
    const def = STATIONS_BY_ID[id];
    const outId = Object.keys(def.out)[0];
    const outAmt = def.out[outId];
    const rate = cycleRate(id);
    const incoming = def.in ? allocated[id] ?? 0 : null;
    let capacity;
    let cycles;
    if (def.in) {
      const need = Object.values(def.in)[0];
      capacity = capacityOf(id);
      cycles = Math.min(incoming, capacity) / need;
    } else {
      capacity = rate * outAmt;
      cycles = rate;
    }
    const output = cycles * outAmt;
    if (def.by) byRate[id] = cycles * Object.values(def.by)[0];

    const children = consumers(state, id);
    // Las rutas que se llevan un producto intermedio cuentan como una rama más (ver transport.exportsOf).
    const exportsHere = routes ? exportsOf(state, id) : [];
    const transport = teamCapacity(state, id);
    const row = { id, incoming, capacity, output, transport, children, exports: exportsHere.map((r) => r.id), next: children[0] ?? null, toNext: 0, diverted: 0, lost: 0 };
    if (def.imports) {
      row.imported = {};
      row.importLimited = null;
      // La que más frena es la que llega en menor proporción a lo que la estación necesita.
      let tightest = 1 - LOSS;
      for (const imp of def.imports) {
        row.imported[imp.product] = importOf(id, imp);
        const ratio = row.imported[imp.product] / (rate * imp.perCycle);
        if (ratio < tightest) {
          tightest = ratio;
          row.importLimited = imp.route;
        }
      }
    }

    if (children.length) {
      const caps = children.map((c) => capacityOf(c));
      const exportCaps = exportsHere.map((r) => Math.min(routeDemandRate(state, r.id), routeRate(state, r.id)));
      const nextCapacity = [...caps, ...exportCaps].reduce((a, b) => a + b, 0);
      row.toNext = Math.min(output, transport, nextCapacity);
      // Cada una recibe en proporción a lo que procesa (las mulas van a la de la entrada más vacía).
      children.forEach((c, k) => (allocated[c] = nextCapacity > 0 ? (row.toNext * caps[k]) / nextCapacity : 0));
      exportsHere.forEach((r, k) => {
        const units = nextCapacity > 0 ? (row.toNext * exportCaps[k]) / nextCapacity : 0;
        exported[r.product] = (exported[r.product] ?? 0) + units;
      });
      const left = output - row.toNext;
      // Las mulas que sobran llevan el resto a la bodega (viaje más largo).
      const free = Math.max(0, 1 - row.toNext / transport);
      row.diverted = Math.min(left, free * teamCapacity(state, id, 'warehouse'));
      row.lost = left - row.diverted;
      row.nextCapacity = nextCapacity;
    } else {
      row.diverted = Math.min(output, transport);
      row.lost = output - row.diverted;
    }
    toWarehouse += row.diverted;
    let units = row.diverted;
    // Lo que se lleva la ruta sale primero de lo que la estación le guardó; solo el resto, de los desvíos.
    if (exports[outId] && exported[outId]) exports[outId] = Math.max(0, exports[outId] - exported[outId]);
    if (exports[outId]) {
      const out = Math.min(units, exports[outId]);
      units -= out;
      exports[outId] -= out;
    }
    flows.push({ product: outId, units, value: value(outId), leaf: !children.length });
    rows.push(row);
  }

  const dispatch = dispatchRate(state.zones[zoneId].dispatch.level, dispatchMult(state, zoneId));
  // El Willys carga primero lo más valioso: si no da abasto, lo que se queda es lo barato.
  // Ingreso de la cadena principal: solo lo que sale del final de cada rama (sin los desvíos, que son
  // un recurso de emergencia). Es lo que mide la mejora recomendada.
  let room = dispatch;
  let mainRoom = dispatch;
  let income = 0;
  let mainIncome = 0;
  for (const f of flows.sort((a, b) => b.value - a.value)) {
    const units = Math.min(f.units, room);
    income += units * f.value;
    room -= units;
    if (f.leaf) {
      const main = Math.min(f.units, mainRoom);
      mainIncome += main * f.value;
      mainRoom -= main;
    }
  }

  // El cuello de botella es el primer punto de la cadena donde no sale todo lo producido:
  // o las siguientes estaciones no lo procesan, o los arrieros no alcanzan a llevarlo.
  // Primero, una estación cuyo patio se llena porque sus arrieros no dan abasto: frena todo lo de antes.
  let bottleneck = null;
  const jammed = rows.find((r) => r.lost > r.output * LOSS && r.transport < r.output * (1 - LOSS));
  if (jammed) bottleneck = `${jammed.id}:transport`;
  for (const row of bottleneck ? [] : rows) {
    const shortfall = row.children.length ? row.output - row.toNext : row.lost;
    if (shortfall <= row.output * LOSS) continue;
    bottleneck = row.children.length && row.nextCapacity <= row.transport ? slowestConsumer(state, row.children, rows) : `${row.id}:transport`;
    break;
  }
  if (!bottleneck) {
    // Una estación que espera el importado: la ruta no da abasto.
    const starved = rows.find((r) => r.importLimited && r.incoming > r.capacity * (1 + LOSS));
    if (starved) bottleneck = `route:${starved.importLimited}`;
  }
  if (!bottleneck) bottleneck = toWarehouse > dispatch * (1 + LOSS) ? `dispatch:${zoneId}` : sourceOf(zoneId);
  // Lo que ya está en el nivel 100 no se puede mejorar: no se señala (si todo está al máximo, nada).
  if (upgradeLevel(state, bottleneck) >= MAX_LEVEL) bottleneck = null;
  return { rows, toWarehouse, dispatch, bottleneck, income, mainIncome, exported };
}

// Nivel de lo que se mejora con un id de mejora ('farm', 'farm:transport', 'dispatch:<zona>', 'route:<ruta>').
function upgradeLevel(state, id) {
  const [sid, part] = id.split(':');
  if (sid === 'dispatch') return state.zones[part].dispatch.level;
  if (sid === 'route') return state.routes[part].level;
  return part === 'transport' ? state.stations[sid].transport.level : state.stations[sid].level;
}

// De las estaciones que reciben de una rama, la que más frena: si es por el importado, su ruta;
// si no, la de menor nivel.
function slowestConsumer(state, children, rows) {
  for (const c of children) {
    const row = rows.find((r) => r.id === c);
    const route = row?.importLimited;
    if (route && routeRate(state, route) < routeFlow(state, route) * (1 + LOSS) + 1e-9) return `route:${route}`;
  }
  return children.reduce((low, c) => (state.stations[c].level < state.stations[low].level ? c : low));
}

// Lo que piden las estaciones de una ruta a toda marcha (u/s) y lo que pide cada una.
const routeDemandRate = (state, routeId) =>
  routeStations(state, routeId).reduce((n, id) => n + stationImportRate(state, ROUTES_BY_ID[routeId], id), 0);
export function routeShare(state, routeId, id) {
  const total = routeDemandRate(state, routeId);
  return total > 0 ? stationImportRate(state, ROUTES_BY_ID[routeId], id) / total : 0;
}

// Unidades/s que mueve una ruta: lo que piden sus estaciones a toda marcha, sin pasar de lo que lleva
// el vehículo ni de lo que llega a la bodega de origen. Si varias rutas sacan el mismo producto de la
// misma zona (la panela del Trapiche va a la Lechería y al Cacaotal), se lo reparten según lo que pide cada una.
export function routeFlow(state, routeId, depth = 0) {
  if (!routeActive(state, routeId)) return 0;
  const r = ROUTES_BY_ID[routeId];
  const want = (id) => (routeActive(state, id) ? Math.min(routeDemandRate(state, id), routeRate(state, id)) : 0);
  const own = want(routeId);
  const siblings = ROUTES.filter((x) => x.from === r.from && x.product === r.product).reduce((n, x) => n + want(x.id), 0);
  const source = analyzeChain(state, r.from, { exports: false, depth });
  const supply = (source.exported[r.product] ?? 0) + source.rows.filter((row) => Object.keys(STATIONS_BY_ID[row.id].out)[0] === r.product).reduce((n, row) => n + row.diverted, 0);
  return Math.min(own, siblings > 0 ? (supply * own) / siblings : 0);
}

// Bono de venta que la Compostera puede sostener: 1 sin compost, 1,3 si alcanza para todo el café
// que lava el Beneficiadero (si no alcanza, el bono está encendido solo parte del tiempo).
export function expectedCompostValue(state) {
  const c = state.stations.composter;
  const w = state.stations.wetmill;
  if (!c || !w) return 1;
  const farmOut = stationRate(STATIONS_BY_ID.farm, state.stations.farm.level) * speedMult(state, 'farm');
  const wetCycles = Math.min(stationRate(STATIONS_BY_ID.wetmill, w.level) * speedMult(state, 'wetmill'), farmOut / STATIONS_BY_ID.wetmill.in.cherry);
  if (wetCycles <= 0) return 1;
  const demand = (wetCycles * STATIONS_BY_ID.wetmill.out.washed) / WASHED_PER_COMPOST; // compost/s
  const supply = Math.min(stationRate(STATIONS_BY_ID.composter, c.level) * speedMult(state, 'composter'), wetCycles / STATIONS_BY_ID.composter.in.pulp);
  return 1 + (COMPOST_VALUE - 1) * Math.min(1, supply / demand);
}

// Mejora recomendada: la que más 💰/s suma por moneda gastada al final de la cadena (sin contar lo que
// se vende desviado), entre estaciones, arrieros y despacho.
// Si ninguna mejora suelta suma lo suficiente (hay que subir varias a la vez), recomienda el
// cuello de botella. Devuelve { id, cost, gain }, o null si no queda nada que mejorar. (`quote` es Game.quote, para no duplicar precios.)
const MIN_GAIN = 0.01; // ganancia mínima, como fracción del ingreso actual
// Arrieros, rutas y la Compostera: suman poco nivel a nivel, se miden de 10 en 10.
const isGradual = (id) => STATIONS_BY_ID[id]?.side || id.endsWith(':transport') || id.startsWith('route:');

export function recommendUpgrade(state, quote, zoneId = 'finca') {
  const analysis = analyzeChain(state, zoneId);
  // Zonas que abastecen a esta por una ruta: sus estaciones también cuentan (si la Paila espera
  // panela, lo que hace falta puede ser la Pulverizadora del Trapiche).
  const suppliers = ROUTES.filter((r) => r.to === zoneId && routeActive(state, r.id)).map((r) => r.from);
  const zones = [zoneId, ...new Set(suppliers)];
  const score = (st) => zones.reduce((n, z) => n + (z === zoneId && st === state ? analysis.mainIncome : analyzeChain(st, z).mainIncome), 0);
  const base = score(state);
  const options = [];
  const ids = [`dispatch:${zoneId}`];
  for (const id of Object.keys(state.stations)) {
    if (!zones.includes(zoneOf(id))) continue;
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  for (const r of ROUTES) if (r.to === zoneId && routeActive(state, r.id)) ids.push(`route:${r.id}`);
  // Lo que suma comprar a la vez `count` niveles de cada uno de `list` (o null si alguno no se puede).
  // Cada elemento es un id o un par [id, niveles], para subir unos más que otros.
  const trialGain = (list, count) => {
    const trial = { ...state, stations: { ...state.stations }, zones: { ...state.zones }, routes: { ...state.routes } };
    let cost = 0;
    for (const item of list) {
      const [id, n] = Array.isArray(item) ? item : [item, count];
      const q = quote(id, n);
      if (q.maxed || q.locked || q.levels === 0) return null;
      cost += q.cost;
      const levels = q.levels ?? 1;
      if (id.startsWith('dispatch')) {
        const zone = trial.zones[zoneId];
        trial.zones[zoneId] = { ...zone, dispatch: { level: zone.dispatch.level + levels } };
      } else if (id.startsWith('route:')) {
        const rid = id.split(':')[1];
        trial.routes[rid] = { ...trial.routes[rid], level: trial.routes[rid].level + levels };
      } else {
        const [sid, part] = id.split(':');
        const st = { ...trial.stations[sid], transport: { ...trial.stations[sid].transport } };
        (part ? st.transport : st).level += levels;
        trial.stations[sid] = st;
      }
    }
    const first = list[0];
    return { id: Array.isArray(first) ? first[0] : first, cost, gain: score(trial) - base };
  };
  for (const id of ids) {
    // Arrieros, rutas y la Compostera suman poco nivel a nivel (unos arrieros muy atrasados, el bono
    // del compost que se cubre poco a poco): si un nivel suelto no llega al mínimo, se miden de 10 en 10.
    let option = STATIONS_BY_ID[id]?.side ? null : trialGain([id], 1);
    if (isGradual(id) && (!option || option.gain < base * MIN_GAIN)) option = trialGain([id], 10) ?? option;
    if (option) options.push(option);
  }
  const roi = (o) => o.gain / o.cost;
  let best = options.filter((o) => o.gain > 1e-9 && o.gain >= base * MIN_GAIN).sort((a, b) => roi(b) - roi(a))[0];
  // Una investigación solo se recomienda si ya alcanza el dinero y rinde más que el mejor nivel:
  // así la recomendación nunca deja al jugador ahorrando para algo caro.
  for (const r of RESEARCH) {
    if (r.zone !== zoneId || state.research.includes(r.id) || r.cost > state.coins) continue;
    if (r.requires && !state.stations[r.requires]) continue;
    const gain = score({ ...state, research: [...state.research, r.id] }) - base;
    const option = { id: `research:${r.id}`, cost: r.cost, gain };
    if (gain > 1e-9 && (!best || roi(option) > roi(best))) best = option;
  }
  if (best) return best;
  // Ninguna sola rinde: puede que dos se frenen entre sí (una ruta y los arrieros de la estación que
  // abastece). Se prueban de dos en dos, de 10 en 10 niveles, y se recomienda la primera del mejor par.
  const gradual = ids.filter(isGradual);
  let pair = null;
  for (let i = 0; i < gradual.length; i++) {
    for (let j = i + 1; j < gradual.length; j++) {
      const o = trialGain([gradual[i], gradual[j]], 10);
      if (o && o.gain >= base * MIN_GAIN && (!pair || roi(o) > roi(pair))) pair = o;
    }
  }
  // Una estación con importados puede estar frenada a la vez por su nivel, sus rutas y sus arrieros
  // (el Puesto de arepas espera queso y mantequilla): se prueba subirla un nivel y poner a su altura lo
  // que va detrás. Se recomienda lo más atrasado del grupo, que es lo que hay que comprar primero.
  for (const id of ids) {
    const def = STATIONS_BY_ID[id];
    if (!def?.imports) continue;
    const target = state.stations[id].level + 1;
    const behind = [`${id}:transport`, ...def.imports.filter((imp) => routeActive(state, imp.route)).map((imp) => `route:${imp.route}`)];
    const group = [[id, 1], ...behind.map((b) => [b, target - upgradeLevel(state, b)]).filter(([, n]) => n > 0)];
    if (group.length < 2) continue;
    const o = trialGain(group, 1);
    if (!o || o.gain < base * MIN_GAIN) continue;
    const lowest = group.map(([g]) => g).reduce((low, g) => (upgradeLevel(state, g) < upgradeLevel(state, low) ? g : low));
    if (!pair || roi(o) > roi(pair)) pair = { ...o, id: lowest };
  }
  if (pair) return { ...pair, cost: quote(pair.id, 1).cost };
  // Sin cuello de botella que se pueda mejorar (todo al máximo): no hay recomendación.
  if (!analysis.bottleneck) return null;
  return { id: analysis.bottleneck, cost: quote(analysis.bottleneck, 1).cost, gain: 0 };
}
