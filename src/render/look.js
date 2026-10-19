// La decoración elegida (v2.2), para los dibujos: main.js la pone al cargar y al cambiarla. Vale
// también en los tableros de los eventos (es del jugador, no de la partida).
import { chosenDecor } from '../sim/renown.js';

export const LOOK = chosenDecor(null);

export function setLook(profile) {
  Object.assign(LOOK, chosenDecor(profile));
}
