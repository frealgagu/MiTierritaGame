// Pacific Coast Map · Zone 3: La Bahía (v3.40). Same layout as La Fiquera, La Ciénaga, Ráquira, and La
// Cachamera: cleaned snapper is split between the Drying Rack, the Filleting Table (passing fillets to the Smokehouse), and the Tapao Kitchen.
import { ICON } from '../icons.js';

export const ZONE33 = {
  id: 'bahia',
  region: 'pacifico',
  name: 'La Bahía',
  icon: ICON.pargo,
  theme: 'bay',
  size: 26,
  seed: 141,
  chain: ['pargo_boats', 'pargo_cleaner', 'fish_drier', 'pargo_filleter', 'pargo_smoker', 'tapao_kitchen'],
  farm: { stationId: 'pargo_boats', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pargo_cleaner', x: 9, y: 5 },
    { stationId: 'pargo_filleter', x: 9, y: 8 },
    // The Smokehouse sits next to the Filleting Table: fillets pass from one to the other.
    { stationId: 'pargo_smoker', x: 12, y: 7 },
    { stationId: 'fish_drier', x: 11, y: 12 },
    // The Tapao Kitchen waits for seasoning from La Azotea next to the route road.
    { stationId: 'tapao_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Nuquí ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Road along which the Seasoning Route arrives, up to the Tapao Kitchen.
  routes: {
    alino: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ De la Azotea' },
    // The Snapper Route leaves the warehouse toward El Manglar (v3.41).
    pargos: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Pargo al Manglar ➜' },
    // Dried fish and smoked snapper leave toward El Werregue (v3.42).
    secos: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Pescado seco al Werregue ⬇' },
    pargos_ahumados: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Pargo ahumado ⬇' },
    // Tapao leaves toward Buenaventura (v3.43).
    platos_tapao: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Tapao a Buenaventura ➜' },
  },
  unlockedBy: 'azotea',
  next: 'manglar',
};
