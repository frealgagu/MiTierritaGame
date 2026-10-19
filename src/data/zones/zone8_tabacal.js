// Mapa de Santander · Zona 2: El Tabacal (v3.1). Mismo trazado que el Trapiche (zone2_trapiche.js).
import { ICON } from '../icons.js';

export const ZONE8 = {
  id: 'tabacal',
  region: 'santander',
  name: 'El Tabacal',
  icon: ICON.tobaccoPlant,
  theme: 'tobacco',
  size: 26,
  seed: 47,
  chain: ['tobacco_field', 'caney', 'stripper', 'tobacco_piles', 'cigar_roller'],
  farm: { stationId: 'tobacco_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'caney', x: 9, y: 5 },
    { stationId: 'stripper', x: 9, y: 8 },
    { stationId: 'tobacco_piles', x: 11, y: 12 },
    { stationId: 'cigar_roller', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  exitSign: [21.5, 24.2],
  exitText: 'A Piedecuesta ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  // Carretera de la Ruta del tabaco: sale de la bodega hacia la Fiquera.
  routes: {
    tabaco: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'A la Fiquera ➜' },
    // Los tabacos torcidos salen hacia Barichara (v3.5).
    tabacos: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'A Barichara ➜' },
  },
  unlockedBy: 'guayabera', // se abre al completar la Guayabera
  next: 'fiquera',
};
