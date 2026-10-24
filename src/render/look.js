// La decoración elegida (v2.2), para los dibujos: main.js la pone al cargar y al cambiarla. Vale
// también en los tableros de los eventos (es del jugador, no de la partida).
import { chosenDecor, petsOf } from '../sim/renown.js';

export const LOOK = chosenDecor(null);

// La de la región que se ve (v3.10: cada región tiene la suya).
export function setLook(profile, region = 'cafetero') {
  Object.assign(LOOK, chosenDecor(profile, region));
  // Las mascotas de la región (v3.12).
  LOOK.pets = profile ? { ...petsOf(profile, region) } : { cats: 0, parrots: 0 };
}
