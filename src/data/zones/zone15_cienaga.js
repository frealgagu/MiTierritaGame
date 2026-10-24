// Mapa de la Costa · Zona 3: La Ciénaga (v3.17). Mismo trazado que la Fiquera (zone9_fiquera.js): el
// pescado limpio se reparte entre el Saladero, la Fileteadora y la Cocina del pescado en coco.
import { ICON } from '../icons.js';

export const ZONE15 = {
  id: 'cienaga',
  region: 'costa',
  name: 'La Ciénaga',
  icon: ICON.canoe,
  theme: 'cienaga',
  size: 26,
  seed: 67,
  chain: ['fishing_canoes', 'fish_cleaner', 'fish_salter', 'fish_filleter', 'fish_fryer', 'coconut_fish_kitchen'],
  farm: { stationId: 'fishing_canoes', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'fish_cleaner', x: 9, y: 5 },
    { stationId: 'fish_filleter', x: 9, y: 8 },
    // La Fritanga va junto a la Fileteadora: los filetes pasan de una a otra.
    { stationId: 'fish_fryer', x: 12, y: 7 },
    { stationId: 'fish_salter', x: 11, y: 12 },
    // La Cocina espera la leche de coco del Cocal junto a la carretera de la ruta.
    { stationId: 'coconut_fish_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Ciénaga de Oro ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta de la leche de coco, hasta la Cocina.
  routes: {
    coco: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Cocal' },
    // La Ruta del pescado sale de la bodega hacia la Quesera (v3.18).
    pescado: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Pescado a la Quesera ➜' },
  },
  unlockedBy: 'cocal',
  next: 'quesera',
};
