// Flujo teórico de la cadena para mostrar el cuello de botella (no afecta a la simulación).
import { STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { dispatchRate, stationRate } from './rules.js';
import { CHAIN } from './chain.js';

// Por estación: lo que le llega, lo que puede procesar y lo que se desvía (unidades/s).
export function analyzeChain(state) {
  const rows = [];
  let flow = 0;
  let toWarehouse = 0;
  let value = 0; // 💰/s de lo que llega a la bodega
  let flowProduct = null;
  for (const id of CHAIN) {
    const st = state.stations[id];
    if (!st) break;
    const def = STATIONS_BY_ID[id];
    const rate = stationRate(def, st.level);
    const outAmt = Object.values(def.out)[0];
    if (!def.in) {
      flow = rate * outAmt;
      flowProduct = Object.keys(def.out)[0];
      rows.push({ id, incoming: null, capacity: flow, processed: flow, diverted: 0, output: flow });
      continue;
    }
    const need = Object.values(def.in)[0];
    const capacity = rate * need;
    const processed = Math.min(flow, capacity);
    const diverted = flow - processed;
    toWarehouse += diverted;
    value += diverted * PRODUCTS[flowProduct].value;
    flow = (processed / need) * outAmt;
    flowProduct = Object.keys(def.out)[0];
    rows.push({ id, incoming: rows.at(-1).output, capacity, processed, diverted, output: flow });
  }
  toWarehouse += flow;
  value += flow * PRODUCTS[flowProduct].value;
  const dispatch = dispatchRate(state.dispatch.level);
  // Si el Willys no da abasto, solo se vende una parte (lo más valioso primero; aproximación lineal).
  const income = toWarehouse > dispatch ? (value * dispatch) / toWarehouse : value;

  let bottleneck = rows.find((r) => r.diverted > r.incoming * 0.02)?.id ?? null;
  if (!bottleneck) bottleneck = toWarehouse > dispatch ? 'dispatch' : 'farm';
  return { rows, toWarehouse, dispatch, bottleneck, income };
}
