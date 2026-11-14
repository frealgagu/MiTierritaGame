// Pacific Coast Map · Zone 2: La Azotea (v3.39). Same layout as El Tabacal (zone8_tabacal.js), El Cocal,
// La Cervecería, and El Frutal.
import { ICON } from '../icons.js';

export const ZONE32 = {
  id: 'azotea',
  region: 'pacifico',
  name: 'La Azotea',
  icon: ICON.azotea,
  theme: 'azotea',
  size: 26,
  seed: 139,
  chain: ['azotea_beds', 'herb_washer', 'herb_pestle', 'refrito_pot', 'alino_packer'],
  farm: { stationId: 'azotea_beds', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'herb_washer', x: 9, y: 5 },
    { stationId: 'herb_pestle', x: 9, y: 8 },
    { stationId: 'refrito_pot', x: 11, y: 12 },
    { stationId: 'alino_packer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Istmina ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'platanal', // opens upon completing El Platanal
  // Road for the Seasoning Route (v3.40): leaves the warehouse toward La Bahía.
  routes: {
    alino: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'A la Bahía ➜' },
    // Crates of seasoning leave toward Buenaventura (v3.43).
    cajas_alino: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'A Buenaventura ➜' },
  },
  next: 'bahia',
};
