// Mapa de Cundinamarca · Zona 2: Los Freseros de Sibaté (v4.4). Mismo trazado que la segunda zona de cada región,
// con la Marmita de mermelada en la parcela que queda libre: le llega la fresa de segunda del Lavadero por la canaleta.
import { ICON } from '../icons.js';

export const ZONE50 = {
  id: 'fresas',
  region: 'cundinamarca',
  name: 'Los Freseros de Sibaté',
  icon: ICON.fresa,
  theme: 'strawberry',
  size: 26,
  seed: 199,
  chain: ['fresal', 'lavadero_fresas', 'seleccionadora_fresas', 'llenadora_bandejas', 'mesa_fresas_crema', 'marmita_mermelada'],
  farm: { stationId: 'fresal', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'lavadero_fresas', x: 9, y: 5 },
    { stationId: 'seleccionadora_fresas', x: 9, y: 8 },
    { stationId: 'llenadora_bandejas', x: 11, y: 12 },
    { stationId: 'marmita_mermelada', x: 13, y: 7 },
    { stationId: 'mesa_fresas_crema', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Sibaté ➜',
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  unlockedBy: 'flores',
  // Las bandejas irán a las Salinas, y las fresas con crema y la mermelada a Zipaquirá (cuando lleguen esas zonas).
  routes: {},
  next: 'truchas',
};
