// Regiones (v3.0): la partida del Eje Cafetero es la principal y guarda las demás en `regions`, cada
// una como una partida completa (con su `region`). Todas producen a la vez, cada una con su Game.
import { REGIONS } from '../data/regions.js';
import { createInitialState } from './state.js';
import { clockOf } from './calendar.js';

// La partida de una región (la principal para el Eje Cafetero), o null si no se ha abierto.
export function regionState(root, regionId) {
  if (regionId === 'cafetero') return root;
  return root.regions?.[regionId] ?? null;
}

// Abre las regiones cuya condición ya se cumplió (completar una zona de otra región). Devuelve las
// que abrió. La región nueva sigue el calendario del país desde el día en que se abre.
export function openRegions(root, now = Date.now()) {
  const opened = [];
  for (const region of REGIONS) {
    if (!region.unlock || regionState(root, region.id)) continue;
    const from = regionState(root, region.unlock.region);
    if (!from?.zones[region.unlock.zone]?.complete) continue;
    const state = createInitialState(now, region.id);
    state.clockOffset = clockOf(root);
    state.settings = { zone: region.zones[0] };
    root.regions ??= {};
    root.regions[region.id] = state;
    opened.push(region.id);
  }
  return opened;
}

// Las regiones abiertas, en orden: [{ region, state }].
export const openRegionStates = (root) => REGIONS.map((region) => ({ region, state: regionState(root, region.id) })).filter((r) => r.state);
