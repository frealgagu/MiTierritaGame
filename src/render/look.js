// Equipped cosmetic decoration (v2.2) for artwork: main.js sets on load and change.
// Applies on event boards too (belongs to player, not run).
import { chosenDecor, petsOf } from '../sim/renown.js';

export const LOOK = chosenDecor(null);

// Decoration for currently viewed region (v3.10: per region).
export function setLook(profile, region = 'cafetero') {
  Object.assign(LOOK, chosenDecor(profile, region));
  // Region's cosmetic pets (v3.12).
  LOOK.pets = profile ? { ...petsOf(profile, region) } : { cats: 0, parrots: 0 };
}
