// Mapa de Boyacá · Zona 1: El Papal (v3.22). Mismo trazado que la Finca (zone1_finca.js) y la
// Guayabera: la región empieza de cero y su primera zona se juega igual que la primera del Eje Cafetero.
import { ICON } from '../icons.js';

export const ZONE19 = {
  id: 'papal',
  region: 'boyaca',
  name: 'El Papal',
  icon: ICON.potatoPlant,
  theme: 'potato',
  size: 26,
  seed: 113,
  chain: ['potato_field', 'potato_washer', 'potato_grader', 'potato_peeler', 'criollas_fryer', 'criollas_bagger', 'criollas_boxer'],
  farm: { stationId: 'potato_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'potato_washer', x: 9, y: 5 },
    { stationId: 'potato_grader', x: 5, y: 8 },
    { stationId: 'potato_peeler', x: 10, y: 11 },
    { stationId: 'criollas_fryer', x: 15, y: 11 },
    { stationId: 'criollas_bagger', x: 11, y: 14 },
    { stationId: 'criollas_boxer', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Ventaquemada ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  unlockedBy: null, // la primera de Boyacá: se abre con la región
  // Carretera de la Ruta de las papitas (v3.25): sale de la bodega hacia Paipa.
  routes: {
    papitas: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Papitas a Paipa ➜' },
  },
  next: 'cerveceria',
};
