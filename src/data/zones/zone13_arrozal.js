// Mapa de la Costa · Zona 1: El Arrozal (v3.15). Mismo trazado que la Finca (zone1_finca.js) y la
// Guayabera: la región empieza de cero y su primera zona se juega igual que la primera del Eje Cafetero.
import { ICON } from '../icons.js';

export const ZONE13 = {
  id: 'arrozal',
  region: 'costa',
  name: 'El Arrozal',
  icon: ICON.ricePlant,
  theme: 'rice',
  size: 26,
  seed: 59,
  chain: ['rice_field', 'rice_dryer', 'rice_huller', 'rice_polisher', 'rice_sorter', 'rice_bagger', 'rice_stacker'],
  farm: { stationId: 'rice_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'rice_dryer', x: 9, y: 5 },
    { stationId: 'rice_huller', x: 5, y: 8 },
    { stationId: 'rice_polisher', x: 10, y: 11 },
    { stationId: 'rice_sorter', x: 15, y: 11 },
    { stationId: 'rice_bagger', x: 11, y: 14 },
    { stationId: 'rice_stacker', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Montería ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  unlockedBy: null, // la primera de la Costa: se abre con la región
  // Carretera de la Ruta del arroz (v3.18): sale de la bodega hacia la Quesera.
  routes: {
    arroz: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Arroz a la Quesera ➜' },
    // Los bultos de arroz salen hacia Cartagena (v3.20).
    bultos: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'A Cartagena ➜' },
  },
  next: 'cocal',
};
