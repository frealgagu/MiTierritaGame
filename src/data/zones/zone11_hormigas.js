// Mapa de Santander · Zona 5: Las Hormigas (v3.4). Mismo trazado que el Maizal (zone5_maizal.js):
// cadena lineal hasta la Tienda de recuerdos, que espera junto a las dos carreteras por las que llegan
// los costales y las alpargatas de la Fiquera.
import { ICON } from '../icons.js';

export const ZONE11 = {
  id: 'hormigas',
  region: 'santander',
  name: 'Las Hormigas',
  icon: ICON.antQueen,
  theme: 'ants',
  size: 26,
  seed: 79,
  chain: ['anthill', 'ant_cleaner', 'brine_pot', 'ant_toaster', 'cone_table', 'souvenir_shop'],
  farm: { stationId: 'anthill', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'ant_cleaner', x: 9, y: 5 },
    { stationId: 'brine_pot', x: 9, y: 8 },
    { stationId: 'ant_toaster', x: 11, y: 12 },
    { stationId: 'cone_table', x: 13, y: 7 },
    { stationId: 'souvenir_shop', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Barichara ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    costales: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Costales de la Fiquera' },
    alpargatas: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Alpargatas' },
    // Los recuerdos salen hacia Barichara (v3.5).
    recuerdos: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Barichara ➜' },
  },
  unlockedBy: 'hato',
  next: 'barichara',
};
