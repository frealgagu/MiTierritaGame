// Caribbean Coast Map · Zone 6: Cartagena (v3.20). Same layout as Barichara (zone12_barichara.js): no
// source of its own; in the square sits the Getsemaní Hearth, which receives rice sacks from El Arrozal, and each
// station waits next to the road bringing its supply from another Coast zone. Drawn like
// El Pueblo ('town' theme), with colorful colonial houses, wooden balconies, and bougainvillea (style).
import { ICON } from '../icons.js';

export const ZONE18 = {
  id: 'cartagena',
  region: 'costa',
  name: 'Cartagena',
  icon: ICON.torreReloj,
  size: 26,
  seed: 107,
  theme: 'town',
  style: 'cartagena',
  chain: ['fogon_getsemani', 'restaurante_muralla', 'hotel_colonial', 'cocina_bahia', 'loncheras', 'muelle'],
  farm: { stationId: 'fogon_getsemani', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'restaurante_muralla', x: 9, y: 5 },
    { stationId: 'hotel_colonial', x: 5, y: 8 },
    { stationId: 'cocina_bahia', x: 11, y: 12 },
    { stationId: 'loncheras', x: 13, y: 7 },
    { stationId: 'muelle', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Bocagrande ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    bultos: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Arroz del Arrozal' },
    cocadas: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Cocadas del Cocal' },
    bandejas: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Bandejas' },
    almuerzos_costenos: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Almuerzos de la Quesera' },
    recuerdos_costa: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Sombreros de Tuchín ⬆' },
    cazuelas: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Pescado en coco ⬆' },
  },
  // The walled city (v3.45): the Caribbean Sea behind the map, the beach, the sea wall bordering it, and the land wall
  // enclosing the historic center, with its sentry boxes and gates where roads pass through; the gate on the
  // hat road is the Clock Tower. Purely visual: stations and paths do not move.
  walls: {
    sea: true,
    lines: [
      [[0.35, 24.6], [0.35, 0.35], [22.6, 0.35]],
      [[0.35, 11.85], [11.7, 11.85]],
      [[12.55, 10.7], [12.55, 0.35]],
    ],
    gates: [
      { at: [6.5, 11.85], clock: true },
      { at: [12.55, 1.5] },
      { at: [12.55, 4.5] },
    ],
    garitas: [[0.35, 0.35], [0.35, 6.2], [0.35, 18], [7.5, 0.35], [15, 0.35], [22.6, 0.35], [0.35, 24.6], [0.35, 11.85], [11.7, 11.85], [12.55, 10.7], [12.55, 0.35]],
  },
  unlockedBy: 'sombrero',
  next: null, // the last zone of the Coast
};
