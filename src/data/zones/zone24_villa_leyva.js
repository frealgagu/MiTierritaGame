// Mapa de Boyacá · Zona 6: Villa de Leyva (v3.27). Mismo trazado que Barichara y Cartagena: no tiene fuente
// propia; en la plaza está la Tienda de la esquina, que recibe las cajas de papitas del Papal, y cada
// estación espera junto a la carretera por la que le llega lo suyo de otra zona de Boyacá. Se dibuja como el
// Pueblo (tema 'town'), con casonas blancas de balcones verdes y la plaza empedrada más grande (style).
import { ICON } from '../icons.js';

export const ZONE24 = {
  id: 'villa_leyva',
  region: 'boyaca',
  name: 'Villa de Leyva',
  icon: ICON.iglesiaVilla,
  size: 26,
  seed: 149,
  theme: 'town',
  style: 'villa',
  chain: ['tienda_esquina', 'terraza_plaza', 'hospedaje_colonial', 'mercado_sabado', 'canastos_paseo', 'salida_fosil'],
  farm: { stationId: 'tienda_esquina', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'terraza_plaza', x: 9, y: 5 },
    { stationId: 'hospedaje_colonial', x: 5, y: 8 },
    { stationId: 'mercado_sabado', x: 11, y: 12 },
    { stationId: 'canastos_paseo', x: 13, y: 7 },
    { stationId: 'salida_fosil', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'Al Fósil ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    cajas_papitas: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Papitas del Papal' },
    canastas_cerveza: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Cerveza' },
    amasijos: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Amasijos' },
    piquetes: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Piquetes de Paipa' },
    recuerdos_boyaca: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Ruanas de Nobsa ⬆' },
    jarras_cerveza: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Jarras de Ráquira ⬆' },
  },
  unlockedBy: 'ruanas',
  next: null, // la última de Boyacá
};
