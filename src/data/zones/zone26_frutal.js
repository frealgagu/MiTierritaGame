// Mapa de los Llanos · Zona 2: El Frutal (v3.32). Mismo trazado que el Tabacal (zone8_tabacal.js), el Cocal
// y la Cervecería.
import { ICON } from '../icons.js';

export const ZONE26 = {
  id: 'frutal',
  region: 'llanos',
  name: 'El Frutal',
  icon: ICON.passionVine,
  theme: 'fruit',
  size: 26,
  seed: 137,
  chain: ['passion_vines', 'passion_pulper', 'pulp_pasteurizer', 'juice_mixer', 'juice_packer'],
  farm: { stationId: 'passion_vines', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'passion_pulper', x: 9, y: 5 },
    { stationId: 'pulp_pasteurizer', x: 9, y: 8 },
    { stationId: 'juice_mixer', x: 11, y: 12 },
    { stationId: 'juice_packer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Granada ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'palma',
  // Carretera de la Ruta del jugo (v3.33): sale de la bodega hacia la Cachamera.
  routes: {
    jugo: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'A la Cachamera ➜' },
  }, // se abre al completar La Palma
  next: 'cachamera',
};
