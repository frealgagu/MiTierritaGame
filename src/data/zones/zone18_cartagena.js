// Mapa de la Costa · Zona 6: Cartagena (v3.20). Mismo trazado que Barichara (zone12_barichara.js): no tiene
// fuente propia; en la plaza está el Fogón de Getsemaní, que recibe los bultos de arroz del Arrozal, y cada
// estación espera junto a la carretera por la que le llega lo suyo de otra zona de la Costa. Se dibuja como
// el Pueblo (tema 'town'), con casas coloniales de colores, balcones de madera y bugambilias (style).
import { ICON } from '../icons.js';

export const ZONE18 = {
  id: 'cartagena',
  region: 'costa',
  name: 'Cartagena',
  icon: ICON.torreReloj,
  size: 26,
  seed: 107,
  theme: 'town',
  style: 'cartagena',
  chain: ['fogon_getsemani', 'restaurante_muralla', 'hotel_colonial', 'cocina_bahia', 'loncheras', 'muelle'],
  farm: { stationId: 'fogon_getsemani', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'restaurante_muralla', x: 9, y: 5 },
    { stationId: 'hotel_colonial', x: 5, y: 8 },
    { stationId: 'cocina_bahia', x: 11, y: 12 },
    { stationId: 'loncheras', x: 13, y: 7 },
    { stationId: 'muelle', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Bocagrande ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    bultos: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Arroz del Arrozal' },
    cocadas: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Cocadas del Cocal' },
    bandejas: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Bandejas' },
    almuerzos_costenos: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Almuerzos de la Quesera' },
    recuerdos_costa: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Sombreros de Tuchín ⬆' },
    cazuelas: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Pescado en coco ⬆' },
  },
  unlockedBy: 'sombrero',
  next: null, // la última de la Costa
};
