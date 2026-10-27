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
//   harvest:  cosecha de temporada (v3.4, el Hormiguero): solo produce en `season`, `mult` veces más (lo
//             de todo el año), y guarda en su patio (la despensa) `store` segundos de producción

import { ICON } from './icons.js';

export const STATIONS = [
  // Zona 1 · La Finca
  { id: 'farm', zone: 'finca', name: 'Cafetal', icon: ICON.coffeePlant, infinite: true, out: { cherry: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '0.1' },
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
  { id: 'chocolatier', zone: 'cacaotal', name: 'Chocolatería', icon: ICON.milkChocolate, in: { cacao_paste: 2 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_cacao' }, { product: 'milk', perCycle: 4, route: 'leche' }], out: { milk_chocolate: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '1.3' },

  // Zona 5 · El Maizal (v1.4). Cadena lineal; el Puesto de arepas necesita queso y mantequilla de la
  // Lechería: a igual nivel, todo lo que hacen la Quesera y la Batidora (ver data/routes.js).
  { id: 'cornfield', zone: 'maizal', name: 'Maizal', icon: '🌽', infinite: true, out: { corn_cob: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '1.4' },
  { id: 'sheller', zone: 'maizal', name: 'Desgranadora', icon: '⚙️', in: { corn_cob: 1 }, out: { corn_kernels: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '1.4' },
  { id: 'corn_huller', zone: 'maizal', name: 'Piladora', icon: '🪵', in: { corn_kernels: 2 }, out: { corn_hulled: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '1.4' },
  { id: 'dough_mill', zone: 'maizal', name: 'Molino de masa', icon: '🌀', in: { corn_hulled: 2 }, out: { corn_dough: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '1.4' },
  { id: 'budare', zone: 'maizal', name: 'Budare', icon: '🔥', in: { corn_dough: 1 }, out: { arepa: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '1.4' },
  { id: 'arepa_stand', zone: 'maizal', name: 'Puesto de arepas', icon: ICON.cheeseArepa, in: { arepa: 4 }, imports: [{ product: 'cheese', perCycle: 1, route: 'queso' }, { product: 'butter', perCycle: 1, route: 'mantequilla' }], out: { cheese_arepa: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '1.4' },

  // Zona 6 · El Pueblo (v1.5). Sin fuente propia: todo llega por rutas. A igual nivel en todas las
  // zonas, cada proveedora tiene un producto final que no se lleva nadie más (1 cada 32 s): las bolsas
  // de café, el cuarto de panela que sobra, el arequipe, los dos chocolates y las arepas de queso. El
  // Pueblo los gasta justo. La Casa del café reparte su café de origen entre la Greca y el Taller.
  { id: 'coffee_house', zone: 'pueblo', name: 'Casa del café', icon: '🏛️', imports: [{ product: 'coffee_bag', perCycle: 1, route: 'cafe' }], out: { cafe_origen: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '1.5' },
  { id: 'greca', zone: 'pueblo', name: 'Greca de tintos', icon: '☕', in: { cafe_origen: 1 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_pueblo' }], out: { tinto: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '1.5' },
  { id: 'fonda', zone: 'pueblo', name: 'Fonda', icon: ICON.breakfast, in: { tinto: 2 }, imports: [{ product: 'cheese_arepa', perCycle: 1, route: 'arepas' }], out: { breakfast: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '1.5' },
  { id: 'basket_shop', zone: 'pueblo', name: 'Taller de canastas', icon: '🧺', in: { cafe_origen: 1 }, imports: [{ product: 'arequipe', perCycle: 1, route: 'arequipe' }], out: { basket: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '1.5' },
  { id: 'gift_wrap', zone: 'pueblo', name: 'Empaque de regalos', icon: '🎁', in: { basket: 1 }, imports: [{ product: 'table_chocolate', perCycle: 1, route: 'chocolate_mesa' }, { product: 'milk_chocolate', perCycle: 1, route: 'chocolatinas' }], out: { gift_basket: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '1.5' },
  { id: 'export_dock', zone: 'pueblo', name: 'Patio de contenedores', icon: ICON.container, in: { gift_basket: 4 }, out: { container: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '1.5' },

  // Santander · La Guayabera (v3.0). La guayaba se vuelve bocadillo veleño: misma estructura y mismos
  // números que la Finca (la región empieza de cero, con su propia economía).
  { id: 'guava_grove', zone: 'guayabera', name: 'Guayabal', icon: ICON.guavaTree, infinite: true, out: { guava: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.0' },
  { id: 'guava_pulper', zone: 'guayabera', name: 'Despulpadora de guayaba', icon: '⚙️', in: { guava: 2 }, out: { guava_pulp: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.0' },
  { id: 'guava_pot', zone: 'guayabera', name: 'Paila de bocadillo', icon: '🔥', in: { guava_pulp: 1 }, out: { guava_jelly: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.0' },
  { id: 'guava_molds', zone: 'guayabera', name: 'Moldes de madera', icon: '🪵', in: { guava_jelly: 1 }, out: { bocadillo_block: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.0' },
  { id: 'bocadillo_cutter', zone: 'guayabera', name: 'Cortadora', icon: '🔪', in: { bocadillo_block: 2 }, out: { bocadillo: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.0' },
  { id: 'bijao_wrapper', zone: 'guayabera', name: 'Envoltura en bijao', icon: '🍃', in: { bocadillo: 1 }, out: { bocadillo_bijao: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.0' },
  { id: 'crate_packer', zone: 'guayabera', name: 'Cajonera', icon: '📦', in: { bocadillo_bijao: 4 }, out: { bocadillo_crate: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.0' },

  // Costa · El Arrozal (v3.15), en las vegas del Sinú y del Magdalena: el arroz en cáscara se seca, se
  // descascara, se pule, se clasifica, se empaca y sale en bultos. Misma estructura y mismos números que
  // la Finca y la Guayabera: la región empieza de cero.
  { id: 'rice_field', zone: 'arrozal', name: 'Arrozal', icon: ICON.ricePlant, infinite: true, out: { paddy: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.15' },
  { id: 'rice_dryer', zone: 'arrozal', name: 'Secadora de arroz', icon: '☀️', in: { paddy: 2 }, out: { dry_paddy: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.15' },
  { id: 'rice_huller', zone: 'arrozal', name: 'Descascaradora', icon: '⚙️', in: { dry_paddy: 1 }, out: { brown_rice: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.15' },
  { id: 'rice_polisher', zone: 'arrozal', name: 'Pulidora', icon: '✨', in: { brown_rice: 1 }, out: { white_rice: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.15' },
  { id: 'rice_sorter', zone: 'arrozal', name: 'Clasificadora', icon: '🔍', in: { white_rice: 2 }, out: { premium_rice: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.15' },
  { id: 'rice_bagger', zone: 'arrozal', name: 'Empacadora de arroz', icon: ICON.riceBag, in: { premium_rice: 1 }, out: { rice_bag: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.15' },
  { id: 'rice_stacker', zone: 'arrozal', name: 'Bultera', icon: ICON.riceSack, in: { rice_bag: 4 }, out: { rice_sack: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.15' },

  // Costa · El Cocal (v3.16), en el golfo de Morrosquillo: el coco se pela, se ralla, se exprime y su
  // leche se cocina en paila con panela hasta volverse cocada. Mismos números que el Tabacal.
  { id: 'coconut_grove', zone: 'cocal', name: 'Cocal', icon: ICON.coconutPalm, infinite: true, out: { coconut: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.16' },
  { id: 'coconut_peeler', zone: 'cocal', name: 'Peladero de cocos', icon: ICON.peeledCoconut, in: { coconut: 1 }, out: { peeled_coconut: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.16' },
  { id: 'coconut_grater', zone: 'cocal', name: 'Ralladora', icon: ICON.gratedCoconut, in: { peeled_coconut: 2 }, out: { grated_coconut: 1 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.16' },
  { id: 'coconut_press', zone: 'cocal', name: 'Prensa de coco', icon: ICON.coconutMilk, in: { grated_coconut: 2 }, out: { coconut_milk: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.16' },
  { id: 'cocada_kitchen', zone: 'cocal', name: 'Paila de cocadas', icon: ICON.cocada, in: { coconut_milk: 1 }, out: { cocada: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.16' },

  // Costa · La Ciénaga (v3.17), en la Ciénaga Grande: los pescadores sacan el bocachico en canoa; se limpia
  // y se reparte entre el Saladero, la Fileteadora (que le pasa los filetes a la Fritanga) y la Cocina, que
  // lo cocina en la leche de coco que llega del Cocal. Mismos números que la Fiquera.
  { id: 'fishing_canoes', zone: 'cienaga', name: 'Canoas de pesca', icon: ICON.canoe, infinite: true, out: { fish: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.17' },
  { id: 'fish_cleaner', zone: 'cienaga', name: 'Limpieza de pescado', icon: ICON.cleanFish, in: { fish: 1 }, out: { clean_fish: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.17' },
  { id: 'fish_salter', zone: 'cienaga', name: 'Saladero', icon: ICON.saltedFish, in: { clean_fish: 4 }, out: { salted_fish: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.17' },
  { id: 'fish_filleter', zone: 'cienaga', name: 'Fileteadora', icon: ICON.fishFillet, in: { clean_fish: 2 }, out: { fish_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.17' },
  { id: 'fish_fryer', zone: 'cienaga', name: 'Fritanga', icon: ICON.friedFish, in: { fish_fillet: 2 }, out: { fried_fish: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.17' },
  { id: 'coconut_fish_kitchen', zone: 'cienaga', name: 'Cocina del pescado en coco', icon: ICON.fishInCoconut, in: { clean_fish: 4 }, imports: [{ product: 'coconut_milk', perCycle: 1, route: 'coco' }], out: { fish_in_coconut: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.17' },

  // Costa · La Quesera (v3.18), en las sabanas de Córdoba y Sucre: la leche de las vacas cebú se cuaja, la
  // cuajada se muele con sal y se prensa (queso costeño), y con el queso se hace el mote. El mote se reparte
  // entre la Fonda costeña, que lo sirve con el arroz del Arrozal, y la Cocina de la bandeja, que además
  // lleva el pescado de la Ciénaga. Mismos números que el Hato.
  { id: 'milking_corral', zone: 'quesera', name: 'Corral de ordeño', icon: ICON.cebu, infinite: true, out: { ordeno_milk: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.18' },
  { id: 'curdler', zone: 'quesera', name: 'Cuajadera', icon: ICON.cuajada, in: { ordeno_milk: 2 }, out: { cuajada: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.18' },
  { id: 'curd_mill', zone: 'quesera', name: 'Molino de cuajada', icon: ICON.saltedCurd, in: { cuajada: 1 }, out: { salted_curd: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.18' },
  { id: 'cheese_press', zone: 'quesera', name: 'Prensa de queso', icon: ICON.quesoCosteno, in: { salted_curd: 1 }, out: { queso_costeno: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.18' },
  { id: 'mote_pot', zone: 'quesera', name: 'Olla del mote', icon: ICON.moteQueso, in: { queso_costeno: 2 }, out: { mote_queso: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.18' },
  { id: 'costeno_fonda', zone: 'quesera', name: 'Fonda costeña', icon: ICON.almuerzoCosteno, in: { mote_queso: 2 }, imports: [{ product: 'rice_bag', perCycle: 1, route: 'arroz' }], out: { almuerzo_costeno: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.18' },
  { id: 'bandeja_kitchen', zone: 'quesera', name: 'Cocina de la bandeja', icon: ICON.bandejaCostena, in: { mote_queso: 2 }, imports: [{ product: 'rice_bag', perCycle: 1, route: 'arroz' }, { product: 'clean_fish', perCycle: 4, route: 'pescado' }], out: { bandeja_costena: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.18' },

  // Costa · El Sombrero (v3.19), en Tuchín y San Andrés de Sotavento, tierra zenú: la caña flecha se raspa,
  // la fibra se tiñe de negro con barro y bija, se trenza y la trenza se cose en vueltas hasta el sombrero
  // vueltiao. El Parador de Tuchín lo vende con el pescado salado y el frito de la Ciénaga. Mismos números
  // que las Hormigas (sin su cosecha de temporada: la caña flecha se corta todo el año).
  { id: 'canaflechal', zone: 'sombrero', name: 'Cañaflechal', icon: ICON.canaFlechaPlant, infinite: true, out: { cana_flecha: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.19' },
  { id: 'fiber_scraper', zone: 'sombrero', name: 'Raspado de la caña', icon: ICON.canaFiber, in: { cana_flecha: 1 }, out: { cana_fiber: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.19' },
  { id: 'fiber_dyer', zone: 'sombrero', name: 'Tintes de barro', icon: ICON.dyedFiber, in: { cana_fiber: 2 }, out: { dyed_fiber: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.19' },
  { id: 'braiders', zone: 'sombrero', name: 'Trenzadoras', icon: ICON.trenza, in: { dyed_fiber: 2 }, out: { trenza: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.19' },
  { id: 'hat_sewer', zone: 'sombrero', name: 'Costura del sombrero', icon: ICON.sombreroVueltiao, in: { trenza: 1 }, out: { sombrero_vueltiao: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.19' },
  { id: 'parador', zone: 'sombrero', name: 'Parador de Tuchín', icon: ICON.recuerdoCosta, in: { sombrero_vueltiao: 4 }, imports: [{ product: 'salted_fish', perCycle: 1, route: 'salado' }, { product: 'fried_fish', perCycle: 1, route: 'frito' }], out: { recuerdo_costa: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.19' },

  // Costa · Cartagena (v3.20), el final de la región: como Barichara, sin fuente propia. Cada estación recibe
  // el producto final de una zona de la Costa; todo termina en el paseo en lancha a las Islas del Rosario.
  { id: 'fogon_getsemani', zone: 'cartagena', name: 'Fogón de Getsemaní', icon: ICON.arrozConCoco, imports: [{ product: 'rice_sack', perCycle: 1, route: 'bultos' }], out: { arroz_con_coco: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.20' },
  { id: 'restaurante_muralla', zone: 'cartagena', name: 'Restaurante de la muralla', icon: ICON.cenaMuralla, in: { arroz_con_coco: 1 }, imports: [{ product: 'cocada', perCycle: 1, route: 'cocadas' }], out: { cena_muralla: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.20' },
  { id: 'hotel_colonial', zone: 'cartagena', name: 'Hotel colonial', icon: ICON.nocheHotel, in: { cena_muralla: 2 }, imports: [{ product: 'recuerdo_costa', perCycle: 1, route: 'recuerdos_costa' }], out: { noche_hotel: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.20' },
  { id: 'cocina_bahia', zone: 'cartagena', name: 'Cocina de la bahía', icon: ICON.almuerzoBahia, in: { arroz_con_coco: 1 }, imports: [{ product: 'fish_in_coconut', perCycle: 1, route: 'cazuelas' }], out: { almuerzo_bahia: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.20' },
  { id: 'loncheras', zone: 'cartagena', name: 'Loncheras del paseo', icon: ICON.loncheraPaseo, in: { almuerzo_bahia: 1 }, imports: [{ product: 'almuerzo_costeno', perCycle: 1, route: 'almuerzos_costenos' }, { product: 'bandeja_costena', perCycle: 1, route: 'bandejas' }], out: { lonchera_paseo: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.20' },
  { id: 'muelle', zone: 'cartagena', name: 'Muelle de las lanchas', icon: ICON.paseoIslas, in: { lonchera_paseo: 4 }, out: { paseo_islas: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.20' },

  // Boyacá · El Papal (v3.22), en la tierra fría del altiplano: la papa se lava, se selecciona, se pela, se
  // fríe (las papitas criollas), se empaca en bolsas y las bolsas en cajas. Mismos números que la Finca, la
  // Guayabera y el Arrozal: la región empieza de cero.
  { id: 'potato_field', zone: 'papal', name: 'Papal', icon: ICON.potatoPlant, infinite: true, out: { potato: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.22' },
  { id: 'potato_washer', zone: 'papal', name: 'Lavadero de papa', icon: ICON.washedPotato, in: { potato: 2 }, out: { washed_potato: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.22' },
  { id: 'potato_grader', zone: 'papal', name: 'Seleccionadora', icon: ICON.gradedPotato, in: { washed_potato: 1 }, out: { graded_potato: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.22' },
  { id: 'potato_peeler', zone: 'papal', name: 'Peladora de papa', icon: ICON.peeledPotato, in: { graded_potato: 1 }, out: { peeled_potato: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.22' },
  { id: 'criollas_fryer', zone: 'papal', name: 'Freidora', icon: ICON.criollas, in: { peeled_potato: 2 }, out: { criollas: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.22' },
  { id: 'criollas_bagger', zone: 'papal', name: 'Empacadora de papitas', icon: ICON.criollasBag, in: { criollas: 1 }, out: { criollas_bag: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.22' },
  { id: 'criollas_boxer', zone: 'papal', name: 'Cajonera', icon: ICON.criollasBox, in: { criollas_bag: 4 }, out: { criollas_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.22' },

  // Boyacá · La Cervecería (v3.23), en el altiplano de Tibasosa y Duitama: la cebada se maltea, la malta se
  // muele y se cocina en la paila (el mosto), el mosto fermenta en los tanques y la cerveza se embotella.
  // Mismos números que el Tabacal y el Cocal.
  { id: 'barley_field', zone: 'cerveceria', name: 'Cebadal', icon: ICON.barleyPlant, infinite: true, out: { barley: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.23' },
  { id: 'maltings', zone: 'cerveceria', name: 'Maltería', icon: ICON.malt, in: { barley: 1 }, out: { malt: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.23' },
  { id: 'brew_kettle', zone: 'cerveceria', name: 'Paila de cocción', icon: ICON.wort, in: { malt: 2 }, out: { wort: 1 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.23' },
  { id: 'fermenters', zone: 'cerveceria', name: 'Tanques de fermentación', icon: ICON.beer, in: { wort: 2 }, out: { beer: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.23' },
  { id: 'bottler', zone: 'cerveceria', name: 'Embotelladora', icon: ICON.beerCrate, in: { beer: 1 }, out: { beer_crate: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.23' },

  // Boyacá · Ráquira (v3.24), el pueblo de los alfareros: la greda se amasa y el barro se reparte entre las
  // Ollas de barro, el Torno (que le pasa las piezas al Horno de leña, donde salen las materas pintadas) y las
  // Jarras, que se llenan con la cerveza que llega de la Cervecería. Mismos números que la Fiquera y la Ciénaga.
  { id: 'clay_pit', zone: 'raquira', name: 'Mina de greda', icon: ICON.greda, infinite: true, out: { greda: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.24' },
  { id: 'clay_kneader', zone: 'raquira', name: 'Amasado del barro', icon: ICON.barro, in: { greda: 1 }, out: { barro: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.24' },
  { id: 'pot_maker', zone: 'raquira', name: 'Ollas de barro', icon: ICON.ollaBarro, in: { barro: 4 }, out: { olla_barro: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.24' },
  { id: 'potter_wheel', zone: 'raquira', name: 'Torno', icon: ICON.piezaTorneada, in: { barro: 2 }, out: { pieza_torneada: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.24' },
  { id: 'pottery_kiln', zone: 'raquira', name: 'Horno de leña', icon: ICON.matera, in: { pieza_torneada: 2 }, out: { matera: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.24' },
  { id: 'jarras', zone: 'raquira', name: 'Jarras', icon: ICON.jarraCerveza, in: { barro: 4 }, imports: [{ product: 'beer', perCycle: 1, route: 'cerveza' }], out: { jarra_cerveza: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.24' },

  // Boyacá · Paipa (v3.25), tierra de quesos y de amasijos: la leche se cuaja, la cuajada se prensa en moldes y
  // madura en la cava (el queso Paipa), y con el queso se hacen almojábanas. Las almojábanas se reparten entre
  // la Mesa del piquete, que las sirve con las papitas del Papal, y el Horno de barro, que hace la canasta de
  // amasijos y se mantiene con el barro de Ráquira. Mismos números que el Hato y la Quesera.
  { id: 'paipa_herd', zone: 'paipa', name: 'Hato lechero', icon: ICON.rawMilk, infinite: true, out: { paipa_milk: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.25' },
  { id: 'paipa_curdler', zone: 'paipa', name: 'Cuajadera de Paipa', icon: ICON.cuajada, in: { paipa_milk: 2 }, out: { paipa_curd: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.25' },
  { id: 'cheese_molds', zone: 'paipa', name: 'Moldes de queso', icon: ICON.moldedCheese, in: { paipa_curd: 1 }, out: { molded_cheese: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.25' },
  { id: 'cheese_cave', zone: 'paipa', name: 'Cava de maduración', icon: ICON.quesoPaipa, in: { molded_cheese: 1 }, out: { queso_paipa: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.25' },
  { id: 'almojabana_oven', zone: 'paipa', name: 'Horno de almojábanas', icon: ICON.almojabana, in: { queso_paipa: 2 }, out: { almojabana: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.25' },
  { id: 'piquete_table', zone: 'paipa', name: 'Mesa del piquete', icon: ICON.piquete, in: { almojabana: 2 }, imports: [{ product: 'criollas_bag', perCycle: 1, route: 'papitas' }], out: { piquete: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.25' },
  { id: 'clay_oven', zone: 'paipa', name: 'Horno de barro', icon: ICON.amasijos, in: { almojabana: 2 }, imports: [{ product: 'criollas_bag', perCycle: 1, route: 'papitas' }, { product: 'barro', perCycle: 4, route: 'barro' }], out: { canasta_amasijos: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.25' },

  // Boyacá · Las Ruanas (v3.26), en Nobsa, la tierra de las ruanas: la lana se trasquila, se lava, se carda,
  // se hila en la rueca y se teje en el telar. La Tienda de Nobsa vende el recuerdo de Boyacá: ruanas con las
  // ollas y las materas de Ráquira. Mismos números que las Hormigas y el Sombrero.
  { id: 'sheep_pasture', zone: 'ruanas', name: 'Rebaño de ovejas', icon: ICON.sheep, infinite: true, out: { wool: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.26' },
  { id: 'wool_washer', zone: 'ruanas', name: 'Lavado de lana', icon: ICON.cleanWool, in: { wool: 1 }, out: { clean_wool: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.26' },
  { id: 'carder', zone: 'ruanas', name: 'Cardado', icon: ICON.cardedWool, in: { clean_wool: 2 }, out: { carded_wool: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.26' },
  { id: 'spinning_wheel', zone: 'ruanas', name: 'Hilado en rueca', icon: ICON.woolYarn, in: { carded_wool: 2 }, out: { wool_yarn: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.26' },
  { id: 'ruana_loom', zone: 'ruanas', name: 'Telar de ruanas', icon: ICON.ruana, in: { wool_yarn: 1 }, out: { ruana: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.26' },
  { id: 'tienda_nobsa', zone: 'ruanas', name: 'Tienda de Nobsa', icon: ICON.recuerdoBoyaca, in: { ruana: 4 }, imports: [{ product: 'olla_barro', perCycle: 1, route: 'ollas' }, { product: 'matera', perCycle: 1, route: 'materas' }], out: { recuerdo_boyaca: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.26' },

  // Boyacá · Villa de Leyva (v3.27), el final de la región: como Barichara y Cartagena, sin fuente propia.
  // Cada estación recibe el producto final de una zona de Boyacá; todo termina en la excursión al Fósil.
  { id: 'tienda_esquina', zone: 'villa_leyva', name: 'Tienda de la esquina', icon: ICON.onces, imports: [{ product: 'criollas_box', perCycle: 1, route: 'cajas_papitas' }], out: { onces: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.27' },
  { id: 'terraza_plaza', zone: 'villa_leyva', name: 'Terraza de la plaza', icon: ICON.tardePlaza, in: { onces: 1 }, imports: [{ product: 'beer_crate', perCycle: 1, route: 'canastas_cerveza' }], out: { tarde_plaza: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.27' },
  { id: 'hospedaje_colonial', zone: 'villa_leyva', name: 'Hospedaje colonial', icon: ICON.nocheVilla, in: { tarde_plaza: 2 }, imports: [{ product: 'recuerdo_boyaca', perCycle: 1, route: 'recuerdos_boyaca' }], out: { noche_villa: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.27' },
  { id: 'mercado_sabado', zone: 'villa_leyva', name: 'Mercado del sábado', icon: ICON.canastaMercado, in: { onces: 1 }, imports: [{ product: 'jarra_cerveza', perCycle: 1, route: 'jarras_cerveza' }], out: { canasta_mercado: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.27' },
  { id: 'canastos_paseo', zone: 'villa_leyva', name: 'Canastos del paseo', icon: ICON.fiambrePaseo, in: { canasta_mercado: 1 }, imports: [{ product: 'piquete', perCycle: 1, route: 'piquetes' }, { product: 'canasta_amasijos', perCycle: 1, route: 'amasijos' }], out: { fiambre_paseo: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.27' },
  { id: 'salida_fosil', zone: 'villa_leyva', name: 'Salida al Fósil', icon: ICON.excursionFosil, in: { fiambre_paseo: 4 }, out: { excursion_fosil: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.27' },

  // Los Llanos · La Palma (v3.31), en las sabanas del Meta: los racimos de la palma de aceite se desgranan, el
  // fruto se cocina al vapor, se prensa (el aceite crudo), se clarifica, se envasa en botellas y las botellas en
  // cajas. Mismos números que la Finca, la Guayabera, el Arrozal y el Papal: la región empieza de cero.
  { id: 'palm_grove', zone: 'palma', name: 'Palmar', icon: ICON.oilPalm, infinite: true, out: { palm_bunch: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.31' },
  { id: 'bunch_thresher', zone: 'palma', name: 'Desgranadora', icon: ICON.palmFruit, in: { palm_bunch: 2 }, out: { palm_fruit: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.31' },
  { id: 'fruit_sterilizer', zone: 'palma', name: 'Esterilizador', icon: ICON.cookedFruit, in: { palm_fruit: 1 }, out: { cooked_fruit: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.31' },
  { id: 'palm_press', zone: 'palma', name: 'Prensa de aceite', icon: '🛢️', in: { cooked_fruit: 1 }, out: { crude_oil: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.31' },
  { id: 'oil_clarifier', zone: 'palma', name: 'Clarificador', icon: ICON.palmOil, in: { crude_oil: 2 }, out: { palm_oil: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.31' },
  { id: 'oil_bottler', zone: 'palma', name: 'Envasadora', icon: ICON.oilBottle, in: { palm_oil: 1 }, out: { oil_bottle: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.31' },
  { id: 'oil_boxer', zone: 'palma', name: 'Cajonera de aceite', icon: ICON.oilBox, in: { oil_bottle: 4 }, out: { oil_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.31' },

  // Los Llanos · El Frutal (v3.32), en las vegas del Meta: el maracuyá se despulpa, la pulpa se pasteuriza, se
  // vuelve jugo en la mezcladora y el jugo se envasa en cajitas. Mismos números que el Tabacal, el Cocal y la
  // Cervecería; el jugo es el que después viajará a la Cachamera, y las cajas, a Villavicencio.
  { id: 'passion_vines', zone: 'frutal', name: 'Maracuyal', icon: ICON.passionVine, infinite: true, out: { passion_fruit: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.32' },
  { id: 'passion_pulper', zone: 'frutal', name: 'Despulpadora de maracuyá', icon: ICON.passionPulp, in: { passion_fruit: 1 }, out: { passion_pulp: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.32' },
  { id: 'pulp_pasteurizer', zone: 'frutal', name: 'Pasteurizadora de pulpa', icon: ICON.pastPulp, in: { passion_pulp: 2 }, out: { past_pulp: 1 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.32' },
  { id: 'juice_mixer', zone: 'frutal', name: 'Mezcladora de jugos', icon: ICON.passionJuice, in: { past_pulp: 2 }, out: { passion_juice: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.32' },
  { id: 'juice_packer', zone: 'frutal', name: 'Envasadora de jugos', icon: ICON.juiceBox, in: { passion_juice: 1 }, out: { juice_box: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.32' },

  // Los Llanos · La Cachamera (v3.33): la cachama se cría en estanques, se limpia y se reparte entre la Pisillera
  // (el pisillo, desmechado y sofrito), la Fileteadora (que le pasa los filetes al Ahumadero) y la Cocina de la
  // cachama, que la sirve con salsa de maracuyá con el jugo del Frutal. Mismos números que la Fiquera, la Ciénaga y Ráquira.
  { id: 'fish_ponds', zone: 'cachamera', name: 'Estanques', icon: ICON.cachama, infinite: true, out: { cachama: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.33' },
  { id: 'cachama_cleaner', zone: 'cachamera', name: 'Limpieza de cachama', icon: ICON.cleanCachama, in: { cachama: 1 }, out: { clean_cachama: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.33' },
  { id: 'pisillo_kitchen', zone: 'cachamera', name: 'Pisillera', icon: ICON.pisillo, in: { clean_cachama: 4 }, out: { pisillo: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.33' },
  { id: 'cachama_filleter', zone: 'cachamera', name: 'Fileteadora de cachama', icon: ICON.cachamaFillet, in: { clean_cachama: 2 }, out: { cachama_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.33' },
  { id: 'cachama_smoker', zone: 'cachamera', name: 'Ahumadero', icon: ICON.smokedCachama, in: { cachama_fillet: 2 }, out: { smoked_cachama: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.33' },
  { id: 'cachama_kitchen', zone: 'cachamera', name: 'Cocina de la cachama', icon: ICON.cachamaMaracuya, in: { clean_cachama: 4 }, imports: [{ product: 'passion_juice', perCycle: 1, route: 'jugo' }], out: { cachama_maracuya: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.33' },

  // Los Llanos · El Hato llanero (v3.34): la ternera se despresa, se adoba con sal, se asa en vara (la mamona) y se
  // trincha: la carne a la llanera. Se reparte entre la Mesa del almuerzo llanero, que la sirve con yuca frita en
  // el aceite de la Palma, y el Asadero de la parranda, que además asa la cachama de la Cachamera. Mismos números
  // que el Hato, la Quesera y Paipa.
  { id: 'llanero_herd', zone: 'hato_llanero', name: 'Sabana del hato', icon: ICON.cebu, infinite: true, out: { llanero_steer: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.34' },
  { id: 'llanero_butcher', zone: 'hato_llanero', name: 'Desposte', icon: '🥩', in: { llanero_steer: 2 }, out: { ternera: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.34' },
  { id: 'adobadero', zone: 'hato_llanero', name: 'Adobadero', icon: ICON.adobada, in: { ternera: 1 }, out: { ternera_adobada: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.34' },
  { id: 'vara_grill', zone: 'hato_llanero', name: 'Asador de vara', icon: ICON.mamona, in: { ternera_adobada: 1 }, out: { mamona: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.34' },
  { id: 'carving_table', zone: 'hato_llanero', name: 'Trinchadora', icon: ICON.carneLlanera, in: { mamona: 2 }, out: { carne_llanera: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.34' },
  { id: 'lunch_llanero', zone: 'hato_llanero', name: 'Mesa del almuerzo llanero', icon: ICON.almuerzoLlanero, in: { carne_llanera: 2 }, imports: [{ product: 'oil_bottle', perCycle: 1, route: 'aceite' }], out: { almuerzo_llanero: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.34' },
  { id: 'parranda_grill', zone: 'hato_llanero', name: 'Asadero de la parranda', icon: ICON.parranda, in: { carne_llanera: 2 }, imports: [{ product: 'oil_bottle', perCycle: 1, route: 'aceite' }, { product: 'clean_cachama', perCycle: 4, route: 'cachamas' }], out: { parranda_llanera: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.34' },

  // Los Llanos · La Talabartería (v3.35): el cuero crudo se curte, se corta, se repuja y se vuelve silla de montar.
  // La Tienda llanera vende el Recuerdo del Llano: sillas con el pisillo y la cachama ahumada de la Cachamera para
  // el camino. Mismos números que las Hormigas, el Sombrero y Las Ruanas.
  { id: 'hide_yard', zone: 'talabarteria', name: 'Saladero de cueros', icon: ICON.rawHide, infinite: true, out: { raw_hide: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.35' },
  { id: 'tannery', zone: 'talabarteria', name: 'Curtiembre', icon: ICON.leather, in: { raw_hide: 1 }, out: { tanned_leather: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.35' },
  { id: 'leather_cutter', zone: 'talabarteria', name: 'Cortadora de cuero', icon: ICON.leatherPieces, in: { tanned_leather: 2 }, out: { leather_pieces: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.35' },
  { id: 'leather_tooler', zone: 'talabarteria', name: 'Repujado', icon: ICON.tooledLeather, in: { leather_pieces: 2 }, out: { tooled_leather: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.35' },
  { id: 'saddler', zone: 'talabarteria', name: 'Taller de sillas', icon: ICON.saddle, in: { tooled_leather: 1 }, out: { silla_montar: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.35' },
  { id: 'tienda_llanera', zone: 'talabarteria', name: 'Tienda llanera', icon: ICON.recuerdoLlano, in: { silla_montar: 4 }, imports: [{ product: 'pisillo', perCycle: 1, route: 'pisillos' }, { product: 'smoked_cachama', perCycle: 1, route: 'ahumadas' }], out: { recuerdo_llano: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.35' },

  // Los Llanos · Villavicencio (v3.36), la Puerta del Llano y el final de la región: como Barichara, Cartagena y
  // Villa de Leyva, sin fuente propia. Cada estación recibe el producto final de una zona llanera; todo termina en
  // la excursión a Caño Cristales.
  { id: 'empanaderia', zone: 'villavicencio', name: 'Empanadería', icon: ICON.empanadas, imports: [{ product: 'oil_box', perCycle: 1, route: 'cajas_aceite' }], out: { empanadas: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.36' },
  { id: 'kiosco_parque', zone: 'villavicencio', name: 'Kiosco del parque', icon: ICON.tardeParque, in: { empanadas: 1 }, imports: [{ product: 'juice_box', perCycle: 1, route: 'cajas_jugos' }], out: { tarde_parque: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.36' },
  { id: 'hotel_campestre', zone: 'villavicencio', name: 'Hotel campestre', icon: ICON.nocheVillavo, in: { tarde_parque: 2 }, imports: [{ product: 'recuerdo_llano', perCycle: 1, route: 'recuerdos_llano' }], out: { noche_villavo: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.36' },
  { id: 'plaza_mercado', zone: 'villavicencio', name: 'Plaza de mercado', icon: ICON.almuerzoPlaza, in: { empanadas: 1 }, imports: [{ product: 'cachama_maracuya', perCycle: 1, route: 'platos_cachama' }], out: { almuerzo_plaza: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.36' },
  { id: 'morrales_viaje', zone: 'villavicencio', name: 'Morrales del viaje', icon: ICON.fiambreViaje, in: { almuerzo_plaza: 1 }, imports: [{ product: 'almuerzo_llanero', perCycle: 1, route: 'almuerzos_llaneros' }, { product: 'parranda_llanera', perCycle: 1, route: 'parrandas' }], out: { fiambre_viaje: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.36' },
  { id: 'salida_cano', zone: 'villavicencio', name: 'Salida a Caño Cristales', icon: ICON.canoCristales, in: { fiambre_viaje: 4 }, out: { excursion_cano: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.36' },

  // Costa Pacífica · El Platanal (v3.38), en las vegas del Atrato: los racimos de plátano se desmanan, las manos se
  // lavan en el tanque, se pelan, se fríen en patacones y los patacones se empacan en bolsas y las bolsas en
  // cajas. Mismos números que la Finca, la Guayabera, el Arrozal, el Papal y la Palma: la región empieza de cero.
  { id: 'plantain_grove', zone: 'platanal', name: 'Platanal', icon: ICON.plantainPlant, infinite: true, out: { plantain_bunch: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.38' },
  { id: 'plantain_dehander', zone: 'platanal', name: 'Desmanadora', icon: ICON.plantainHand, in: { plantain_bunch: 2 }, out: { plantain_hand: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.38' },
  { id: 'plantain_washer', zone: 'platanal', name: 'Tanque de lavado', icon: ICON.washedPlantain, in: { plantain_hand: 1 }, out: { washed_plantain: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.38' },
  { id: 'plantain_peeler', zone: 'platanal', name: 'Peladora', icon: ICON.peeledPlantain, in: { washed_plantain: 1 }, out: { peeled_plantain: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.38' },
  { id: 'patacon_fryer', zone: 'platanal', name: 'Fritanga de patacones', icon: ICON.patacon, in: { peeled_plantain: 2 }, out: { patacon: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.38' },
  { id: 'patacon_bagger', zone: 'platanal', name: 'Empacadora', icon: ICON.pataconBag, in: { patacon: 1 }, out: { patacon_bag: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.38' },
  { id: 'patacon_boxer', zone: 'platanal', name: 'Cajonera de patacones', icon: ICON.pataconBox, in: { patacon_bag: 4 }, out: { patacon_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.38' },

  // Costa Pacífica · La Azotea (v3.39): las hierbas de las azoteas (huertas alzadas sobre pilotes) se lavan, se machacan
  // en el pilón con ajo y cebolla, se sofríen en el refrito y el aliño se envasa en frascos. Mismos números que el
  // Tabacal, el Cocal, la Cervecería y el Frutal; el aliño es el que después viajará a la Bahía, y las cajas, a Quibdó.
  { id: 'azotea_beds', zone: 'azotea', name: 'Azoteas', icon: ICON.azotea, infinite: true, out: { herbs: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.39' },
  { id: 'herb_washer', zone: 'azotea', name: 'Lavadero de hierbas', icon: ICON.washedHerbs, in: { herbs: 1 }, out: { washed_herbs: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.39' },
  { id: 'herb_pestle', zone: 'azotea', name: 'Pilón', icon: ICON.poundedHerbs, in: { washed_herbs: 2 }, out: { pounded_herbs: 1 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.39' },
  { id: 'refrito_pot', zone: 'azotea', name: 'Olla del refrito', icon: ICON.alino, in: { pounded_herbs: 2 }, out: { alino: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.39' },
  { id: 'alino_packer', zone: 'azotea', name: 'Envasadora de aliño', icon: ICON.alinoBox, in: { alino: 1 }, out: { alino_box: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.39' },

  // Costa Pacífica · La Bahía (v3.40): el pargo rojo se pesca en lancha, se limpia en la playa y se reparte entre el
  // Secadero (el pescado seco, salado y tendido al sol), la Fileteadora (que le pasa los filetes al Ahumadero) y la
  // Cocina del tapao, que lo cocina con plátano y el aliño de la Azotea. Mismos números que la Fiquera, la Ciénaga, Ráquira y la Cachamera.
  { id: 'pargo_boats', zone: 'bahia', name: 'Lanchas de pesca', icon: ICON.pargo, infinite: true, out: { pargo: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.40' },
  { id: 'pargo_cleaner', zone: 'bahia', name: 'Limpieza de pargo', icon: ICON.cleanPargo, in: { pargo: 1 }, out: { clean_pargo: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.40' },
  { id: 'fish_drier', zone: 'bahia', name: 'Secadero', icon: ICON.driedFish, in: { clean_pargo: 4 }, out: { dried_fish: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.40' },
  { id: 'pargo_filleter', zone: 'bahia', name: 'Fileteadora de pargo', icon: ICON.pargoFillet, in: { clean_pargo: 2 }, out: { pargo_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.40' },
  { id: 'pargo_smoker', zone: 'bahia', name: 'Ahumadero de pargo', icon: ICON.smokedPargo, in: { pargo_fillet: 2 }, out: { smoked_pargo: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.40' },
  { id: 'tapao_kitchen', zone: 'bahia', name: 'Cocina del tapao', icon: ICON.tapao, in: { clean_pargo: 4 }, imports: [{ product: 'alino', perCycle: 1, route: 'alino' }], out: { tapao: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.40' },

  // Costa Pacífica · El Manglar (v3.41): las piangüeras sacan la piangua del barro del manglar; se lava, se cocina,
  // se desconcha y se encoca en leche de coco. La piangua encocada se reparte entre la Mesa del arroz con piangua, que
  // la sirve con los patacones del Platanal, y la Cocina de la cazuela, que además lleva el pargo de la Bahía. Mismos
  // números que el Hato, la Quesera, Paipa y el Hato llanero.
  { id: 'mangrove_flats', zone: 'manglar', name: 'Manglar', icon: ICON.mangrove, infinite: true, out: { piangua: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.41' },
  { id: 'piangua_washer', zone: 'manglar', name: 'Lavadero de piangua', icon: ICON.piangua, in: { piangua: 2 }, out: { washed_piangua: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.41' },
  { id: 'piangua_cooker', zone: 'manglar', name: 'Olla de la piangua', icon: ICON.cookedPiangua, in: { washed_piangua: 1 }, out: { cooked_piangua: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.41' },
  { id: 'piangua_sheller', zone: 'manglar', name: 'Desconchadora', icon: ICON.pianguaMeat, in: { cooked_piangua: 1 }, out: { piangua_meat: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.41' },
  { id: 'encocado_pot', zone: 'manglar', name: 'Olla del encocado', icon: ICON.encocado, in: { piangua_meat: 2 }, out: { encocado: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.41' },
  { id: 'piangua_lunch', zone: 'manglar', name: 'Mesa del arroz con piangua', icon: ICON.arrozPiangua, in: { encocado: 2 }, imports: [{ product: 'patacon_bag', perCycle: 1, route: 'patacones' }], out: { arroz_piangua: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.41' },
  { id: 'cazuela_kitchen', zone: 'manglar', name: 'Cocina de la cazuela', icon: ICON.cazuela, in: { encocado: 2 }, imports: [{ product: 'patacon_bag', perCycle: 1, route: 'patacones' }, { product: 'clean_pargo', perCycle: 4, route: 'pargos' }], out: { cazuela_mariscos: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.41' },

  // Costa Pacífica · El Werregue (v3.42): el cogollo de la palma de werregue se desfibra, la fibra se tiñe con jagua
  // y achiote, se tuerce en hebra y las tejedoras wounaan la vuelven jarrón. La Tienda de artesanías vende el Recuerdo
  // del Pacífico: jarrones con el pescado seco y el pargo ahumado de la Bahía para el camino. Mismos números que las
  // Hormigas, el Sombrero, Las Ruanas y la Talabartería.
  { id: 'werregue_palms', zone: 'werregue', name: 'Palmar de werregue', icon: ICON.werreguePalm, infinite: true, out: { werregue_leaf: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.42' },
  { id: 'werregue_stripper', zone: 'werregue', name: 'Desfibradora de werregue', icon: ICON.werregueFiber, in: { werregue_leaf: 1 }, out: { werregue_fiber: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.42' },
  { id: 'werregue_dyer', zone: 'werregue', name: 'Tintorería', icon: ICON.dyedWerregue, in: { werregue_fiber: 2 }, out: { dyed_werregue: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.42' },
  { id: 'werregue_twister', zone: 'werregue', name: 'Torcedora', icon: ICON.werregueThread, in: { dyed_werregue: 2 }, out: { werregue_thread: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.42' },
  { id: 'werregue_weaver', zone: 'werregue', name: 'Tejedoras', icon: ICON.werregueJar, in: { werregue_thread: 1 }, out: { werregue_jar: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.42' },
  { id: 'tienda_pacifico', zone: 'werregue', name: 'Tienda de artesanías', icon: ICON.recuerdoPacifico, in: { werregue_jar: 4 }, imports: [{ product: 'dried_fish', perCycle: 1, route: 'secos' }, { product: 'smoked_pargo', perCycle: 1, route: 'pargos_ahumados' }], out: { recuerdo_pacifico: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.42' },

  // Costa Pacífica · Buenaventura (v3.43), el puerto y el final de la región: como Barichara, Cartagena, Villa de
  // Leyva y Villavicencio, sin fuente propia. Cada estación recibe el producto final de una zona del Pacífico; todo
  // termina en las salidas a ver las ballenas.
  { id: 'fritanga_puerto', zone: 'buenaventura', name: 'Fritanga del puerto', icon: ICON.marranitas, imports: [{ product: 'patacon_box', perCycle: 1, route: 'cajas_patacones' }], out: { marranitas: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.43' },
  { id: 'cevicheria', zone: 'buenaventura', name: 'Cevichería del malecón', icon: ICON.ceviche, in: { marranitas: 1 }, imports: [{ product: 'alino_box', perCycle: 1, route: 'cajas_alino' }], out: { ceviche: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.43' },
  { id: 'hotel_bahia', zone: 'buenaventura', name: 'Hotel de la bahía', icon: ICON.nocheBuenaventura, in: { ceviche: 2 }, imports: [{ product: 'recuerdo_pacifico', perCycle: 1, route: 'recuerdos_pacifico' }], out: { noche_buenaventura: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.43' },
  { id: 'galeria_pueblo_nuevo', zone: 'buenaventura', name: 'Galería de Pueblo Nuevo', icon: ICON.almuerzoGaleria, in: { marranitas: 1 }, imports: [{ product: 'tapao', perCycle: 1, route: 'platos_tapao' }], out: { almuerzo_galeria: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.43' },
  { id: 'loncheras_lancha', zone: 'buenaventura', name: 'Loncheras de la lancha', icon: ICON.loncheraLancha, in: { almuerzo_galeria: 1 }, imports: [{ product: 'arroz_piangua', perCycle: 1, route: 'arroces_piangua' }, { product: 'cazuela_mariscos', perCycle: 1, route: 'cazuelas_mariscos' }], out: { lonchera_lancha: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.43' },
  { id: 'salida_ballenas', zone: 'buenaventura', name: 'Salida a las ballenas', icon: ICON.ballenas, in: { lonchera_lancha: 4 }, out: { excursion_ballenas: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.43' },

  // Amazonas · El Asaizal (v3.47), a la orilla del río: los racimos de asaí se desgranan, el fruto se remoja en
  // agua tibia, se despulpa, se bate y el asaí se empaca en bolsas congeladas y las bolsas en cajas. Mismos
  // números que la primera zona de cada región: el Amazonas empieza de cero.
  { id: 'asai_grove', zone: 'asaizal', name: 'Asaizal', icon: ICON.asaiPalm, infinite: true, out: { asai_bunch: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.47' },
  { id: 'asai_thresher', zone: 'asaizal', name: 'Desgranadora', icon: ICON.asaiFruit, in: { asai_bunch: 2 }, out: { asai_fruit: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.47' },
  { id: 'asai_soaker', zone: 'asaizal', name: 'Tanque de remojo', icon: ICON.soakedAsai, in: { asai_fruit: 1 }, out: { soaked_asai: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.47' },
  { id: 'asai_pulper', zone: 'asaizal', name: 'Despulpadora de asaí', icon: ICON.asaiPulp, in: { soaked_asai: 1 }, out: { asai_pulp: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.47' },
  { id: 'asai_blender', zone: 'asaizal', name: 'Batidora', icon: ICON.asaiShake, in: { asai_pulp: 2 }, out: { asai_shake: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.47' },
  { id: 'asai_bagger', zone: 'asaizal', name: 'Empacadora de asaí', icon: ICON.asaiBag, in: { asai_shake: 1 }, out: { asai_bag: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.47' },
  { id: 'asai_boxer', zone: 'asaizal', name: 'Cajonera de asaí', icon: ICON.asaiBox, in: { asai_bag: 4 }, out: { asai_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.47' },

  // Amazonas · El Ajizal (v3.48): el ají de la chagra se lava, se muele y se cocina en el tucupí (el jugo de la
  // yuca brava) hasta volverse ají negro, que se envasa en frascos. Mismos números que el Tabacal, el Cocal, la
  // Cervecería, el Frutal y la Azotea; el ají negro es el que después viajará al Lago, y las cajas, a Leticia.
  { id: 'aji_field', zone: 'ajizal', name: 'Ajizal', icon: ICON.ajiPlant, infinite: true, out: { aji: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.48' },
  { id: 'aji_washer', zone: 'ajizal', name: 'Lavadero de ají', icon: ICON.ajiPeppers, in: { aji: 1 }, out: { washed_aji: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.48' },
  { id: 'aji_grinder', zone: 'ajizal', name: 'Molino de ají', icon: ICON.groundAji, in: { washed_aji: 2 }, out: { ground_aji: 1 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.48' },
  { id: 'tucupi_pot', zone: 'ajizal', name: 'Olla del tucupí', icon: ICON.ajiNegro, in: { ground_aji: 2 }, out: { aji_negro: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.48' },
  { id: 'aji_packer', zone: 'ajizal', name: 'Envasadora de ají negro', icon: ICON.ajiBox, in: { aji_negro: 1 }, out: { aji_box: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.48' },

  // Amazonas · El Lago (v3.49): el pirarucú se pesca en canoa en los lagos de Tarapoto, se limpia y se reparte entre
  // el Saladero (el pirarucú salado y seco al sol), la Fileteadora (que le pasa las postas al Moquén, la parrilla de
  // palos donde se ahúma) y la Cocina, que lo sirve con el ají negro del Ajizal. Mismos números que la Bahía.
  { id: 'pirarucu_canoes', zone: 'lago', name: 'Canoas del lago', icon: ICON.pirarucu, infinite: true, out: { pirarucu: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_cleaner', zone: 'lago', name: 'Limpieza de pirarucú', icon: ICON.cleanPirarucu, in: { pirarucu: 1 }, out: { clean_pirarucu: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_salter', zone: 'lago', name: 'Saladero de pirarucú', icon: ICON.saltedPirarucu, in: { clean_pirarucu: 4 }, out: { salted_pirarucu: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_filleter', zone: 'lago', name: 'Fileteadora de pirarucú', icon: ICON.pirarucuFillet, in: { clean_pirarucu: 2 }, out: { pirarucu_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.49' },
  { id: 'moquen', zone: 'lago', name: 'Moquén', icon: ICON.moqueado, in: { pirarucu_fillet: 2 }, out: { moqueado: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_kitchen', zone: 'lago', name: 'Cocina del pirarucú', icon: ICON.pirarucuAji, in: { clean_pirarucu: 4 }, imports: [{ product: 'aji_negro', perCycle: 1, route: 'ajinegro' }], out: { pirarucu_aji: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.49' },

  // Amazonas · La Casabería (v3.50): la yuca brava de la chagra se pela, se ralla, se exprime en el tipití (para
  // sacarle el jugo venenoso, que se vuelve tucupí) y se asa en el budare: es el casabe. Con el asaí del Asaizal
  // se sirve el desayuno amazónico, y con el pirarucú del Lago, el banquete de la maloca. Mismos números que el Manglar.
  { id: 'yuca_chagra', zone: 'casaberia', name: 'Chagra de yuca', icon: ICON.yucaPlant, infinite: true, out: { yuca_brava: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.50' },
  { id: 'yuca_peeler', zone: 'casaberia', name: 'Peladora de yuca', icon: ICON.yucaBrava, in: { yuca_brava: 2 }, out: { peeled_yuca: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.50' },
  { id: 'yuca_grater', zone: 'casaberia', name: 'Rallador de yuca', icon: ICON.peeledYuca, in: { peeled_yuca: 1 }, out: { grated_yuca: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.50' },
  { id: 'tipiti_press', zone: 'casaberia', name: 'Tipití', icon: ICON.tipiti, in: { grated_yuca: 1 }, out: { pressed_yuca: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.50' },
  { id: 'casabe_budare', zone: 'casaberia', name: 'Budare de casabe', icon: ICON.casabe, in: { pressed_yuca: 2 }, out: { casabe: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.50' },
  { id: 'desayuno_table', zone: 'casaberia', name: 'Mesa del desayuno', icon: ICON.desayunoAmazonico, in: { casabe: 2 }, imports: [{ product: 'asai_bag', perCycle: 1, route: 'bolsas_asai' }], out: { desayuno_amazonico: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.50' },
  { id: 'maloca', zone: 'casaberia', name: 'Maloca', icon: ICON.banqueteMaloca, in: { casabe: 2 }, imports: [{ product: 'asai_bag', perCycle: 1, route: 'bolsas_asai' }, { product: 'clean_pirarucu', perCycle: 4, route: 'pirarucus' }], out: { banquete_maloca: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.50' },

  // Amazonas · La Yanchama (v3.51): los ticuna sacan la corteza del árbol de yanchama, la remojan en el río, la
  // golpean con el mazo hasta volverla tela, la pintan con tintes de la selva y tallan las máscaras del ritual de la
  // Pelazón. La Tienda las vende con el pirarucú salado y moqueado del Lago. Mismos números que el Werregue.
  { id: 'yanchama_trees', zone: 'yanchama', name: 'Árboles de yanchama', icon: ICON.yanchamaTree, infinite: true, out: { yanchama_bark: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.51' },
  { id: 'bark_soaker', zone: 'yanchama', name: 'Remojo de corteza', icon: ICON.yanchamaBark, in: { yanchama_bark: 1 }, out: { soaked_bark: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.51' },
  { id: 'bark_beater', zone: 'yanchama', name: 'Golpeadero', icon: ICON.barkCloth, in: { soaked_bark: 2 }, out: { bark_cloth: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.51' },
  { id: 'cloth_painter', zone: 'yanchama', name: 'Pintores de yanchama', icon: ICON.paintedCloth, in: { bark_cloth: 2 }, out: { painted_cloth: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.51' },
  { id: 'mask_maker', zone: 'yanchama', name: 'Taller de máscaras', icon: ICON.ticunaMask, in: { painted_cloth: 1 }, out: { ticuna_mask: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.51' },
  { id: 'tienda_yanchama', zone: 'yanchama', name: 'Tienda de la Yanchama', icon: ICON.recuerdoAmazonas, in: { ticuna_mask: 4 }, imports: [{ product: 'salted_pirarucu', perCycle: 1, route: 'pirarucus_salados' }, { product: 'moqueado', perCycle: 1, route: 'moqueados' }], out: { recuerdo_amazonas: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.51' },

  // Santander · El Tabacal (v3.1). La hoja de tabaco se cura, se despalilla, se fermenta y se tuerce:
  // mismos números que el Trapiche (sin el combustible de la Hornilla: la cadena cuadra igual sin él).
  { id: 'tobacco_field', zone: 'tabacal', name: 'Tabacal', icon: ICON.tobaccoPlant, infinite: true, out: { tobacco_leaf: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.1' },
  { id: 'caney', zone: 'tabacal', name: 'Caney de curado', icon: '🛖', in: { tobacco_leaf: 1 }, out: { cured_leaf: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.1' },
  { id: 'stripper', zone: 'tabacal', name: 'Despalilladora', icon: '✂️', in: { cured_leaf: 2 }, out: { stripped_leaf: 1 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.1' },
  { id: 'tobacco_piles', zone: 'tabacal', name: 'Pilones de fermentación', icon: '♨️', in: { stripped_leaf: 2 }, out: { fermented_tobacco: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.1' },
  { id: 'cigar_roller', zone: 'tabacal', name: 'Torcedores', icon: '🤲', in: { fermented_tobacco: 1 }, out: { cigar: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.1' },

  // Santander · La Fiquera (v3.2). De la penca sale la fibra, que se reparte como la leche de la
  // Lechería (mismos números): costales, hilo para alpargatas y tela para los tercios del tabaco, que
  // llega del Tabacal por la Ruta del tabaco.
  { id: 'fique_field', zone: 'fiquera', name: 'Cultivo de fique', icon: ICON.fiquePlant, infinite: true, out: { fique_leaf: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.2' },
  { id: 'decorticator', zone: 'fiquera', name: 'Desfibradora', icon: '⚙️', in: { fique_leaf: 1 }, out: { fique_fiber: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.2' },
  { id: 'sack_loom', zone: 'fiquera', name: 'Telar de costales', icon: ICON.fiqueSack, in: { fique_fiber: 4 }, out: { fique_sack: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.2' },
  { id: 'spinner', zone: 'fiquera', name: 'Hiladora', icon: ICON.fiqueYarn, in: { fique_fiber: 2 }, out: { fique_yarn: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.2' },
  { id: 'alpargata_shop', zone: 'fiquera', name: 'Alpargatería', icon: ICON.alpargatas, in: { fique_yarn: 2 }, out: { alpargatas: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.2' },
  { id: 'tercio_packer', zone: 'fiquera', name: 'Empacadora de tercios', icon: ICON.tobaccoBale, in: { fique_fiber: 4 }, imports: [{ product: 'fermented_tobacco', perCycle: 1, route: 'tabaco' }], out: { tobacco_bale: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.2' },

  // Santander · El Hato (v3.3). La carne oreada: se corta, se adoba con sal, se orea al sol y se asa.
  // Mismos números que el Cacaotal: la carne asada se reparte entre la Mesa del almuerzo y la
  // Fiambrería, que esperan el bocadillo de la Guayabera y la cabuya de la Fiquera.
  { id: 'cattle_ranch', zone: 'hato', name: 'Hato ganadero', icon: '🐂', infinite: true, out: { steer: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.3' },
  { id: 'butcher', zone: 'hato', name: 'Fama', icon: '🥩', in: { steer: 2 }, out: { beef: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.3' },
  { id: 'salter', zone: 'hato', name: 'Saladero', icon: ICON.saltedBeef, in: { beef: 1 }, out: { salted_beef: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.3' },
  { id: 'airing_rack', zone: 'hato', name: 'Tendedero de oreo', icon: ICON.carneOreada, in: { salted_beef: 1 }, out: { carne_oreada: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.3' },
  { id: 'grill', zone: 'hato', name: 'Asadero', icon: '🔥', in: { carne_oreada: 2 }, out: { grilled_oreada: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.3' },
  { id: 'lunch_table', zone: 'hato', name: 'Mesa del almuerzo', icon: ICON.almuerzo, in: { grilled_oreada: 2 }, imports: [{ product: 'bocadillo_bijao', perCycle: 1, route: 'bocadillo' }], out: { almuerzo: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.3' },
  { id: 'fiambre_maker', zone: 'hato', name: 'Fiambrería', icon: ICON.fiambre, in: { grilled_oreada: 2 }, imports: [{ product: 'bocadillo_bijao', perCycle: 1, route: 'bocadillo' }, { product: 'fique_fiber', perCycle: 4, route: 'cabuya' }], out: { fiambre: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.3' },

  // Santander · Las Hormigas (v3.4). La hormiga culona sale del hormiguero solo en la entrada de aguas:
  // se cosecha entonces lo de todo el año (×4) y se guarda en la despensa, que los arrieros van llevando
  // a la cadena el resto del año. Mismos números que el Maizal; la Tienda de recuerdos espera los
  // costales y las alpargatas de la Fiquera.
  { id: 'anthill', zone: 'hormigas', name: 'Hormiguero', icon: ICON.antQueen, infinite: true, out: { ant_queen: 1 }, harvest: { season: 'entrada', mult: 4, store: 3000 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.4' },
  { id: 'ant_cleaner', zone: 'hormigas', name: 'Mesa de limpieza', icon: ICON.antClean, in: { ant_queen: 1 }, out: { ant_clean: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.4' },
  { id: 'brine_pot', zone: 'hormigas', name: 'Ollas de salmuera', icon: ICON.antBrine, in: { ant_clean: 2 }, out: { ant_brine: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.4' },
  { id: 'ant_toaster', zone: 'hormigas', name: 'Tiesto de barro', icon: ICON.toastedAnts, in: { ant_brine: 2 }, out: { toasted_ants: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.4' },
  { id: 'cone_table', zone: 'hormigas', name: 'Mesa de cucuruchos', icon: ICON.antCone, in: { toasted_ants: 1 }, out: { ant_cone: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.4' },
  { id: 'souvenir_shop', zone: 'hormigas', name: 'Tienda de recuerdos', icon: ICON.recuerdo, in: { ant_cone: 4 }, imports: [{ product: 'fique_sack', perCycle: 1, route: 'costales' }, { product: 'alpargatas', perCycle: 1, route: 'alpargatas' }], out: { recuerdo: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.4' },

  // Santander · Barichara (v3.5), la última zona de la región: como el Pueblo, no tiene fuente propia.
  // La Dulcería de la plaza hace dulces con el bocadillo de la Guayabera, y cada estación recibe lo suyo
  // de una zona de Santander (las mismas, en el mismo orden y con los mismos números que el Pueblo).
  // Todo termina en excursiones por el Camino Real a Guane.
  { id: 'dulceria', zone: 'barichara', name: 'Dulcería de la plaza', icon: ICON.dulcesTipicos, imports: [{ product: 'bocadillo_crate', perCycle: 1, route: 'dulces' }], out: { dulces_tipicos: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.5' },
  { id: 'park_cafe', zone: 'barichara', name: 'Café del parque', icon: ICON.sobremesa, in: { dulces_tipicos: 1 }, imports: [{ product: 'cigar', perCycle: 1, route: 'tabacos' }], out: { sobremesa: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.5' },
  { id: 'posada', zone: 'barichara', name: 'Posada', icon: ICON.estadia, in: { sobremesa: 2 }, imports: [{ product: 'recuerdo', perCycle: 1, route: 'recuerdos' }], out: { estadia: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.5' },
  { id: 'box_shop', zone: 'barichara', name: 'Taller de cajas', icon: ICON.cajaSurtida, in: { dulces_tipicos: 1 }, imports: [{ product: 'tobacco_bale', perCycle: 1, route: 'tercios' }], out: { caja_surtida: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.5' },
  { id: 'hamper', zone: 'barichara', name: 'Canastas del caminante', icon: ICON.canastaCaminante, in: { caja_surtida: 1 }, imports: [{ product: 'almuerzo', perCycle: 1, route: 'almuerzos' }, { product: 'fiambre', perCycle: 1, route: 'fiambres' }], out: { canasta_caminante: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.5' },
  { id: 'camino_real', zone: 'barichara', name: 'Salida al Camino Real', icon: ICON.excursion, in: { canasta_caminante: 4 }, out: { excursion: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.5' },
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
