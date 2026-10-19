// Mapa de Santander · Zona 3: La Fiquera (v3.2). Mismo trazado que la Lechería (zone3_lecheria.js): la
// fibra de la Desfibradora se reparte entre el Telar de costales, la Hiladora y la Empacadora de tercios.
import { ICON } from '../icons.js';

export const ZONE9 = {
  id: 'fiquera',
  region: 'santander',
  name: 'La Fiquera',
  icon: ICON.fiquePlant,
  theme: 'fique',
  size: 26,
  seed: 53,
  chain: ['fique_field', 'decorticator', 'sack_loom', 'spinner', 'alpargata_shop', 'tercio_packer'],
  farm: { stationId: 'fique_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'decorticator', x: 9, y: 5 },
    { stationId: 'spinner', x: 9, y: 8 },
    // La Alpargatería va junto a la Hiladora: el hilo pasa de una a otra.
    { stationId: 'alpargata_shop', x: 12, y: 7 },
    { stationId: 'sack_loom', x: 11, y: 12 },
    // La Empacadora espera el tabaco del Tabacal junto a la carretera de la ruta.
    { stationId: 'tercio_packer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  exitSign: [21.5, 24.2],
  exitText: 'A Curití ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta del tabaco, hasta la Empacadora de tercios.
  routes: {
    tabaco: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Tabacal' },
  },
  unlockedBy: 'tabacal',
  next: null, // (las siguientes de Santander llegan en las próximas versiones)
};
