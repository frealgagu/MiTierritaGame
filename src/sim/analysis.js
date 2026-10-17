// Flujo teórico de la cadena para mostrar el cuello de botella (no afecta a la simulación).
import { STATIONS_BY_ID } from '../data/stations.js';
import { dispatchRate, stationRate, transportCapacity } from './rules.js';
import { CHAIN } from './chain.js';
import { legTime } from './transport.js';
import { COMPOST_BOOST, CHERRIES_PER_COMPOST, dispatchMult, muleSpeedMult, productValue, speedMult } from './modifiers.js';

const LOSS = 0.02; // por debajo del 2 % no se considera cuello de botella

// Por estación (unidades/s):
//   incoming   lo que le llega        capacity  lo que puede procesar (en unidades de entrada)
//   output     lo que produce         toNext    lo que sus arrieros llevan a la siguiente
//   diverted   lo que se desvía a la bodega     lost  lo que no alcanza a salir (el patio se llena)
//   transport  capacidad de sus arrieros hacia la siguiente estación (o la bodega)
// cause: qué limita a esta estación ('station' | 'transport' | null)
export function analyzeChain(state) {
  const ids = CHAIN.filter((id) => state.stations[id]);
  const rows = [];
  let incoming = 0;
  let toWarehouse = 0;
  const flows = []; // { units, value } que llegan a la bodega

  const muleSpeed = muleSpeedMult(state);
  ids.forEach((id, i) => {
    const st = state.stations[id];
    const def = STATIONS_BY_ID[id];
    const outId = Object.keys(def.out)[0];
    const outAmt = def.out[outId];
    const rate = stationRate(def, st.level) * speedMult(state, id) * (id === 'farm' ? expectedCompostBoost(state) : 1);
    let capacity;
    let output;
    if (def.in) {
      const need = Object.values(def.in)[0];
      capacity = rate * need;
      output = (Math.min(incoming, capacity) / need) * outAmt;
    } else {
      capacity = rate * outAmt;
      output = capacity;
    }

    const next = ids[i + 1] ?? null;
    const dest = next ?? 'warehouse';
    const transport = transportCapacity(def, st.transport.level, 2 * legTime(id, dest, muleSpeed));
    const row = { id, incoming: def.in ? incoming : null, capacity, output, transport, next, toNext: 0, diverted: 0, lost: 0 };

    if (next) {
      const nextDef = STATIONS_BY_ID[next];
      const nextCapacity = stationRate(nextDef, state.stations[next].level) * speedMult(state, next) * Object.values(nextDef.in)[0];
      row.toNext = Math.min(output, transport, nextCapacity);
      const left = output - row.toNext;
      // Las mulas que sobran llevan el resto a la bodega (viaje más largo).
      const free = Math.max(0, 1 - row.toNext / transport);
      row.diverted = Math.min(left, free * transportCapacity(def, st.transport.level, 2 * legTime(id, 'warehouse', muleSpeed)));
      row.lost = left - row.diverted;
      row.nextCapacity = nextCapacity;
    } else {
      row.diverted = Math.min(output, transport);
      row.lost = output - row.diverted;
    }
    toWarehouse += row.diverted;
    flows.push({ units: row.diverted, value: productValue(state, outId) });
    rows.push(row);
    incoming = row.toNext;
  });

  const dispatch = dispatchRate(state.dispatch.level, dispatchMult(state));
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
  if (!bottleneck) bottleneck = toWarehouse > dispatch * (1 + LOSS) ? 'dispatch' : 'farm';
  return { rows, toWarehouse, dispatch, bottleneck, income };
}

// Aceleración del Cafetal que la Compostera puede sostener: 1 sin compost, 1,5 si alcanza para todo.
export function expectedCompostBoost(state) {
  const c = state.stations.composter;
  const w = state.stations.wetmill;
  if (!c || !w) return 1;
  const farmOut = stationRate(STATIONS_BY_ID.farm, state.stations.farm.level) * speedMult(state, 'farm');
  const demand = (farmOut * COMPOST_BOOST) / CHERRIES_PER_COMPOST; // compost/s
  const wetCycles = Math.min(stationRate(STATIONS_BY_ID.wetmill, w.level) * speedMult(state, 'wetmill'), (farmOut * COMPOST_BOOST) / 2);
  const pulpPerCompost = STATIONS_BY_ID.composter.in.pulp;
  const supply = Math.min(stationRate(STATIONS_BY_ID.composter, c.level) * speedMult(state, 'composter'), wetCycles / pulpPerCompost);
  return 1 + (COMPOST_BOOST - 1) * Math.min(1, supply / demand);
}

// Mejora recomendada: la que más 💰/s suma por moneda gastada, entre estaciones, arrieros y despacho.
// Si ninguna mejora suelta suma lo suficiente (hay que subir varias a la vez), recomienda el
// cuello de botella. Devuelve { id, cost, gain }. (`quote` es Game.quote, para no duplicar precios.)
const MIN_GAIN = 0.01; // ganancia mínima, como fracción del ingreso actual

export function recommendUpgrade(state, quote) {
  const analysis = analyzeChain(state);
  const base = analysis.income;
  const ids = ['dispatch'];
  for (const id of Object.keys(state.stations)) {
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  let best = null;
  for (const id of ids) {
    const q = quote(id, 1);
    if (q.maxed) continue;
    const trial = { ...state, dispatch: { ...state.dispatch }, stations: { ...state.stations } };
    if (id === 'dispatch') trial.dispatch.level++;
    else {
      const [sid, part] = id.split(':');
      const st = { ...state.stations[sid], transport: { ...state.stations[sid].transport } };
      (part ? st.transport : st).level++;
      trial.stations[sid] = st;
    }
    const gain = analyzeChain(trial).income - base;
    if (gain <= 1e-9) continue;
    if (!best || gain / q.cost > best.gain / best.cost) best = { id, cost: q.cost, gain };
  }
  if (best && best.gain >= base * MIN_GAIN) return best;
  return { id: analysis.bottleneck, cost: quote(analysis.bottleneck, 1).cost, gain: 0 };
}
