// Mapa de los Llanos · Zona 1: La Palma (v3.31). Mismo trazado que la Finca (zone1_finca.js), el
// Arrozal y el Papal: la región empieza de cero y su primera zona se juega igual que la primera del Eje Cafetero.
import { ICON } from '../icons.js';

export const ZONE25 = {
  id: 'palma',
  region: 'llanos',
  name: 'La Palma',
  icon: ICON.oilPalm,
  theme: 'palm',
  size: 26,
  seed: 131,
  chain: ['palm_grove', 'bunch_thresher', 'fruit_sterilizer', 'palm_press', 'oil_clarifier', 'oil_bottler', 'oil_boxer'],
  farm: { stationId: 'palm_grove', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'bunch_thresher', x: 9, y: 5 },
    { stationId: 'fruit_sterilizer', x: 5, y: 8 },
    { stationId: 'palm_press', x: 10, y: 11 },
    { stationId: 'oil_clarifier', x: 15, y: 11 },
    { stationId: 'oil_bottler', x: 11, y: 14 },
    { stationId: 'oil_boxer', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Puerto López ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  // Carretera de la Ruta del aceite (v3.34): sale de la bodega hacia el Hato llanero.
  routes: {
    aceite: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Aceite al Hato ➜' },
  },
  unlockedBy: null, // la primera de los Llanos: se abre con la región
  next: 'frutal',
};
