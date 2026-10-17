// Flujo teórico de la cadena para mostrar el cuello de botella (no afecta a la simulación).
import { STATIONS_BY_ID } from '../data/stations.js';
import { RESEARCH } from '../data/research.js';
import { dispatchRate, stationRate } from './rules.js';
import { chainOf, sourceOf, zoneOf } from './chain.js';
import { teamCapacity } from './transport.js';
import { COMPOST_VALUE, WASHED_PER_COMPOST, dispatchMult, productValue, speedMult } from './modifiers.js';
import { PRODUCTS } from '../data/products.js';

const LOSS = 0.02; // por debajo del 2 % no se considera cuello de botella

// Por estación (unidades/s):
//   incoming   lo que le llega        capacity  lo que puede procesar (en unidades de entrada)
//   output     lo que produce         toNext    lo que sus arrieros llevan a la siguiente
//   diverted   lo que se desvía a la bodega     lost  lo que no alcanza a salir (el patio se llena)
//   transport  capacidad de sus arrieros hacia la siguiente estación (o la bodega)
// cause: qué limita a esta estación ('station' | 'transport' | null)
export function analyzeChain(state, zoneId = 'finca') {
  const ids = chainOf(zoneId).filter((id) => state.stations[id]);
  const rows = [];
  let incoming = 0;
  let toWarehouse = 0;
  const flows = []; // { units, value } que llegan a la bodega
  const byRate = {}; // subproducto que genera cada estación (por s), p. ej. bagazo de la Molienda

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

  ids.forEach((id, i) => {
    const st = state.stations[id];
    const def = STATIONS_BY_ID[id];
    const outId = Object.keys(def.out)[0];
    const outAmt = def.out[outId];
    const rate = cycleRate(id);
    let capacity;
    let output;
    let cycles;
    if (def.in) {
      const need = Object.values(def.in)[0];
      capacity = rate * need;
      cycles = Math.min(incoming, capacity) / need;
    } else {
      capacity = rate * outAmt;
      cycles = rate;
    }
    output = cycles * outAmt;
    if (def.by) byRate[id] = cycles * Object.values(def.by)[0];

    const next = ids[i + 1] ?? null;
    const dest = next ?? 'warehouse';
    const transport = teamCapacity(state, id, dest);
    const row = { id, incoming: def.in ? incoming : null, capacity, output, transport, next, toNext: 0, diverted: 0, lost: 0 };

    if (next) {
      const nextDef = STATIONS_BY_ID[next];
      const nextCapacity = cycleRate(next) * Object.values(nextDef.in)[0];
      row.toNext = Math.min(output, transport, nextCapacity);
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
    flows.push({ units: row.diverted, value: value(outId) });
    rows.push(row);
    incoming = row.toNext;
  });

  const dispatch = dispatchRate(state.zones[zoneId].dispatch.level, dispatchMult(state, zoneId));
  // Ingreso de la cadena principal: solo lo que sale de la última estación (sin los desvíos, que son
  // un recurso de emergencia). Es lo que mide la mejora recomendada.
  const last = rows.at(-1);
  const lastValue = last ? value(Object.keys(STATIONS_BY_ID[last.id].out)[0]) : 0;
  const mainIncome = last ? Math.min(last.diverted, dispatch) * lastValue : 0;

  // El Willys carga primero lo más valioso: si no da abasto, lo que se queda es lo barato.
  let room = dispatch;
  let income = 0;
  for (const f of flows.sort((a, b) => b.value - a.value)) {
    const units = Math.min(f.units, room);
    income += units * f.value;
    room -= units;
  }

  // El cuello de botella es el primer punto de la cadena donde no sale todo lo producido:
  // o la siguiente estación no lo procesa, o los arrieros no alcanzan a llevarlo.
  let bottleneck = null;
  for (const row of rows) {
    const shortfall = row.next ? row.output - row.toNext : row.lost;
    if (shortfall <= row.output * LOSS) continue;
    bottleneck = row.next && row.nextCapacity <= row.transport ? row.next : `${row.id}:transport`;
    break;
  }
  if (!bottleneck) bottleneck = toWarehouse > dispatch * (1 + LOSS) ? `dispatch:${zoneId}` : sourceOf(zoneId);
  return { rows, toWarehouse, dispatch, bottleneck, income, mainIncome };
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
// cuello de botella. Devuelve { id, cost, gain }. (`quote` es Game.quote, para no duplicar precios.)
const MIN_GAIN = 0.01; // ganancia mínima, como fracción del ingreso actual

export function recommendUpgrade(state, quote, zoneId = 'finca') {
  const analysis = analyzeChain(state, zoneId);
  const base = analysis.mainIncome;
  const options = [];
  const ids = [`dispatch:${zoneId}`];
  for (const id of Object.keys(state.stations)) {
    if (zoneOf(id) !== zoneId) continue;
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  for (const id of ids) {
    // La Compostera rinde poco nivel a nivel (cubre el bono poco a poco): se mide de 10 en 10.
    const step = STATIONS_BY_ID[id]?.side ? 10 : 1;
    const q = quote(id, step);
    if (q.maxed || q.levels === 0) continue;
    const levels = q.levels ?? 1;
    const trial = { ...state, stations: { ...state.stations } };
    if (id.startsWith('dispatch')) {
      const zone = state.zones[zoneId];
      trial.zones = { ...state.zones, [zoneId]: { ...zone, dispatch: { level: zone.dispatch.level + 1 } } };
    } else {
      const [sid, part] = id.split(':');
      const st = { ...state.stations[sid], transport: { ...state.stations[sid].transport } };
      (part ? st.transport : st).level += levels;
      trial.stations[sid] = st;
    }
    options.push({ id, cost: q.cost, gain: analyzeChain(trial, zoneId).mainIncome - base });
  }
  const roi = (o) => o.gain / o.cost;
  let best = options.filter((o) => o.gain > 1e-9 && o.gain >= base * MIN_GAIN).sort((a, b) => roi(b) - roi(a))[0];
  // Una investigación solo se recomienda si ya alcanza el dinero y rinde más que el mejor nivel:
  // así la recomendación nunca deja al jugador ahorrando para algo caro.
  for (const r of RESEARCH) {
    if (r.zone !== zoneId || state.research.includes(r.id) || r.cost > state.coins) continue;
    if (r.requires && !state.stations[r.requires]) continue;
    const gain = analyzeChain({ ...state, research: [...state.research, r.id] }, zoneId).mainIncome - base;
    const option = { id: `research:${r.id}`, cost: r.cost, gain };
    if (gain > 1e-9 && (!best || roi(option) > roi(best))) best = option;
  }
  if (best) return best;
  return { id: analysis.bottleneck, cost: quote(analysis.bottleneck, 1).cost, gain: 0 };
}
