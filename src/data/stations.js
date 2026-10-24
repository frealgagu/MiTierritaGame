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
