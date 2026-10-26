// Mapa de la Costa Pacífica · Zona 3: La Bahía (v3.40). Mismo trazado que la Fiquera, la Ciénaga, Ráquira y la
// Cachamera: el pargo limpio se reparte entre el Secadero, la Fileteadora (que le pasa los filetes al Ahumadero) y la Cocina del tapao.
import { ICON } from '../icons.js';

export const ZONE33 = {
  id: 'bahia',
  region: 'choco',
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
    // El Ahumadero va junto a la Fileteadora: los filetes pasan de uno a otro.
    { stationId: 'pargo_smoker', x: 12, y: 7 },
    { stationId: 'fish_drier', x: 11, y: 12 },
    // La Cocina del tapao espera el aliño de la Azotea junto a la carretera de la ruta.
    { stationId: 'tapao_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Nuquí ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta del aliño, hasta la Cocina del tapao.
  routes: {
    alino: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ De la Azotea' },
  },
  unlockedBy: 'azotea',
  next: 'manglar',
};
