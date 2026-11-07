// Mapa de Cundinamarca · Zona 3: Las Truchas de Guatavita (v4.4). Mismo trazado que la tercera zona de cada región:
// la trucha limpia se reparte entre el Ahumadero, la Fileteadora (que le pasa los filetes a la Mesa del ceviche) y la
// Cocina de la laguna.
import { ICON } from '../icons.js';

export const ZONE51 = {
  id: 'truchas',
  region: 'cundinamarca',
  name: 'Las Truchas de Guatavita',
  icon: ICON.trucha,
  theme: 'ponds',
  style: 'truchas',
  size: 26,
  seed: 211,
  chain: ['estanques_trucha', 'limpieza_trucha', 'ahumadero_trucha', 'fileteadora_trucha', 'mesa_ceviche', 'cocina_laguna'],
  farm: { stationId: 'estanques_trucha', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'limpieza_trucha', x: 9, y: 5 },
    { stationId: 'fileteadora_trucha', x: 9, y: 8 },
    // La Mesa del ceviche va junto a la Fileteadora: los filetes pasan de una a otra.
    { stationId: 'mesa_ceviche', x: 12, y: 7 },
    { stationId: 'ahumadero_trucha', x: 11, y: 12 },
    { stationId: 'cocina_laguna', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Guatavita ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // La trucha ahumada y el ceviche irán a la Cocina de la Sabana, y el almuerzo a Zipaquirá (cuando lleguen esas zonas).
  routes: {},
  unlockedBy: 'fresas',
  next: 'salinas',
};
