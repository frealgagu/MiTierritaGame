// Los Llanos Map · Zone 3: La Cachamera (v3.33). Same layout as La Fiquera, La Ciénaga, and Ráquira: the
// cleaned cachama is split between the Pisillo Stall, the Filleting Table (passing fillets to the Smokehouse), and the Kitchen.
import { ICON } from '../icons.js';

export const ZONE27 = {
  id: 'cachamera',
  region: 'llanos',
  name: 'La Cachamera',
  icon: ICON.cachama,
  theme: 'ponds',
  size: 26,
  seed: 139,
  chain: ['fish_ponds', 'cachama_cleaner', 'pisillo_kitchen', 'cachama_filleter', 'cachama_smoker', 'cachama_kitchen'],
  farm: { stationId: 'fish_ponds', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'cachama_cleaner', x: 9, y: 5 },
    { stationId: 'cachama_filleter', x: 9, y: 8 },
    // The Smokehouse sits next to the Filleting Table: fillets pass from one to the other.
    { stationId: 'cachama_smoker', x: 12, y: 7 },
    { stationId: 'pisillo_kitchen', x: 11, y: 12 },
    // The Kitchen waits for juice from El Frutal next to the route road.
    { stationId: 'cachama_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Restrepo ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Road along which the Juice Route arrives, up to the Cachama Kitchen.
  routes: {
    jugo: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Frutal' },
    // The Cachama Route leaves the warehouse toward El Hato Llanero (v3.34).
    cachamas: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Cachama al Hato ➜' },
    // Pisillo and smoked cachama leave toward La Talabartería (v3.35).
    pisillos: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Pisillo a la Talabartería ⬇' },
    ahumadas: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Cachama ahumada ⬇' },
    // Passionfruit cachama leaves toward Villavicencio (v3.36).
    platos_cachama: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Platos a Villavicencio ➜' },
  },
  unlockedBy: 'frutal',
  next: 'hato_llanero',
};
