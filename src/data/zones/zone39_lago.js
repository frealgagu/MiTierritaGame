// Mapa del Amazonas · Zona 3: El Lago (v3.49). Mismo trazado que la Fiquera, la Ciénaga, Ráquira, la Cachamera y
// la Bahía: el pirarucú limpio se reparte entre el Saladero, la Fileteadora (que le pasa las postas al Moquén) y la Cocina.
import { ICON } from '../icons.js';

export const ZONE39 = {
  id: 'lago',
  region: 'amazonas',
  name: 'El Lago',
  icon: ICON.pirarucu,
  theme: 'lake',
  size: 26,
  seed: 167,
  chain: ['pirarucu_canoes', 'pirarucu_cleaner', 'pirarucu_salter', 'pirarucu_filleter', 'moquen', 'pirarucu_kitchen'],
  farm: { stationId: 'pirarucu_canoes', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pirarucu_cleaner', x: 9, y: 5 },
    { stationId: 'pirarucu_filleter', x: 9, y: 8 },
    // El Moquén va junto a la Fileteadora: las postas pasan de una a otro.
    { stationId: 'moquen', x: 12, y: 7 },
    { stationId: 'pirarucu_salter', x: 11, y: 12 },
    // La Cocina del pirarucú espera el ají negro del Ajizal junto a la carretera de la ruta.
    { stationId: 'pirarucu_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A los lagos de Tarapoto ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta del ají negro, hasta la Cocina del pirarucú.
  routes: {
    ajinegro: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Ajizal' },
    // El pirarucú limpio sale de la bodega hacia la Casabería (v3.50).
    pirarucus: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Pirarucú a la Casabería ➜' },
  },
  unlockedBy: 'ajizal',
  next: 'casaberia',
};
