// Flujo teórico de la cadena para mostrar el cuello de botella (no afecta a la simulación).
import { STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { dispatchRate, stationRate, transportCapacity } from './rules.js';
import { CHAIN } from './chain.js';
import { legTime } from './transport.js';

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
  let value = 0;

  ids.forEach((id, i) => {
    const st = state.stations[id];
    const def = STATIONS_BY_ID[id];
    const outId = Object.keys(def.out)[0];
    const outAmt = def.out[outId];
    const rate = stationRate(def, st.level);
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
    const transport = transportCapacity(def, st.transport.level, 2 * legTime(id, dest));
    const row = { id, incoming: def.in ? incoming : null, capacity, output, transport, next, toNext: 0, diverted: 0, lost: 0 };

    if (next) {
      const nextDef = STATIONS_BY_ID[next];
      const nextCapacity = stationRate(nextDef, state.stations[next].level) * Object.values(nextDef.in)[0];
      row.toNext = Math.min(output, transport, nextCapacity);
      const left = output - row.toNext;
      // Las mulas que sobran llevan el resto a la bodega (viaje más largo).
      const free = Math.max(0, 1 - row.toNext / transport);
      row.diverted = Math.min(left, free * transportCapacity(def, st.transport.level, 2 * legTime(id, 'warehouse')));
      row.lost = left - row.diverted;
      row.nextCapacity = nextCapacity;
    } else {
      row.diverted = Math.min(output, transport);
      row.lost = output - row.diverted;
    }
    toWarehouse += row.diverted;
    value += row.diverted * PRODUCTS[outId].value;
    rows.push(row);
    incoming = row.toNext;
  });

  const dispatch = dispatchRate(state.dispatch.level);
  // Si el Willys no da abasto, solo se vende una parte (aproximación lineal).
  const income = toWarehouse > dispatch ? (value * dispatch) / toWarehouse : value;

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
