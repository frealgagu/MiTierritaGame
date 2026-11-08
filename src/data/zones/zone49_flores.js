// Mapa de Cundinamarca · Zona 1: Las Flores de la Sabana (v4.4), en Madrid y Facatativá. Mismo trazado que la
// primera zona de cada región: Cundinamarca empieza de cero.
import { ICON } from '../icons.js';

export const ZONE49 = {
  id: 'flores',
  region: 'cundinamarca',
  name: 'Las Flores de la Sabana',
  icon: ICON.rosa,
  theme: 'roses',
  size: 26,
  seed: 197,
  chain: ['invernadero_rosas', 'mesa_corte', 'tinas_hidratacion', 'clasificadora_flores', 'boncheo', 'cuarto_frio', 'empacadora_flores'],
  farm: { stationId: 'invernadero_rosas', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'mesa_corte', x: 9, y: 5 },
    { stationId: 'tinas_hidratacion', x: 5, y: 8 },
    { stationId: 'clasificadora_flores', x: 10, y: 11 },
    { stationId: 'boncheo', x: 15, y: 11 },
    { stationId: 'cuarto_frio', x: 11, y: 14 },
    { stationId: 'empacadora_flores', x: 16, y: 17 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'Al aeropuerto ➜',
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  // Los ramos salen hacia las Salinas y las cajas hacia Zipaquirá.
  routes: {
    ramos_rosas: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Ramos a las Salinas ➜' },
    cajas_flores: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'A Zipaquirá ➜' },
  },
  unlockedBy: null, // la primera de Cundinamarca: se abre con la región
  next: 'fresas',
};
