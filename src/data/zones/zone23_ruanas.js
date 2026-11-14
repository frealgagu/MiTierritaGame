// Boyacá Map · Zone 5: Las Ruanas (v3.26). Same layout as Las Hormigas and El Sombrero: linear chain
// up to the Nobsa Shop, which waits next to the two roads bringing pots and planters
// from Ráquira.
import { ICON } from '../icons.js';

export const ZONE23 = {
  id: 'ruanas',
  region: 'boyaca',
  name: 'Las Ruanas',
  icon: ICON.ruana,
  theme: 'sheep',
  size: 26,
  seed: 139,
  chain: ['sheep_pasture', 'wool_washer', 'carder', 'spinning_wheel', 'ruana_loom', 'tienda_nobsa'],
  farm: { stationId: 'sheep_pasture', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'wool_washer', x: 9, y: 5 },
    { stationId: 'carder', x: 9, y: 8 },
    { stationId: 'spinning_wheel', x: 11, y: 12 },
    { stationId: 'ruana_loom', x: 13, y: 7 },
    { stationId: 'tienda_nobsa', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Nobsa ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    ollas: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Ollas de Ráquira' },
    materas: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Materas' },
    // Souvenirs leave toward Villa de Leyva (v3.27).
    recuerdos_boyaca: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Villa de Leyva ➜' },
  },
  unlockedBy: 'paipa',
  next: 'villa_leyva',
};
