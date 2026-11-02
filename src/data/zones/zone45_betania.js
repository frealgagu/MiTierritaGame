// Mapa del Tolima Grande · Zona 3: La Represa de Betania (v4.0), en el Huila. Mismo trazado que la tercera zona de
// cada región: la tilapia limpia se reparte entre el Ahumadero, la Fileteadora (que le pasa los filetes a la Olla del
// escabeche) y la Cocina de la represa.
import { ICON } from '../icons.js';

export const ZONE45 = {
  id: 'betania',
  region: 'tolima',
  name: 'La Represa de Betania',
  icon: ICON.tilapia,
  theme: 'lake',
  style: 'betania',
  size: 26,
  seed: 197,
  chain: ['tilapia_cages', 'tilapia_cleaner', 'tilapia_smoker', 'tilapia_filleter', 'escabeche_pot', 'represa_kitchen'],
  farm: { stationId: 'tilapia_cages', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'tilapia_cleaner', x: 9, y: 5 },
    { stationId: 'tilapia_filleter', x: 9, y: 8 },
    // La Olla del escabeche va junto a la Fileteadora: los filetes pasan de una a otra.
    { stationId: 'escabeche_pot', x: 12, y: 7 },
    { stationId: 'tilapia_smoker', x: 11, y: 12 },
    { stationId: 'represa_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Yaguará ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // La tilapia ahumada y el escabeche salen hacia La Chamba; el almuerzo, hacia Neiva.
  routes: {
    ahumadas_tilapia: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Tilapia ahumada a La Chamba ⬇' },
    escabeches: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Escabeche ⬇' },
    almuerzos_represa: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Almuerzos a Neiva ➜' },
  },
  unlockedBy: 'cafe_huila',
  next: 'lechoneria',
};
