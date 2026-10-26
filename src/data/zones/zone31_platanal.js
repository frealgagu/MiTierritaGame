// Mapa de la Costa Pacífica · Zona 1: El Platanal (v3.38). Mismo trazado que la Finca (zone1_finca.js), el
// Arrozal, el Papal y la Palma: la región empieza de cero y su primera zona se juega igual que la primera del Eje Cafetero.
import { ICON } from '../icons.js';

export const ZONE31 = {
  id: 'platanal',
  region: 'pacifico',
  name: 'El Platanal',
  icon: ICON.plantainPlant,
  theme: 'plantain',
  size: 26,
  seed: 137,
  chain: ['plantain_grove', 'plantain_dehander', 'plantain_washer', 'plantain_peeler', 'patacon_fryer', 'patacon_bagger', 'patacon_boxer'],
  farm: { stationId: 'plantain_grove', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'plantain_dehander', x: 9, y: 5 },
    { stationId: 'plantain_washer', x: 5, y: 8 },
    { stationId: 'plantain_peeler', x: 10, y: 11 },
    { stationId: 'patacon_fryer', x: 15, y: 11 },
    { stationId: 'patacon_bagger', x: 11, y: 14 },
    { stationId: 'patacon_boxer', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Quibdó ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  // Los patacones salen de la bodega hacia el Manglar (v3.41).
  routes: {
    patacones: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Patacones al Manglar ➜' },
    // Las cajas de patacones salen hacia Buenaventura (v3.43).
    cajas_patacones: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'A Buenaventura ➜' },
  },
  unlockedBy: null, // la primera de la Costa Pacífica: se abre con la región
  next: 'azotea',
};
