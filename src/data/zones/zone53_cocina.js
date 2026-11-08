// Mapa de Cundinamarca · Zona 5: La Cocina de la Sabana (v4.4), en Chía. Mismo trazado que la quinta zona de cada
// región: el Restaurante santafereño espera junto a las carreteras por las que llegan la trucha ahumada y el ceviche
// de Guatavita.
import { ICON } from '../icons.js';

export const ZONE53 = {
  id: 'cocina',
  region: 'cundinamarca',
  name: 'La Cocina de la Sabana',
  icon: ICON.platoAjiaco,
  theme: 'potato',
  size: 26,
  seed: 227,
  chain: ['huerta_papa', 'peladero', 'olla_caldo', 'olla_ajiaco', 'servidora_ajiaco', 'restaurante_santafereno'],
  farm: { stationId: 'huerta_papa', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'peladero', x: 9, y: 5 },
    { stationId: 'olla_caldo', x: 9, y: 8 },
    { stationId: 'olla_ajiaco', x: 11, y: 12 },
    { stationId: 'servidora_ajiaco', x: 13, y: 7 },
    { stationId: 'restaurante_santafereno', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Chía ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    ahumadas_trucha: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Trucha ahumada de Guatavita' },
    ceviches: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Ceviche' },
    almuerzos_sabaneros: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Zipaquirá ➜' },
  },
  unlockedBy: 'salinas',
  next: 'zipaquira',
};
