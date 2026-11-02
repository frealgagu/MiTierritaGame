// Mapa del Tolima Grande · Zona 1: Los Achirales (v4.0), en el sur del Tolima (Natagaima y Coyaima). Mismo trazado
// que la primera zona de cada región: el Tolima empieza de cero.
import { ICON } from '../icons.js';

export const ZONE43 = {
  id: 'achirales',
  region: 'tolima',
  name: 'Los Achirales',
  icon: ICON.bizcochos,
  theme: 'achira',
  size: 26,
  seed: 191,
  chain: ['achiral', 'achira_grater', 'starch_tanks', 'starch_patio', 'achira_kneader', 'bizcocho_oven', 'bizcocho_packer'],
  farm: { stationId: 'achiral', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'achira_grater', x: 9, y: 5 },
    { stationId: 'starch_tanks', x: 5, y: 8 },
    { stationId: 'starch_patio', x: 10, y: 11 },
    { stationId: 'achira_kneader', x: 15, y: 11 },
    { stationId: 'bizcocho_oven', x: 11, y: 14 },
    { stationId: 'bizcocho_packer', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Natagaima ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  // Los bizcochos salen hacia la Lechonería y las cajas hacia Neiva.
  routes: {
    bizcochos: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Bizcochos a la Lechonería ➜' },
    cajas_bizcochos: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'A Neiva ➜' },
  },
  unlockedBy: null, // la primera del Tolima Grande: se abre con la región
  next: 'cafe_huila',
};
