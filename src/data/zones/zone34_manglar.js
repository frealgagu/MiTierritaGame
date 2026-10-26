// Mapa de la Costa Pacífica · Zona 4: El Manglar (v3.41). Mismo trazado que el Hato, la Quesera, Paipa y el
// Hato llanero: la piangua encocada se reparte entre la Mesa del arroz con piangua y la Cocina de la cazuela,
// que esperan junto a las dos carreteras por las que llegan los patacones del Platanal y el pargo de la Bahía.
import { ICON } from '../icons.js';

export const ZONE34 = {
  id: 'manglar',
  region: 'choco',
  name: 'El Manglar',
  icon: ICON.piangua,
  theme: 'mangrove',
  size: 26,
  seed: 151,
  chain: ['mangrove_flats', 'piangua_washer', 'piangua_cooker', 'piangua_sheller', 'encocado_pot', 'piangua_lunch', 'cazuela_kitchen'],
  farm: { stationId: 'mangrove_flats', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'piangua_washer', x: 9, y: 5 },
    { stationId: 'piangua_cooker', x: 9, y: 8 },
    { stationId: 'piangua_sheller', x: 11, y: 12 },
    { stationId: 'encocado_pot', x: 13, y: 7 },
    { stationId: 'piangua_lunch', x: 17, y: 12 },
    { stationId: 'cazuela_kitchen', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Guapi ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    patacones: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Patacones del Platanal' },
    pargos: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Pargo de la Bahía' },
    // Las cazuelas y el arroz con piangua salen hacia Buenaventura (v3.43).
    cazuelas_mariscos: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Cazuelas a Buenaventura ➜' },
    arroces_piangua: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Arroz con piangua ⬇' },
  },
  unlockedBy: 'bahia',
  next: 'werregue',
};
