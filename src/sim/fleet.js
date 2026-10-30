// Cuenta de las mulas en camino mientras se despachan (v3.65.1). Cada estación preguntaba varias veces
// por segundo cuántas mulas tiene fuera y cuánto viene hacia ella o hacia la bodega, y cada pregunta
// recorría todas las mulas del juego: con todo nivelado eso era lo que más tardaba al calcular el tiempo
// fuera. Ahora se cuentan una vez al empezar el despacho y se suma cada mula que sale. Se suma en el
// mismo orden que antes (el de la lista), así que los resultados son idénticos.
import { STATIONS_BY_ID } from '../data/stations.js';

let fleet = null;

export function countFleet(state) {
  fleet = { state, busy: {}, incoming: {}, toWarehouse: {}, toExport: {} };
  for (const m of state.mules) addMule(m);
}

export function addMule(m) {
  if (!fleet) return;
  fleet.busy[m.from] = (fleet.busy[m.from] ?? 0) + 1;
  if (m.phase !== 'go') return;
  if (m.to === 'warehouse') {
    const zone = STATIONS_BY_ID[m.from].zone;
    fleet.toWarehouse[zone] = (fleet.toWarehouse[zone] ?? 0) + m.amount;
    const key = `${zone}|${m.productId}`;
    fleet.toExport[key] = (fleet.toExport[key] ?? 0) + m.amount;
  } else fleet.incoming[m.to] = (fleet.incoming[m.to] ?? 0) + m.amount;
}

export function endFleet() {
  fleet = null;
}

// La cuenta, si se está despachando en esta partida; si no, null (y se recorre la lista como antes).
export const fleetOf = (state) => (fleet?.state === state ? fleet : null);
