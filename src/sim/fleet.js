// En-route mule tally cache during dispatch (v3.65.1). Stations queried several times per
// second how many mules were out and inbound to self or warehouse, scanning all mules every
// time: with everything leveled that dominated offline catch-up cost. Now counted once per
// dispatch pass and updated per departing mule. Preserves exact list iteration order.
// Active count during dispatch pass; otherwise null (falls back to scanning list).
import { STATIONS_BY_ID } from '../data/stations.js';
import { incomingKey } from './production.js';

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
  } else {
    const key = incomingKey(m.to, m.productId);
    fleet.incoming[key] = (fleet.incoming[key] ?? 0) + m.amount;
  }
}

export function endFleet() {
  fleet = null;
}

// «Upgrade Cafetal to level 5», «Upgrade Cafetal haulers to 5», «Upgrade Ruta de la panela to 10».
export const fleetOf = (state) => (fleet?.state === state ? fleet : null);
