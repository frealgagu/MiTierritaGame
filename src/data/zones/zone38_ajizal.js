// Mapa del Amazonas · Zona 2: El Ajizal (v3.48). Mismo trazado que el Tabacal (zone8_tabacal.js), el Cocal,
// la Cervecería, el Frutal y la Azotea.
import { ICON } from '../icons.js';

export const ZONE38 = {
  id: 'ajizal',
  region: 'amazonas',
  name: 'El Ajizal',
  icon: ICON.ajiPlant,
  theme: 'aji',
  size: 26,
  seed: 163,
  chain: ['aji_field', 'aji_washer', 'aji_grinder', 'tucupi_pot', 'aji_packer'],
  farm: { stationId: 'aji_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'aji_washer', x: 9, y: 5 },
    { stationId: 'aji_grinder', x: 9, y: 8 },
    { stationId: 'tucupi_pot', x: 11, y: 12 },
    { stationId: 'aji_packer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Tarapacá ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'asaizal', // se abre al completar El Asaizal
  // El ají negro sale hacia El Lago por la Ruta del ají negro (v3.49).
  routes: {
    ajinegro: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Al Lago ➜' },
  },
  next: 'lago',
};
