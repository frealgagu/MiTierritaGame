// Mapa de Santander · Zona 1: La Guayabera (v3.0). Se juega igual que la Finca (zone1_finca.js): la
// región empieza de cero. Desde la v3.29 tiene en la mitad la plaza de Vélez con su iglesia, y el camino
// de las mulas la rodea. Cada estación queda a la misma distancia del guayabal que en la Finca (2, 5, 9,
// 14, 17 y 21 casillas; la bodega a 27,9): el camino sigue bajando en escalera, así que mide lo mismo, y
// `door` dice en qué punto del camino queda la puerta de cada estación.
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
    { stationId: 'guava_molds', x: 9, y: 8, door: [10.5, 11.5] },
    { stationId: 'bocadillo_cutter', x: 14, y: 8, door: [15.5, 11.5] },
    { stationId: 'bijao_wrapper', x: 17, y: 12, door: [16.5, 13.5] },
    { stationId: 'crate_packer', x: 16, y: 17, door: [17.5, 16.5] },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  // La plaza de Vélez (v3.29): la iglesia en la mitad, las calles de los otros dos costados (por donde
  // anda la gente; las mulas van por el camino) y las casas del marco de la plaza.
  plaza: {
    x: 12, y: 12, w: 4, h: 4,
    street: [[11.5, 11.5], [11.5, 16.5], [16.5, 16.5]],
    houses: [[9.5, 13.3], [9.6, 15.2], [12.4, 18.4], [14.3, 18.3]],
  },
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
