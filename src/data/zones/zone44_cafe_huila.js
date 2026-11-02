// Mapa del Tolima Grande · Zona 2: El Café del Huila (v4.0), en Pitalito. Mismo trazado que la segunda zona de
// cada región, con el Secadero de cáscara en la parcela que queda libre: le llega la cáscara del Beneficiadero por
// la canaleta.
import { ICON } from '../icons.js';

export const ZONE44 = {
  id: 'cafe_huila',
  region: 'tolima',
  name: 'El Café del Huila',
  icon: ICON.cafeEspecial,
  theme: 'coffee',
  style: 'huila',
  size: 26,
  seed: 193,
  chain: ['cafetal_huila', 'huila_wetmill', 'huila_huller', 'huila_roaster', 'huila_packer', 'cascara_dryer'],
  farm: { stationId: 'cafetal_huila', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'huila_wetmill', x: 9, y: 5 },
    { stationId: 'huila_huller', x: 9, y: 8 },
    { stationId: 'huila_roaster', x: 11, y: 12 },
    { stationId: 'cascara_dryer', x: 13, y: 7 },
    { stationId: 'huila_packer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Pitalito ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'achirales',
  // El tinto sale hacia la Lechonería; el café especial y el té de cáscara, hacia Neiva.
  routes: {
    tinto: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Tinto a la Lechonería ➜' },
    te_cascara: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'Té de cáscara a Neiva ➜' },
    cafe_especial: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'A Neiva ➜' },
  },
  next: 'betania',
};
