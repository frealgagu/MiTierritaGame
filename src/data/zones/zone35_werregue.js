// Mapa de la Costa Pacífica · Zona 5: El Werregue (v3.42). Mismo trazado que las Hormigas, el Sombrero, Las
// Ruanas y la Talabartería: cadena lineal hasta la Tienda de artesanías, que espera junto a las dos carreteras
// por las que llegan el pescado seco y el pargo ahumado de la Bahía.
import { ICON } from '../icons.js';

export const ZONE35 = {
  id: 'werregue',
  region: 'pacifico',
  name: 'El Werregue',
  icon: ICON.werregueJar,
  theme: 'werregue',
  size: 26,
  seed: 153,
  chain: ['werregue_palms', 'werregue_stripper', 'werregue_dyer', 'werregue_twister', 'werregue_weaver', 'tienda_pacifico'],
  farm: { stationId: 'werregue_palms', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'werregue_stripper', x: 9, y: 5 },
    { stationId: 'werregue_dyer', x: 9, y: 8 },
    { stationId: 'werregue_twister', x: 11, y: 12 },
    { stationId: 'werregue_weaver', x: 13, y: 7 },
    { stationId: 'tienda_pacifico', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'Al río San Juan ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    secos: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Pescado seco de la Bahía' },
    pargos_ahumados: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Pargo ahumado' },
    // Los recuerdos salen hacia Buenaventura (v3.43).
    recuerdos_pacifico: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Buenaventura ➜' },
  },
  unlockedBy: 'manglar',
  next: 'buenaventura',
};
