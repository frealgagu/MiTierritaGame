// Mapa de Cundinamarca · Zona 4: Las Salinas de Nemocón (v4.4). Mismo trazado que la cuarta zona de cada región. Los
// Pozos (junto al socavón) sacan salmuera y bloques de sal: los bloques pasan por la canaleta al Taller de tallado, al
// lado, y el Empaque de regalo junta las figuras con la sal de los Tachos. La Armadora de canastas espera junto a las
// carreteras por las que llegan los ramos de rosas de las Flores y las bandejas de fresa de Sibaté.
import { ICON } from '../icons.js';

export const ZONE52 = {
  id: 'salinas',
  region: 'cundinamarca',
  name: 'Las Salinas de Nemocón',
  icon: ICON.panSal,
  theme: 'salt',
  size: 26,
  seed: 223,
  chain: ['socavon_sal', 'pozos_salmuera', 'taller_tallado', 'tachos_evaporacion', 'gachas_barro', 'empaque_regalo', 'armadora_canastas'],
  farm: { stationId: 'socavon_sal', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pozos_salmuera', x: 9, y: 5 },
    { stationId: 'taller_tallado', x: 9, y: 8 },
    { stationId: 'tachos_evaporacion', x: 13, y: 7 },
    { stationId: 'gachas_barro', x: 11, y: 12 },
    { stationId: 'empaque_regalo', x: 17, y: 12 },
    { stationId: 'armadora_canastas', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Nemocón ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    ramos_rosas: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Ramos de las Flores' },
    bandejas_fresa: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Fresas de Sibaté' },
    // El cofre y la canasta irán a Zipaquirá (cuando llegue).
  },
  unlockedBy: 'truchas',
  next: null,
};
