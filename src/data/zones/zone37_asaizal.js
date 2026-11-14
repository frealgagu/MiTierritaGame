// Amazonas Map · Zone 1: El Asaizal (v3.47). Same layout as La Finca (zone1_finca.js) and the
// first zone of each region: Amazonas starts from scratch and its first zone plays like the first one of Eje Cafetero.
import { ICON } from '../icons.js';

export const ZONE37 = {
  id: 'asaizal',
  region: 'amazonas',
  name: 'El Asaizal',
  icon: ICON.asaiPalm,
  theme: 'asai',
  size: 26,
  seed: 161,
  chain: ['asai_grove', 'asai_thresher', 'asai_soaker', 'asai_pulper', 'asai_blender', 'asai_bagger', 'asai_boxer'],
  farm: { stationId: 'asai_grove', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'asai_thresher', x: 9, y: 5 },
    { stationId: 'asai_soaker', x: 5, y: 8 },
    { stationId: 'asai_pulper', x: 10, y: 11 },
    { stationId: 'asai_blender', x: 15, y: 11 },
    { stationId: 'asai_bagger', x: 11, y: 14 },
    { stationId: 'asai_boxer', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys (v3.9), inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Puerto Nariño ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  // Açaí bags leave toward La Casabería along the Açaí Route (v3.50).
  routes: {
    bolsas_asai: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Asaí a la Casabería ➜' },
    // Crates of açaí leave toward Leticia (v3.52).
    cajas_asai: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'A Leticia ➜' },
  },
  unlockedBy: null, // the first zone of Amazonas: opens with the region
  next: 'ajizal',
};
