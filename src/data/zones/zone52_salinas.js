// Cundinamarca Map · Zone 4: Las Salinas de Nemocón (v4.4). Same layout as the fourth zone of each region. The
// Brine Wells (next to the mine drift) produce brine and salt blocks: blocks go down the chute to the Carving Workshop
// next door, and Gift Packing combines carvings with salt from the Evaporators. The Basket Assembler waits next to the
// roads bringing rose bouquets from Las Flores and strawberry trays from Sibaté.
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
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Nemocón ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    ramos_rosas: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Ramos de las Flores' },
    bandejas_fresa: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Fresas de Sibaté' },
    // The chest and the basket leave toward Zipaquirá.
    cofres_sal: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Cofres a Zipaquirá ➜' },
    canastas: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Canastas ⬇' },
  },
  unlockedBy: 'truchas',
  next: 'cocina',
};
