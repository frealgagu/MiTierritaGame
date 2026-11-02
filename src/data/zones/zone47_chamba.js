// Mapa del Tolima Grande · Zona 5: La Chamba (v4.0), en El Guamo. Mismo trazado que la quinta zona de cada región:
// cadena lineal hasta la Tienda de La Chamba, que espera junto a las dos carreteras por las que llegan la tilapia
// ahumada y el escabeche de Betania.
import { ICON } from '../icons.js';

export const ZONE47 = {
  id: 'chamba',
  region: 'tolima',
  name: 'La Chamba',
  icon: ICON.lozaNegra,
  theme: 'clay',
  style: 'chamba',
  size: 26,
  seed: 211,
  chain: ['clay_bank', 'clay_treader', 'pot_modelers', 'pot_burnishers', 'black_kiln', 'tienda_chamba'],
  farm: { stationId: 'clay_bank', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'clay_treader', x: 9, y: 5 },
    { stationId: 'pot_modelers', x: 9, y: 8 },
    { stationId: 'pot_burnishers', x: 11, y: 12 },
    { stationId: 'black_kiln', x: 13, y: 7 },
    { stationId: 'tienda_chamba', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'Al Guamo ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    ahumadas_tilapia: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Tilapia ahumada de Betania' },
    escabeches: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Escabeche' },
    recuerdos_tolima: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Neiva ➜' },
  },
  unlockedBy: 'lechoneria',
  next: 'neiva',
};
