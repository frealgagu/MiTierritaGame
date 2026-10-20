// Mapa de Santander · Zona 1: La Guayabera (v3.0). Mismo trazado que la Finca (zone1_finca.js): la
// región empieza de cero y su primera zona se juega igual que la primera del Eje Cafetero.
import { ICON } from '../icons.js';

export const ZONE7 = {
  id: 'guayabera',
  region: 'santander',
  name: 'La Guayabera',
  icon: ICON.guava,
  theme: 'guava',
  size: 26,
  seed: 41,
  chain: ['guava_grove', 'guava_pulper', 'guava_pot', 'guava_molds', 'bocadillo_cutter', 'bijao_wrapper', 'crate_packer'],
  farm: { stationId: 'guava_grove', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'guava_pulper', x: 9, y: 5 },
    { stationId: 'guava_pot', x: 5, y: 8 },
    { stationId: 'guava_molds', x: 10, y: 11 },
    { stationId: 'bocadillo_cutter', x: 15, y: 11 },
    { stationId: 'bijao_wrapper', x: 11, y: 14 },
    { stationId: 'crate_packer', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Vélez ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  // Carretera de la Ruta del bocadillo: sale de la bodega hacia el Hato (v3.3).
  routes: {
    bocadillo: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Bocadillo al Hato ➜' },
    // Las cajas de bocadillos salen hacia Barichara (v3.5).
    dulces: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'A Barichara ➜' },
  },
  unlockedBy: null, // la primera de Santander: se abre con la región
  next: 'tabacal',
};
