// Catálogo completo de estaciones (38), ver docs/GDD.md §4b.
// `release`: versión del juego en la que se vuelve jugable.
//
//   in:     productos consumidos por ciclo
//   out:    productos generados por ciclo
//   by:     subproductos generados por ciclo
//   cycle:  segundos por ciclo a nivel 1
//   infinite: fuente ilimitada (no consume nada)
//   side:     rama secundaria fuera de la cadena principal; requires = estación que la habilita
//   fuel:     combustible opcional que llega directo de otra estación (subproducto) y la acelera

import { ICON } from './icons.js';

export const STATIONS = [
  // Zona 1 · La Finca
  { id: 'farm', zone: 'finca', name: 'Cafetal', icon: '🌳', infinite: true, out: { cherry: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '0.1' },
  { id: 'wetmill', zone: 'finca', name: 'Beneficiadero', icon: '💧', in: { cherry: 2 }, out: { washed: 1 }, by: { pulp: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '0.2' },
  { id: 'dryer', zone: 'finca', name: 'Marquesina de secado', icon: '☀️', in: { washed: 1 }, out: { parchment: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '0.2' },
  { id: 'huller', zone: 'finca', name: 'Trilladora', icon: '⚙️', in: { parchment: 1 }, out: { green: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '0.2' },
  { id: 'roaster', zone: 'finca', name: 'Tostadora', icon: '🔥', in: { green: 2 }, out: { roasted: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '0.2' },
  { id: 'grinder', zone: 'finca', name: 'Molino', icon: '🌀', in: { roasted: 1 }, out: { ground: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '0.2' },
  { id: 'packer', zone: 'finca', name: 'Empacadora', icon: '📦', in: { ground: 4 }, out: { coffee_bag: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '0.2' },
  // Rama secundaria: la pulpa del Beneficiadero pasa directo por una canaleta (sin mulas) y el
  // compost hace que todo lo que vende la Finca valga más mientras haya (ver sim/modifiers.js).
  { id: 'composter', zone: 'finca', name: 'Compostera', icon: '🪱', in: { pulp: 4 }, out: { compost: 1 }, cycle: 16, unlockCost: 1500, upgradeBase: 10, growth: 1.15, release: '1.0', side: true, requires: 'wetmill' },

  // Zona 2 · El Trapiche
  { id: 'canefield', zone: 'trapiche', name: 'Cañaduzal', icon: '🎋', infinite: true, out: { cane: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '1.1' },
  { id: 'cane_mill', zone: 'trapiche', name: 'Molienda', icon: '⚙️', in: { cane: 1 }, out: { guarapo: 1 }, by: { bagasse: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '1.1' },
  // El bagazo de la Molienda pasa directo a la Hornilla como combustible: mientras haya, trabaja ×2.
  { id: 'furnace', zone: 'trapiche', name: 'Hornilla', icon: '🔥', in: { guarapo: 2 }, out: { melado: 1 }, fuel: { product: 'bagasse', from: 'cane_mill', perCycle: 1, boost: 2 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '1.1' },
  { id: 'molds', zone: 'trapiche', name: 'Gaveras', icon: '🧱', in: { melado: 2 }, out: { panela: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '1.1' },
  { id: 'pulverizer', zone: 'trapiche', name: 'Pulverizadora', icon: '🌀', in: { panela: 1 }, out: { panela_powder: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '1.1' },

  // Zona 3 · La Lechería (v1.2). La leche pasteurizada se reparte: a igual nivel, un cuarto para la
  // Quesera, la Descremadora, la Paila y la Ruta de la leche al Cacaotal (ver sim/transport.js: exportsOf).
  { id: 'pasture', zone: 'lecheria', name: 'Potrero y establo', icon: '🐄', infinite: true, out: { raw_milk: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '1.2' },
  { id: 'pasteurizer', zone: 'lecheria', name: 'Pasteurizadora', icon: '🌡️', in: { raw_milk: 1 }, out: { milk: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '1.2' },
  { id: 'cheesery', zone: 'lecheria', name: 'Quesera', icon: ICON.cheese, in: { milk: 4 }, out: { cheese: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '1.2' },
  { id: 'separator', zone: 'lecheria', name: 'Descremadora', icon: ICON.cream, in: { milk: 2 }, out: { cream: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '1.2' },
  { id: 'churn', zone: 'lecheria', name: 'Batidora', icon: '🧈', in: { cream: 2 }, out: { butter: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '1.2' },
  // La panela pulverizada llega del Trapiche por la ruta (ver data/routes.js): sin ella, la Paila espera.
  { id: 'arequipe_pot', zone: 'lecheria', name: 'Paila de arequipe', icon: '🍮', in: { milk: 4 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela' }], out: { arequipe: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '1.2' },

  // Zona 4 · El Cacaotal (v1.3). La pasta de cacao se reparte entre la Mesa de chocolate y la
  // Chocolatería (la mitad cada una a igual nivel). Las dos necesitan panela del Trapiche y la
  // Chocolatería, además, leche pasteurizada de la Lechería (ver data/routes.js). A igual nivel en
  // todas las zonas, la panela que piden la Paila, la Mesa y la Chocolatería es ¾ de lo que da el
  // Trapiche, y la leche de la Chocolatería es el cuarto que la Pasteurizadora guarda para la ruta.
  { id: 'cacao_grove', zone: 'cacaotal', name: 'Cacaotal', icon: '🌳', infinite: true, out: { cacao_pod: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '1.3' },
  { id: 'fermenter', zone: 'cacaotal', name: 'Cajones de fermentación', icon: '📦', in: { cacao_pod: 2 }, out: { cacao_fermented: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '1.3' },
  { id: 'cacao_dryer', zone: 'cacaotal', name: 'Secadero', icon: '☀️', in: { cacao_fermented: 1 }, out: { cacao_dry: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '1.3' },
  { id: 'cacao_roaster', zone: 'cacaotal', name: 'Tostador de cacao', icon: '🔥', in: { cacao_dry: 1 }, out: { cacao_roasted: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '1.3' },
  { id: 'cacao_mill', zone: 'cacaotal', name: 'Molino de cacao', icon: '🌀', in: { cacao_roasted: 2 }, out: { cacao_paste: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '1.3' },
  { id: 'chocolate_table', zone: 'cacaotal', name: 'Mesa de chocolate', icon: '🍫', in: { cacao_paste: 2 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_cacao' }], out: { table_chocolate: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '1.3' },
  { id: 'chocolatier', zone: 'cacaotal', name: 'Chocolatería', icon: '🍬', in: { cacao_paste: 2 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_cacao' }, { product: 'milk', perCycle: 4, route: 'leche' }], out: { milk_chocolate: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '1.3' },

  // Zona 5 · El Maizal (v1.4). Cadena lineal; el Puesto de arepas necesita queso y mantequilla de la
  // Lechería: a igual nivel, todo lo que hacen la Quesera y la Batidora (ver data/routes.js).
  { id: 'cornfield', zone: 'maizal', name: 'Maizal', icon: '🌽', infinite: true, out: { corn_cob: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '1.4' },
  { id: 'sheller', zone: 'maizal', name: 'Desgranadora', icon: '⚙️', in: { corn_cob: 1 }, out: { corn_kernels: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '1.4' },
  { id: 'corn_huller', zone: 'maizal', name: 'Piladora', icon: '🪵', in: { corn_kernels: 2 }, out: { corn_hulled: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '1.4' },
  { id: 'dough_mill', zone: 'maizal', name: 'Molino de masa', icon: '🌀', in: { corn_hulled: 2 }, out: { corn_dough: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '1.4' },
  { id: 'budare', zone: 'maizal', name: 'Budare', icon: '🔥', in: { corn_dough: 1 }, out: { arepa: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '1.4' },
  { id: 'arepa_stand', zone: 'maizal', name: 'Puesto de arepas', icon: '🥪', in: { arepa: 4 }, imports: [{ product: 'cheese', perCycle: 1, route: 'queso' }, { product: 'butter', perCycle: 1, route: 'mantequilla' }], out: { cheese_arepa: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '1.4' },

  // Zona 6 · El Pueblo (v1.5). Sin fuente propia: todo llega por rutas. A igual nivel en todas las
  // zonas, cada proveedora tiene un producto final que no se lleva nadie más (1 cada 32 s): las bolsas
  // de café, el cuarto de panela que sobra, el arequipe, los dos chocolates y las arepas de queso. El
  // Pueblo los gasta justo. La Casa del café reparte su café de origen entre la Greca y el Taller.
  { id: 'coffee_house', zone: 'pueblo', name: 'Casa del café', icon: '🏛️', imports: [{ product: 'coffee_bag', perCycle: 1, route: 'cafe' }], out: { cafe_origen: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '1.5' },
  { id: 'greca', zone: 'pueblo', name: 'Greca de tintos', icon: '☕', in: { cafe_origen: 1 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_pueblo' }], out: { tinto: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '1.5' },
  { id: 'fonda', zone: 'pueblo', name: 'Fonda', icon: '🍳', in: { tinto: 2 }, imports: [{ product: 'cheese_arepa', perCycle: 1, route: 'arepas' }], out: { breakfast: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '1.5' },
  { id: 'basket_shop', zone: 'pueblo', name: 'Taller de canastas', icon: '🧺', in: { cafe_origen: 1 }, imports: [{ product: 'arequipe', perCycle: 1, route: 'arequipe' }], out: { basket: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '1.5' },
  { id: 'gift_wrap', zone: 'pueblo', name: 'Empaque de regalos', icon: '🎁', in: { basket: 1 }, imports: [{ product: 'table_chocolate', perCycle: 1, route: 'chocolate_mesa' }, { product: 'milk_chocolate', perCycle: 1, route: 'chocolatinas' }], out: { gift_basket: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '1.5' },
  { id: 'export_dock', zone: 'pueblo', name: 'Patio de contenedores', icon: '🚢', in: { gift_basket: 4 }, out: { container: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '1.5' },
];

export const STATIONS_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

// Bodega + Despacho (Willys). Uno por zona; el precio de sus mejoras está en los datos de cada zona.
export const DISPATCH = {
  id: 'dispatch',
  name: 'Bodega y Despacho',
  icon: '🚙',
  capacityBase: 10, // unidades por viaje a nivel 1
  capacityPerLevel: 5, // unidades extra por nivel
  tripTime: 10, // segundos ida y vuelta
  maxWait: 3, // segundos que espera el Willys con carga parcial antes de salir
  warehouseTrips: 5, // la bodega guarda lo equivalente a N viajes
};
