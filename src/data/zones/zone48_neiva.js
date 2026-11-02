// Mapa del Tolima Grande · Zona 6: Neiva (v4.0). Mismo trazado que la última zona de cada región: no tiene fuente
// propia; en el malecón del río Magdalena está la Cafetería, que recibe las cajas de bizcochos de los Achirales, y cada
// estación espera junto a la carretera por la que le llega lo suyo. Se dibuja como el Pueblo (tema 'town'), con
// casas de colores, ceibas, guayacanes y palmas (style), y las banderitas del San Pedro.
import { ICON } from '../icons.js';

export const ZONE48 = {
  id: 'neiva',
  region: 'tolima',
  name: 'Neiva',
  icon: ICON.tatacoa,
  size: 26,
  seed: 223,
  theme: 'town',
  style: 'neiva',
  chain: ['cafeteria_malecon', 'restaurante_rio', 'hotel_sanpedro', 'plaza_neiva', 'fiambrera_tatacoa', 'salida_tatacoa'],
  farm: { stationId: 'cafeteria_malecon', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'restaurante_rio', x: 9, y: 5 },
    { stationId: 'hotel_sanpedro', x: 5, y: 8 },
    { stationId: 'plaza_neiva', x: 11, y: 12 },
    { stationId: 'fiambrera_tatacoa', x: 13, y: 7 },
    { stationId: 'salida_tatacoa', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Villavieja ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    cajas_bizcochos: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Bizcochos de los Achirales' },
    cafe_especial: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Café del Huila' },
    lechonas: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Lechonas' },
    desayunos_tolimenses: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Desayunos' },
    recuerdos_tolima: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'La Chamba ⬆' },
    te_cascara: { road: [[4.5, 25.9], [4.5, 11.2]], sign: [3.3, 21.6], text: 'Té de cáscara ⬆' },
    almuerzos_represa: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Tilapia ⬆' },
  },
  unlockedBy: 'chamba',
  next: null, // la última del Tolima Grande
};
