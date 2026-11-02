// Mapa del Tolima Grande · Zona 4: La Lechonería (v4.0), cerca de Ibagué. Mismo trazado que la cuarta zona de cada
// región. El Desposte (junto al chiquero) saca carne y cuero: el cuero pasa por la canaleta a la Limpieza del cuero, al
// lado, y el Horno de leña junta el cuero limpio con el relleno de la Paila. La Mesa del desayuno espera junto a las
// carreteras por las que llegan los bizcochos de los Achirales y el tinto del Huila.
import { ICON } from '../icons.js';

export const ZONE46 = {
  id: 'lechoneria',
  region: 'tolima',
  name: 'La Lechonería',
  icon: ICON.lechona,
  theme: 'pigs',
  size: 26,
  seed: 199,
  chain: ['pigsty', 'pork_butcher', 'skin_cleaner', 'relleno_pot', 'tamal_stove', 'lechona_oven', 'desayuno_tolimense_table'],
  farm: { stationId: 'pigsty', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pork_butcher', x: 9, y: 5 },
    { stationId: 'skin_cleaner', x: 9, y: 8 },
    { stationId: 'relleno_pot', x: 13, y: 7 },
    { stationId: 'tamal_stove', x: 11, y: 12 },
    { stationId: 'lechona_oven', x: 17, y: 12 },
    { stationId: 'desayuno_tolimense_table', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Ibagué ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    bizcochos: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Bizcochos de los Achirales' },
    tinto: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Tinto del Huila' },
    // La lechona y el desayuno salen hacia Neiva.
    lechonas: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Lechonas a Neiva ➜' },
    desayunos_tolimenses: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Desayunos ⬇' },
  },
  unlockedBy: 'betania',
  next: 'chamba',
};
