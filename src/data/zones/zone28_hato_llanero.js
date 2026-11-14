// Los Llanos Map · Zone 4: El Hato Llanero (v3.34). Same layout as El Hato, La Quesera, and Paipa: the
// llanera beef is split between the Lunch Table and the Parranda Grill, which wait next to the
// two roads bringing oil from La Palma and cachama from La Cachamera.
import { ICON } from '../icons.js';

export const ZONE28 = {
  id: 'hato_llanero',
  region: 'llanos',
  name: 'El Hato llanero',
  icon: ICON.mamona,
  theme: 'ranch',
  style: 'llanos', // Zebu and Sanmartinero cattle, moriche groves, and termite mounds (v3.34)
  size: 26,
  seed: 149,
  chain: ['llanero_herd', 'llanero_butcher', 'adobadero', 'vara_grill', 'carving_table', 'lunch_llanero', 'parranda_grill'],
  farm: { stationId: 'llanero_herd', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'llanero_butcher', x: 9, y: 5 },
    { stationId: 'adobadero', x: 9, y: 8 },
    { stationId: 'vara_grill', x: 11, y: 12 },
    { stationId: 'carving_table', x: 13, y: 7 },
    { stationId: 'lunch_llanero', x: 17, y: 12 },
    { stationId: 'parranda_grill', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A San Martín ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    aceite: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Aceite de la Palma' },
    cachamas: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Cachama de la Cachamera' },
    // Roasts and lunches leave toward Villavicencio (v3.36).
    parrandas: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Asados a Villavicencio ➜' },
    almuerzos_llaneros: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Almuerzos ⬇' },
    // Hides from Butchery leave toward La Talabartería (v4.0).
    cueros: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 19.6], text: 'Cueros ➜' },
  },
  unlockedBy: 'cachamera',
  next: 'talabarteria',
};
