// Mapa de Boyacá · Zona 2: La Cervecería (v3.23). Mismo trazado que el Tabacal (zone8_tabacal.js).
import { ICON } from '../icons.js';

export const ZONE20 = {
  id: 'cerveceria',
  region: 'boyaca',
  name: 'La Cervecería',
  icon: ICON.barleyPlant,
  theme: 'barley',
  size: 26,
  seed: 127,
  chain: ['barley_field', 'maltings', 'brew_kettle', 'fermenters', 'bottler'],
  farm: { stationId: 'barley_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'maltings', x: 9, y: 5 },
    { stationId: 'brew_kettle', x: 9, y: 8 },
    { stationId: 'fermenters', x: 11, y: 12 },
    { stationId: 'bottler', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Tibasosa ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'papal', // se abre al completar el Papal
  // Carretera de la Ruta de la cerveza (v3.24): sale de la bodega hacia Ráquira.
  routes: {
    cerveza: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'A Ráquira ➜' },
    // Las canastas de cerveza salen hacia Villa de Leyva (v3.27).
    canastas_cerveza: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'A Villa de Leyva ➜' },
  },
  next: 'raquira',
};
