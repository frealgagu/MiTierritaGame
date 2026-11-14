// Complete station catalog, see docs/GDD.md §4b.
// `release`: game version when it became playable.
//
//   in:     products consumed per cycle
//   out:    products produced per cycle
//   by:     byproducts produced per cycle
//   cycle:  seconds per cycle at level 1
//   infinite: unlimited source (consumes nothing)
//   side:     optional branch outside main chain; requires = enabling station
//   fuel:     optional fuel arriving directly from another station (byproduct) speeding it up
//   harvest:  seasonal harvest (v3.4, Hormiguero): produces only in `season`, `mult`× normal
//             (a full year's yield), storing `store` s of output in pantry yard

import { ICON } from './icons.js';

// Special zone prices (v5.4), per station in chain order: upgrade base (haulers cost half) and build cost. Calibrated
// with the even player (`npm run balance -- 30 parejo` with BALANCE_REGION=sanandres): each station takes about
// 3 hours (level 100 in ~1h45, its ×32 in ~45 min more, and the next station in ~30 min), 24 hours in all. Without
// the ×32 the first station alone takes over 16 hours (see docs/GDD.md).
const SA = {
  base: [0.125, 5.2, 101, 1720, 53700, 819000, 26000000, 430000000],
  unlock: [0, 1e8, 1.9e9, 3.3e10, 4.1e11, 6.55e12, 1.1e14, 2.2e15],
};

export const STATIONS = [
  // Zone 1 · La Finca
  { id: 'farm', zone: 'finca', name: 'Cafetal', icon: ICON.coffeePlant, infinite: true, out: { cherry: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '0.1' },
  { id: 'wetmill', zone: 'finca', name: 'Beneficiadero', icon: '💧', in: { cherry: 2 }, out: { washed: 1 }, by: { pulp: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '0.2' },
  { id: 'dryer', zone: 'finca', name: 'Marquesina de secado', icon: '☀️', in: { washed: 1 }, out: { parchment: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '0.2' },
  { id: 'huller', zone: 'finca', name: 'Trilladora', icon: '⚙️', in: { parchment: 1 }, out: { green: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '0.2' },
  { id: 'roaster', zone: 'finca', name: 'Tostadora', icon: '🔥', in: { green: 2 }, out: { roasted: 1 }, cycle: 8, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '0.2' },
  { id: 'grinder', zone: 'finca', name: 'Molino', icon: '🌀', in: { roasted: 1 }, out: { ground: 1 }, cycle: 8, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '0.2' },
  { id: 'packer', zone: 'finca', name: 'Empacadora', icon: '📦', in: { ground: 4 }, out: { coffee_bag: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '0.2' },
  // Side branch: Beneficiadero pulp travels directly via chute (no mules) and compost
  // increases sale value of everything Finca sells while stocked (see sim/modifiers.js).
  { id: 'composter', zone: 'finca', name: 'Compostera', icon: '🪱', in: { pulp: 4 }, out: { compost: 1 }, cycle: 16, unlockCost: 1500, upgradeBase: 10, growth: 1.15, release: '1.0', side: true, requires: 'wetmill' },

  // Zone 2 · El Trapiche
  { id: 'canefield', zone: 'trapiche', name: 'Cañaduzal', icon: '🎋', infinite: true, out: { cane: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '1.1' },
  { id: 'cane_mill', zone: 'trapiche', name: 'Molienda', icon: '⚙️', in: { cane: 1 }, out: { guarapo: 1 }, by: { bagasse: 1 }, cycle: 2, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '1.1' },
  // Molienda bagazo travels straight to Hornilla as fuel: while stocked, runs ×2.
  { id: 'furnace', zone: 'trapiche', name: 'Hornilla', icon: '🔥', in: { guarapo: 2 }, out: { melado: 1 }, fuel: { product: 'bagasse', from: 'cane_mill', perCycle: 1, boost: 2 }, cycle: 4, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '1.1' },
  { id: 'molds', zone: 'trapiche', name: 'Gaveras', icon: '🧱', in: { melado: 2 }, out: { panela: 1 }, cycle: 8, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '1.1' },
  { id: 'pulverizer', zone: 'trapiche', name: 'Pulverizadora', icon: '🌀', in: { panela: 1 }, out: { panela_powder: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '1.1' },

  // Zone 3 · La Lechería (v1.2). Pasteurized milk splits equally at matching level: a quarter each
  // to Quesera, Descremadora, Paila, and milk route to Cacaotal (see sim/transport.js: exportsOf).
  { id: 'pasture', zone: 'lecheria', name: 'Potrero y establo', icon: '🐄', infinite: true, out: { raw_milk: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '1.2' },
  { id: 'pasteurizer', zone: 'lecheria', name: 'Pasteurizadora', icon: '🌡️', in: { raw_milk: 1 }, out: { milk: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '1.2' },
  { id: 'cheesery', zone: 'lecheria', name: 'Quesera', icon: ICON.cheese, in: { milk: 4 }, out: { cheese: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '1.2' },
  { id: 'separator', zone: 'lecheria', name: 'Descremadora', icon: ICON.cream, in: { milk: 2 }, out: { cream: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '1.2' },
  { id: 'churn', zone: 'lecheria', name: 'Batidora', icon: '🧈', in: { cream: 2 }, out: { butter: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '1.2' },
  // Pulverized panela arrives from Trapiche via route (see data/routes.js): without it, Paila waits.
  { id: 'arequipe_pot', zone: 'lecheria', name: 'Paila de arequipe', icon: '🍮', in: { milk: 4 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela' }], out: { arequipe: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '1.2' },

  // Zone 4 · El Cacaotal (v1.3). Cacao paste splits half each between Mesa de chocolate and
  // Chocolatería at equal level. Both need Trapiche panela and Chocolatería also needs
  // Lechería pasteurized milk (see data/routes.js). Across equal-level zones, Paila, Mesa, and
  // Chocolatería take ¾ of Trapiche's panela, and Chocolatería takes Pasteurizadora's reserved 1/4.
  // reserve.
  { id: 'cacao_grove', zone: 'cacaotal', name: 'Cacaotal', icon: '🌳', infinite: true, out: { cacao_pod: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '1.3' },
  { id: 'fermenter', zone: 'cacaotal', name: 'Cajones de fermentación', icon: '📦', in: { cacao_pod: 2 }, out: { cacao_fermented: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '1.3' },
  { id: 'cacao_dryer', zone: 'cacaotal', name: 'Secadero', icon: '☀️', in: { cacao_fermented: 1 }, out: { cacao_dry: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '1.3' },
  { id: 'cacao_roaster', zone: 'cacaotal', name: 'Tostador de cacao', icon: '🔥', in: { cacao_dry: 1 }, out: { cacao_roasted: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '1.3' },
  { id: 'cacao_mill', zone: 'cacaotal', name: 'Molino de cacao', icon: '🌀', in: { cacao_roasted: 2 }, out: { cacao_paste: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '1.3' },
  { id: 'chocolate_table', zone: 'cacaotal', name: 'Mesa de chocolate', icon: '🍫', in: { cacao_paste: 2 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_cacao' }], out: { table_chocolate: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '1.3' },
  { id: 'chocolatier', zone: 'cacaotal', name: 'Chocolatería', icon: ICON.milkChocolate, in: { cacao_paste: 2 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_cacao' }, { product: 'milk', perCycle: 4, route: 'leche' }], out: { milk_chocolate: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '1.3' },

  // Zone 5 · El Maizal (v1.4). Linear chain; Puesto de arepas needs cheese and butter from
  // Lechería: at equal level, all output of Quesera and Batidora (see data/routes.js).
  { id: 'cornfield', zone: 'maizal', name: 'Maizal', icon: '🌽', infinite: true, out: { corn_cob: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '1.4' },
  { id: 'sheller', zone: 'maizal', name: 'Desgranadora', icon: '⚙️', in: { corn_cob: 1 }, out: { corn_kernels: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '1.4' },
  { id: 'corn_huller', zone: 'maizal', name: 'Piladora', icon: '🪵', in: { corn_kernels: 2 }, out: { corn_hulled: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '1.4' },
  { id: 'dough_mill', zone: 'maizal', name: 'Molino de masa', icon: '🌀', in: { corn_hulled: 2 }, out: { corn_dough: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '1.4' },
  { id: 'budare', zone: 'maizal', name: 'Budare', icon: '🔥', in: { corn_dough: 1 }, out: { arepa: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '1.4' },
  { id: 'arepa_stand', zone: 'maizal', name: 'Puesto de arepas', icon: ICON.cheeseArepa, in: { arepa: 4 }, imports: [{ product: 'cheese', perCycle: 1, route: 'queso' }, { product: 'butter', perCycle: 1, route: 'mantequilla' }], out: { cheese_arepa: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '1.4' },

  // Zone 6 · El Pueblo (v1.5). No native source: everything arrives by routes. At equal levels across
  // all zones, each supplier sends an unexported final product (1 per 32 s): coffee bags,
  // remaining quarter panela, arequipe, both chocolates, and cheese arepas. Pueblo consumes
  // them evenly. Casa del café splits origin coffee between Greca and Taller.
  { id: 'coffee_house', zone: 'pueblo', name: 'Casa del café', icon: '🏛️', imports: [{ product: 'coffee_bag', perCycle: 1, route: 'cafe' }], out: { cafe_origen: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '1.5' },
  { id: 'greca', zone: 'pueblo', name: 'Greca de tintos', icon: '☕', in: { cafe_origen: 1 }, imports: [{ product: 'panela_powder', perCycle: 1, route: 'panela_pueblo' }], out: { tinto: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '1.5' },
  { id: 'fonda', zone: 'pueblo', name: 'Fonda', icon: ICON.breakfast, in: { tinto: 2 }, imports: [{ product: 'cheese_arepa', perCycle: 1, route: 'arepas' }], out: { breakfast: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '1.5' },
  { id: 'basket_shop', zone: 'pueblo', name: 'Taller de canastas', icon: '🧺', in: { cafe_origen: 1 }, imports: [{ product: 'arequipe', perCycle: 1, route: 'arequipe' }], out: { basket: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '1.5' },
  { id: 'gift_wrap', zone: 'pueblo', name: 'Empaque de regalos', icon: '🎁', in: { basket: 1 }, imports: [{ product: 'table_chocolate', perCycle: 1, route: 'chocolate_mesa' }, { product: 'milk_chocolate', perCycle: 1, route: 'chocolatinas' }], out: { gift_basket: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '1.5' },
  { id: 'export_dock', zone: 'pueblo', name: 'Despacho de exportación', icon: ICON.container, in: { gift_basket: 4 }, out: { container: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '1.5' },

  // Santander · La Guayabera (v3.0). Guava turns into bocadillo veleño: identical layout and
  // numbers as Finca (new region starts fresh with its own economy).
  { id: 'guava_grove', zone: 'guayabera', name: 'Guayabal', icon: ICON.guavaTree, infinite: true, out: { guava: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.0' },
  { id: 'guava_pulper', zone: 'guayabera', name: 'Despulpadora de guayaba', icon: '⚙️', in: { guava: 2 }, out: { guava_pulp: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.0' },
  { id: 'guava_pot', zone: 'guayabera', name: 'Paila de bocadillo', icon: '🔥', in: { guava_pulp: 1 }, out: { guava_jelly: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.0' },
  { id: 'guava_molds', zone: 'guayabera', name: 'Moldes de madera', icon: '🪵', in: { guava_jelly: 1 }, out: { bocadillo_block: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.0' },
  { id: 'bocadillo_cutter', zone: 'guayabera', name: 'Cortadora', icon: '🔪', in: { bocadillo_block: 4 }, out: { bocadillo: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.0' },
  { id: 'bijao_wrapper', zone: 'guayabera', name: 'Envoltura en bijao', icon: '🍃', in: { bocadillo: 1 }, out: { bocadillo_bijao: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.0' },
  { id: 'crate_packer', zone: 'guayabera', name: 'Cajonera', icon: '📦', in: { bocadillo_bijao: 4 }, out: { bocadillo_crate: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.0' },

  // Coast · El Arrozal (v3.15), in Sinú & Magdalena valleys: paddy rice is dried, hulled,
  // polished, sorted, bagged, and baled. Identical structure and numbers to Finca and Guayabera.
  // Guayabera: region starts from zero.
  { id: 'rice_field', zone: 'arrozal', name: 'Arrozal', icon: ICON.ricePlant, infinite: true, out: { paddy: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.15' },
  { id: 'rice_dryer', zone: 'arrozal', name: 'Secadora de arroz', icon: '☀️', in: { paddy: 2 }, out: { dry_paddy: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.15' },
  { id: 'rice_huller', zone: 'arrozal', name: 'Descascaradora', icon: '⚙️', in: { dry_paddy: 1 }, out: { brown_rice: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.15' },
  { id: 'rice_polisher', zone: 'arrozal', name: 'Pulidora', icon: '✨', in: { brown_rice: 1 }, out: { white_rice: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.15' },
  { id: 'rice_sorter', zone: 'arrozal', name: 'Clasificadora', icon: '🔍', in: { white_rice: 4 }, out: { premium_rice: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.15' },
  { id: 'rice_bagger', zone: 'arrozal', name: 'Empacadora de arroz', icon: ICON.riceBag, in: { premium_rice: 1 }, out: { rice_bag: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.15' },
  { id: 'rice_stacker', zone: 'arrozal', name: 'Bultera', icon: ICON.riceSack, in: { rice_bag: 4 }, out: { rice_sack: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.15' },

  // Coast · El Cocal (v3.16), Gulf of Morrosquillo: coconut is husked, grated, pressed, and
  // its milk boiled with panela into cocada. Same numbers as Tabacal.
  { id: 'coconut_grove', zone: 'cocal', name: 'Cocal', icon: ICON.coconutPalm, infinite: true, out: { coconut: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.16' },
  { id: 'coconut_peeler', zone: 'cocal', name: 'Peladero de cocos', icon: ICON.peeledCoconut, in: { coconut: 1 }, out: { peeled_coconut: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.16' },
  { id: 'coconut_grater', zone: 'cocal', name: 'Ralladora', icon: ICON.gratedCoconut, in: { peeled_coconut: 2 }, out: { grated_coconut: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.16' },
  { id: 'coconut_press', zone: 'cocal', name: 'Prensa de coco', icon: ICON.coconutMilk, in: { grated_coconut: 2 }, out: { coconut_milk: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.16' },
  { id: 'cocada_kitchen', zone: 'cocal', name: 'Paila de cocadas', icon: ICON.cocada, in: { coconut_milk: 1 }, out: { cocada: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.16' },

  // Coast · La Ciénaga (v3.17), Ciénaga Grande: fishermen catch bocachico by canoe; cleaned
  // and split across Saladero, Fileteadora (feeding Fritanga), and Cocina cooking with
  // Cocal coconut milk. Same numbers as Fiquera.
  { id: 'fishing_canoes', zone: 'cienaga', name: 'Canoas de pesca', icon: ICON.canoe, infinite: true, out: { fish: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.17' },
  { id: 'fish_cleaner', zone: 'cienaga', name: 'Limpieza de pescado', icon: ICON.cleanFish, in: { fish: 1 }, out: { clean_fish: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.17' },
  { id: 'fish_salter', zone: 'cienaga', name: 'Saladero', icon: ICON.saltedFish, in: { clean_fish: 4 }, out: { salted_fish: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.17' },
  { id: 'fish_filleter', zone: 'cienaga', name: 'Fileteadora', icon: ICON.fishFillet, in: { clean_fish: 2 }, out: { fish_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.17' },
  { id: 'fish_fryer', zone: 'cienaga', name: 'Fritanga', icon: ICON.friedFish, in: { fish_fillet: 2 }, out: { fried_fish: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.17' },
  { id: 'coconut_fish_kitchen', zone: 'cienaga', name: 'Cocina del pescado en coco', icon: ICON.fishInCoconut, in: { clean_fish: 4 }, imports: [{ product: 'coconut_milk', perCycle: 1, route: 'coco' }], out: { fish_in_coconut: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.17' },

  // Coast · La Quesera (v3.18), Córdoba & Sucre savannas: zebu milk curdles, mills with salt,
  // and presses into queso costeño, then makes mote stew. Mote feeds Fonda costeña (with Arrozal rice)
  // and Cocina de la bandeja (also taking Ciénaga fish). Same numbers as Hato.
  // Ciénaga fish too. Same numbers as Hato.
  { id: 'milking_corral', zone: 'quesera', name: 'Corral de ordeño', icon: ICON.cebu, infinite: true, out: { ordeno_milk: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.18' },
  { id: 'curdler', zone: 'quesera', name: 'Cuajadera', icon: ICON.cuajada, in: { ordeno_milk: 2 }, out: { cuajada: 1 }, by: { suero_costeno: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.18' },
  { id: 'curd_mill', zone: 'quesera', name: 'Molino de cuajada', icon: ICON.saltedCurd, in: { cuajada: 1 }, out: { salted_curd: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.18' },
  { id: 'cheese_press', zone: 'quesera', name: 'Prensa de queso', icon: ICON.quesoCosteno, in: { salted_curd: 1 }, out: { queso_costeno: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.18' },
  { id: 'mote_pot', zone: 'quesera', name: 'Olla del mote', icon: ICON.moteQueso, in: { queso_costeno: 2 }, out: { mote_queso: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.18' },
  { id: 'costeno_fonda', zone: 'quesera', name: 'Fonda costeña', icon: ICON.almuerzoCosteno, in: { mote_queso: 2 }, imports: [{ product: 'rice_bag', perCycle: 1, route: 'arroz' }], out: { almuerzo_costeno: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.18' },
  { id: 'bandeja_kitchen', zone: 'quesera', name: 'Cocina de la bandeja', icon: ICON.bandejaCostena, in: { mote_queso: 2 }, joins: [{ product: 'suero_costeno', perCycle: 8, from: 'curdler' }], imports: [{ product: 'rice_bag', perCycle: 1, route: 'arroz' }, { product: 'clean_fish', perCycle: 4, route: 'pescado' }], out: { bandeja_costena: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.18' },

  // Coast · El Sombrero (v3.19), Tuchín & San Andrés de Sotavento: caña flecha is scraped,
  // mud-dyed black, braided, and sewn in coils into sombrero vueltiao. Parador de Tuchín sells
  // it with Ciénaga salted & fried fish. Same numbers as Hormigas (without seasonal harvest:
  // caña flecha cuts year-round).
  { id: 'canaflechal', zone: 'sombrero', name: 'Cañaflechal', icon: ICON.canaFlechaPlant, infinite: true, out: { cana_flecha: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.19' },
  { id: 'fiber_scraper', zone: 'sombrero', name: 'Raspado de la caña', icon: ICON.canaFiber, in: { cana_flecha: 1 }, out: { cana_fiber: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.19' },
  { id: 'fiber_dyer', zone: 'sombrero', name: 'Tintes de barro', icon: ICON.dyedFiber, in: { cana_fiber: 2 }, out: { dyed_fiber: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.19' },
  { id: 'braiders', zone: 'sombrero', name: 'Trenzadoras', icon: ICON.trenza, in: { dyed_fiber: 2 }, out: { trenza: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.19' },
  { id: 'hat_sewer', zone: 'sombrero', name: 'Costura del sombrero', icon: ICON.sombreroVueltiao, in: { trenza: 1 }, out: { sombrero_vueltiao: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.19' },
  { id: 'parador', zone: 'sombrero', name: 'Parador de Tuchín', icon: ICON.recuerdoCosta, in: { sombrero_vueltiao: 4 }, imports: [{ product: 'salted_fish', perCycle: 1, route: 'salado' }, { product: 'fried_fish', perCycle: 1, route: 'frito' }], out: { recuerdo_costa: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.19' },

  // Coast · Cartagena (v3.20), region finale: like Barichara, no native source. Each station
  // receives final output from one Coast zone; ends at boat tour to Rosario Islands.
  { id: 'fogon_getsemani', zone: 'cartagena', name: 'Fogón de Getsemaní', icon: ICON.arrozConCoco, imports: [{ product: 'rice_sack', perCycle: 1, route: 'bultos' }], out: { arroz_con_coco: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.20' },
  { id: 'restaurante_muralla', zone: 'cartagena', name: 'Restaurante de la muralla', icon: ICON.cenaMuralla, in: { arroz_con_coco: 1 }, imports: [{ product: 'cocada', perCycle: 4, route: 'cocadas' }], out: { cena_muralla: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.20' },
  { id: 'hotel_colonial', zone: 'cartagena', name: 'Hotel colonial', icon: ICON.nocheHotel, in: { cena_muralla: 2 }, imports: [{ product: 'recuerdo_costa', perCycle: 1, route: 'recuerdos_costa' }], out: { noche_hotel: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.20' },
  { id: 'cocina_bahia', zone: 'cartagena', name: 'Cocina de la bahía', icon: ICON.almuerzoBahia, in: { arroz_con_coco: 1 }, imports: [{ product: 'fish_in_coconut', perCycle: 1, route: 'cazuelas' }], out: { almuerzo_bahia: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.20' },
  { id: 'loncheras', zone: 'cartagena', name: 'Loncheras del paseo', icon: ICON.loncheraPaseo, in: { almuerzo_bahia: 1 }, imports: [{ product: 'almuerzo_costeno', perCycle: 1, route: 'almuerzos_costenos' }, { product: 'bandeja_costena', perCycle: 1, route: 'bandejas' }], out: { lonchera_paseo: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.20' },
  { id: 'muelle', zone: 'cartagena', name: 'Muelle de las lanchas', icon: ICON.paseoIslas, in: { lonchera_paseo: 4 }, out: { paseo_islas: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.20' },

  // Boyacá · El Papal (v3.22), cool highland altiplano: potatoes are washed, graded, peeled,
  // fried (criolla chips), bagged, and boxed. Same numbers as Finca, Guayabera, and Arrozal:
  // region starts fresh.
  { id: 'potato_field', zone: 'papal', name: 'Papal', icon: ICON.potatoPlant, infinite: true, out: { potato: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.22' },
  { id: 'potato_washer', zone: 'papal', name: 'Lavadero de papa', icon: ICON.washedPotato, in: { potato: 2 }, out: { washed_potato: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.22' },
  { id: 'potato_grader', zone: 'papal', name: 'Seleccionadora', icon: ICON.gradedPotato, in: { washed_potato: 1 }, out: { graded_potato: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.22' },
  { id: 'potato_peeler', zone: 'papal', name: 'Peladora de papa', icon: ICON.peeledPotato, in: { graded_potato: 1 }, out: { peeled_potato: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.22' },
  { id: 'criollas_fryer', zone: 'papal', name: 'Freidora', icon: ICON.criollas, in: { peeled_potato: 4 }, out: { criollas: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.22' },
  { id: 'criollas_bagger', zone: 'papal', name: 'Empacadora de papitas', icon: ICON.criollasBag, in: { criollas: 1 }, out: { criollas_bag: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.22' },
  { id: 'criollas_boxer', zone: 'papal', name: 'Cajonera', icon: ICON.criollasBox, in: { criollas_bag: 4 }, out: { criollas_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.22' },

  // Boyacá · La Cervecería (v3.23), Tibasosa & Duitama: barley malts, mashes and boils in
  // kettle (wort), ferments in tanks, bottles beer. Same numbers as Tabacal and Cocal.
  // Cocal.
  { id: 'barley_field', zone: 'cerveceria', name: 'Cebadal', icon: ICON.barleyPlant, infinite: true, out: { barley: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.23' },
  { id: 'maltings', zone: 'cerveceria', name: 'Maltería', icon: ICON.malt, in: { barley: 1 }, out: { malt: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.23' },
  { id: 'brew_kettle', zone: 'cerveceria', name: 'Paila de cocción', icon: ICON.wort, in: { malt: 2 }, out: { wort: 1 }, by: { bagazo_cervecero: 8 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.23' },
  { id: 'fermenters', zone: 'cerveceria', name: 'Tanques de fermentación', icon: ICON.beer, in: { wort: 2 }, out: { beer: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.23' },
  { id: 'bottler', zone: 'cerveceria', name: 'Embotelladora', icon: ICON.beerCrate, in: { beer: 1 }, out: { beer_crate: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.23' },

  // Boyacá · Ráquira (v3.24), potters town: clay wedges and splits across Ollas de barro,
  // Torno (feeding wood kiln for painted planters), and Jarras filled with Cervecería beer.
  // Same numbers as Fiquera and Ciénaga.
  { id: 'clay_pit', zone: 'raquira', name: 'Mina de greda', icon: ICON.greda, infinite: true, out: { greda: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.24' },
  { id: 'clay_kneader', zone: 'raquira', name: 'Amasado del barro', icon: ICON.barro, in: { greda: 1 }, out: { barro: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.24' },
  { id: 'pot_maker', zone: 'raquira', name: 'Ollas de barro', icon: ICON.ollaBarro, in: { barro: 4 }, out: { olla_barro: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.24' },
  { id: 'potter_wheel', zone: 'raquira', name: 'Torno', icon: ICON.piezaTorneada, in: { barro: 2 }, out: { pieza_torneada: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.24' },
  { id: 'pottery_kiln', zone: 'raquira', name: 'Horno de leña', icon: ICON.matera, in: { pieza_torneada: 2 }, out: { matera: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.24' },
  { id: 'jarras', zone: 'raquira', name: 'Jarras', icon: ICON.jarraCerveza, in: { barro: 4 }, imports: [{ product: 'beer', perCycle: 1, route: 'cerveza' }], out: { jarra_cerveza: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.24' },

  // Boyacá · Paipa (v3.25), cheese and pastries: milk curdles, presses, and ages in cellar
  // (Paipa cheese), then bakes almojábanas. Splits between Mesa del piquete (with Papal chips)
  // and Horno de barro (making pastry hampers using Ráquira clay). Same numbers as Hato and Quesera.
  // clay. Same numbers as Hato and Quesera.
  { id: 'paipa_herd', zone: 'paipa', name: 'Hato lechero', icon: ICON.rawMilk, imports: [{ product: 'bagazo_cervecero', perCycle: 5, route: 'bagazo' }], out: { paipa_milk: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.25' },
  { id: 'paipa_curdler', zone: 'paipa', name: 'Cuajadera de Paipa', icon: ICON.cuajada, in: { paipa_milk: 2 }, out: { paipa_curd: 2 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.25' },
  { id: 'cheese_molds', zone: 'paipa', name: 'Moldes de queso', icon: ICON.moldedCheese, in: { paipa_curd: 1 }, out: { molded_cheese: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.25' },
  { id: 'cheese_cave', zone: 'paipa', name: 'Cava de maduración', icon: ICON.quesoPaipa, in: { molded_cheese: 1 }, out: { queso_paipa: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.25' },
  { id: 'almojabana_oven', zone: 'paipa', name: 'Horno de almojábanas', icon: ICON.almojabana, in: { queso_paipa: 2 }, joins: [{ product: 'paipa_curd', perCycle: 2, from: 'paipa_curdler' }], out: { almojabana: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.25' },
  { id: 'piquete_table', zone: 'paipa', name: 'Mesa del piquete', icon: ICON.piquete, in: { almojabana: 2 }, imports: [{ product: 'criollas_bag', perCycle: 1, route: 'papitas' }], out: { piquete: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.25' },
  { id: 'clay_oven', zone: 'paipa', name: 'Horno de barro', icon: ICON.amasijos, in: { almojabana: 2 }, imports: [{ product: 'criollas_bag', perCycle: 1, route: 'papitas' }, { product: 'barro', perCycle: 4, route: 'barro' }], out: { canasta_amasijos: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.25' },

  // Boyacá · Las Ruanas (v3.26), Nobsa ruana weavers: wool shears, washes, cards, spins,
  // and weaves on loom. Tienda de Nobsa sells Boyacá souvenir: ruanas with Ráquira pots
  // and planters. Same numbers as Hormigas and Sombrero.
  { id: 'sheep_pasture', zone: 'ruanas', name: 'Rebaño de ovejas', icon: ICON.sheep, infinite: true, out: { wool: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.26' },
  { id: 'wool_washer', zone: 'ruanas', name: 'Lavado de lana', icon: ICON.cleanWool, in: { wool: 1 }, out: { clean_wool: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.26' },
  { id: 'carder', zone: 'ruanas', name: 'Cardado', icon: ICON.cardedWool, in: { clean_wool: 2 }, out: { carded_wool: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.26' },
  { id: 'spinning_wheel', zone: 'ruanas', name: 'Hilado en rueca', icon: ICON.woolYarn, in: { carded_wool: 2 }, out: { wool_yarn: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.26' },
  { id: 'ruana_loom', zone: 'ruanas', name: 'Telar de ruanas', icon: ICON.ruana, in: { wool_yarn: 1 }, out: { ruana: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.26' },
  { id: 'tienda_nobsa', zone: 'ruanas', name: 'Tienda de Nobsa', icon: ICON.recuerdoBoyaca, in: { ruana: 4 }, imports: [{ product: 'olla_barro', perCycle: 1, route: 'ollas' }, { product: 'matera', perCycle: 1, route: 'materas' }], out: { recuerdo_boyaca: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.26' },

  // Boyacá · Villa de Leyva (v3.27), region finale: like Barichara and Cartagena, no native source.
  // Each station takes a Boyacá zone's final product; ends at Kronosaurus Fossil excursion.
  { id: 'tienda_esquina', zone: 'villa_leyva', name: 'Tienda de la esquina', icon: ICON.onces, imports: [{ product: 'criollas_box', perCycle: 1, route: 'cajas_papitas' }], out: { onces: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.27' },
  { id: 'terraza_plaza', zone: 'villa_leyva', name: 'Terraza de la plaza', icon: ICON.tardePlaza, in: { onces: 1 }, imports: [{ product: 'beer_crate', perCycle: 4, route: 'canastas_cerveza' }], out: { tarde_plaza: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.27' },
  { id: 'hospedaje_colonial', zone: 'villa_leyva', name: 'Hospedaje colonial', icon: ICON.nocheVilla, in: { tarde_plaza: 2 }, imports: [{ product: 'recuerdo_boyaca', perCycle: 1, route: 'recuerdos_boyaca' }], out: { noche_villa: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.27' },
  { id: 'mercado_sabado', zone: 'villa_leyva', name: 'Mercado del sábado', icon: ICON.canastaMercado, in: { onces: 1 }, imports: [{ product: 'jarra_cerveza', perCycle: 1, route: 'jarras_cerveza' }], out: { canasta_mercado: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.27' },
  { id: 'canastos_paseo', zone: 'villa_leyva', name: 'Canastos del paseo', icon: ICON.fiambrePaseo, in: { canasta_mercado: 1 }, imports: [{ product: 'piquete', perCycle: 1, route: 'piquetes' }, { product: 'canasta_amasijos', perCycle: 1, route: 'amasijos' }], out: { fiambre_paseo: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.27' },
  { id: 'salida_fosil', zone: 'villa_leyva', name: 'Salida al Fósil', icon: ICON.excursionFosil, in: { fiambre_paseo: 4 }, out: { excursion_fosil: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.27' },

  // Llanos · La Palma (v3.31), Meta savannas: oil palm fruit bunches thresh, steam-sterilize,
  // press (crude oil), clarify, bottle, and box. Same numbers as Finca, Guayabera, Arrozal,
  // and Papal: region starts fresh.
  { id: 'palm_grove', zone: 'palma', name: 'Palmar', icon: ICON.oilPalm, infinite: true, out: { palm_bunch: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.31' },
  { id: 'bunch_thresher', zone: 'palma', name: 'Desgranadora', icon: ICON.palmFruit, in: { palm_bunch: 2 }, out: { palm_fruit: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.31' },
  { id: 'fruit_sterilizer', zone: 'palma', name: 'Esterilizador', icon: ICON.cookedFruit, in: { palm_fruit: 1 }, out: { cooked_fruit: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.31' },
  { id: 'palm_press', zone: 'palma', name: 'Prensa de aceite', icon: '🛢️', in: { cooked_fruit: 1 }, out: { crude_oil: 1 }, by: { palmiste: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.31' },
  { id: 'oil_clarifier', zone: 'palma', name: 'Clarificador', icon: ICON.palmOil, in: { crude_oil: 4 }, out: { palm_oil: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.31' },
  { id: 'oil_bottler', zone: 'palma', name: 'Envasadora', icon: ICON.oilBottle, in: { palm_oil: 1 }, out: { oil_bottle: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.31' },
  { id: 'oil_boxer', zone: 'palma', name: 'Cajonera de aceite', icon: ICON.oilBox, in: { oil_bottle: 4 }, out: { oil_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.31' },

  // Llanos · El Frutal (v3.32), Meta lowlands: passionfruit pulps, pasteurizes, blends into
  // juice, and cartons. Same numbers as Tabacal, Cocal, and Cervecería; juice flows to
  // Cachamera, boxes to Villavicencio.
  { id: 'passion_vines', zone: 'frutal', name: 'Maracuyal', icon: ICON.passionVine, infinite: true, out: { passion_fruit: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.32' },
  { id: 'passion_pulper', zone: 'frutal', name: 'Despulpadora de maracuyá', icon: ICON.passionPulp, in: { passion_fruit: 1 }, out: { passion_pulp: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.32' },
  { id: 'pulp_pasteurizer', zone: 'frutal', name: 'Pasteurizadora de pulpa', icon: ICON.pastPulp, in: { passion_pulp: 2 }, out: { past_pulp: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.32' },
  { id: 'juice_mixer', zone: 'frutal', name: 'Mezcladora de jugos', icon: ICON.passionJuice, in: { past_pulp: 2 }, out: { passion_juice: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.32' },
  { id: 'juice_packer', zone: 'frutal', name: 'Envasadora de jugos', icon: ICON.juiceBox, in: { passion_juice: 1 }, out: { juice_box: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.32' },

  // Llanos · La Cachamera (v3.33): pond-raised cachama cleans and splits across Pisillera
  // (flaked sautéed pisillo), Fileteadora (feeding Smokehouse), and Cocina de la cachama
  // (passionfruit sauce from El Frutal). Same numbers as Fiquera, Ciénaga, and Ráquira.
  { id: 'fish_ponds', zone: 'cachamera', name: 'Estanques', icon: ICON.cachama, infinite: true, out: { cachama: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.33' },
  { id: 'cachama_cleaner', zone: 'cachamera', name: 'Limpieza de cachama', icon: ICON.cleanCachama, in: { cachama: 1 }, out: { clean_cachama: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.33' },
  { id: 'pisillo_kitchen', zone: 'cachamera', name: 'Pisillera', icon: ICON.pisillo, in: { clean_cachama: 4 }, out: { pisillo: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.33' },
  { id: 'cachama_filleter', zone: 'cachamera', name: 'Fileteadora de cachama', icon: ICON.cachamaFillet, in: { clean_cachama: 2 }, out: { cachama_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.33' },
  { id: 'cachama_smoker', zone: 'cachamera', name: 'Ahumadero', icon: ICON.smokedCachama, in: { cachama_fillet: 2 }, out: { smoked_cachama: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.33' },
  { id: 'cachama_kitchen', zone: 'cachamera', name: 'Cocina de la cachama', icon: ICON.cachamaMaracuya, in: { clean_cachama: 4 }, imports: [{ product: 'passion_juice', perCycle: 1, route: 'jugo' }], out: { cachama_maracuya: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.33' },

  // Llanos · El Hato llanero (v3.34): beef butchers, salts, stake-roasts (mamona), and
  // carves llanero style. Splits between Mesa del almuerzo (fried cassava in La Palma oil)
  // and Asadero de la parranda (also grilling Cachamera fish). Same numbers as Hato, Quesera,
  // and Paipa.
  { id: 'llanero_herd', zone: 'hato_llanero', name: 'Sabana del hato', icon: ICON.cebu, infinite: true, out: { llanero_steer: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.34' },
  { id: 'llanero_butcher', zone: 'hato_llanero', name: 'Desposte', icon: '🥩', in: { llanero_steer: 2 }, out: { ternera: 1 }, by: { fresh_hide: 2 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.34' },
  { id: 'adobadero', zone: 'hato_llanero', name: 'Adobadero', icon: ICON.adobada, in: { ternera: 1 }, out: { ternera_adobada: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.34' },
  { id: 'vara_grill', zone: 'hato_llanero', name: 'Asador de vara', icon: ICON.mamona, in: { ternera_adobada: 1 }, out: { mamona: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.34' },
  { id: 'carving_table', zone: 'hato_llanero', name: 'Trinchadora', icon: ICON.carneLlanera, in: { mamona: 2 }, out: { carne_llanera: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.34' },
  { id: 'lunch_llanero', zone: 'hato_llanero', name: 'Mesa del almuerzo llanero', icon: ICON.almuerzoLlanero, in: { carne_llanera: 2 }, imports: [{ product: 'oil_bottle', perCycle: 1, route: 'aceite' }], out: { almuerzo_llanero: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.34' },
  { id: 'parranda_grill', zone: 'hato_llanero', name: 'Asadero de la parranda', icon: ICON.parranda, in: { carne_llanera: 2 }, imports: [{ product: 'oil_bottle', perCycle: 1, route: 'aceite' }, { product: 'clean_cachama', perCycle: 4, route: 'cachamas' }], out: { parranda_llanera: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.34' },

  // Llanos · La Talabartería (v3.35): raw cowhide tans, cuts, tools, and becomes saddles.
  // Tienda llanera sells Plains Souvenir: saddles plus Cachamera pisillo and smoked cachama
  // for the trail. Same numbers as Hormigas, Sombrero, and Las Ruanas.
  { id: 'hide_yard', zone: 'talabarteria', name: 'Saladero de cueros', icon: ICON.rawHide, imports: [{ product: 'fresh_hide', perCycle: 1, route: 'cueros' }], out: { raw_hide: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.35' },
  { id: 'tannery', zone: 'talabarteria', name: 'Curtiembre', icon: ICON.leather, in: { raw_hide: 1 }, out: { tanned_leather: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.35' },
  { id: 'leather_cutter', zone: 'talabarteria', name: 'Cortadora de cuero', icon: ICON.leatherPieces, in: { tanned_leather: 2 }, out: { leather_pieces: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.35' },
  { id: 'leather_tooler', zone: 'talabarteria', name: 'Repujado', icon: ICON.tooledLeather, in: { leather_pieces: 2 }, out: { tooled_leather: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.35' },
  { id: 'saddler', zone: 'talabarteria', name: 'Taller de sillas', icon: ICON.saddle, in: { tooled_leather: 1 }, out: { silla_montar: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.35' },
  { id: 'tienda_llanera', zone: 'talabarteria', name: 'Tienda llanera', icon: ICON.recuerdoLlano, in: { silla_montar: 4 }, imports: [{ product: 'pisillo', perCycle: 1, route: 'pisillos' }, { product: 'smoked_cachama', perCycle: 1, route: 'ahumadas' }], out: { recuerdo_llano: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.35' },

  // Llanos · Villavicencio (v3.36), Gateway to Llanos and region finale: like Barichara, Cartagena,
  // and Villa de Leyva, no native source. Each station takes a Llanos zone's output; ends at
  // Caño Cristales excursion.
  { id: 'empanaderia', zone: 'villavicencio', name: 'Empanadería', icon: ICON.empanadas, imports: [{ product: 'oil_box', perCycle: 1, route: 'cajas_aceite' }], out: { empanadas: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.36' },
  { id: 'kiosco_parque', zone: 'villavicencio', name: 'Kiosco del parque', icon: ICON.tardeParque, in: { empanadas: 1 }, imports: [{ product: 'juice_box', perCycle: 4, route: 'cajas_jugos' }], out: { tarde_parque: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.36' },
  { id: 'hotel_campestre', zone: 'villavicencio', name: 'Hotel campestre', icon: ICON.nocheVillavo, in: { tarde_parque: 2 }, imports: [{ product: 'recuerdo_llano', perCycle: 1, route: 'recuerdos_llano' }, { product: 'palmiste', perCycle: 8, route: 'palmiste' }], out: { noche_villavo: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.36' },
  { id: 'plaza_mercado', zone: 'villavicencio', name: 'Plaza de mercado', icon: ICON.almuerzoPlaza, in: { empanadas: 1 }, imports: [{ product: 'cachama_maracuya', perCycle: 1, route: 'platos_cachama' }], out: { almuerzo_plaza: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.36' },
  { id: 'morrales_viaje', zone: 'villavicencio', name: 'Morrales del viaje', icon: ICON.fiambreViaje, in: { almuerzo_plaza: 1 }, imports: [{ product: 'almuerzo_llanero', perCycle: 1, route: 'almuerzos_llaneros' }, { product: 'parranda_llanera', perCycle: 1, route: 'parrandas' }], out: { fiambre_viaje: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.36' },
  { id: 'salida_cano', zone: 'villavicencio', name: 'Salida a Caño Cristales', icon: ICON.canoCristales, in: { fiambre_viaje: 4 }, out: { excursion_cano: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.36' },

  // Pacific Coast · El Platanal (v3.38), Atrato riverbanks: plantain bunches debunch, wash,
  // peel, fry into patacones, bag, and box. Same numbers as Finca, Guayabera, Arrozal,
  // Papal, and La Palma: region starts fresh.
  { id: 'plantain_grove', zone: 'platanal', name: 'Platanal', icon: ICON.plantainPlant, infinite: true, out: { plantain_bunch: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.38' },
  { id: 'plantain_dehander', zone: 'platanal', name: 'Desmanadora', icon: ICON.plantainHand, in: { plantain_bunch: 2 }, out: { plantain_hand: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.38' },
  { id: 'plantain_washer', zone: 'platanal', name: 'Tanque de lavado', icon: ICON.washedPlantain, in: { plantain_hand: 1 }, out: { washed_plantain: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.38' },
  { id: 'plantain_peeler', zone: 'platanal', name: 'Peladora', icon: ICON.peeledPlantain, in: { washed_plantain: 1 }, out: { peeled_plantain: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.38' },
  { id: 'patacon_fryer', zone: 'platanal', name: 'Fritanga de patacones', icon: ICON.patacon, in: { peeled_plantain: 4 }, out: { patacon: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.38' },
  { id: 'patacon_bagger', zone: 'platanal', name: 'Empacadora', icon: ICON.pataconBag, in: { patacon: 1 }, out: { patacon_bag: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.38' },
  { id: 'patacon_boxer', zone: 'platanal', name: 'Cajonera de patacones', icon: ICON.pataconBox, in: { patacon_bag: 4 }, out: { patacon_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.38' },

  // Pacific Coast · La Azotea (v3.39): raised-canoe azotea herbs wash, pound in mortar
  // with garlic & onion, sauté into sofrito, and jar. Same numbers as Tabacal, Cocal,
  // Cervecería, and Frutal; seasoning travels to Bahía, boxes to Buenaventura.
  { id: 'azotea_beds', zone: 'azotea', name: 'Azoteas', icon: ICON.azotea, infinite: true, out: { herbs: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.39' },
  { id: 'herb_washer', zone: 'azotea', name: 'Lavadero de hierbas', icon: ICON.washedHerbs, in: { herbs: 1 }, out: { washed_herbs: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.39' },
  { id: 'herb_pestle', zone: 'azotea', name: 'Pilón', icon: ICON.poundedHerbs, in: { washed_herbs: 2 }, out: { pounded_herbs: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.39' },
  { id: 'refrito_pot', zone: 'azotea', name: 'Olla del refrito', icon: ICON.alino, in: { pounded_herbs: 2 }, out: { alino: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.39' },
  { id: 'alino_packer', zone: 'azotea', name: 'Envasadora de aliño', icon: ICON.alinoBox, in: { alino: 1 }, out: { alino_box: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.39' },

  // Pacific Coast · La Bahía (v3.40): red snapper is boat-caught, cleaned on shore, split
  // to Drying racks (dried fish), Filleter (feeding Smokehouse), and Tapao kitchen cooking
  // with plantain & Azotea seasoning. Same numbers as Fiquera, Ciénaga, Ráquira, Cachamera.
  { id: 'pargo_boats', zone: 'bahia', name: 'Lanchas de pesca', icon: ICON.pargo, infinite: true, out: { pargo: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.40' },
  { id: 'pargo_cleaner', zone: 'bahia', name: 'Limpieza de pargo', icon: ICON.cleanPargo, in: { pargo: 1 }, out: { clean_pargo: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.40' },
  { id: 'fish_drier', zone: 'bahia', name: 'Secadero', icon: ICON.driedFish, in: { clean_pargo: 4 }, out: { dried_fish: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.40' },
  { id: 'pargo_filleter', zone: 'bahia', name: 'Fileteadora de pargo', icon: ICON.pargoFillet, in: { clean_pargo: 2 }, out: { pargo_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.40' },
  { id: 'pargo_smoker', zone: 'bahia', name: 'Ahumadero de pargo', icon: ICON.smokedPargo, in: { pargo_fillet: 2 }, out: { smoked_pargo: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.40' },
  { id: 'tapao_kitchen', zone: 'bahia', name: 'Cocina del tapao', icon: ICON.tapao, in: { clean_pargo: 4 }, imports: [{ product: 'alino', perCycle: 1, route: 'alino' }], out: { tapao: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.40' },

  // Pacific Coast · El Manglar (v3.41): piangüeras dig cockles from mangrove mud; wash, boil,
  // shuck, and simmer in coconut milk. Splits between rice-and-piangua diner (with Platanal
  // patacones) and Casserole kitchen (adding Bahía snapper). Same numbers as Hato, Quesera,
  // Paipa, and Hato llanero.
  { id: 'mangrove_flats', zone: 'manglar', name: 'Manglar', icon: ICON.mangrove, infinite: true, out: { piangua: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.41' },
  { id: 'piangua_washer', zone: 'manglar', name: 'Lavadero de piangua', icon: ICON.piangua, in: { piangua: 2 }, out: { washed_piangua: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.41' },
  { id: 'piangua_cooker', zone: 'manglar', name: 'Olla de la piangua', icon: ICON.cookedPiangua, in: { washed_piangua: 1 }, out: { cooked_piangua: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.41' },
  { id: 'piangua_sheller', zone: 'manglar', name: 'Desconchadora', icon: ICON.pianguaMeat, in: { cooked_piangua: 1 }, out: { piangua_meat: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.41' },
  { id: 'encocado_pot', zone: 'manglar', name: 'Olla del encocado', icon: ICON.encocado, in: { piangua_meat: 2 }, out: { encocado: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.41' },
  { id: 'piangua_lunch', zone: 'manglar', name: 'Mesa del arroz con piangua', icon: ICON.arrozPiangua, in: { encocado: 2 }, imports: [{ product: 'patacon_bag', perCycle: 1, route: 'patacones' }], out: { arroz_piangua: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.41' },
  { id: 'cazuela_kitchen', zone: 'manglar', name: 'Cocina de la cazuela', icon: ICON.cazuela, in: { encocado: 2 }, imports: [{ product: 'patacon_bag', perCycle: 1, route: 'patacones' }, { product: 'clean_pargo', perCycle: 4, route: 'pargos' }], out: { cazuela_mariscos: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.41' },

  // Pacific Coast · El Werregue (v3.42): werregue palm shoots strip to fiber, dye with jagua
  // and achiote, twist into cord, and weave into Wounaan vases. Craft shop sells Pacific
  // Souvenir: vases with Bahía dried & smoked fish. Same numbers as Hormigas, Sombrero,
  // Las Ruanas, and Talabartería.
  { id: 'werregue_palms', zone: 'werregue', name: 'Palmar de werregue', icon: ICON.werreguePalm, infinite: true, out: { werregue_leaf: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.42' },
  { id: 'werregue_stripper', zone: 'werregue', name: 'Desfibradora de werregue', icon: ICON.werregueFiber, in: { werregue_leaf: 1 }, out: { werregue_fiber: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.42' },
  { id: 'werregue_dyer', zone: 'werregue', name: 'Tintorería', icon: ICON.dyedWerregue, in: { werregue_fiber: 2 }, out: { dyed_werregue: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.42' },
  { id: 'werregue_twister', zone: 'werregue', name: 'Torcedora', icon: ICON.werregueThread, in: { dyed_werregue: 2 }, out: { werregue_thread: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.42' },
  { id: 'werregue_weaver', zone: 'werregue', name: 'Tejedoras', icon: ICON.werregueJar, in: { werregue_thread: 1 }, out: { werregue_jar: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.42' },
  { id: 'tienda_pacifico', zone: 'werregue', name: 'Tienda de artesanías', icon: ICON.recuerdoPacifico, in: { werregue_jar: 4 }, imports: [{ product: 'dried_fish', perCycle: 1, route: 'secos' }, { product: 'smoked_pargo', perCycle: 1, route: 'pargos_ahumados' }], out: { recuerdo_pacifico: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.42' },

  // Pacific Coast · Buenaventura (v3.43), port finale: like Barichara, Cartagena, Villa de
  // Leyva, and Villavicencio, no native source. Takes each Pacific zone's final product;
  // ends at whale-watching excursions.
  { id: 'fritanga_puerto', zone: 'buenaventura', name: 'Fritanga del puerto', icon: ICON.marranitas, imports: [{ product: 'patacon_box', perCycle: 1, route: 'cajas_patacones' }], out: { marranitas: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.43' },
  { id: 'cevicheria', zone: 'buenaventura', name: 'Cevichería del malecón', icon: ICON.ceviche, in: { marranitas: 1 }, imports: [{ product: 'alino_box', perCycle: 4, route: 'cajas_alino' }], out: { ceviche: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.43' },
  { id: 'hotel_bahia', zone: 'buenaventura', name: 'Hotel de la bahía', icon: ICON.nocheBuenaventura, in: { ceviche: 2 }, imports: [{ product: 'recuerdo_pacifico', perCycle: 1, route: 'recuerdos_pacifico' }], out: { noche_buenaventura: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.43' },
  { id: 'galeria_pueblo_nuevo', zone: 'buenaventura', name: 'Galería de Pueblo Nuevo', icon: ICON.almuerzoGaleria, in: { marranitas: 1 }, imports: [{ product: 'tapao', perCycle: 1, route: 'platos_tapao' }], out: { almuerzo_galeria: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.43' },
  { id: 'loncheras_lancha', zone: 'buenaventura', name: 'Loncheras de la lancha', icon: ICON.loncheraLancha, in: { almuerzo_galeria: 1 }, imports: [{ product: 'arroz_piangua', perCycle: 1, route: 'arroces_piangua' }, { product: 'cazuela_mariscos', perCycle: 1, route: 'cazuelas_mariscos' }], out: { lonchera_lancha: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.43' },
  { id: 'salida_ballenas', zone: 'buenaventura', name: 'Salida a las ballenas', icon: ICON.ballenas, in: { lonchera_lancha: 4 }, out: { excursion_ballenas: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.43' },

  // Amazon · El Asaizal (v3.47), riverside: açaí bunches thresh, warm-soak, pulp, whip,
  // freeze-bag, and box. Same numbers as every first regional zone: Amazon starts fresh.
  // Amazon stars fresh.
  { id: 'asai_grove', zone: 'asaizal', name: 'Asaizal', icon: ICON.asaiPalm, infinite: true, out: { asai_bunch: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '3.47' },
  { id: 'asai_thresher', zone: 'asaizal', name: 'Desgranadora', icon: ICON.asaiFruit, in: { asai_bunch: 2 }, out: { asai_fruit: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '3.47' },
  { id: 'asai_soaker', zone: 'asaizal', name: 'Tanque de remojo', icon: ICON.soakedAsai, in: { asai_fruit: 1 }, out: { soaked_asai: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '3.47' },
  { id: 'asai_pulper', zone: 'asaizal', name: 'Despulpadora de asaí', icon: ICON.asaiPulp, in: { soaked_asai: 1 }, out: { asai_pulp: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '3.47' },
  { id: 'asai_blender', zone: 'asaizal', name: 'Batidora', icon: ICON.asaiShake, in: { asai_pulp: 4 }, out: { asai_shake: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '3.47' },
  { id: 'asai_bagger', zone: 'asaizal', name: 'Empacadora de asaí', icon: ICON.asaiBag, in: { asai_shake: 1 }, out: { asai_bag: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '3.47' },
  { id: 'asai_boxer', zone: 'asaizal', name: 'Cajonera de asaí', icon: ICON.asaiBox, in: { asai_bag: 4 }, out: { asai_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '3.47' },

  // Amazon · El Ajizal (v3.48): chagra chili washes, mills, and simmers days in cassava juice
  // (tucupí) into black chili sauce, then jars. Same numbers as Tabacal, Cocal, Cervecería,
  // Frutal, and Azotea; black chili travels to Lago, boxes to Leticia.
  { id: 'aji_field', zone: 'ajizal', name: 'Ajizal', icon: ICON.ajiPlant, infinite: true, out: { aji: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.48' },
  { id: 'aji_washer', zone: 'ajizal', name: 'Lavadero de ají', icon: ICON.ajiPeppers, in: { aji: 1 }, out: { washed_aji: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.48' },
  { id: 'aji_grinder', zone: 'ajizal', name: 'Molino de ají', icon: ICON.groundAji, in: { washed_aji: 2 }, out: { ground_aji: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.48' },
  { id: 'tucupi_pot', zone: 'ajizal', name: 'Olla del tucupí', icon: ICON.ajiNegro, in: { ground_aji: 2 }, out: { aji_negro: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.48' },
  { id: 'aji_packer', zone: 'ajizal', name: 'Envasadora de ají negro', icon: ICON.ajiBox, in: { aji_negro: 1 }, out: { aji_box: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.48' },

  // Amazon · El Lago (v3.49): pirarucu caught by canoe in Tarapoto lakes, cleaned, split
  // across Salting racks (sun-dried), Filleter (feeding Moquén smoker grill), and Kitchen
  // serving with Ajizal black chili. Same numbers as Bahía.
  { id: 'pirarucu_canoes', zone: 'lago', name: 'Canoas del lago', icon: ICON.pirarucu, infinite: true, out: { pirarucu: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_cleaner', zone: 'lago', name: 'Limpieza de pirarucú', icon: ICON.cleanPirarucu, in: { pirarucu: 1 }, out: { clean_pirarucu: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_salter', zone: 'lago', name: 'Saladero de pirarucú', icon: ICON.saltedPirarucu, in: { clean_pirarucu: 4 }, out: { salted_pirarucu: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_filleter', zone: 'lago', name: 'Fileteadora de pirarucú', icon: ICON.pirarucuFillet, in: { clean_pirarucu: 2 }, out: { pirarucu_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.49' },
  { id: 'moquen', zone: 'lago', name: 'Moquén', icon: ICON.moqueado, in: { pirarucu_fillet: 2 }, out: { moqueado: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.49' },
  { id: 'pirarucu_kitchen', zone: 'lago', name: 'Cocina del pirarucú', icon: ICON.pirarucuAji, in: { clean_pirarucu: 4 }, imports: [{ product: 'aji_negro', perCycle: 1, route: 'ajinegro' }], out: { pirarucu_aji: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.49' },

  // Amazon · La Casabería (v3.50): bitter cassava peels, grates, squeezes in tipití (poisonous
  // juice boils into tucupí), and bakes on budare into casabe. With Asaizal açaí serves
  // Amazon breakfast; with Lago pirarucu, Maloca feast. Same numbers as Manglar.
  { id: 'yuca_chagra', zone: 'casaberia', name: 'Chagra de yuca', icon: ICON.yucaPlant, infinite: true, out: { yuca_brava: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.50' },
  { id: 'yuca_peeler', zone: 'casaberia', name: 'Peladora de yuca', icon: ICON.yucaBrava, in: { yuca_brava: 2 }, out: { peeled_yuca: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.50' },
  { id: 'yuca_grater', zone: 'casaberia', name: 'Rallador de yuca', icon: ICON.peeledYuca, in: { peeled_yuca: 1 }, out: { grated_yuca: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.50' },
  { id: 'tipiti_press', zone: 'casaberia', name: 'Tipití', icon: ICON.tipiti, in: { grated_yuca: 1 }, out: { pressed_yuca: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.50' },
  { id: 'casabe_budare', zone: 'casaberia', name: 'Budare de casabe', icon: ICON.casabe, in: { pressed_yuca: 2 }, out: { casabe: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.50' },
  { id: 'desayuno_table', zone: 'casaberia', name: 'Mesa del desayuno', icon: ICON.desayunoAmazonico, in: { casabe: 2 }, imports: [{ product: 'asai_bag', perCycle: 1, route: 'bolsas_asai' }], out: { desayuno_amazonico: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.50' },
  { id: 'maloca', zone: 'casaberia', name: 'Maloca', icon: ICON.banqueteMaloca, in: { casabe: 2 }, imports: [{ product: 'asai_bag', perCycle: 1, route: 'bolsas_asai' }, { product: 'clean_pirarucu', perCycle: 4, route: 'pirarucus' }], out: { banquete_maloca: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.50' },

  // Amazon · La Yanchama (v3.51): Ticuna harvest yanchama tree bark, river-soak, beat into
  // bark cloth, paint with forest dyes, and craft Pelazón ritual masks. Sold with Lago
  // salted and smoked pirarucu. Same numbers as Werregue.
  { id: 'yanchama_trees', zone: 'yanchama', name: 'Árboles de yanchama', icon: ICON.yanchamaTree, infinite: true, out: { yanchama_bark: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.51' },
  { id: 'bark_soaker', zone: 'yanchama', name: 'Remojo de corteza', icon: ICON.yanchamaBark, in: { yanchama_bark: 1 }, out: { soaked_bark: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.51' },
  { id: 'bark_beater', zone: 'yanchama', name: 'Golpeadero', icon: ICON.barkCloth, in: { soaked_bark: 2 }, out: { bark_cloth: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.51' },
  { id: 'cloth_painter', zone: 'yanchama', name: 'Pintores de yanchama', icon: ICON.paintedCloth, in: { bark_cloth: 2 }, out: { painted_cloth: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.51' },
  { id: 'mask_maker', zone: 'yanchama', name: 'Taller de máscaras', icon: ICON.ticunaMask, in: { painted_cloth: 1 }, out: { ticuna_mask: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.51' },
  { id: 'tienda_yanchama', zone: 'yanchama', name: 'Tienda de la Yanchama', icon: ICON.recuerdoAmazonas, in: { ticuna_mask: 4 }, imports: [{ product: 'salted_pirarucu', perCycle: 1, route: 'pirarucus_salados' }, { product: 'moqueado', perCycle: 1, route: 'moqueados' }], out: { recuerdo_amazonas: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.51' },

  // Amazon · Leticia (v3.52): triple-border port finale. Açaí shop gets Asaizal boxes;
  // riverside diner, Ajizal black chili; jungle hotel, Yanchama souvenirs; port market,
  // Lago black-chili pirarucu; canoe provisions, Casabería breakfast & feast. Same as Buenaventura.
  // same as Buenaventura.
  { id: 'heladeria_asai', zone: 'leticia', name: 'Heladería de asaí', icon: ICON.heladoAsai, imports: [{ product: 'asai_box', perCycle: 1, route: 'cajas_asai' }], out: { helado_asai: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.52' },
  { id: 'restaurante_ribera', zone: 'leticia', name: 'Restaurante de la ribera', icon: ICON.cenaRibera, in: { helado_asai: 1 }, imports: [{ product: 'aji_box', perCycle: 4, route: 'cajas_aji' }], out: { cena_ribera: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.52' },
  { id: 'hotel_selva', zone: 'leticia', name: 'Hotel de la selva', icon: ICON.nocheLeticia, in: { cena_ribera: 2 }, imports: [{ product: 'recuerdo_amazonas', perCycle: 1, route: 'recuerdos_amazonas' }], out: { noche_leticia: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.52' },
  { id: 'mercado_puerto', zone: 'leticia', name: 'Mercado del puerto', icon: ICON.almuerzoMercado, in: { helado_asai: 1 }, imports: [{ product: 'pirarucu_aji', perCycle: 1, route: 'platos_pirarucu' }], out: { almuerzo_mercado: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.52' },
  { id: 'provisiones_canoa', zone: 'leticia', name: 'Provisiones de la canoa', icon: ICON.provisionCanoa, in: { almuerzo_mercado: 1 }, imports: [{ product: 'desayuno_amazonico', perCycle: 1, route: 'desayunos_amazonicos' }, { product: 'banquete_maloca', perCycle: 1, route: 'banquetes_maloca' }], out: { provision_canoa: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.52' },
  { id: 'salida_delfines', zone: 'leticia', name: 'Salida a los delfines', icon: ICON.delfines, in: { provision_canoa: 4 }, out: { excursion_delfines: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.52' },

  // Tolima Grande (v4.0), eighth region: opens after Leticia. Same numbers as Amazon, with
  // v4.0's twin mechanics: Café del Huila Beneficiadero also outputs cascara (husk dryer makes tea);
  // Lechonería Butchery outputs meat and skin, combined by Wood oven into lechona.
  // Los Achirales (southern Tolima: Natagaima & Coyaima): from achira rhizome to bizcochos.
  { id: 'achiral', zone: 'achirales', name: 'Achiral', icon: ICON.achiraPlant, infinite: true, out: { achira_root: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '4.0' },
  { id: 'achira_grater', zone: 'achirales', name: 'Rallador de achira', icon: ICON.achiraMash, in: { achira_root: 2 }, out: { achira_mash: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '4.0' },
  { id: 'starch_tanks', zone: 'achirales', name: 'Tanques de asiento', icon: ICON.wetStarch, in: { achira_mash: 1 }, out: { wet_starch: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '4.0' },
  { id: 'starch_patio', zone: 'achirales', name: 'Patio de secado', icon: ICON.achiraStarch, in: { wet_starch: 1 }, out: { achira_starch: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '4.0' },
  { id: 'achira_kneader', zone: 'achirales', name: 'Amasadero', icon: ICON.bizcochoDough, in: { achira_starch: 4 }, out: { bizcocho_dough: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '4.0' },
  { id: 'bizcocho_oven', zone: 'achirales', name: 'Horno de bizcochos', icon: ICON.bizcochos, in: { bizcocho_dough: 1 }, out: { bizcochos: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '4.0' },
  { id: 'bizcocho_packer', zone: 'achirales', name: 'Empacadora de bizcochos', icon: ICON.bizcochoBox, in: { bizcochos: 4 }, out: { bizcocho_box: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '4.0' },

  // Café del Huila (Pitalito): Beneficiadero outputs parchment coffee plus cherry cascara,
  // sent via chute to Cascara dryer making tea for Neiva.
  { id: 'cafetal_huila', zone: 'cafe_huila', name: 'Cafetal de montaña', icon: ICON.cherry, infinite: true, out: { huila_cherry: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '4.0' },
  { id: 'huila_wetmill', zone: 'cafe_huila', name: 'Beneficiadero del Huila', icon: ICON.parchment, in: { huila_cherry: 1 }, out: { huila_parchment: 1 }, by: { cascara: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '4.0' },
  { id: 'huila_huller', zone: 'cafe_huila', name: 'Trilladora', icon: ICON.cafeExcelso, in: { huila_parchment: 2 }, out: { cafe_excelso: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '4.0' },
  { id: 'huila_roaster', zone: 'cafe_huila', name: 'Tostadora', icon: ICON.roastedCoffee, in: { cafe_excelso: 2 }, out: { huila_roasted: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '4.0' },
  { id: 'huila_packer', zone: 'cafe_huila', name: 'Empacadora de café especial', icon: ICON.cafeEspecial, in: { huila_roasted: 1 }, out: { cafe_especial: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '4.0' },
  { id: 'cascara_dryer', zone: 'cafe_huila', name: 'Secadero de cáscara', icon: ICON.teCascara, in: { cascara: 4 }, out: { te_cascara: 1 }, cycle: 6.4, unlockCost: 400000, upgradeBase: 500, growth: 1.15, release: '4.0' },

  // Betania Dam: cage tilapia splits across Smokehouse, Filleter (feeding Escabeche pot),
  // and Reservoir kitchen (fried tilapia with patacón).
  { id: 'tilapia_cages', zone: 'betania', name: 'Jaulas de tilapia', icon: ICON.tilapia, infinite: true, out: { tilapia: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '4.0' },
  { id: 'tilapia_cleaner', zone: 'betania', name: 'Limpieza de tilapia', icon: ICON.cleanTilapia, in: { tilapia: 1 }, out: { clean_tilapia: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '4.0' },
  { id: 'tilapia_smoker', zone: 'betania', name: 'Ahumadero', icon: ICON.tilapiaAhumada, in: { clean_tilapia: 8 }, out: { tilapia_ahumada: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '4.0' },
  { id: 'tilapia_filleter', zone: 'betania', name: 'Fileteadora de tilapia', icon: ICON.tilapiaFillet, in: { clean_tilapia: 2 }, out: { tilapia_fillet: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '4.0' },
  { id: 'escabeche_pot', zone: 'betania', name: 'Olla del escabeche', icon: ICON.escabeche, in: { tilapia_fillet: 2 }, out: { escabeche: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '4.0' },
  { id: 'represa_kitchen', zone: 'betania', name: 'Cocina de la represa', icon: ICON.almuerzoRepresa, in: { clean_tilapia: 4 }, out: { almuerzo_represa: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '4.0' },

  // Lechonería (Ibagué): Butchery outputs meat & skin. Meat feeds Filling cauldron & Tamal
  // hearth; skin runs via chute to Skin cleaning, and Wood oven combines filling + clean skin
  // into lechona. Breakfast porch serves tamal with achira bizcochos & Huila coffee.
  { id: 'pigsty', zone: 'lechoneria', name: 'Chiquero', icon: ICON.cerdo, infinite: true, out: { cerdo: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '4.0' },
  { id: 'pork_butcher', zone: 'lechoneria', name: 'Desposte de cerdo', icon: ICON.carneCerdo, in: { cerdo: 2 }, out: { carne_cerdo: 1 }, by: { cuero_cerdo: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '4.0' },
  { id: 'skin_cleaner', zone: 'lechoneria', name: 'Limpieza del cuero', icon: ICON.cueroLimpio, in: { cuero_cerdo: 2 }, out: { cuero_limpio: 1 }, cycle: 8, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '4.0' },
  { id: 'relleno_pot', zone: 'lechoneria', name: 'Paila del relleno', icon: ICON.relleno, in: { carne_cerdo: 1 }, out: { relleno: 1 }, cycle: 8, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '4.0' },
  { id: 'tamal_stove', zone: 'lechoneria', name: 'Fogón del tamal', icon: ICON.tamal, in: { carne_cerdo: 1 }, out: { tamal: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '4.0' },
  { id: 'lechona_oven', zone: 'lechoneria', name: 'Horno de leña', icon: ICON.lechona, in: { relleno: 4 }, joins: [{ product: 'cuero_limpio', perCycle: 4, from: 'skin_cleaner' }], out: { lechona: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '4.0' },
  { id: 'desayuno_tolimense_table', zone: 'lechoneria', name: 'Mesa del desayuno tolimense', icon: ICON.desayunoTolimense, in: { tamal: 4 }, imports: [{ product: 'bizcochos', perCycle: 2, route: 'bizcochos' }, { product: 'huila_roasted', perCycle: 1, route: 'tinto' }], out: { desayuno_tolimense: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '4.0' },

  // La Chamba (El Guamo): black clay pottery. Clay is trodden, hand-molded, burnished with
  // river stones, and dung-smoked jet black. Shop sells it with Betania smoked tilapia & escabeche.
  { id: 'clay_bank', zone: 'chamba', name: 'Barranco de arcilla', icon: ICON.arcilla, infinite: true, out: { arcilla: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '4.0' },
  { id: 'clay_treader', zone: 'chamba', name: 'Pisadero de barro', icon: ICON.barroPisado, in: { arcilla: 1 }, out: { barro_pisado: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '4.0' },
  { id: 'pot_modelers', zone: 'chamba', name: 'Moldeadoras', icon: ICON.piezaCruda, in: { barro_pisado: 2 }, out: { pieza_cruda: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '4.0' },
  { id: 'pot_burnishers', zone: 'chamba', name: 'Bruñidoras', icon: ICON.piezaBrunida, in: { pieza_cruda: 2 }, out: { pieza_brunida: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '4.0' },
  { id: 'black_kiln', zone: 'chamba', name: 'Horno de quema', icon: ICON.lozaNegra, in: { pieza_brunida: 1 }, out: { loza_negra: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '4.0' },
  { id: 'tienda_chamba', zone: 'chamba', name: 'Tienda de La Chamba', icon: ICON.recuerdoTolima, in: { loza_negra: 4 }, imports: [{ product: 'tilapia_ahumada', perCycle: 1, route: 'ahumadas_tilapia' }, { product: 'escabeche', perCycle: 1, route: 'escabeches' }], out: { recuerdo_tolima: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '4.0' },

  // Neiva, Tolima Grande finale: like Leticia, no native source. Each station receives a zone's
  // goods; San Pedro hotel combines La Chamba souvenirs with Huila cascara tea, ending at
  // Tatacoa Desert stargazing.
  { id: 'cafeteria_malecon', zone: 'neiva', name: 'Cafetería del malecón', icon: ICON.meriendaMalecon, imports: [{ product: 'bizcocho_box', perCycle: 1, route: 'cajas_bizcochos' }], out: { merienda_malecon: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '4.0' },
  { id: 'restaurante_rio', zone: 'neiva', name: 'Restaurante del río', icon: ICON.cenaOpita, in: { merienda_malecon: 1 }, imports: [{ product: 'cafe_especial', perCycle: 4, route: 'cafe_especial' }], out: { cena_opita: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '4.0' },
  { id: 'hotel_sanpedro', zone: 'neiva', name: 'Hotel del San Pedro', icon: ICON.nocheSanpedro, in: { cena_opita: 2 }, imports: [{ product: 'recuerdo_tolima', perCycle: 1, route: 'recuerdos_tolima' }, { product: 'te_cascara', perCycle: 5, route: 'te_cascara' }], out: { noche_sanpedro: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '4.0' },
  { id: 'plaza_neiva', zone: 'neiva', name: 'Plaza de mercado de Neiva', icon: ICON.almuerzoOpita, in: { merienda_malecon: 1 }, imports: [{ product: 'almuerzo_represa', perCycle: 1, route: 'almuerzos_represa' }], out: { almuerzo_opita: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '4.0' },
  { id: 'fiambrera_tatacoa', zone: 'neiva', name: 'Fiambrera del paseo', icon: ICON.fiambreTatacoa, in: { almuerzo_opita: 1 }, imports: [{ product: 'desayuno_tolimense', perCycle: 1, route: 'desayunos_tolimenses' }, { product: 'lechona', perCycle: 1, route: 'lechonas' }], out: { fiambre_tatacoa: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '4.0' },
  { id: 'salida_tatacoa', zone: 'neiva', name: 'Salida a la Tatacoa', icon: ICON.tatacoa, in: { fiambre_tatacoa: 4 }, out: { excursion_tatacoa: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '4.0' },

  // Cundinamarca (v4.4), ninth region: opens after Neiva. Same numbers as Tolima Grande.
  // Flores de la Sabana (Madrid & Facatativá): export roses, greenhouse to air-cargo box.
  { id: 'invernadero_rosas', zone: 'flores', name: 'Invernadero de rosas', icon: ICON.rosal, infinite: true, out: { rosa: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, growth: 1.15, release: '4.4' },
  { id: 'mesa_corte', zone: 'flores', name: 'Mesa de corte', icon: ICON.rosasCortadas, in: { rosa: 2 }, out: { rosas_cortadas: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, growth: 1.15, release: '4.4' },
  { id: 'tinas_hidratacion', zone: 'flores', name: 'Tinas de hidratación', icon: ICON.rosaHidratada, in: { rosas_cortadas: 1 }, out: { rosa_hidratada: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, growth: 1.15, release: '4.4' },
  { id: 'clasificadora_flores', zone: 'flores', name: 'Clasificadora', icon: ICON.rosaClasificada, in: { rosa_hidratada: 1 }, out: { rosa_clasificada: 1 }, cycle: 4, unlockCost: 1000, upgradeBase: 20, growth: 1.15, release: '4.4' },
  { id: 'boncheo', zone: 'flores', name: 'Boncheo', icon: ICON.boncheRosas, in: { rosa_clasificada: 4 }, out: { bonche_rosas: 3 }, cycle: 16, unlockCost: 4000, upgradeBase: 35, growth: 1.15, release: '4.4' },
  { id: 'cuarto_frio', zone: 'flores', name: 'Cuarto frío', icon: ICON.ramoRosas, in: { bonche_rosas: 1 }, out: { ramo_rosas: 1 }, cycle: 16 / 3, unlockCost: 8000, upgradeBase: 60, growth: 1.15, release: '4.4' },
  { id: 'empacadora_flores', zone: 'flores', name: 'Empacadora de flores', icon: ICON.cajaFlores, in: { ramo_rosas: 4 }, out: { caja_flores: 1 }, cycle: 32, unlockCost: 30000, upgradeBase: 100, growth: 1.15, release: '4.4' },

  // Freseros de Sibaté: Washer separates prime berries from seconds (small/bruised), routed
  // down chute to Marmita kettle for jam bound for Zipaquirá.
  { id: 'fresal', zone: 'fresas', name: 'Fresal', icon: ICON.fresal, infinite: true, out: { fresa: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '4.4' },
  { id: 'lavadero_fresas', zone: 'fresas', name: 'Lavadero de fresas', icon: ICON.fresaLavada, in: { fresa: 1 }, out: { fresa_lavada: 1 }, by: { fresa_segunda: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '4.4' },
  { id: 'seleccionadora_fresas', zone: 'fresas', name: 'Seleccionadora', icon: ICON.fresaSeleccionada, in: { fresa_lavada: 2 }, out: { fresa_seleccionada: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '4.4' },
  { id: 'llenadora_bandejas', zone: 'fresas', name: 'Llenadora de bandejas', icon: ICON.bandejaFresas, in: { fresa_seleccionada: 2 }, out: { bandeja_fresas: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '4.4' },
  { id: 'mesa_fresas_crema', zone: 'fresas', name: 'Mesa de fresas con crema', icon: ICON.fresasCrema, in: { bandeja_fresas: 1 }, out: { fresas_crema: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '4.4' },
  { id: 'marmita_mermelada', zone: 'fresas', name: 'Marmita de mermelada', icon: ICON.mermeladaFresa, in: { fresa_segunda: 4 }, out: { mermelada_fresa: 1 }, cycle: 6.4, unlockCost: 400000, upgradeBase: 500, growth: 1.15, release: '4.4' },

  // Truchas de Guatavita: cleaned trout splits across Smokehouse, Filleter (feeding Ceviche
  // bench), and Lakeside kitchen (fried trout with salted potato).
  { id: 'estanques_trucha', zone: 'truchas', name: 'Estanques de trucha', icon: ICON.estanquesTrucha, infinite: true, out: { trucha: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '4.4' },
  { id: 'limpieza_trucha', zone: 'truchas', name: 'Limpieza de trucha', icon: ICON.truchaLimpia, in: { trucha: 1 }, out: { trucha_limpia: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '4.4' },
  { id: 'ahumadero_trucha', zone: 'truchas', name: 'Ahumadero de trucha', icon: ICON.truchaAhumada, in: { trucha_limpia: 8 }, out: { trucha_ahumada: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '4.4' },
  { id: 'fileteadora_trucha', zone: 'truchas', name: 'Fileteadora de trucha', icon: ICON.fileteTrucha, in: { trucha_limpia: 2 }, out: { filete_trucha: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '4.4' },
  { id: 'mesa_ceviche', zone: 'truchas', name: 'Mesa del ceviche', icon: ICON.cevicheTrucha, in: { filete_trucha: 2 }, out: { ceviche_trucha: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '4.4' },
  { id: 'cocina_laguna', zone: 'truchas', name: 'Cocina de la laguna', icon: ICON.almuerzoTrucha, in: { trucha_limpia: 4 }, out: { almuerzo_trucha: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '4.4' },

  // Salinas de Nemocón: Brine wells dissolve rock and yield salt blocks via chute to Carving
  // workshop. Brine splits between Evaporation pans (refined salt) and Clay pots (Muisca salt loaves);
  // Gift packer combines salt with carvings. Hamper bench packs salt loaves, Flores roses,
  // and Sibaté berry trays.
  { id: 'socavon_sal', zone: 'salinas', name: 'Socavón de sal', icon: ICON.socavonSal, infinite: true, out: { roca_sal: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '4.4' },
  { id: 'pozos_salmuera', zone: 'salinas', name: 'Pozos de salmuera', icon: ICON.salmuera, in: { roca_sal: 2 }, out: { salmuera: 1 }, by: { bloque_sal: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '4.4' },
  { id: 'taller_tallado', zone: 'salinas', name: 'Taller de tallado', icon: ICON.figuraSal, in: { bloque_sal: 2 }, out: { figura_sal: 1 }, cycle: 8, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '4.4' },
  { id: 'tachos_evaporacion', zone: 'salinas', name: 'Tachos de evaporación', icon: ICON.salRefinada, in: { salmuera: 1 }, out: { sal_refinada: 1 }, cycle: 8, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '4.4' },
  { id: 'gachas_barro', zone: 'salinas', name: 'Gachas de barro', icon: ICON.panSal, in: { salmuera: 1 }, out: { pan_sal: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '4.4' },
  { id: 'empaque_regalo', zone: 'salinas', name: 'Empaque de regalo', icon: ICON.cofreSal, in: { sal_refinada: 4 }, joins: [{ product: 'figura_sal', perCycle: 4, from: 'taller_tallado' }], out: { cofre_sal: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '4.4' },
  { id: 'armadora_canastas', zone: 'salinas', name: 'Armadora de canastas', icon: ICON.canastaSabanera, in: { pan_sal: 4 }, imports: [{ product: 'ramo_rosas', perCycle: 2, route: 'ramos_rosas' }, { product: 'bandeja_fresas', perCycle: 1, route: 'bandejas_fresa' }], out: { canasta_sabanera: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '4.4' },

  // Cocina de la Sabana (Chía): authentic ajiaco santafereño from potato to cream-and-caper bowl.
  // Santafereño restaurant serves it alongside Guatavita smoked trout and ceviche.
  { id: 'huerta_papa', zone: 'cocina', name: 'Huerta de papa', icon: ICON.potatoPlant, infinite: true, out: { papa_sabanera: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '4.4' },
  { id: 'peladero', zone: 'cocina', name: 'Peladero', icon: ICON.peeledPotato, in: { papa_sabanera: 1 }, out: { papa_pelada_sabana: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '4.4' },
  { id: 'olla_caldo', zone: 'cocina', name: 'Olla del caldo', icon: ICON.caldoPapas, in: { papa_pelada_sabana: 2 }, out: { caldo_papas: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '4.4' },
  { id: 'olla_ajiaco', zone: 'cocina', name: 'Olla del ajiaco', icon: ICON.ajiaco, in: { caldo_papas: 2 }, out: { ajiaco: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '4.4' },
  { id: 'servidora_ajiaco', zone: 'cocina', name: 'Servidora', icon: ICON.platoAjiaco, in: { ajiaco: 1 }, out: { plato_ajiaco: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '4.4' },
  { id: 'restaurante_santafereno', zone: 'cocina', name: 'Restaurante santafereño', icon: ICON.almuerzoSabanero, in: { plato_ajiaco: 4 }, imports: [{ product: 'trucha_ahumada', perCycle: 1, route: 'ahumadas_trucha' }, { product: 'ceviche_trucha', perCycle: 1, route: 'ceviches' }], out: { almuerzo_sabanero: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '4.4' },

  // Zipaquirá, Cundinamarca finale: like Neiva, no native source. Takes each zone's output;
  // Plaza hotel pairs Sabana lunch with Sibaté jam, ending at Salt Cathedral tour.
  // Salt Cathedral tour.
  { id: 'floristeria_plaza', zone: 'zipaquira', name: 'Floristería de la plaza', icon: ICON.arregloFloral, imports: [{ product: 'caja_flores', perCycle: 1, route: 'cajas_flores' }], out: { arreglo_floral: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '4.4' },
  { id: 'salon_onces', zone: 'zipaquira', name: 'Salón de onces', icon: ICON.onces, in: { arreglo_floral: 1 }, imports: [{ product: 'fresas_crema', perCycle: 4, route: 'fresas_crema' }], out: { onces_santafereñas: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '4.4' },
  { id: 'hotel_plaza_zipa', zone: 'zipaquira', name: 'Hotel de la plaza', icon: ICON.nocheZipaquira, in: { onces_santafereñas: 2 }, imports: [{ product: 'almuerzo_sabanero', perCycle: 1, route: 'almuerzos_sabaneros' }, { product: 'mermelada_fresa', perCycle: 5, route: 'mermeladas' }], out: { noche_zipaquira: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '4.4' },
  { id: 'plaza_mercado_zipa', zone: 'zipaquira', name: 'Plaza de mercado de Zipaquirá', icon: ICON.almuerzoPlazaZipa, in: { arreglo_floral: 1 }, imports: [{ product: 'almuerzo_trucha', perCycle: 1, route: 'almuerzos_trucha' }], out: { almuerzo_plaza_zipa: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '4.4' },
  { id: 'mochilas_paseo', zone: 'zipaquira', name: 'Mochilas del paseo', icon: ICON.mochilaPaseo, in: { almuerzo_plaza_zipa: 1 }, imports: [{ product: 'canasta_sabanera', perCycle: 1, route: 'canastas' }, { product: 'cofre_sal', perCycle: 1, route: 'cofres_sal' }], out: { mochila_paseo: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '4.4' },
  { id: 'entrada_catedral', zone: 'zipaquira', name: 'Entrada a la Catedral de Sal', icon: ICON.catedralSal, in: { mochila_paseo: 4 }, out: { visita_catedral: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '4.4' },

  // Bogotá (v4.5; network since v4.6): produces nothing native, no chain neighborhoods. 24-station
  // network in 6 tiers: tier 1 builds cheap from start; every later station unlocks once all its
  // Bogotá suppliers are built. Many combine 2–3 stations (`joins`), 3 output chute byproducts (`by`).
  // Tractomulas bring external cargo only where sensible. Equal levels supply exact (or slightly surplus) demand.
  // demand.
  // Tier 1: external goods, buildable from start.
  { id: 'tostadero_chorro', zone: 'bogota', name: 'Tostadero del Chorro', icon: ICON.cafeCapitalino, imports: [{ product: 'coffee_bag', perCycle: 1, route: 'tm_cafe' }], out: { cafe_capitalino: 1 }, by: { cafe_molido: 5 }, cycle: 2, unlockCost: 0, upgradeBase: 20, growth: 1.15, release: '4.5' },
  { id: 'despensa_zona_g', zone: 'bogota', name: 'Despensa de la Zona G', icon: ICON.salsasCasa, imports: [{ product: 'alino_box', perCycle: 1, route: 'tm_alino' }, { product: 'aji_box', perCycle: 1, route: 'tm_aji' }], out: { salsas_casa: 2 }, cycle: 1.6, unlockCost: 200, upgradeBase: 32, growth: 1.15, release: '4.5' },
  { id: 'toldo_tejidos', zone: 'bogota', name: 'Toldo de tejidos', icon: ICON.surtidoTejidos, imports: [{ product: 'ruana', perCycle: 1, route: 'tm_ruanas' }, { product: 'alpargatas', perCycle: 1, route: 'tm_alpargatas' }], out: { surtido_tejidos: 1 }, cycle: 2, unlockCost: 600, upgradeBase: 48, growth: 1.15, release: '4.5' },
  { id: 'puesto_flores', zone: 'bogota', name: 'Puesto de flores', icon: ICON.canastaFlores, imports: [{ product: 'caja_flores', perCycle: 1, route: 'tm_flores' }], out: { canasta_flores: 1 }, cycle: 2, unlockCost: 1600, upgradeBase: 72, growth: 1.15, release: '4.5' },
  { id: 'puesto_frutas', zone: 'bogota', name: 'Puesto de frutas', icon: ICON.canastaFrutas, imports: [{ product: 'juice_box', perCycle: 1, route: 'tm_jugos' }, { product: 'asai_box', perCycle: 1, route: 'tm_asai' }], out: { canasta_frutas: 2 }, cycle: 2, unlockCost: 4000, upgradeBase: 100, growth: 1.15, release: '4.5' },
  // Nivel 2.
  { id: 'cafeteria_septima', zone: 'bogota', name: 'Cafetería de la Séptima', icon: ICON.tintoBizcochos, in: { cafe_capitalino: 2 }, imports: [{ product: 'bizcocho_box', perCycle: 1, route: 'tm_bizcochos' }], out: { tinto_bizcochos: 2 }, cycle: 4, unlockCost: 12000, upgradeBase: 160, growth: 1.15, release: '4.5' },
  { id: 'cocina_entradas', zone: 'bogota', name: 'Cocina de entradas', icon: ICON.picadaCasa, in: { salsas_casa: 1 }, imports: [{ product: 'criollas_box', perCycle: 1, route: 'tm_papitas' }, { product: 'ant_cone', perCycle: 1, route: 'tm_hormigas' }], out: { picada_casa: 1 }, by: { chicharron: 1 }, cycle: 1.6, unlockCost: 20000, upgradeBase: 220, growth: 1.15, release: '4.5' },
  { id: 'toldo_sombreros', zone: 'bogota', name: 'Toldo de sombreros', icon: ICON.surtidoFeria, in: { surtido_tejidos: 1 }, imports: [{ product: 'sombrero_vueltiao', perCycle: 1, route: 'tm_sombreros' }, { product: 'silla_montar', perCycle: 1, route: 'tm_sillas' }], out: { surtido_feria: 1 }, cycle: 2, unlockCost: 32000, upgradeBase: 300, growth: 1.15, release: '4.5' },
  { id: 'pescaderia_plaza', zone: 'bogota', name: 'Pescadería', icon: ICON.canastaPaloquemao, in: { canasta_frutas: 2 }, imports: [{ product: 'trucha_ahumada', perCycle: 1, route: 'tm_trucha' }, { product: 'smoked_pargo', perCycle: 1, route: 'tm_pargo' }], out: { canasta_plaza: 1 }, cycle: 4, unlockCost: 48000, upgradeBase: 400, growth: 1.15, release: '4.5' },
  // Tier 3: network intersections begin here.
  { id: 'chocolateria_candelaria', zone: 'bogota', name: 'Chocolatería santafereña', icon: ICON.santafereno, in: { tinto_bizcochos: 1 }, imports: [{ product: 'table_chocolate', perCycle: 1, route: 'tm_chocolate' }, { product: 'canasta_amasijos', perCycle: 1, route: 'tm_amasijos' }], out: { chocolate_completo: 1 }, cycle: 4, unlockCost: 160000, upgradeBase: 600, growth: 1.15, release: '4.5' },
  { id: 'parrilla_zona_g', zone: 'bogota', name: 'Parrilla', icon: ICON.platoFuerte, in: { picada_casa: 2 }, joins: [{ product: 'salsas_casa', perCycle: 1, from: 'despensa_zona_g' }], imports: [{ product: 'parranda_llanera', perCycle: 1, route: 'tm_asado' }, { product: 'rice_sack', perCycle: 1, route: 'tm_arroz' }], out: { plato_fuerte: 1 }, by: { caldo_costilla: 1 }, cycle: 3.2, unlockCost: 240000, upgradeBase: 800, growth: 1.15, release: '4.5' },
  { id: 'toldo_loza', zone: 'bogota', name: 'Toldo de loza y canastas', icon: ICON.surtidoLoza, in: { surtido_feria: 2 }, joins: [{ product: 'canasta_flores', perCycle: 1, from: 'puesto_flores' }], imports: [{ product: 'loza_negra', perCycle: 1, route: 'tm_loza' }, { product: 'gift_basket', perCycle: 1, route: 'tm_canastas' }], out: { surtido_loza: 1 }, cycle: 4, unlockCost: 400000, upgradeBase: 1120, growth: 1.15, release: '4.5' },
  { id: 'fritanga_plaza', zone: 'bogota', name: 'Fritanga de la plaza', icon: ICON.desayunoPlaza, in: { canasta_plaza: 2 }, joins: [{ product: 'salsas_casa', perCycle: 2, from: 'despensa_zona_g' }, { product: 'chicharron', perCycle: 5, from: 'cocina_entradas' }], imports: [{ product: 'lechona', perCycle: 1, route: 'tm_lechona' }], out: { desayuno_plaza: 2 }, cycle: 8, unlockCost: 600000, upgradeBase: 1600, growth: 1.15, release: '4.5' },
  // Nivel 4.
  { id: 'dulceria_calle11', zone: 'bogota', name: 'Dulcería de la Calle 11', icon: ICON.oncesBogotanas, in: { chocolate_completo: 4 }, joins: [{ product: 'canasta_frutas', perCycle: 4, from: 'puesto_frutas' }], imports: [{ product: 'bocadillo_crate', perCycle: 1, route: 'tm_bocadillos' }, { product: 'cocada', perCycle: 2, route: 'tm_cocadas' }], out: { onces_bogotanas: 3 }, cycle: 16, unlockCost: 2000000, upgradeBase: 2800, growth: 1.15, release: '4.5' },
  { id: 'reposteria_zona_g', zone: 'bogota', name: 'Repostería y jugos', icon: ICON.menuCompleto, in: { plato_fuerte: 2 }, joins: [{ product: 'canasta_frutas', perCycle: 1, from: 'puesto_frutas' }], out: { menu_completo: 1 }, cycle: 6.4, unlockCost: 3200000, upgradeBase: 4000, growth: 1.15, release: '4.5' },
  { id: 'toldo_mascaras', zone: 'bogota', name: 'Toldo de máscaras y werregue', icon: ICON.granSurtido, in: { surtido_loza: 2 }, imports: [{ product: 'ticuna_mask', perCycle: 1, route: 'tm_mascaras' }, { product: 'werregue_jar', perCycle: 1, route: 'tm_werregue' }], out: { gran_surtido: 1 }, cycle: 8, unlockCost: 4800000, upgradeBase: 5600, growth: 1.15, release: '4.5' },
  { id: 'plaza_paloquemao', zone: 'bogota', name: 'Plaza de Paloquemao', icon: ICON.mananaPaloquemao, in: { desayuno_plaza: 2 }, joins: [{ product: 'caldo_costilla', perCycle: 5, from: 'parrilla_zona_g' }, { product: 'tinto_bizcochos', perCycle: 4, from: 'cafeteria_septima' }], out: { manana_paloquemao: 1 }, cycle: 16, unlockCost: 8000000, upgradeBase: 8000, growth: 1.15, release: '4.5' },
  // Nivel 5.
  { id: 'casa_colonial', zone: 'bogota', name: 'Casa colonial', icon: ICON.tardeCandelaria, in: { onces_bogotanas: 6 }, joins: [{ product: 'canasta_flores', perCycle: 8, from: 'puesto_flores' }], out: { tarde_candelaria: 2 }, cycle: 32, unlockCost: 60000000, upgradeBase: 14000, growth: 1.15, release: '4.5' },
  { id: 'restaurante_zona_g', zone: 'bogota', name: 'Restaurante de la Zona G', icon: ICON.cenaZonaG, in: { menu_completo: 1 }, joins: [{ product: 'cafe_molido', perCycle: 16, from: 'tostadero_chorro' }], out: { cena_zona_g: 1 }, cycle: 6.4, unlockCost: 120000000, upgradeBase: 20000, growth: 1.15, release: '4.5' },
  { id: 'mercado_pulgas', zone: 'bogota', name: 'Mercado de las pulgas', icon: ICON.domingoUsaquen, in: { gran_surtido: 2 }, joins: [{ product: 'desayuno_plaza', perCycle: 2, from: 'fritanga_plaza' }], imports: [{ product: 'cofre_sal', perCycle: 1, route: 'tm_cofres' }], out: { domingo_usaquen: 1 }, cycle: 16, unlockCost: 240000000, upgradeBase: 28000, growth: 1.15, release: '4.5' },
  // Tier 6, downtown: unites whole city. Casa colonial splits cakes between Hotel and Funicular.
  { id: 'hotel_capital', zone: 'bogota', name: 'Hotel de la capital', icon: ICON.nocheBogota, in: { tarde_candelaria: 1 }, joins: [{ product: 'cena_zona_g', perCycle: 5, from: 'restaurante_zona_g' }], out: { noche_bogota: 1 }, cycle: 32, unlockCost: 800000000, upgradeBase: 40000, growth: 1.15, release: '4.5' },
  { id: 'funicular_monserrate', zone: 'bogota', name: 'Funicular de Monserrate', icon: ICON.monserrate, in: { tarde_candelaria: 1 }, out: { subida_monserrate: 1 }, cycle: 32, unlockCost: 1600000000, upgradeBase: 60000, growth: 1.15, release: '4.5' },
  { id: 'pabellon_regiones', zone: 'bogota', name: 'Pabellón de las regiones', icon: ICON.pabellonColombia, in: { domingo_usaquen: 2 }, joins: [{ product: 'manana_paloquemao', perCycle: 2, from: 'plaza_paloquemao' }], out: { pabellon_colombia: 1 }, cycle: 32, unlockCost: 3600000000, upgradeBase: 88000, growth: 1.15, release: '4.5' },
  { id: 'gran_feria', zone: 'bogota', name: 'Recinto de la Gran Feria', icon: ICON.feriaMiTierrita, in: { pabellon_colombia: 2 }, joins: [{ product: 'noche_bogota', perCycle: 2, from: 'hotel_capital' }, { product: 'subida_monserrate', perCycle: 2, from: 'funicular_monserrate' }], out: { feria_mi_tierrita: 1 }, cycle: 64, unlockCost: 8000000000, upgradeBase: 140000, growth: 1.15, release: '4.5' },

  // Santander · El Tabacal (v3.1). Tobacco leaf cures, stems, ferments, and twists:
  // same numbers as Trapiche (without Hornilla fuel boost: chain still balances).
  { id: 'tobacco_field', zone: 'tabacal', name: 'Tabacal', icon: ICON.tobaccoPlant, infinite: true, out: { tobacco_leaf: 1 }, cycle: 1.6, unlockCost: 0, upgradeBase: 50, growth: 1.15, release: '3.1' },
  { id: 'caney', zone: 'tabacal', name: 'Caney de curado', icon: '🛖', in: { tobacco_leaf: 1 }, out: { cured_leaf: 1 }, cycle: 1.6, unlockCost: 5000, upgradeBase: 80, growth: 1.15, release: '3.1' },
  { id: 'stripper', zone: 'tabacal', name: 'Despalilladora', icon: '✂️', in: { cured_leaf: 2 }, out: { stripped_leaf: 1 }, cycle: 3.2, unlockCost: 25000, upgradeBase: 120, growth: 1.15, release: '3.1' },
  { id: 'tobacco_piles', zone: 'tabacal', name: 'Pilones de fermentación', icon: '♨️', in: { stripped_leaf: 2 }, out: { fermented_tobacco: 1 }, cycle: 6.4, unlockCost: 80000, upgradeBase: 200, growth: 1.15, release: '3.1' },
  { id: 'cigar_roller', zone: 'tabacal', name: 'Torcedores', icon: '🤲', in: { fermented_tobacco: 1 }, out: { cigar: 1 }, cycle: 8, unlockCost: 250000, upgradeBase: 350, growth: 1.15, release: '3.1' },

  // Santander · La Fiquera (v3.2). Agave leaf yields fiber splitting like Lechería milk (same
  // numbers): burlap sacks, espadrille twine, and bale cloth for Tabacal fermented tobacco
  // arriving via tobacco route.
  { id: 'fique_field', zone: 'fiquera', name: 'Cultivo de fique', icon: ICON.fiquePlant, infinite: true, out: { fique_leaf: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 250, growth: 1.15, release: '3.2' },
  { id: 'decorticator', zone: 'fiquera', name: 'Desfibradora', icon: '⚙️', in: { fique_leaf: 1 }, out: { fique_fiber: 1 }, cycle: 2, unlockCost: 200000, upgradeBase: 400, growth: 1.15, release: '3.2' },
  { id: 'sack_loom', zone: 'fiquera', name: 'Telar de costales', icon: ICON.fiqueSack, in: { fique_fiber: 4 }, out: { fique_sack: 1 }, cycle: 32, unlockCost: 400000, upgradeBase: 1300, growth: 1.15, release: '3.2' },
  { id: 'spinner', zone: 'fiquera', name: 'Hiladora', icon: ICON.fiqueYarn, in: { fique_fiber: 2 }, out: { fique_yarn: 1 }, cycle: 16, unlockCost: 1000000, upgradeBase: 600, growth: 1.15, release: '3.2' },
  { id: 'alpargata_shop', zone: 'fiquera', name: 'Alpargatería', icon: ICON.alpargatas, in: { fique_yarn: 2 }, out: { alpargatas: 1 }, cycle: 32, unlockCost: 2000000, upgradeBase: 900, growth: 1.15, release: '3.2' },
  { id: 'tercio_packer', zone: 'fiquera', name: 'Empacadora de tercios', icon: ICON.tobaccoBale, in: { fique_fiber: 4 }, imports: [{ product: 'fermented_tobacco', perCycle: 1, route: 'tabaco' }], out: { tobacco_bale: 1 }, cycle: 32, unlockCost: 4000000, upgradeBase: 2000, growth: 1.15, release: '3.2' },

  // Santander · El Hato (v3.3). Sun-cured beef: cuts, salt-cures, air-dries, grills.
  // Same numbers as Cacaotal: grilled beef splits between Lunch diner and Fiambre shop,
  // awaiting Guayabera bocadillo and Fiquera twine.
  { id: 'cattle_ranch', zone: 'hato', name: 'Hato ganadero', icon: '🐂', infinite: true, out: { steer: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 1500, growth: 1.15, release: '3.3' },
  { id: 'butcher', zone: 'hato', name: 'Fama', icon: '🥩', in: { steer: 2 }, out: { beef: 1 }, cycle: 4, unlockCost: 2000000, upgradeBase: 2000, growth: 1.15, release: '3.3' },
  { id: 'salter', zone: 'hato', name: 'Saladero', icon: ICON.saltedBeef, in: { beef: 1 }, out: { salted_beef: 1 }, cycle: 4, unlockCost: 5000000, upgradeBase: 3000, growth: 1.15, release: '3.3' },
  { id: 'airing_rack', zone: 'hato', name: 'Tendedero de oreo', icon: ICON.carneOreada, in: { salted_beef: 1 }, out: { carne_oreada: 1 }, cycle: 4, unlockCost: 12000000, upgradeBase: 4500, growth: 1.15, release: '3.3' },
  { id: 'grill', zone: 'hato', name: 'Asadero', icon: '🔥', in: { carne_oreada: 2 }, out: { grilled_oreada: 1 }, cycle: 8, unlockCost: 30000000, upgradeBase: 7000, growth: 1.15, release: '3.3' },
  { id: 'lunch_table', zone: 'hato', name: 'Mesa del almuerzo', icon: ICON.almuerzo, in: { grilled_oreada: 2 }, imports: [{ product: 'bocadillo_bijao', perCycle: 1, route: 'bocadillo' }], out: { almuerzo: 1 }, cycle: 32, unlockCost: 40000000, upgradeBase: 10000, growth: 1.15, release: '3.3' },
  { id: 'fiambre_maker', zone: 'hato', name: 'Fiambrería', icon: ICON.fiambre, in: { grilled_oreada: 2 }, imports: [{ product: 'bocadillo_bijao', perCycle: 1, route: 'bocadillo' }, { product: 'fique_fiber', perCycle: 4, route: 'cabuya' }], out: { fiambre: 1 }, cycle: 32, unlockCost: 80000000, upgradeBase: 16000, growth: 1.15, release: '3.3' },

  // Santander · Las Hormigas (v3.4). Culona ants emerge only at rainy onset: full year's catch
  // (×4) harvests into pantry for haulers to carry year-round. Same numbers as Maizal;
  // Souvenir shop awaits Fiquera sacks and espadrilles.
  // Fiquera espadrilles.
  { id: 'anthill', zone: 'hormigas', name: 'Hormiguero', icon: ICON.antQueen, infinite: true, out: { ant_queen: 1 }, harvest: { season: 'entrada', mult: 4, store: 3000 }, cycle: 2, unlockCost: 0, upgradeBase: 20000, growth: 1.15, release: '3.4' },
  { id: 'ant_cleaner', zone: 'hormigas', name: 'Mesa de limpieza', icon: ICON.antClean, in: { ant_queen: 1 }, out: { ant_clean: 1 }, cycle: 2, unlockCost: 30000000, upgradeBase: 25000, growth: 1.15, release: '3.4' },
  { id: 'brine_pot', zone: 'hormigas', name: 'Ollas de salmuera', icon: ICON.antBrine, in: { ant_clean: 2 }, out: { ant_brine: 1 }, cycle: 4, unlockCost: 80000000, upgradeBase: 40000, growth: 1.15, release: '3.4' },
  { id: 'ant_toaster', zone: 'hormigas', name: 'Tiesto de barro', icon: ICON.toastedAnts, in: { ant_brine: 2 }, out: { toasted_ants: 1 }, cycle: 8, unlockCost: 200000000, upgradeBase: 60000, growth: 1.15, release: '3.4' },
  { id: 'cone_table', zone: 'hormigas', name: 'Mesa de cucuruchos', icon: ICON.antCone, in: { toasted_ants: 1 }, out: { ant_cone: 1 }, cycle: 8, unlockCost: 500000000, upgradeBase: 90000, growth: 1.15, release: '3.4' },
  { id: 'souvenir_shop', zone: 'hormigas', name: 'Tienda de recuerdos', icon: ICON.recuerdo, in: { ant_cone: 4 }, imports: [{ product: 'fique_sack', perCycle: 1, route: 'costales' }, { product: 'alpargatas', perCycle: 1, route: 'alpargatas' }], out: { recuerdo: 1 }, cycle: 32, unlockCost: 600000000, upgradeBase: 150000, growth: 1.15, release: '3.4' },

  // Santander · Barichara (v3.5), final zone: like Pueblo, no native source. Plaza candy shop
  // makes sweets using Guayabera bocadillo; every station takes a Santander zone's final product
  // (exact same layout, order, and numbers as Pueblo).
  // Ends with Camino Real hikes to Guane.
  { id: 'dulceria', zone: 'barichara', name: 'Dulcería de la plaza', icon: ICON.dulcesTipicos, imports: [{ product: 'bocadillo_crate', perCycle: 1, route: 'dulces' }], out: { dulces_tipicos: 2 }, cycle: 32, unlockCost: 0, upgradeBase: 300000, growth: 1.15, release: '3.5' },
  { id: 'park_cafe', zone: 'barichara', name: 'Café del parque', icon: ICON.sobremesa, in: { dulces_tipicos: 1 }, imports: [{ product: 'cigar', perCycle: 4, route: 'tabacos' }], out: { sobremesa: 2 }, cycle: 32, unlockCost: 300000000, upgradeBase: 400000, growth: 1.15, release: '3.5' },
  { id: 'posada', zone: 'barichara', name: 'Posada', icon: ICON.estadia, in: { sobremesa: 2 }, imports: [{ product: 'recuerdo', perCycle: 1, route: 'recuerdos' }], out: { estadia: 1 }, cycle: 32, unlockCost: 700000000, upgradeBase: 600000, growth: 1.15, release: '3.5' },
  { id: 'box_shop', zone: 'barichara', name: 'Taller de cajas', icon: ICON.cajaSurtida, in: { dulces_tipicos: 1 }, imports: [{ product: 'tobacco_bale', perCycle: 1, route: 'tercios' }], out: { caja_surtida: 1 }, cycle: 32, unlockCost: 1500000000, upgradeBase: 800000, growth: 1.15, release: '3.5' },
  { id: 'hamper', zone: 'barichara', name: 'Canastas del caminante', icon: ICON.canastaCaminante, in: { caja_surtida: 1 }, imports: [{ product: 'almuerzo', perCycle: 1, route: 'almuerzos' }, { product: 'fiambre', perCycle: 1, route: 'fiambres' }], out: { canasta_caminante: 1 }, cycle: 32, unlockCost: 1200000000, upgradeBase: 1000000, growth: 1.15, release: '3.5' },
  { id: 'camino_real', zone: 'barichara', name: 'Salida al Camino Real', icon: ICON.excursion, in: { canasta_caminante: 4 }, out: { excursion: 1 }, cycle: 128, unlockCost: 2000000000, upgradeBase: 1500000, growth: 1.15, release: '3.5' },

  // Special zone · San Andrés (v5.4): the tour of the island, one linear chain. Visitors arrive at the airport and
  // each station adds an experience to their day. Rates are balanced at equal levels (each station takes all its
  // supplier makes), and every station has a ×32 research at level 100 (data/research.js) that also multiplies the
  // warehouse: without it, the next station takes far longer to afford. Prices: SA, above.
  { id: 'aeropuerto_sai', zone: 'sanandres', name: 'Llegada al aeropuerto', icon: '✈️', infinite: true, out: { viajero: 1 }, cycle: 2, unlockCost: 0, upgradeBase: SA.base[0], growth: 1.15, release: '5.4' },
  { id: 'carpas_spratt', zone: 'sanandres', name: 'Carpas de Spratt Bight', icon: ICON.diaPlaya, in: { viajero: 2 }, out: { dia_playa: 1 }, cycle: 4, unlockCost: SA.unlock[1], upgradeBase: SA.base[1], growth: 1.15, release: '5.4' },
  { id: 'lanchas_siete_colores', zone: 'sanandres', name: 'Lanchas del mar de siete colores', icon: ICON.lanchaSiete, in: { dia_playa: 2 }, out: { paseo_lancha: 1 }, cycle: 8, unlockCost: SA.unlock[2], upgradeBase: SA.base[2], growth: 1.15, release: '5.4' },
  { id: 'paseo_johnny_cay', zone: 'sanandres', name: 'Paseo a Johnny Cay', icon: ICON.johnnyCay, in: { paseo_lancha: 2 }, out: { visita_cayo: 1 }, cycle: 16, unlockCost: SA.unlock[3], upgradeBase: SA.base[3], growth: 1.15, release: '5.4' },
  { id: 'rondon_san_luis', zone: 'sanandres', name: 'Fogón del rondón en San Luis', icon: ICON.rondon, in: { visita_cayo: 1 }, out: { almuerzo_rondon: 1 }, cycle: 16, unlockCost: SA.unlock[4], upgradeBase: SA.base[4], growth: 1.15, release: '5.4' },
  { id: 'hoyo_soplador', zone: 'sanandres', name: 'Hoyo Soplador', icon: ICON.mulita, in: { almuerzo_rondon: 2 }, out: { vuelta_isla: 1 }, cycle: 32, unlockCost: SA.unlock[5], upgradeBase: SA.base[5], growth: 1.15, release: '5.4' },
  { id: 'snorkel_piscinita', zone: 'sanandres', name: 'Snorkel en La Piscinita', icon: ICON.snorkel, in: { vuelta_isla: 1 }, out: { buceo: 1 }, cycle: 32, unlockCost: SA.unlock[6], upgradeBase: SA.base[6], growth: 1.15, release: '5.4' },
  { id: 'mirador_la_loma', zone: 'sanandres', name: 'Mirador de La Loma', icon: ICON.iglesiaLoma, in: { buceo: 2 }, out: { tour_isla: 1 }, cycle: 64, unlockCost: SA.unlock[7], upgradeBase: SA.base[7], growth: 1.15, release: '5.4' },
];

export const STATIONS_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

// Warehouse + Dispatch (Willys). One per zone; upgrade prices defined in zone data.
export const DISPATCH = {
  id: 'dispatch',
  name: 'Bodega y Despacho',
  icon: '🚙',
  capacityBase: 10, // units per trip at level 1
  capacityPerLevel: 5, // extra units per level
  tripTime: 10, // segundos ida y vuelta
  maxWait: 3, // seconds Willys waits with partial load before departing
  warehouseTrips: 5, // warehouse holds N trips worth
};
