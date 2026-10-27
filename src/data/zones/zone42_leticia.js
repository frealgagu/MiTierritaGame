// Mapa del Amazonas · Zona 6: Leticia (v3.52). Mismo trazado que Barichara, Cartagena, Villa de Leyva,
// Villavicencio y Buenaventura: no tiene fuente propia; en la ribera está la Heladería de asaí, que recibe las
// cajas de asaí del Asaizal, y cada estación espera junto a la carretera por la que le llega lo suyo de otra
// zona del Amazonas. Se dibuja como el Pueblo (tema 'town'), con casas de colores, techos de zinc, ceibas,
// palmas de asaí y guacamayas (style).
import { ICON } from '../icons.js';

export const ZONE42 = {
  id: 'leticia',
  region: 'amazonas',
  name: 'Leticia',
  icon: ICON.delfines,
  size: 26,
  seed: 181,
  theme: 'town',
  style: 'leticia',
  chain: ['heladeria_asai', 'restaurante_ribera', 'hotel_selva', 'mercado_puerto', 'provisiones_canoa', 'salida_delfines'],
  farm: { stationId: 'heladeria_asai', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'restaurante_ribera', x: 9, y: 5 },
    { stationId: 'hotel_selva', x: 5, y: 8 },
    { stationId: 'mercado_puerto', x: 11, y: 12 },
    { stationId: 'provisiones_canoa', x: 13, y: 7 },
    { stationId: 'salida_delfines', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Puerto Nariño ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    cajas_asai: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Asaí del Asaizal' },
    cajas_aji: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Ají negro' },
    banquetes_maloca: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Banquetes' },
    desayunos_amazonicos: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Desayunos' },
    recuerdos_amazonas: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Yanchama ⬆' },
    platos_pirarucu: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Pirarucú ⬆' },
  },
  unlockedBy: 'yanchama',
  next: null, // la última del Amazonas
};
