// Mapa del Amazonas · Zona 5: La Yanchama (v3.51). Mismo trazado que las Hormigas, el Sombrero, Las Ruanas, la
// Talabartería y el Werregue: cadena lineal hasta la Tienda de la Yanchama, que espera junto a las dos carreteras
// por las que llegan el pirarucú salado y el moqueado del Lago.
import { ICON } from '../icons.js';

export const ZONE41 = {
  id: 'yanchama',
  region: 'amazonas',
  name: 'La Yanchama',
  icon: ICON.ticunaMask,
  theme: 'yanchama',
  size: 26,
  seed: 179,
  chain: ['yanchama_trees', 'bark_soaker', 'bark_beater', 'cloth_painter', 'mask_maker', 'tienda_yanchama'],
  farm: { stationId: 'yanchama_trees', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'bark_soaker', x: 9, y: 5 },
    { stationId: 'bark_beater', x: 9, y: 8 },
    { stationId: 'cloth_painter', x: 11, y: 12 },
    { stationId: 'mask_maker', x: 13, y: 7 },
    { stationId: 'tienda_yanchama', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Macedonia ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  // Las dos carreteras por las que llegan el pirarucú salado y el moqueado del Lago.
  routes: {
    pirarucus_salados: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Pirarucú salado del Lago' },
    moqueados: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Moqueado' },
    // Los recuerdos salen hacia Leticia (v3.52).
    recuerdos_amazonas: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Leticia ➜' },
  },
  unlockedBy: 'casaberia',
  next: 'leticia',
};
