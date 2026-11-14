// Theoretical chain flow for bottleneck hints (does not affect live simulation).
import { STATIONS_BY_ID } from '../data/stations.js';
import { RESEARCH } from '../data/research.js';
import { dispatchRate, maxLevel, stationRate } from './rules.js';
import { BY_CHILDREN, BY_ROUTES, JOIN_FROM, PARENT, branchShare, chainOf, consumers, joinOf, perCycleOf, sourceOf, suppliersOf, zoneOf } from './chain.js';
import { routeActive, routeRate, routeStations, stationImportRate } from './routes.js';
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { exportsOf, pendingRoutes, teamCapacity } from './transport.js';
import { COMPOST_VALUE, WASHED_PER_COMPOST, dispatchMult, jeepCount, productValue, speedMult } from './modifiers.js';
import { PRODUCTS } from '../data/products.js';
import { canPay, researchLocked } from './upgrades.js';
import { objectiveUpgrades, supplyFraction } from './events.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

const LOSS = 0.02; // under 2 % is not considered a bottleneck
const MAX_ROUTE_DEPTH = 4; // max zone hops chained via routes to inspect

// Per station (units/s):
//   incoming   what arrives          capacity  what it can process (in input units)
//   output     what it produces      toNext    what haulers carry downstream
//   diverted   diverted to warehouse lost      unable to leave (yard fills up)
//   transport  hauler capacity to next station (or warehouse)
//   children   built stations receiving its output (multiple branches if any)
//   next       first child (or null)  nextCapacity  combined downstream capacity
//   exports    routes reserving a share of its output (milk for Cacaotal)
//   imported   for routed stations: units/s arriving per import { product: u/s }
//   importLimited  route whose product bottlenecks this station (or null)
// With `exports: false` skips subtracting route exports (used by routeFlow to see available supply).
// `depth` caps recursion across chained zones. `memo` (a Map) caches analyses and flows already
// computed for this state: analyzing a routed zone inspects neighbors, and Pueblo's recommendation
// checks five zones for every trial upgrade.
export function analyzeChain(state, zoneId = 'finca', { exports: withExports = true, depth = 0, memo = null } = {}) {
  const key = `${zoneId}|${withExports}|${depth}`;
  if (memo?.has(key)) return memo.get(key);
  const result = analyze(state, zoneId, withExports, depth, memo);
  memo?.set(key, result);
  return result;
}

function analyze(state, zoneId, withExports, depth, memo) {
  const routes = depth < MAX_ROUTE_DEPTH;
  const ids = chainOf(zoneId).filter((id) => state.stations[id]);

  // Expected sale price: on Finca, includes compost bonus sustainable by Compostera.
  const compost = zoneId === 'finca' ? expectedCompostValue(state) : 1;
  const value = (pid) => productValue(state, pid) * (PRODUCTS[pid].zone === 'finca' ? compost : 1);

  let byRate = {}; // byproduct generated per station (per s), e.g. Molienda bagazo
  // Station cycles per second, including research and fuel.
  const cycleRate = (id) => {
    const def = STATIONS_BY_ID[id];
    let rate = stationRate(def, state.stations[id].level) * speedMult(state, id);
    if (def.fuel) {
      // Fuel speeds up ×boost while supply lasts: if source makes less, scaled proportionally.
      const demand = rate * def.fuel.boost * def.fuel.perCycle;
      const supply = byRate[def.fuel.from] ?? 0;
      rate *= 1 + (def.fuel.boost - 1) * Math.min(1, demand > 0 ? supply / demand : 0);
    }
    return rate;
  };
  // Units/s of an imported product reaching a station (its share of route throughput).
  // Throughput per route computed once per analysis (checking another zone costs a full zone pass).
  const routeFlows = memo ?? new Map();
  const flowOf = (routeId) => {
    const key = `flow|${routeId}|${depth + 1}`;
    if (!routeFlows.has(key)) routeFlows.set(key, routeFlow(state, routeId, depth + 1, memo));
    return routeFlows.get(key);
  };
  // On an event board there are no routes: external imports arrive per event rules.
  const importOf = (id, imp) =>
    state.event ? supplyFraction(state, imp.product) * cycleRate(id) * imp.perCycle : routes ? flowOf(imp.route) * routeShare(state, imp.route, id) : 0;
  // A combiner station (v4.0) runs at the pace of its tightest input. First pass assumes full
  // arrival; second pass caps each input at what it can actually consume (`limit`), except
  // the limiting one: surplus from one supplier goes to siblings or to warehouse.
  let limit = {};
  // Units of `product` (primary input unless specified) processable per second (capped by
  // imports if missing).
  const capacityOf = (id, product) => {
    const def = STATIONS_BY_ID[id];
    product ??= Object.keys(def.in)[0];
    let cycles = cycleRate(id);
    for (const imp of def.imports ?? []) cycles = Math.min(cycles, importOf(id, imp) / imp.perCycle);
    const l = limit[id];
    if (l && l.binding !== product) cycles = Math.min(cycles, l.cycles);
    return cycles * perCycleOf(id, product);
  };

  const pass = () => {
    const rows = [];
    let toWarehouse = 0;
    const flows = []; // { product, units, value, leaf } arriving at warehouse
    const allocated = {}; // what each station receives from its supplier (per s)
    const joinedIn = {}; // what each combiner receives per product (per s)
    const exported = {}; // intermediate product reserved for routes (per s), routed to warehouse unsold
    byRate = {};
    // Outbound volume from this zone via routes (units/s per product): skips Willys.
    const exports = {};
    if (withExports && routes) {
      for (const r of ROUTES) if (r.from === zoneId) exports[r.product] = (exports[r.product] ?? 0) + flowOf(r.id);
    }

    for (const id of ids) {
      const def = STATIONS_BY_ID[id];
      const outId = Object.keys(def.out)[0];
      const outAmt = def.out[outId];
      const rate = cycleRate(id);
      const incoming = def.in ? allocated[id] ?? 0 : null;
      let capacity;
      let cycles;
      let joinLimited = null;
      if (def.in) {
        const need = Object.values(def.in)[0];
        capacity = capacityOf(id);
        cycles = Math.min(incoming, capacity) / need;
        // Combined input (v4.0): each product sustains so many cycles; tightest one bottlenecks.
        for (const j of def.joins ?? []) {
          const n = (joinedIn[id]?.[j.product] ?? 0) / j.perCycle;
          if (n < cycles * (1 - LOSS)) joinLimited = j.product;
          cycles = Math.min(cycles, n);
        }
      } else {
        // Source: unlimited, or (in Pueblo) limited by arriving imports.
        cycles = rate;
        for (const imp of def.imports ?? []) cycles = Math.min(cycles, importOf(id, imp) / imp.perCycle);
        capacity = cycles * outAmt;
      }
      const output = cycles * outAmt;
      if (def.by) byRate[id] = cycles * Object.values(def.by)[0];

      const children = consumers(state, id);
      // Routes carrying an intermediate product count as an extra branch (see transport.exportsOf).
      const exportsHere = routes ? exportsOf(state, id) : [];
      const transport = teamCapacity(state, id);
      const row = { id, incoming, capacity, output, transport, children, exports: exportsHere.map((r) => r.id), next: children[0] ?? null, toNext: 0, diverted: 0, lost: 0, cycles };
      if (def.joins) {
        row.joined = Object.fromEntries(def.joins.map((j) => [j.product, joinedIn[id]?.[j.product] ?? 0]));
        row.joinLimited = joinLimited;
      }
      if (def.imports) {
        row.imported = {};
        row.importLimited = null;
        // Tightest bottleneck is the import arriving at the lowest fraction of station need.
        let tightest = 1 - LOSS;
        for (const imp of def.imports) {
          row.imported[imp.product] = importOf(id, imp);
          const ratio = row.imported[imp.product] / (rate * imp.perCycle);
          // On an event board there are no routes to upgrade: external supply can't be leveled up.
          if (ratio < tightest && !state.event) {
            tightest = ratio;
            row.importLimited = imp.route;
          }
        }
      }
      // Byproduct (v4.0): flows via chute. First what its routes demand; next zone stations using
      // it, proportional to each station's capacity; surplus sells if routed (open or not), otherwise
      // discarded.
      const byKids = (BY_CHILDREN[id] ?? []).filter((c) => ids.includes(c));
      const byRoutes = BY_ROUTES[id] ?? [];
      if (def.by && (byKids.length || byRoutes.length)) {
        const byId = Object.keys(def.by)[0];
        const open = routes ? byRoutes.filter((r) => routeActive(state, r.id)) : [];
        const toRoutes = Math.min(byRate[id], open.reduce((n, r) => n + Math.min(routeDemandRate(state, r.id), routeRate(state, r.id)), 0));
        if (toRoutes > 0) exported[byId] = (exported[byId] ?? 0) + toRoutes;
        const caps = byKids.map((c) => capacityOf(c, byId));
        const total = caps.reduce((a, b) => a + b, 0);
        const used = Math.min(byRate[id] - toRoutes, total);
        byKids.forEach((c, k) => {
          const units = total > 0 ? (used * caps[k]) / total : 0;
          if (joinOf(c, byId)) (joinedIn[c] ??= {})[byId] = units;
          else allocated[c] = units;
        });
        const left = byRate[id] - toRoutes - used;
        row.byOutput = byRate[id];
        row.byLost = byRoutes.length ? 0 : left;
        row.bySold = byRoutes.length ? left : 0;
        if (row.bySold > 0) {
          toWarehouse += left;
          // Anything carried by a route (plus its warehouse reserve) is not sold locally.
          let units = left;
          if (exports[byId] && exported[byId]) exports[byId] = Math.max(0, exports[byId] - exported[byId]);
          if (exports[byId]) {
            const out = Math.min(units, exports[byId]);
            units -= out;
            exports[byId] -= out;
          }
          flows.push({ product: byId, units, value: value(byId), leaf: false });
        }
      }

      if (children.length) {
        const caps = children.map((c) => capacityOf(c, outId));
        const exportCaps = exportsHere.map((r) => Math.min(routeDemandRate(state, r.id), routeRate(state, r.id)));
        // Share of an unopened route (v3.67) doesn't go to branches: sold meanwhile. So over-leveling
        // one branch won't look artificially profitable (Cajonera used to steal Ruta del bocadillo's
        // share before Hato opened).
        const reserved = routes && pendingRoutes(state, id).length ? output * Math.max(0, 1 - children.reduce((n, c) => n + branchShare(id, c), 0)) : 0;
        const childLimit = Math.min(caps.reduce((a, b) => a + b, 0), output - reserved);
        row.reserved = reserved;
        const nextCapacity = childLimit + exportCaps.reduce((a, b) => a + b, 0);
        row.toNext = Math.min(output, transport, nextCapacity);
        // Routes first (v3.67): their demand already counts in destination zone, and station reserves
        // their share in warehouse. Rest goes to branches proportional to capacity (mules aim for
        // emptiest input). Previously all split proportionally, so leveling local Cajonera seemed
        // extra profitable by starving the route.
        const exportCap = exportCaps.reduce((a, b) => a + b, 0);
        const toExports = Math.min(row.toNext, exportCap);
        const childCap = caps.reduce((a, b) => a + b, 0);
        const toChildren = Math.min(row.toNext - toExports, childLimit);
        children.forEach((c, k) => {
          const units = childCap > 0 ? (toChildren * caps[k]) / childCap : 0;
          // For combiners, secondary input tracks separately from primary input.
          if (joinOf(c, outId)) (joinedIn[c] ??= {})[outId] = units;
          else allocated[c] = units;
        });
        exportsHere.forEach((r, k) => {
          const units = exportCap > 0 ? (toExports * exportCaps[k]) / exportCap : 0;
          exported[r.product] = (exported[r.product] ?? 0) + units;
        });
        const left = output - row.toNext;
        // Remaining haulers carry the rest to the warehouse (longer trip).
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
      // Route cargo draws first from station's reserved stock; remainder from diverted goods.
      if (exports[outId] && exported[outId]) exports[outId] = Math.max(0, exports[outId] - exported[outId]);
      if (exports[outId]) {
        const out = Math.min(units, exports[outId]);
        units -= out;
        exports[outId] -= out;
      }
      flows.push({ product: outId, units, value: value(outId), leaf: !children.length });
      rows.push(row);
    }
    return { rows, toWarehouse, flows, exported };
  };

  let { rows, toWarehouse, flows, exported } = pass();
  const joiners = rows.filter((r) => r.joined);
  if (joiners.length) {
    limit = Object.fromEntries(joiners.map((r) => [r.id, { cycles: r.cycles, binding: r.joinLimited ?? Object.keys(STATIONS_BY_ID[r.id].in)[0] }]));
    ({ rows, toWarehouse, flows, exported } = pass());
  }

  const dispatch = dispatchRate(state.zones[zoneId].dispatch.level, dispatchMult(state, zoneId)) * jeepCount(state);
  // Willys loads highest-value goods first: if behind, cheap items stay behind.
  // Main-chain income: only output leaving end of each branch (excluding emergency diversions).
  // Used by the recommended upgrade solver.
  let room = dispatch;
  let mainRoom = dispatch;
  let income = 0;
  let mainIncome = 0;
  // What Willys sells of each product and what goes unsold (v4.1.1: income breakdown panel).
  const sold = {};
  for (const f of flows.sort((a, b) => b.value - a.value)) {
    const units = Math.min(f.units, room);
    income += units * f.value;
    room -= units;
    const line = (sold[f.product] ??= { product: f.product, units: 0, unsold: 0, value: f.value });
    line.units += units;
    line.unsold += f.units - units;
    if (f.leaf) {
      const main = Math.min(f.units, mainRoom);
      mainIncome += main * f.value;
      mainRoom -= main;
    }
  }

  // Bottleneck is the first chain link where not all produced output leaves:
  // either downstream stations can't process it, or haulers can't carry it.
  // First, a station whose yard fills because haulers lag behind: blocks everything upstream.
  let bottleneck = null;
  const jammed = rows.find((r) => r.lost > r.output * LOSS && r.transport < r.output * (1 - LOSS));
  if (jammed) bottleneck = `${jammed.id}:transport`;
  for (const row of bottleneck ? [] : rows) {
    // (Share awaiting an unopened route is not a shortfall: sold in the meantime.)
    const shortfall = row.children.length ? row.output - row.toNext - (row.reserved ?? 0) : row.lost;
    // Byproduct discarded because consumers can't keep up (v4.0): lagging consumer.
    if (shortfall <= row.output * LOSS && row.byLost > row.byOutput * LOSS) {
      const kids = BY_CHILDREN[row.id].filter((c) => state.stations[c]);
      bottleneck = kids.reduce((low, c) => (state.stations[c].level < state.stations[low].level ? c : low));
      break;
    }
    if (shortfall <= row.output * LOSS) continue;
    bottleneck = row.children.length && row.nextCapacity <= row.transport ? slowestConsumer(state, row.children, rows) : `${row.id}:transport`;
    break;
  }
  if (!bottleneck) {
    // Station waiting on import: route can't keep up.
    const starved = rows.find((r) => r.importLimited && r.incoming > r.capacity * (1 + LOSS));
    if (starved) bottleneck = `route:${starved.importLimited}`;
  }
  // Otherwise source; in Bogotá (v4.5), first built station if source isn't built (neighborhood board).
  if (!bottleneck) bottleneck = toWarehouse > dispatch * (1 + LOSS) ? `dispatch:${zoneId}` : state.stations[sourceOf(zoneId)] ? sourceOf(zoneId) : ids[0];
  // Already at level 100 can't be upgraded: not highlighted (if all maxed, null).
  if (upgradeLevel(state, bottleneck) >= maxLevel(state)) bottleneck = null;
  // In network (v4.6, Bogotá) mid-network surplus is part of the chain too: many stations sell part of
  // their output while downstream doesn't take it all yet, and raising one branch takes several buys to reach the end.
  // Counting only the final end caused recommendation to pick buys adding zero.
  if (ZONES_BY_ID[zoneId]?.network) mainIncome = income;
  return { rows, toWarehouse, dispatch, bottleneck, income, mainIncome, exported, sold: Object.values(sold) };
}

// Level of target referenced by upgrade id ('farm', 'farm:transport', 'dispatch:<zone>', 'route:<route>').
export function upgradeLevel(state, id) {
  const [sid, part] = id.split(':');
  if (sid === 'dispatch') return state.zones[part].dispatch.level;
  if (sid === 'route') return state.routes[part].level;
  const st = state.stations[sid];
  if (!st) return 0; // not yet built (closed zone)
  return part === 'transport' ? st.transport.level : st.level;
}

// Among stations fed by a branch, tightest bottleneck: if import-starved, its route;
// otherwise lowest-level station.
function slowestConsumer(state, children, rows) {
  for (const c of children) {
    const row = rows.find((r) => r.id === c);
    // If waiting on combined input (v4.0), upgrade the station making it.
    if (row?.joinLimited) return JOIN_FROM[c][row.joinLimited];
    const route = row?.importLimited;
    if (route && routeRate(state, route) < routeFlow(state, route) * (1 + LOSS) + 1e-9) return `route:${route}`;
  }
  return children.reduce((low, c) => (state.stations[c].level < state.stations[low].level ? c : low));
}

// Demand by a route's stations at full speed (u/s) and per station.
const routeDemandRate = (state, routeId) =>
  routeStations(state, routeId).reduce((n, id) => n + stationImportRate(state, ROUTES_BY_ID[routeId], id), 0);
export function routeShare(state, routeId, id) {
  const total = routeDemandRate(state, routeId);
  return total > 0 ? stationImportRate(state, ROUTES_BY_ID[routeId], id) / total : 0;
}

// Units/s moved by a route: what target stations consume at full speed, capped by vehicle capacity
// and source warehouse arrivals. If multiple routes draw the same product from the same zone
// (Trapiche panela to Lechería and Cacaotal), split proportional to demand.
export function routeFlow(state, routeId, depth = 0, memo = null) {
  if (!routeActive(state, routeId)) return 0;
  const r = ROUTES_BY_ID[routeId];
  const want = (id) => (routeActive(state, id) ? Math.min(routeDemandRate(state, id), routeRate(state, id)) : 0);
  const own = want(routeId);
  if (r.unlimited) return own; // tractomula depends on no warehouse (v4.5)
  const siblings = ROUTES.filter((x) => x.from === r.from && x.product === r.product).reduce((n, x) => n + want(x.id), 0);
  const source = analyzeChain(state, r.from, { exports: false, depth, memo });
  let supply = (source.exported[r.product] ?? 0) + source.rows.filter((row) => Object.keys(STATIONS_BY_ID[row.id].out)[0] === r.product).reduce((n, row) => n + row.diverted, 0);
  // Plus byproduct arriving at warehouse via chute (v4.0).
  supply += source.rows.filter((row) => Object.keys(STATIONS_BY_ID[row.id].by ?? {})[0] === r.product).reduce((n, row) => n + (row.bySold ?? 0), 0);
  // If target warehouse receives more than Willys and outbound routes take, it fills and the
  // whole zone stalls, including incoming route deliveries (surplus milk in Lechería starved
  // Maizal of cheese). Scale back proportionally.
  const inflow = source.toWarehouse + Object.values(source.exported).reduce((a, b) => a + b, 0);
  const outflow = source.dispatch + ROUTES.filter((x) => x.from === r.from).reduce((n, x) => n + want(x.id), 0);
  if (inflow > outflow) supply *= outflow / inflow;
  return Math.min(own, siblings > 0 ? (supply * own) / siblings : 0);
}

// Effective sale bonus Compostera can sustain: 1 with no compost, 1.3 if enough for all
// Beneficiadero coffee (if short, bonus stays active only part of the time).
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

// Recommended upgrade: highest 💰/s gain per coin spent at chain end (excluding bypassed sales),
// across stations, haulers, and dispatch.
// If no single upgrade gains enough (several needed together), recommends bottleneck.
// Returns { id, cost, gain }, or null if nothing left to upgrade. (`quote` is Game.quote to share pricing.)
const MIN_GAIN = 0.01; // minimum gain, as fraction of current income
// Haulers, routes, and Compostera: add little per single level, tested in steps of 10.
const isGradual = (id) => STATIONS_BY_ID[id]?.side || id.endsWith(':transport') || id.startsWith('route:');

// Source-zone stations leading to route `r`'s product: maker plus all upstream ones
// (e.g. for arequipe: Potrero, Pasteurizadora, and Paila).
function supplyPath(state, r) {
  const path = [];
  for (const id of chainOf(r.from)) {
    const def = STATIONS_BY_ID[id];
    if (!state.stations[id] || (Object.keys(def.out)[0] !== r.product && Object.keys(def.by ?? {})[0] !== r.product)) continue;
    const walk = (at) => {
      if (!at || path.includes(at)) return;
      path.push(at);
      walk(PARENT[at]);
      for (const from of Object.values(JOIN_FROM[at] ?? {})) walk(from); // combined inputs (v4.0)
    };
    walk(id);
  }
  return path;
}

// Cache for analyzing trial states: copies from current state what the trial cannot touch.
//   touched.zones   zones where something was upgraded (station, haulers, or dispatch)
//   touched.demand  routes whose demand changed (route or supplied station upgraded)
//   touched.all     global modifier changed: nothing can be reused
// Those zones, origin zones of changed routes (send different volume), and recursively any
// zone importing from a changed zone are recomputed. Flow changes if origin or demand changes.
export function reusable(baseMemo, touched) {
  if (touched.all) return new Map(); // something affecting all zones (faster mules from Cable aéreo)
  const dirty = new Set(touched.zones);
  for (const id of touched.demand) {
    if (ROUTES_BY_ID[id].from) dirty.add(ROUTES_BY_ID[id].from); // tractomulas have none (v4.5)
    dirty.add(ROUTES_BY_ID[id].to);
  }
  for (let grew = true; grew; ) {
    grew = false;
    for (const r of ROUTES) {
      if (dirty.has(r.from) && !dirty.has(r.to)) {
        dirty.add(r.to);
        grew = true;
      }
    }
  }
  const memo = new Map();
  for (const [key, value] of baseMemo) {
    const [a, b] = key.split('|');
    const stale = a === 'flow' ? dirty.has(ROUTES_BY_ID[b].from) || touched.demand.has(b) : dirty.has(a);
    if (!stale) memo.set(key, value);
  }
  return memo;
}

export function recommendUpgrade(state, quote, zoneId = 'finca') {
  const baseMemo = new Map();
  const analysis = analyzeChain(state, zoneId, { memo: baseMemo });
  // Zones feeding this one via routes: their income counts (route cargo stops being sold
  // there) and, if route doesn't supply full station demand, try upgrading them (if Paila
  // awaits panela, bottleneck may be Trapiche's Pulverizadora).
  const incoming = ROUTES.filter((r) => r.to === zoneId && routeActive(state, r.id));
  const zones = [zoneId, ...new Set(incoming.filter((r) => !r.unlimited).map((r) => r.from))];
  const short = (r) => routeFlow(state, r.id, 1, baseMemo) < routeDemandRate(state, r.id) * (1 - LOSS);
  // Upstream, test what limits route output along stations leading to that product
  // (for arequipe: Potrero, Pasteurizadora, and Paila): its bottleneck, lowest station,
  // and lowest haulers. Testing all of them was slow with five supplier zones.
  const feeders = new Set();
  for (const r of incoming.filter(short)) {
    if (r.unlimited) continue; // tractomula has no origin zone to upgrade (v4.5)
    const path = supplyPath(state, r);
    if (!path.length) continue;
    const lowest = (key) => path.map(key).reduce((low, id) => (upgradeLevel(state, id) < upgradeLevel(state, low) ? id : low));
    feeders.add(lowest((id) => id));
    feeders.add(lowest((id) => `${id}:transport`));
    const neck = analyzeChain(state, r.from, { memo: baseMemo }).bottleneck;
    if (neck && path.includes(neck.split(':')[0])) feeders.add(neck);
  }
  // What truly limits an import, walking upstream zone chain (see «Nothing adds», below).
  const chase = (r, hops) => {
    if (routeRate(state, r.id) < routeDemandRate(state, r.id) * (1 - LOSS) && !quote(`route:${r.id}`, 1).maxed) return `route:${r.id}`;
    if (r.unlimited) return null;
    const path = supplyPath(state, r);
    if (hops < MAX_ROUTE_DEPTH) {
      for (const row of analyzeChain(state, r.from, { memo: baseMemo }).rows) {
        const deeper = path.includes(row.id) && ROUTES_BY_ID[row.importLimited] ? chase(ROUTES_BY_ID[row.importLimited], hops + 1) : null;
        if (deeper) return deeper;
      }
    }
    // If supplier warehouse lags, surplus fills it and route cargo cannot unload:
    // its dispatch counts too.
    const there = analyzeChain(state, r.from, { memo: baseMemo });
    const jammed = there.toWarehouse > there.dispatch * (1 + LOSS) ? [`dispatch:${r.from}`] : [];
    const choices = [...path.flatMap((id) => [id, `${id}:transport`]), ...jammed].filter((id) => !quote(id, 1).maxed);
    return choices.length ? choices.reduce((low, x) => (upgradeLevel(state, x) < upgradeLevel(state, low) ? x : low)) : null;
  };
  // Test upgrading that supplier dispatch too: when its warehouse is full (surplus fails to
  // sell), upgrading dispatch frees room for route cargo.
  for (const r of incoming.filter(short)) {
    const id = chase(r, 1);
    if (id) feeders.add(id);
  }
  // Each trial state analyzes with its own memo, shared across summed zones. Knowing what
  // changed (`touched`), untouched entries copy from baseline state's analysis.
  const score = (st, touched = null) => {
    const memo = st === state ? baseMemo : touched ? reusable(baseMemo, touched) : new Map();
    return zones.reduce((n, z) => n + analyzeChain(st, z, { memo }).mainIncome, 0);
  };
  const base = score(state);
  // Minimum gain: fraction of this zone's income (suppliers' excluded: in Pueblo, looking at
  // five zones, almost no single upgrade reached 1 % of total).
  const minGain = Math.max(analysis.mainIncome, 1e-9) * MIN_GAIN;
  const options = [];
  const ids = [`dispatch:${zoneId}`];
  for (const id of Object.keys(state.stations)) {
    if (zoneOf(id) !== zoneId) continue;
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  ids.push(...feeders);
  for (const r of ROUTES) if (r.to === zoneId && routeActive(state, r.id)) ids.push(`route:${r.id}`);
  // On an event board, only upgrades leading to its goal (see objectiveUpgrades).
  if (state.event) {
    const allowed = new Set(objectiveUpgrades(state));
    ids.splice(0, ids.length, ...ids.filter((id) => allowed.has(id)));
  }
  // Gain from simultaneously buying `count` levels of each item in `list` (or null if invalid).
  // Each element is an id or [id, levels] pair to upgrade some more than others.
  const trialGain = (list, count) => {
    const trial = { ...state, stations: { ...state.stations }, zones: { ...state.zones }, routes: { ...state.routes } };
    const touched = { zones: new Set(), demand: new Set() };
    let cost = 0;
    for (const item of list) {
      const [id, n] = Array.isArray(item) ? item : [item, count];
      const q = quote(id, n);
      if (q.maxed || q.locked || q.levels === 0) return null;
      cost += q.cost;
      const levels = q.levels ?? 1;
      if (id.startsWith('dispatch')) {
        // This zone's dispatch or, if chasing a bottlenecked import, its supplier zone's dispatch.
        const zid = id.split(':')[1];
        const zone = trial.zones[zid];
        trial.zones[zid] = { ...zone, dispatch: { level: zone.dispatch.level + levels } };
        touched.zones.add(zid);
      } else if (id.startsWith('route:')) {
        const rid = id.split(':')[1];
        trial.routes[rid] = { ...trial.routes[rid], level: trial.routes[rid].level + levels };
        touched.demand.add(rid);
      } else {
        const [sid, part] = id.split(':');
        const st = { ...trial.stations[sid], transport: { ...trial.stations[sid].transport } };
        (part ? st.transport : st).level += levels;
        trial.stations[sid] = st;
        touched.zones.add(zoneOf(sid));
        // Faster station demands more along its routes.
        if (!part) for (const r of ROUTES) if (r.stations.includes(sid)) touched.demand.add(r.id);
      }
    }
    const first = list[0];
    return { id: Array.isArray(first) ? first[0] : first, cost, gain: score(trial, touched) - base };
  };
  for (const id of ids) {
    // Haulers, routes, and Compostera gain tiny steps per level (far-behind haulers, partial
    // compost uptime): if one level falls below minimum, test steps of 10.
    // (Testing stations by 10 too made solver suggest huge less cost-effective batches.)
    let option = STATIONS_BY_ID[id]?.side ? null : trialGain([id], 1);
    if (isGradual(id) && (!option || option.gain < minGain)) option = trialGain([id], 10) ?? option;
    if (option) options.push(option);
  }
  // In network (v4.6, Bogotá) a whole branch can stall: every station waits on upstream
  // suppliers and two tractomulas at once, so buying one piece adds nothing. Also test leveling
  // a station together with everything feeding it (stations, haulers, tractomulas up to its
  // level) and recommend the lowest piece in that group.
  if (ZONES_BY_ID[zoneId]?.network && !state.event) {
    // Only from each branch's leaf (unfed by any built station): its group already pulls upstream.
    const built = Object.keys(state.stations).filter((id) => zoneOf(id) === zoneId && !STATIONS_BY_ID[id].side);
    const fed = new Set(built.flatMap((id) => suppliersOf(id)));
    for (const id of built) {
      if (fed.has(id)) continue;
      const branch = new Set([id]);
      for (const x of branch) for (const sup of suppliersOf(x)) if (state.stations[sup]) branch.add(sup);
      const items = [...branch].flatMap((x) => [x, `${x}:transport`, ...(STATIONS_BY_ID[x].imports ?? []).filter((imp) => routeActive(state, imp.route)).map((imp) => `route:${imp.route}`)]);
      const trial = (step) => {
        const target = state.stations[id].level + step;
        const group = items.map((x) => [x, target - upgradeLevel(state, x)]).filter(([, n]) => n > 0);
        return group.length < 2 ? null : { group, o: trialGain(group, 1) };
      };
      let t = trial(1);
      if (t && !(t.o?.gain >= minGain)) t = trial(10);
      if (!t?.o || !(t.o.gain >= minGain)) continue;
      const lowest = t.group.map(([g]) => g).reduce((low, g) => (upgradeLevel(state, g) < upgradeLevel(state, low) ? g : low));
      options.push({ ...t.o, id: lowest, group: true });
    }
  }
  const roi = (o) => o.gain / o.cost;
  let best = options.filter((o) => o.gain > 1e-9 && o.gain >= minGain).sort((a, b) => roi(b) - roi(a))[0];
  // On an event board (v3.8.2) there's no research (zone research can't be bought
  // there): recommend event purchases needed to win. Next affordable one right away (clears
  // penalty), and once medal is locked in, recommend even if not yet affordable: it's all that's left.
  // Research recommended only when already affordable and paying better than best level upgrade:
  if (state.event) {
    const action = EVENTS_BY_ID[state.event.id].actions.find((a) => !state.research.includes(a.id));
    if (action && (state.event.medal || canPay(state, action.cost))) return { id: `action:${action.id}`, cost: action.cost, gain: 0 };
  }
  // recommendation never leaves player saving up for something pricey. Also ×2 of
  // supplying zones: they unlock at level 25 and often arrive after moving to another zone.
  // (Wait: line 153 follows) changes zone and, if speeding an import station (or whole zone: Mastery/Supremacy),
  for (const r of state.event ? [] : RESEARCH) {
    const here = r.zone === zoneId || (r.stationLevel && zones.includes(r.zone));
    if (!here || state.research.includes(r.id) || !canPay(state, r.cost)) continue;
    if (researchLocked(state, r)) continue;
    // wait — let's keep exact mapping for 151-155:
    // what its routes request.
    const zoneWide = r.effect.type === 'zoneSpeed';
    const touched = { zones: new Set([r.zone]), demand: new Set(ROUTES.filter((x) => x.stations.includes(r.effect.target) || (zoneWide && x.to === r.effect.target)).map((x) => x.id)), all: !r.effect.target };
    const gain = score({ ...state, research: [...state.research, r.id] }, touched) - base;
    const option = { id: `research:${r.id}`, cost: r.cost, gain };
    if (gain > 1e-9 && (!best || roi(option) > roi(best))) best = option;
  }
  // (From a group, recommends one item: cost is that single item's price.)
  if (best?.group) return { id: best.id, cost: quote(best.id, 1).cost, gain: best.gain };
  if (best) return best;
  // No single item gains: two pieces may bottleneck each other (route and supplier haulers).
  // Try pairs in steps of 10 levels, and recommend first item of best pair.
  const gradual = ids.filter(isGradual);
  let pair = null;
  for (let i = 0; i < gradual.length; i++) {
    for (let j = i + 1; j < gradual.length; j++) {
      const o = trialGain([gradual[i], gradual[j]], 10);
      if (o && o.gain >= minGain && (!pair || roi(o) > roi(pair))) pair = o;
    }
  }
  // A station may be simultaneously limited by level, haulers, and routes (Puesto de arepas
  // waits on cheese and butter; freshly built Despacho lacks capacity for its output):
  // try leveling it together with dependencies. Recommends lowest piece in group to buy first.
  // Must buy lowest item in group first.
  for (const id of ids) {
    const def = STATIONS_BY_ID[id];
    if (!def || def.side) continue;
    // (v4.5) Also supplier haulers: in Bogotá each station waits on previous station and two
    // tractomulas at once; raising only tractomulas still leaves upstream output waiting.
    const feeding = Object.keys(def.in ?? {}).flatMap((p) => Object.keys(state.stations).filter((s) => zoneOf(s) === zoneId && !STATIONS_BY_ID[s].side && Object.keys(STATIONS_BY_ID[s].out)[0] === p));
    const behind = [`${id}:transport`, ...feeding.map((s) => `${s}:transport`), ...(def.imports ?? []).filter((imp) => routeActive(state, imp.route)).map((imp) => `route:${imp.route}`)];
    const trial = (step) => {
      const target = state.stations[id].level + step;
      const group = [[id, step], ...behind.map((b) => [b, target - upgradeLevel(state, b)]).filter(([, n]) => n > 0)];
      return group.length < 2 ? null : { group, o: trialGain(group, 1) };
    };
    let t = trial(1);
    if (t && !(t.o?.gain >= minGain)) t = trial(10);
    if (!t?.o || t.o.gain < minGain) continue;
    const { group, o } = t;
    const lowest = group.map(([g]) => g).reduce((low, g) => (upgradeLevel(state, g) < upgradeLevel(state, low) ? g : low));
    if (!pair || roi(o) > roi(pair)) pair = { ...o, id: lowest };
  }
  if (pair) return { ...pair, cost: quote(pair.id, 1).cost };
  // Nothing gains alone: recommend bottleneck. If waiting on an import, leveling it won't help:
  // upgrade route or origin zone sending it (as its panel says: «upgrade upstream chain»).
  // Route if lagging, otherwise lowest item on upstream path producing it; if origin awaits
  // an import too (Maizal arepas wait on Lechería cheese), keep walking upstream. Raises
  // supplier chain step by step even before immediate profit shows.
  // supplier chain step by step even before immediate profit shows.
  const neck = analysis.bottleneck;
  const neckRow = neck && analysis.rows.find((r) => r.id === neck.split(':')[0]);
  const waiting = neck?.startsWith('route:') ? ROUTES_BY_ID[neck.split(':')[1]] : ROUTES_BY_ID[neckRow?.importLimited];
  let elsewhere = waiting ? chase(waiting, 1) : null;
  // With no local shortage (bottleneck is source), in Pueblo chase first missing import:
  // there the source itself depends on another zone.
  if (!elsewhere && neck === sourceOf(zoneId) && !STATIONS_BY_ID[neck].infinite) {
    for (const row of analysis.rows) if (!elsewhere && ROUTES_BY_ID[row.importLimited]) elsewhere = chase(ROUTES_BY_ID[row.importLimited], 1);
  }
  if (elsewhere) return { id: elsewhere, cost: quote(elsewhere, 1).cost, gain: 0 };
  // With no improvable bottleneck (all maxed): no recommendation.
  if (!neck) return null;
  return { id: neck, cost: quote(neck, 1).cost, gain: 0 };
}

// Remaining non-maxed target in zone when no upgrade adds income (v3.54): lowest-level station,
// haulers, dispatch, or route not yet at cap. Keeps «zone maxed» from appearing prematurely
// when remaining pieces already cover flow (dispatch at 92 keeping up) or are side branches.
// On an event board, only items on goal path.
export function pendingUpgrade(state, quote, zoneId) {
  const ids = [`dispatch:${zoneId}`];
  for (const id of Object.keys(state.stations)) {
    if (zoneOf(id) !== zoneId) continue;
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  for (const r of ROUTES) if (r.to === zoneId && routeActive(state, r.id)) ids.push(`route:${r.id}`);
  const allowed = state.event ? new Set(objectiveUpgrades(state)) : null;
  const open = ids.filter((id) => (!allowed || allowed.has(id)) && !quote(id, 1).maxed && !quote(id, 1).locked);
  if (!open.length) return null;
  const id = open.reduce((low, x) => (upgradeLevel(state, x) < upgradeLevel(state, low) ? x : low));
  return { id, cost: quote(id, 1).cost, gain: 0, pending: true };
}
