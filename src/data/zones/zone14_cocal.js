// Caribbean Coast Map · Zone 2: El Cocal (v3.16). Same layout as El Tabacal (zone8_tabacal.js).
import { ICON } from '../icons.js';

export const ZONE14 = {
  id: 'cocal',
  region: 'costa',
  name: 'El Cocal',
  icon: ICON.coconutPalm,
  theme: 'coconut',
  size: 26,
  seed: 61,
  chain: ['coconut_grove', 'coconut_peeler', 'coconut_grater', 'coconut_press', 'cocada_kitchen'],
  farm: { stationId: 'coconut_grove', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'coconut_peeler', x: 9, y: 5 },
    { stationId: 'coconut_grater', x: 9, y: 8 },
    { stationId: 'coconut_press', x: 11, y: 12 },
    { stationId: 'cocada_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Tolú ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'arrozal', // opens upon completing El Arrozal
  // Road for the Coconut Milk Route (v3.17): leaves the warehouse toward La Ciénaga.
  routes: {
    coco: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'A la Ciénaga ➜' },
    // Cocadas leave toward Cartagena (v3.20).
    cocadas: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'A Cartagena ➜' },
  },
  next: 'cienaga',
};
