// Mapa de los Llanos · Zona 3: La Cachamera (v3.33). Mismo trazado que la Fiquera, la Ciénaga y Ráquira: la
// cachama limpia se reparte entre la Pisillera, la Fileteadora (que le pasa los filetes al Ahumadero) y la Cocina.
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
    // El Ahumadero va junto a la Fileteadora: los filetes pasan de uno a otro.
    { stationId: 'cachama_smoker', x: 12, y: 7 },
    { stationId: 'pisillo_kitchen', x: 11, y: 12 },
    // La Cocina espera el jugo del Frutal junto a la carretera de la ruta.
    { stationId: 'cachama_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Restrepo ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta del jugo, hasta la Cocina de la cachama.
  routes: {
    jugo: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Frutal' },
    // La Ruta de la cachama sale de la bodega hacia el Hato llanero (v3.34).
    cachamas: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Cachama al Hato ➜' },
  },
  unlockedBy: 'frutal',
  next: 'hato_llanero',
};
