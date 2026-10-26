// Eventos (v2.0, GDD §10.2): cada zona tiene un evento al año, que se juega en un tablero aparte con
// las piezas de esa zona, sus propias monedas y niveles y su propio reloj (que solo corre mientras se
// juega). El objetivo cambia de un año al siguiente; según lo rápido que se cumpla se gana una medalla.
//   announce: lo que dice la persona de la zona cuando el evento se abre (una vez al año)
//   stations: estaciones que ya están construidas al empezar (en el nivel `level`)
//   coins:    con cuánto se empieza (v3.1.1: lo que cuesta la primera compra del evento, para que desde el
//             primer segundo haya algo que decidir: esa compra o subir estaciones)
//   blame:    qué frena la producción, para decir «el Cafetal produce al 40 % por culpa de la broca»
//   speed:    lo que el evento le hace a la velocidad de cada estación (la broca: el Cafetal al 40 %)
//   supply:   lo que llega de afuera por cada importado, de 0 (nada) a 1 (todo lo que piden): en el
//             tablero no hay otras zonas; stock: lo que ya tienen guardado las estaciones al empezar
//   actions:  compras del evento (como las investigaciones, solo en el tablero); cada una pide la anterior.
//             Efecto (effect, o varios en effects): los de las investigaciones o { type: 'supply', product, fraction }
//   objectives: uno por año, en orden (y vuelve a empezar): kind ('sold' o 'produced'), items
//             (producto → cantidad) y medals = [s para el oro, s para la plata]
// Las medallas se calibran con tools/event-sim.js (v3.1.1): el oro es el tiempo del mejor jugador
// automático que decide cada segundo, más un 9 % (difícil, pero posible para alguien atento); la plata,
// 5 minutos más.
import { ICON } from './icons.js';

export const MEDALS = {
  gold: { icon: '🥇', name: 'oro', renown: 4 },
  silver: { icon: '🥈', name: 'plata', renown: 2 },
  bronze: { icon: '🥉', name: 'bronce', renown: 1 },
};

export const EVENTS = [
  {
    id: 'broca',
    blame: 'la broca', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'finca',
    icon: '🪲',
    name: 'La broca',
    intro:
      'La broca, un cucarroncito que se mete en la cereza, tiene el cafetal produciendo al 40 %. Contrólala con trampas, el hongo Beauveria y el re-re, y saca la cosecha a tiempo.',
    announce: '¡Llegó la broca al cafetal, patrón! Toque 🏅 Eventos para controlarla.',
    stations: ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer'],
    level: 10,
    coins: 400,
    speed: { farm: 0.4 },
    actions: [
      { id: 'broca_trampas', icon: '🪤', name: 'Trampas', desc: 'Trampas con alcohol atrapan las brocas: el Cafetal pasa del 40 al 60 %.', cost: 400, effect: { type: 'stationSpeed', target: 'farm', mult: 1.5 } },
      { id: 'broca_hongo', icon: '🍄', name: 'Hongo Beauveria', desc: 'Un hongo que enferma a la broca sin dañar el café: del 60 al 80 %.', cost: 2500, effect: { type: 'stationSpeed', target: 'farm', mult: 4 / 3 } },
      { id: 'broca_rere', icon: '🧺', name: 'Re-re', desc: 'Recoger los granos caídos y los que quedan en la mata: la broca ya no tiene dónde esconderse. Del 80 al 100 %.', cost: 6000, effect: { type: 'stationSpeed', target: 'farm', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { coffee_bag: 100 }, medals: [720, 1020] },
      { kind: 'produced', items: { roasted: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { green: 1000 }, medals: [630, 930] },
    ],
  },
  {
    id: 'molienda',
    blame: 'el bagazo húmedo', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'trapiche',
    icon: '🔥',
    name: 'La gran molienda',
    intro:
      'Llegó la molienda grande y se acabó la leña: la hornilla apenas calienta con bagazo húmedo y cocina al 40 %. Seca el bagazo, arregla la hornilla y ponle un fuelle para sacar la panela.',
    announce: '¡Llegó la gran molienda y no hay leña! Toque 🏅 Eventos y ayúdeme con la hornilla.',
    stations: ['canefield', 'cane_mill', 'furnace', 'molds', 'pulverizer'],
    level: 10,
    coins: 2400,
    speed: { furnace: 0.4 },
    actions: [
      { id: 'molienda_bagacera', icon: '☀️', name: 'Bagacera', desc: 'Un techo para secar el bagazo al sol: la Hornilla pasa del 40 al 60 %.', cost: 2400, effect: { type: 'stationSpeed', target: 'furnace', mult: 1.5 } },
      { id: 'molienda_hornilla', icon: '🧱', name: 'Hornilla reparada', desc: 'Ladrillos nuevos que no dejan escapar el calor: del 60 al 80 %.', cost: 15000, effect: { type: 'stationSpeed', target: 'furnace', mult: 4 / 3 } },
      { id: 'molienda_fuelle', icon: '🌬️', name: 'Fuelle', desc: 'Más aire para el fuego: la Hornilla vuelve al 100 %.', cost: 35000, effect: { type: 'stationSpeed', target: 'furnace', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'produced', items: { panela_powder: 500 }, medals: [675, 975] },
      { kind: 'produced', items: { panela: 550 }, medals: [720, 1020] },
      { kind: 'produced', items: { melado: 1100 }, medals: [675, 975] },
    ],
  },
  {
    id: 'feria',
    zone: 'lecheria',
    icon: '🐮',
    name: 'Feria ganadera',
    intro:
      'En la feria del pueblo piden queso, mantequilla y arequipe, todo a la vez. Reparte bien la leche y mejora cada rama: la panela para el arequipe llega sin falta.',
    announce: '¡Llegaron los pedidos de la feria ganadera! Toque 🏅 Eventos y armemos el pedido.',
    stations: ['pasture', 'pasteurizer', 'cheesery', 'separator', 'churn', 'arequipe_pot'],
    level: 10,
    coins: 40000,
    supply: { panela_powder: 1 },
    actions: [
      { id: 'feria_moldes', icon: '🧀', name: 'Moldes nuevos', desc: 'La Quesera hace un 50 % más.', cost: 40000, effect: { type: 'stationSpeed', target: 'cheesery', mult: 1.5 } },
      { id: 'feria_batidora', icon: '🧈', name: 'Batidora', desc: 'La Mantequera y la Descremadora hacen un 50 % más.', cost: 230000, effects: [{ type: 'stationSpeed', target: 'churn', mult: 1.5 }, { type: 'stationSpeed', target: 'separator', mult: 1.5 }] },
      { id: 'feria_paila', icon: '🍯', name: 'Paila de cobre', desc: 'La Paila hace un 50 % más de arequipe.', cost: 550000, effect: { type: 'stationSpeed', target: 'arequipe_pot', mult: 1.5 } },
    ],
    objectives: [
      { kind: 'sold', items: { cheese: 150, butter: 75, arequipe: 50 }, medals: [570, 870] },
      { kind: 'sold', items: { cheese: 60, butter: 120, arequipe: 40 }, medals: [615, 915] },
      { kind: 'sold', items: { cheese: 90, butter: 90, arequipe: 120 }, medals: [615, 915] },
    ],
  },
  {
    id: 'derrumbe',
    blame: 'el derrumbe', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'cacaotal',
    icon: '🪨',
    name: 'Derrumbe en la vía',
    intro:
      'Un derrumbe tapó la vía del Trapiche: la panela no llega y solo queda la guardada. Mándala por el monte en mulas, abre una trocha y despeja la vía para que el chocolate no pare.',
    announce: '¡Un derrumbe tapó la vía y no llega la panela! Toque 🏅 Eventos y busquemos cómo pasarla.',
    stations: ['cacao_grove', 'fermenter', 'cacao_dryer', 'cacao_roaster', 'cacao_mill', 'chocolate_table', 'chocolatier'],
    level: 10,
    coins: 1000000,
    supply: { panela_powder: 0, milk: 1 },
    stock: { panela_powder: 60 },
    actions: [
      { id: 'derrumbe_mulas', icon: '🐴', name: 'Mulas por el monte', desc: 'Unas mulas pasan la panela por el monte: llega una cuarta parte de la que se necesita.', cost: 1000000, effect: { type: 'supply', product: 'panela_powder', fraction: 0.25 } },
      { id: 'derrumbe_trocha', icon: '🛻', name: 'Trocha', desc: 'Un camino destapado por donde pasa un carro: llega el 60 % de la panela.', cost: 3000000, effect: { type: 'supply', product: 'panela_powder', fraction: 0.6 } },
      { id: 'derrumbe_via', icon: '🚧', name: 'Despejar la vía', desc: 'Con la vía libre, la panela vuelve a llegar toda.', cost: 8000000, effect: { type: 'supply', product: 'panela_powder', fraction: 1 } },
    ],
    objectives: [
      { kind: 'produced', items: { table_chocolate: 150 }, medals: [495, 795] },
      { kind: 'produced', items: { milk_chocolate: 130 }, medals: [540, 840] },
      { kind: 'produced', items: { table_chocolate: 100, milk_chocolate: 100 }, medals: [615, 915] },
    ],
  },
  {
    id: 'fiesta',
    blame: 'el budare rajado', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'maizal',
    icon: '🎉',
    name: 'Fiesta del maíz',
    intro:
      'Es la fiesta del maíz y todo el pueblo quiere arepas, pero el budare grande se rajó: asa al 40 %. Consigue uno prestado, leña seca y la ayuda de las vecinas.',
    announce: '¡Llegó la fiesta del maíz y se rajó el budare! Toque 🏅 Eventos, que hay mucha arepa por hacer.',
    stations: ['cornfield', 'sheller', 'corn_huller', 'dough_mill', 'budare', 'arepa_stand'],
    level: 10,
    coins: 2500000,
    supply: { cheese: 1, butter: 1 },
    speed: { budare: 0.4 },
    actions: [
      { id: 'fiesta_budare', icon: '🍳', name: 'Budare prestado', desc: 'La vecina presta su budare: del 40 al 60 %.', cost: 2500000, effect: { type: 'stationSpeed', target: 'budare', mult: 1.5 } },
      { id: 'fiesta_lena', icon: '🪵', name: 'Leña seca', desc: 'Fuego parejo: del 60 al 80 %.', cost: 15000000, effect: { type: 'stationSpeed', target: 'budare', mult: 4 / 3 } },
      { id: 'fiesta_vecinas', icon: '👵', name: 'Las vecinas ayudan', desc: 'Más manos para voltear las arepas: el Budare vuelve al 100 %.', cost: 35000000, effect: { type: 'stationSpeed', target: 'budare', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { cheese_arepa: 120 }, medals: [600, 900] },
      { kind: 'produced', items: { arepa: 850 }, medals: [765, 1065] },
      { kind: 'produced', items: { corn_dough: 850 }, medals: [720, 1020] },
    ],
  },
  {
    id: 'barco',
    blame: 'la grúa varada', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'pueblo',
    icon: '🚢',
    name: 'El barco sale el viernes',
    intro:
      'El barco zarpa el viernes y hay que llenar los contenedores, pero la grúa del puerto está varada: carga al 40 %. Consigue repuestos, arregla la grúa y pon un turno extra.',
    announce: '¡El barco sale el viernes y la grúa está varada! Toque 🏅 Eventos y llenemos esos contenedores.',
    stations: ['coffee_house', 'greca', 'fonda', 'basket_shop', 'gift_wrap', 'export_dock'],
    level: 10,
    coins: 20000000,
    supply: { coffee_bag: 1, panela_powder: 1, cheese_arepa: 1, arequipe: 1, table_chocolate: 1, milk_chocolate: 1 },
    speed: { export_dock: 0.4 },
    actions: [
      { id: 'barco_repuestos', icon: '🔧', name: 'Repuestos', desc: 'Llegan los repuestos de la grúa: del 40 al 60 %.', cost: 20000000, effect: { type: 'stationSpeed', target: 'export_dock', mult: 1.5 } },
      { id: 'barco_grua', icon: '🏗️', name: 'Grúa arreglada', desc: 'La grúa vuelve a subir los contenedores: del 60 al 80 %.', cost: 130000000, effect: { type: 'stationSpeed', target: 'export_dock', mult: 4 / 3 } },
      { id: 'barco_turno', icon: '👷', name: 'Turno extra', desc: 'Los estibadores trabajan de corrido: el Patio vuelve al 100 %.', cost: 300000000, effect: { type: 'stationSpeed', target: 'export_dock', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { container: 24 }, medals: [675, 975] },
      { kind: 'produced', items: { gift_basket: 120 }, medals: [690, 990] },
      { kind: 'sold', items: { container: 6, breakfast: 180 }, medals: [840, 1140] },
    ],
  },
  // ---------- Santander (v3.6): uno por zona, con la misma mecánica que el de su par del Eje Cafetero ----------
  {
    id: 'mosca',
    blame: 'la mosca de la fruta', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'guayabera',
    icon: '🪰',
    name: 'La mosca de la fruta',
    intro:
      'La mosca de la fruta pica las guayabas y las daña por dentro: el Guayabal rinde al 40 %. Pon trampas, embolsa las guayabas y recoge la fruta caída para salvar la cosecha.',
    announce: '¡Llegó la mosca de la fruta al guayabal, mijo! Toque 🏅 Eventos y salvemos las guayabas.',
    stations: ['guava_grove', 'guava_pulper', 'guava_pot', 'guava_molds', 'bocadillo_cutter', 'bijao_wrapper', 'crate_packer'],
    level: 10,
    coins: 400,
    speed: { guava_grove: 0.4 },
    actions: [
      { id: 'mosca_trampas', icon: '🪤', name: 'Trampas con cebo', desc: 'Botellas con cebo atrapan las moscas: el Guayabal pasa del 40 al 60 %.', cost: 400, effect: { type: 'stationSpeed', target: 'guava_grove', mult: 1.5 } },
      { id: 'mosca_bolsas', icon: '🛍️', name: 'Embolsar las guayabas', desc: 'Cada guayaba en su bolsita, para que la mosca no la alcance: del 60 al 80 %.', cost: 2500, effect: { type: 'stationSpeed', target: 'guava_grove', mult: 4 / 3 } },
      { id: 'mosca_recoger', icon: '🧺', name: 'Recoger la fruta caída', desc: 'Sin guayabas podridas en el suelo, la mosca no tiene dónde criar. Del 80 al 100 %.', cost: 6000, effect: { type: 'stationSpeed', target: 'guava_grove', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { bocadillo_crate: 100 }, medals: [720, 1020] },
      { kind: 'produced', items: { bocadillo: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { bocadillo_block: 1000 }, medals: [630, 930] },
    ],
  },
  {
    id: 'humedad',
    blame: 'la humedad', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'tabacal',
    icon: '💧',
    name: 'Humedad en el caney',
    intro:
      'Llovió una semana entera y el aire está tan húmedo que la hoja no cura: el Caney trabaja al 40 %. Abre ventilas, prende fogones de secado y cambia el techo para que la hoja no se pierda.',
    announce: '¡Con tanta lluvia la hoja no cura en el caney! Toque 🏅 Eventos y ayúdeme a secarla.',
    stations: ['tobacco_field', 'caney', 'stripper', 'tobacco_piles', 'cigar_roller'],
    level: 10,
    coins: 2400,
    speed: { caney: 0.4 },
    actions: [
      { id: 'humedad_ventilas', icon: '🪟', name: 'Abrir ventilas', desc: 'Más aire entre las varas: el Caney pasa del 40 al 60 %.', cost: 2400, effect: { type: 'stationSpeed', target: 'caney', mult: 1.5 } },
      { id: 'humedad_fogones', icon: '🔥', name: 'Fogones de secado', desc: 'Un calorcito bajo las varas seca el aire: del 60 al 80 %.', cost: 15000, effect: { type: 'stationSpeed', target: 'caney', mult: 4 / 3 } },
      { id: 'humedad_techo', icon: '🏚️', name: 'Techo nuevo', desc: 'Sin goteras, el Caney vuelve al 100 %.', cost: 35000, effect: { type: 'stationSpeed', target: 'caney', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'produced', items: { cigar: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { fermented_tobacco: 550 }, medals: [780, 1080] },
      { kind: 'produced', items: { stripped_leaf: 1100 }, medals: [765, 1065] },
    ],
  },
  {
    id: 'artesanal',
    zone: 'fiquera',
    icon: '🧺',
    name: 'Feria artesanal',
    intro:
      'En la feria artesanal piden costales, alpargatas y tercios de tabaco, todo a la vez. Reparte bien la fibra y mejora cada rama: el tabaco del Tabacal llega sin falta.',
    announce: '¡Llegaron los pedidos de la feria artesanal! Toque 🏅 Eventos y armemos el pedido.',
    stations: ['fique_field', 'decorticator', 'sack_loom', 'spinner', 'alpargata_shop', 'tercio_packer'],
    level: 10,
    coins: 40000,
    supply: { fermented_tobacco: 1 },
    actions: [
      { id: 'artesanal_telares', icon: ICON.fiqueSack, name: 'Telares nuevos', desc: 'El Telar de costales teje un 50 % más.', cost: 40000, effect: { type: 'stationSpeed', target: 'sack_loom', mult: 1.5 } },
      { id: 'artesanal_hormas', icon: ICON.alpargatas, name: 'Hormas y ruecas', desc: 'La Hiladora y la Alpargatería hacen un 50 % más.', cost: 230000, effects: [{ type: 'stationSpeed', target: 'alpargata_shop', mult: 1.5 }, { type: 'stationSpeed', target: 'spinner', mult: 1.5 }] },
      { id: 'artesanal_prensa', icon: ICON.tobaccoBale, name: 'Prensa de tercios', desc: 'La Empacadora arma un 50 % más de tercios.', cost: 550000, effect: { type: 'stationSpeed', target: 'tercio_packer', mult: 1.5 } },
    ],
    objectives: [
      { kind: 'sold', items: { fique_sack: 150, alpargatas: 75, tobacco_bale: 50 }, medals: [570, 870] },
      { kind: 'sold', items: { fique_sack: 60, alpargatas: 120, tobacco_bale: 40 }, medals: [615, 915] },
      { kind: 'sold', items: { fique_sack: 90, alpargatas: 90, tobacco_bale: 120 }, medals: [615, 915] },
    ],
  },
  {
    id: 'creciente',
    blame: 'la creciente del río', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'hato',
    icon: '🌊',
    name: 'Creciente del río',
    intro:
      'La creciente del río se llevó el puente: el bocadillo de la Guayabera no llega y solo queda el guardado. Pásalo en mulas por el vado, consigue un planchón y arma un puente nuevo.',
    announce: '¡La creciente se llevó el puente y no llega el bocadillo, compadre! Toque 🏅 Eventos.',
    stations: ['cattle_ranch', 'butcher', 'salter', 'airing_rack', 'grill', 'lunch_table', 'fiambre_maker'],
    level: 10,
    coins: 1000000,
    supply: { bocadillo_bijao: 0, fique_fiber: 1 },
    stock: { bocadillo_bijao: 60 },
    actions: [
      { id: 'creciente_vado', icon: '🐴', name: 'Mulas por el vado', desc: 'Unas mulas cruzan el río por donde está bajito: llega una cuarta parte del bocadillo.', cost: 1000000, effect: { type: 'supply', product: 'bocadillo_bijao', fraction: 0.25 } },
      { id: 'creciente_planchon', icon: '🛶', name: 'Planchón', desc: 'Una balsa grande pasa el carro de lado a lado: llega el 60 % del bocadillo.', cost: 3000000, effect: { type: 'supply', product: 'bocadillo_bijao', fraction: 0.6 } },
      { id: 'creciente_puente', icon: '🌉', name: 'Puente nuevo', desc: 'Con el puente arreglado, el bocadillo vuelve a llegar todo.', cost: 8000000, effect: { type: 'supply', product: 'bocadillo_bijao', fraction: 1 } },
    ],
    objectives: [
      { kind: 'produced', items: { almuerzo: 150 }, medals: [495, 795] },
      { kind: 'produced', items: { fiambre: 130 }, medals: [540, 840] },
      { kind: 'produced', items: { almuerzo: 100, fiambre: 100 }, medals: [615, 915] },
    ],
  },
  {
    id: 'turistas',
    blame: 'la falta de papel', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'hormigas',
    icon: '🎒',
    name: 'Temporada de turistas',
    intro:
      'Llegaron los turistas y todos quieren hormigas, pero se acabó el papel: la Mesa de cucuruchos arma al 40 %. Consigue papel prestado, una resma y la ayuda de las vecinas.',
    announce: '¡Llegaron los turistas y se acabó el papel de los cucuruchos! Toque 🏅 Eventos, mijo.',
    stations: ['anthill', 'ant_cleaner', 'brine_pot', 'ant_toaster', 'cone_table', 'souvenir_shop'],
    level: 10,
    coins: 2500000,
    supply: { fique_sack: 1, alpargatas: 1 },
    speed: { cone_table: 0.4 },
    actions: [
      { id: 'turistas_papel', icon: '📰', name: 'Papel prestado', desc: 'La tienda de la esquina presta papel: del 40 al 60 %.', cost: 2500000, effect: { type: 'stationSpeed', target: 'cone_table', mult: 1.5 } },
      { id: 'turistas_resma', icon: '📦', name: 'Una resma entera', desc: 'Papel de sobra: del 60 al 80 %.', cost: 15000000, effect: { type: 'stationSpeed', target: 'cone_table', mult: 4 / 3 } },
      { id: 'turistas_vecinas', icon: '👵', name: 'Las vecinas ayudan', desc: 'Más manos doblando cucuruchos: la Mesa vuelve al 100 %.', cost: 35000000, effect: { type: 'stationSpeed', target: 'cone_table', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { recuerdo: 120 }, medals: [600, 900] },
      { kind: 'produced', items: { ant_cone: 850 }, medals: [765, 1065] },
      { kind: 'produced', items: { toasted_ants: 850 }, medals: [720, 1020] },
    ],
  },
  {
    id: 'puente_festivo',
    blame: 'la falta de guías', // lo que frena (v3.12: «al 40 % por culpa de …»)
    zone: 'barichara',
    icon: '🥾',
    name: 'Puente festivo',
    intro:
      'Es puente festivo y Barichara se llenó de caminantes, pero hay pocos guías: la Salida al Camino Real despacha al 40 %. Trae guías de Guane, señaliza el camino y súmale guías del pueblo.',
    announce: '¡Puente festivo y el pueblo lleno de caminantes! Toque 🏅 Eventos y organicemos las salidas.',
    stations: ['dulceria', 'park_cafe', 'posada', 'box_shop', 'hamper', 'camino_real'],
    level: 10,
    coins: 20000000,
    supply: { bocadillo_crate: 1, cigar: 1, recuerdo: 1, tobacco_bale: 1, almuerzo: 1, fiambre: 1 },
    speed: { camino_real: 0.4 },
    actions: [
      { id: 'puente_guane', icon: '🧭', name: 'Guías de Guane', desc: 'Suben guías desde Guane: del 40 al 60 %.', cost: 20000000, effect: { type: 'stationSpeed', target: 'camino_real', mult: 1.5 } },
      { id: 'puente_senales', icon: '🪧', name: 'Señalizar el camino', desc: 'Con letreros, los grupos salen más rápido: del 60 al 80 %.', cost: 130000000, effect: { type: 'stationSpeed', target: 'camino_real', mult: 4 / 3 } },
      { id: 'puente_guias', icon: '🥾', name: 'Guías del pueblo', desc: 'Los muchachos del pueblo también guían: la Salida vuelve al 100 %.', cost: 300000000, effect: { type: 'stationSpeed', target: 'camino_real', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { excursion: 24 }, medals: [675, 975] },
      { kind: 'produced', items: { canasta_caminante: 120 }, medals: [690, 990] },
      { kind: 'sold', items: { excursion: 6, estadia: 180 }, medals: [840, 1140] },
    ],
  },

  // La Costa (v3.21): los mismos números que los de Santander, zona por zona.
  {
    id: 'pajaros',
    blame: 'los pájaros',
    zone: 'arrozal',
    icon: '🐦',
    name: 'Pájaros en el arrozal',
    intro:
      'Bandadas de pájaros bajan al arrozal a comerse el grano: el Arrozal rinde al 40 %. Pon espantapájaros, cuelga cintas que brillen y contrata a los pajareros para salvar la cosecha.',
    announce: '¡Ajá, se llenó el arrozal de pájaros, compa! Toque 🏅 Eventos y espantémoslos.',
    stations: ['rice_field', 'rice_dryer', 'rice_huller', 'rice_polisher', 'rice_sorter', 'rice_bagger', 'rice_stacker'],
    level: 10,
    coins: 400,
    speed: { rice_field: 0.4 },
    actions: [
      { id: 'pajaros_espantapajaros', icon: '🧍', name: 'Espantapájaros', desc: 'Unos espantapájaros con sombrero vueltiao: el Arrozal pasa del 40 al 60 %.', cost: 400, effect: { type: 'stationSpeed', target: 'rice_field', mult: 1.5 } },
      { id: 'pajaros_cintas', icon: '🎗️', name: 'Cintas que brillan', desc: 'Cintas plateadas que suenan con el viento: del 60 al 80 %.', cost: 2500, effect: { type: 'stationSpeed', target: 'rice_field', mult: 4 / 3 } },
      { id: 'pajaros_pajareros', icon: '🪃', name: 'Los pajareros', desc: 'Muchachos que recorren los camellones aplaudiendo y silbando. Del 80 al 100 %.', cost: 6000, effect: { type: 'stationSpeed', target: 'rice_field', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { rice_sack: 100 }, medals: [720, 1020] },
      { kind: 'produced', items: { premium_rice: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { white_rice: 1000 }, medals: [630, 930] },
    ],
  },
  {
    id: 'machetes',
    blame: 'los machetes sin filo',
    zone: 'cocal',
    icon: '🔪',
    name: 'Machetes sin filo',
    intro:
      'Los machetes del peladero se mellaron con tanto coco y ya no cortan: el Peladero trabaja al 40 %. Consigue una piedra de amolar, machetes nuevos y una peladora para que no se amontonen los cocos.',
    announce: '¡Ay, mi vida, los machetes ya no cortan y se amontonan los cocos! Toque 🏅 Eventos.',
    stations: ['coconut_grove', 'coconut_peeler', 'coconut_grater', 'coconut_press', 'cocada_kitchen'],
    level: 10,
    coins: 2400,
    speed: { coconut_peeler: 0.4 },
    actions: [
      { id: 'machetes_amolar', icon: '🪨', name: 'Piedra de amolar', desc: 'Con filo otra vez: el Peladero pasa del 40 al 60 %.', cost: 2400, effect: { type: 'stationSpeed', target: 'coconut_peeler', mult: 1.5 } },
      { id: 'machetes_nuevos', icon: '🔪', name: 'Machetes nuevos', desc: 'Un machete para cada pelador: del 60 al 80 %.', cost: 15000, effect: { type: 'stationSpeed', target: 'coconut_peeler', mult: 4 / 3 } },
      { id: 'machetes_peladora', icon: '⚙️', name: 'Peladora de cocos', desc: 'Una máquina que quita la cáscara: el Peladero vuelve al 100 %.', cost: 35000, effect: { type: 'stationSpeed', target: 'coconut_peeler', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'produced', items: { cocada: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { coconut_milk: 550 }, medals: [780, 1080] },
      { kind: 'produced', items: { grated_coconut: 1100 }, medals: [765, 1065] },
    ],
  },
  {
    id: 'semana_santa',
    zone: 'cienaga',
    icon: '✝️',
    name: 'Semana Santa',
    intro:
      'Llegó la Semana Santa y en todos los pueblos piden pescado: salado, frito y en coco, todo a la vez. Reparte bien el pescado limpio y mejora cada rama; la leche de coco del Cocal llega sin falta.',
    announce: '¡Primo, llegó la Semana Santa y todo el mundo quiere pescado! Toque 🏅 Eventos.',
    stations: ['fishing_canoes', 'fish_cleaner', 'fish_salter', 'fish_filleter', 'fish_fryer', 'coconut_fish_kitchen'],
    level: 10,
    coins: 40000,
    supply: { coconut_milk: 1 },
    actions: [
      { id: 'semana_tendales', icon: ICON.saltedFish, name: 'Tendales nuevos', desc: 'El Saladero sala un 50 % más.', cost: 40000, effect: { type: 'stationSpeed', target: 'fish_salter', mult: 1.5 } },
      { id: 'semana_calderos', icon: ICON.friedFish, name: 'Cuchillos y calderos', desc: 'La Fileteadora y la Fritanga hacen un 50 % más.', cost: 230000, effects: [{ type: 'stationSpeed', target: 'fish_fryer', mult: 1.5 }, { type: 'stationSpeed', target: 'fish_filleter', mult: 1.5 }] },
      { id: 'semana_fogones', icon: ICON.fishInCoconut, name: 'Más fogones', desc: 'La Cocina hace un 50 % más de pescado en coco.', cost: 550000, effect: { type: 'stationSpeed', target: 'coconut_fish_kitchen', mult: 1.5 } },
    ],
    objectives: [
      { kind: 'sold', items: { salted_fish: 150, fried_fish: 75, fish_in_coconut: 50 }, medals: [570, 870] },
      { kind: 'sold', items: { salted_fish: 60, fried_fish: 120, fish_in_coconut: 40 }, medals: [615, 915] },
      { kind: 'sold', items: { salted_fish: 90, fried_fish: 90, fish_in_coconut: 120 }, medals: [615, 915] },
    ],
  },
  {
    id: 'inundacion',
    blame: 'la inundación',
    zone: 'quesera',
    icon: '🌧️',
    name: 'Carretera inundada',
    intro:
      'Con el invierno se desbordó el caño y la carretera quedó bajo el agua: el arroz del Arrozal no llega y solo queda el guardado. Pásalo en canoas, consigue una chalupa y levanta un terraplén.',
    announce: '¡Ay, mi amor, se inundó la carretera y no llega el arroz! Toque 🏅 Eventos.',
    stations: ['milking_corral', 'curdler', 'curd_mill', 'cheese_press', 'mote_pot', 'costeno_fonda', 'bandeja_kitchen'],
    level: 10,
    coins: 1000000,
    supply: { rice_bag: 0, clean_fish: 1 },
    stock: { rice_bag: 60 },
    actions: [
      { id: 'inundacion_canoas', icon: ICON.canoe, name: 'Canoas por el caño', desc: 'Unas canoas pasan el arroz por el agua: llega una cuarta parte.', cost: 1000000, effect: { type: 'supply', product: 'rice_bag', fraction: 0.25 } },
      { id: 'inundacion_chalupa', icon: '🛥️', name: 'Chalupa', desc: 'Una chalupa con motor lleva el arroz de un lado al otro: llega el 60 %.', cost: 3000000, effect: { type: 'supply', product: 'rice_bag', fraction: 0.6 } },
      { id: 'inundacion_terraplen', icon: '🚧', name: 'Terraplén nuevo', desc: 'Con la carretera levantada sobre el agua, el arroz vuelve a llegar todo.', cost: 8000000, effect: { type: 'supply', product: 'rice_bag', fraction: 1 } },
    ],
    objectives: [
      { kind: 'produced', items: { almuerzo_costeno: 150 }, medals: [495, 795] },
      { kind: 'produced', items: { bandeja_costena: 130 }, medals: [540, 840] },
      { kind: 'produced', items: { almuerzo_costeno: 100, bandeja_costena: 100 }, medals: [615, 915] },
    ],
  },
  {
    id: 'festival_sombrero',
    blame: 'la falta de máquinas',
    zone: 'sombrero',
    icon: '👒',
    name: 'Festival del sombrero',
    intro:
      'Llegó el festival del sombrero vueltiao y Tuchín se llenó de visitantes, pero hay pocas máquinas de coser: la Costura trabaja al 40 %. Consigue una máquina prestada, repuestos y la ayuda de las costureras.',
    announce: '¡Compadre, llegó el festival y no damos abasto cosiendo sombreros! Toque 🏅 Eventos.',
    stations: ['canaflechal', 'fiber_scraper', 'fiber_dyer', 'braiders', 'hat_sewer', 'parador'],
    level: 10,
    coins: 2500000,
    supply: { salted_fish: 1, fried_fish: 1 },
    speed: { hat_sewer: 0.4 },
    actions: [
      { id: 'festival_maquina', icon: '🧵', name: 'Máquina prestada', desc: 'La vecina presta su máquina: la Costura pasa del 40 al 60 %.', cost: 2500000, effect: { type: 'stationSpeed', target: 'hat_sewer', mult: 1.5 } },
      { id: 'festival_repuestos', icon: '🪡', name: 'Agujas y repuestos', desc: 'Ninguna máquina parada: del 60 al 80 %.', cost: 15000000, effect: { type: 'stationSpeed', target: 'hat_sewer', mult: 4 / 3 } },
      { id: 'festival_costureras', icon: '👩🏽', name: 'Las costureras ayudan', desc: 'Más manos cosiendo vueltas: la Costura vuelve al 100 %.', cost: 35000000, effect: { type: 'stationSpeed', target: 'hat_sewer', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { recuerdo_costa: 120 }, medals: [600, 900] },
      { kind: 'produced', items: { sombrero_vueltiao: 850 }, medals: [765, 1065] },
      { kind: 'produced', items: { trenza: 850 }, medals: [720, 1020] },
    ],
  },
  {
    id: 'crucero',
    blame: 'la falta de lanchas',
    zone: 'cartagena',
    icon: '🛳️',
    name: 'Llegó un crucero',
    intro:
      'Atracó un crucero y miles de turistas quieren ir a las islas, pero hay pocas lanchas: el Muelle despacha al 40 %. Trae lanchas de Bocachica, organiza los turnos y súmale los lancheros del barrio.',
    announce: '¡Mi amor, llegó un crucero y todo el mundo quiere ir a las islas! Toque 🏅 Eventos.',
    stations: ['fogon_getsemani', 'restaurante_muralla', 'hotel_colonial', 'cocina_bahia', 'loncheras', 'muelle'],
    level: 10,
    coins: 20000000,
    supply: { rice_sack: 1, cocada: 1, recuerdo_costa: 1, fish_in_coconut: 1, almuerzo_costeno: 1, bandeja_costena: 1 },
    speed: { muelle: 0.4 },
    actions: [
      { id: 'crucero_bocachica', icon: '🚤', name: 'Lanchas de Bocachica', desc: 'Llegan lanchas desde Bocachica: del 40 al 60 %.', cost: 20000000, effect: { type: 'stationSpeed', target: 'muelle', mult: 1.5 } },
      { id: 'crucero_turnos', icon: '🎫', name: 'Turnos en el muelle', desc: 'Con fichas y turnos los grupos salen más rápido: del 60 al 80 %.', cost: 130000000, effect: { type: 'stationSpeed', target: 'muelle', mult: 4 / 3 } },
      { id: 'crucero_lancheros', icon: '🧑🏾‍✈️', name: 'Lancheros del barrio', desc: 'Los lancheros de Getsemaní también salen: el Muelle vuelve al 100 %.', cost: 300000000, effect: { type: 'stationSpeed', target: 'muelle', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { paseo_islas: 24 }, medals: [675, 975] },
      { kind: 'produced', items: { lonchera_paseo: 120 }, medals: [690, 990] },
      { kind: 'sold', items: { paseo_islas: 6, noche_hotel: 180 }, medals: [840, 1140] },
    ],
  },

  // Boyacá (v3.28): los mismos números que los de la Costa y Santander, zona por zona.
  {
    id: 'gota',
    blame: 'la gota',
    zone: 'papal',
    icon: '🍂',
    name: 'La gota en el papal',
    intro:
      'Con tanta neblina llegó la gota, el hongo que mancha las hojas de la papa: el Papal rinde al 40 %. Echa caldo bordelés, aporca las matas y siembra semilla resistente para salvar la cosecha.',
    announce: '¡Sumercé, le cayó la gota al papal! Toque 🏅 Eventos y salvemos las matas.',
    stations: ['potato_field', 'potato_washer', 'potato_grader', 'potato_peeler', 'criollas_fryer', 'criollas_bagger', 'criollas_boxer'],
    level: 10,
    coins: 400,
    speed: { potato_field: 0.4 },
    actions: [
      { id: 'gota_caldo', icon: '🧪', name: 'Caldo bordelés', desc: 'Una fumigada con caldo bordelés: el Papal pasa del 40 al 60 %.', cost: 400, effect: { type: 'stationSpeed', target: 'potato_field', mult: 1.5 } },
      { id: 'gota_aporque', icon: '⛏️', name: 'Aporcar las matas', desc: 'Tierra arrimada a cada mata para que la papa no se dañe: del 60 al 80 %.', cost: 2500, effect: { type: 'stationSpeed', target: 'potato_field', mult: 4 / 3 } },
      { id: 'gota_semilla', icon: ICON.potato, name: 'Semilla resistente', desc: 'Papa que aguanta la gota: el Papal vuelve al 100 %.', cost: 6000, effect: { type: 'stationSpeed', target: 'potato_field', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { criollas_box: 100 }, medals: [720, 1020] },
      { kind: 'produced', items: { criollas: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { peeled_potato: 1000 }, medals: [630, 930] },
    ],
  },
  {
    id: 'horno_malta',
    blame: 'el horno dañado',
    zone: 'cerveceria',
    icon: '🔥',
    name: 'Horno de malta dañado',
    intro:
      'Se rajó el horno donde se seca la malta y la cebada germinada se amontona: la Maltería trabaja al 40 %. Arréglalo con ladrillos nuevos, ponle un ventilador y cámbiale el quemador.',
    announce: '¡Sumercé, se dañó el horno de la maltería y se amontona la cebada! Toque 🏅 Eventos.',
    stations: ['barley_field', 'maltings', 'brew_kettle', 'fermenters', 'bottler'],
    level: 10,
    coins: 2400,
    speed: { maltings: 0.4 },
    actions: [
      { id: 'malta_ladrillos', icon: '🧱', name: 'Ladrillos nuevos', desc: 'El horno sin grietas: la Maltería pasa del 40 al 60 %.', cost: 2400, effect: { type: 'stationSpeed', target: 'maltings', mult: 1.5 } },
      { id: 'malta_ventilador', icon: '🌀', name: 'Ventilador', desc: 'El aire caliente llega a toda la malta: del 60 al 80 %.', cost: 15000, effect: { type: 'stationSpeed', target: 'maltings', mult: 4 / 3 } },
      { id: 'malta_quemador', icon: '🔥', name: 'Quemador a gas', desc: 'Un fuego parejo: la Maltería vuelve al 100 %.', cost: 35000, effect: { type: 'stationSpeed', target: 'maltings', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'produced', items: { beer_crate: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { beer: 550 }, medals: [780, 1080] },
      { kind: 'produced', items: { wort: 1100 }, medals: [765, 1065] },
    ],
  },
  {
    id: 'mercado_artesanias',
    zone: 'raquira',
    icon: '🏺',
    name: 'Mercado de artesanías',
    intro:
      'Domingo de mercado en Ráquira y los turistas piden ollas, materas y jarras con cerveza, todo a la vez. Reparte bien el barro y mejora cada rama; la cerveza de la Cervecería llega sin falta.',
    announce: '¡Sumercé, llegó el mercado de artesanías y piden de todo! Toque 🏅 Eventos.',
    stations: ['clay_pit', 'clay_kneader', 'pot_maker', 'potter_wheel', 'pottery_kiln', 'jarras'],
    level: 10,
    coins: 40000,
    supply: { beer: 1 },
    actions: [
      { id: 'artesanias_moldes', icon: ICON.ollaBarro, name: 'Moldes nuevos', desc: 'Las Ollas de barro salen un 50 % más.', cost: 40000, effect: { type: 'stationSpeed', target: 'pot_maker', mult: 1.5 } },
      { id: 'artesanias_tornos', icon: ICON.matera, name: 'Tornos y leña', desc: 'El Torno y el Horno de leña hacen un 50 % más.', cost: 230000, effects: [{ type: 'stationSpeed', target: 'pottery_kiln', mult: 1.5 }, { type: 'stationSpeed', target: 'potter_wheel', mult: 1.5 }] },
      { id: 'artesanias_jarras', icon: ICON.jarraCerveza, name: 'Más jarras', desc: 'Las Jarras salen un 50 % más.', cost: 550000, effect: { type: 'stationSpeed', target: 'jarras', mult: 1.5 } },
    ],
    objectives: [
      { kind: 'sold', items: { olla_barro: 150, matera: 75, jarra_cerveza: 50 }, medals: [570, 870] },
      { kind: 'sold', items: { olla_barro: 60, matera: 120, jarra_cerveza: 40 }, medals: [615, 915] },
      { kind: 'sold', items: { olla_barro: 90, matera: 90, jarra_cerveza: 120 }, medals: [615, 915] },
    ],
  },
  {
    id: 'obras',
    blame: 'las obras en la vía',
    zone: 'paipa',
    icon: '🚧',
    name: 'Carretera en obras',
    intro:
      'Están arreglando la carretera del Papal y no pasan los carros: las papitas no llegan y solo queda lo guardado. Pásalas en mulas por la trocha, consigue paso a un carril y espera la vía nueva.',
    announce: '¡Ay, sumercé, la vía está en obras y no llegan las papitas! Toque 🏅 Eventos.',
    stations: ['paipa_herd', 'paipa_curdler', 'cheese_molds', 'cheese_cave', 'almojabana_oven', 'piquete_table', 'clay_oven'],
    level: 10,
    coins: 1000000,
    supply: { criollas_bag: 0, barro: 1 },
    stock: { criollas_bag: 60 },
    actions: [
      { id: 'obras_mulas', icon: '🐴', name: 'Mulas por la trocha', desc: 'Unas mulas pasan por la trocha: llega una cuarta parte de las papitas.', cost: 1000000, effect: { type: 'supply', product: 'criollas_bag', fraction: 0.25 } },
      { id: 'obras_carril', icon: '🚦', name: 'Paso a un carril', desc: 'Los carros pasan por turnos: llega el 60 % de las papitas.', cost: 3000000, effect: { type: 'supply', product: 'criollas_bag', fraction: 0.6 } },
      { id: 'obras_via', icon: '🛣️', name: 'Vía nueva', desc: 'Con la carretera terminada, las papitas vuelven a llegar todas.', cost: 8000000, effect: { type: 'supply', product: 'criollas_bag', fraction: 1 } },
    ],
    objectives: [
      { kind: 'produced', items: { piquete: 150 }, medals: [495, 795] },
      { kind: 'produced', items: { canasta_amasijos: 130 }, medals: [540, 840] },
      { kind: 'produced', items: { piquete: 100, canasta_amasijos: 100 }, medals: [615, 915] },
    ],
  },
  {
    id: 'heladas',
    blame: 'la falta de telares',
    zone: 'ruanas',
    icon: '❄️',
    name: 'Las heladas de diciembre',
    intro:
      'Llegaron las heladas de diciembre y todo el mundo quiere ruana, pero hay pocos telares: el Telar trabaja al 40 %. Consigue un telar prestado, lanzaderas nuevas y la ayuda de las tejedoras.',
    announce: '¡Qué frío, sumercé! Todos quieren ruana y no damos abasto. Toque 🏅 Eventos.',
    stations: ['sheep_pasture', 'wool_washer', 'carder', 'spinning_wheel', 'ruana_loom', 'tienda_nobsa'],
    level: 10,
    coins: 2500000,
    supply: { olla_barro: 1, matera: 1 },
    speed: { ruana_loom: 0.4 },
    actions: [
      { id: 'heladas_telar', icon: ICON.ruana, name: 'Telar prestado', desc: 'La vecina presta su telar: del 40 al 60 %.', cost: 2500000, effect: { type: 'stationSpeed', target: 'ruana_loom', mult: 1.5 } },
      { id: 'heladas_lanzaderas', icon: '🪡', name: 'Lanzaderas nuevas', desc: 'Ningún telar parado: del 60 al 80 %.', cost: 15000000, effect: { type: 'stationSpeed', target: 'ruana_loom', mult: 4 / 3 } },
      { id: 'heladas_tejedoras', icon: '👵🏻', name: 'Las tejedoras ayudan', desc: 'Más manos en los telares: el Telar vuelve al 100 %.', cost: 35000000, effect: { type: 'stationSpeed', target: 'ruana_loom', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { recuerdo_boyaca: 120 }, medals: [600, 900] },
      { kind: 'produced', items: { ruana: 850 }, medals: [765, 1065] },
      { kind: 'produced', items: { wool_yarn: 850 }, medals: [720, 1020] },
    ],
  },
  {
    id: 'cometas',
    blame: 'la falta de guías',
    zone: 'villa_leyva',
    icon: '🪁',
    name: 'Festival de las cometas',
    intro:
      'Es el festival de las cometas y Villa de Leyva se llenó de visitantes que quieren ir al Fósil, pero hay pocos guías: la Salida despacha al 40 %. Trae guías de Sáchica, organiza turnos y súmale los jóvenes del pueblo.',
    announce: '¡Sumercé, festival de las cometas y el pueblo lleno de gente! Toque 🏅 Eventos.',
    stations: ['tienda_esquina', 'terraza_plaza', 'hospedaje_colonial', 'mercado_sabado', 'canastos_paseo', 'salida_fosil'],
    level: 10,
    coins: 20000000,
    supply: { criollas_box: 1, beer_crate: 1, recuerdo_boyaca: 1, jarra_cerveza: 1, piquete: 1, canasta_amasijos: 1 },
    speed: { salida_fosil: 0.4 },
    actions: [
      { id: 'cometas_sachica', icon: '🧭', name: 'Guías de Sáchica', desc: 'Llegan guías del pueblo vecino: del 40 al 60 %.', cost: 20000000, effect: { type: 'stationSpeed', target: 'salida_fosil', mult: 1.5 } },
      { id: 'cometas_turnos', icon: '🪧', name: 'Turnos y letreros', desc: 'Los grupos salen en orden: del 60 al 80 %.', cost: 130000000, effect: { type: 'stationSpeed', target: 'salida_fosil', mult: 4 / 3 } },
      { id: 'cometas_jovenes', icon: '🥾', name: 'Los jóvenes del pueblo', desc: 'Los muchachos del pueblo también guían: la Salida vuelve al 100 %.', cost: 300000000, effect: { type: 'stationSpeed', target: 'salida_fosil', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { excursion_fosil: 24 }, medals: [675, 975] },
      { kind: 'produced', items: { fiambre_paseo: 120 }, medals: [690, 990] },
      { kind: 'sold', items: { excursion_fosil: 6, noche_villa: 180 }, medals: [840, 1140] },
    ],
  },
  // Los Llanos (v3.37): los mismos números que los de Boyacá, la Costa y Santander, zona por zona.
  {
    id: 'pudricion',
    blame: 'la pudrición del cogollo',
    zone: 'palma',
    icon: '🦠',
    name: 'Pudrición del cogollo',
    intro:
      'Con tanta lluvia llegó la pudrición del cogollo, el mal que pudre el corazón de la palma: el Palmar rinde al 40 %. Córtale el cogollo enfermo, abre drenajes y siembra palma híbrida, que aguanta.',
    announce: '¡Compadre, le cayó la pudrición a la palma! Toque 🏅 Eventos y salvemos el palmar.',
    stations: ['palm_grove', 'bunch_thresher', 'fruit_sterilizer', 'palm_press', 'oil_clarifier', 'oil_bottler', 'oil_boxer'],
    level: 10,
    coins: 400,
    speed: { palm_grove: 0.4 },
    actions: [
      { id: 'pudricion_cirugia', icon: '🪓', name: 'Cirugía del cogollo', desc: 'Se corta lo podrido y se cura la palma: el Palmar pasa del 40 al 60 %.', cost: 400, effect: { type: 'stationSpeed', target: 'palm_grove', mult: 1.5 } },
      { id: 'pudricion_drenajes', icon: '💧', name: 'Drenajes', desc: 'Zanjas para que no se encharque el palmar: del 60 al 80 %.', cost: 2500, effect: { type: 'stationSpeed', target: 'palm_grove', mult: 4 / 3 } },
      { id: 'pudricion_hibrida', icon: ICON.oilPalm, name: 'Palma híbrida', desc: 'Palma que aguanta la pudrición: el Palmar vuelve al 100 %.', cost: 6000, effect: { type: 'stationSpeed', target: 'palm_grove', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { oil_box: 100 }, medals: [720, 1020] },
      { kind: 'produced', items: { palm_oil: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { crude_oil: 1000 }, medals: [630, 930] },
    ],
  },
  {
    id: 'despulpadora',
    blame: 'la despulpadora varada',
    zone: 'frutal',
    icon: '⚙️',
    name: 'Despulpadora varada',
    intro:
      'Se varó la despulpadora y el maracuyá se amontona en canastas: la Despulpadora trabaja al 40 %. Ponle aspas nuevas, un motor nuevo y un tamiz de acero.',
    announce: '¡Compadre, se varó la despulpadora y se amontona el maracuyá! Toque 🏅 Eventos.',
    stations: ['passion_vines', 'passion_pulper', 'pulp_pasteurizer', 'juice_mixer', 'juice_packer'],
    level: 10,
    coins: 2400,
    speed: { passion_pulper: 0.4 },
    actions: [
      { id: 'despulpa_aspas', icon: '🔪', name: 'Aspas nuevas', desc: 'Las aspas cortan otra vez: la Despulpadora pasa del 40 al 60 %.', cost: 2400, effect: { type: 'stationSpeed', target: 'passion_pulper', mult: 1.5 } },
      { id: 'despulpa_motor', icon: '⚡', name: 'Motor nuevo', desc: 'Un motor con más fuerza: del 60 al 80 %.', cost: 15000, effect: { type: 'stationSpeed', target: 'passion_pulper', mult: 4 / 3 } },
      { id: 'despulpa_tamiz', icon: ICON.passionPulp, name: 'Tamiz de acero', desc: 'La pulpa sale limpia de una vez: la Despulpadora vuelve al 100 %.', cost: 35000, effect: { type: 'stationSpeed', target: 'passion_pulper', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'produced', items: { juice_box: 500 }, medals: [735, 1035] },
      { kind: 'produced', items: { passion_juice: 550 }, medals: [780, 1080] },
      { kind: 'produced', items: { past_pulp: 1100 }, medals: [765, 1065] },
    ],
  },
  {
    id: 'feria_pescado',
    zone: 'cachamera',
    icon: '🐟',
    name: 'Feria del pescado',
    intro:
      'Llegó la Semana Santa y todo el Llano quiere pescado: piden pisillo, cachama ahumada y cachama al maracuyá, todo a la vez. Reparte bien la cachama y mejora cada rama; el jugo del Frutal llega sin falta.',
    announce: '¡Compadre, llegó la feria del pescado y piden de todo! Toque 🏅 Eventos.',
    stations: ['fish_ponds', 'cachama_cleaner', 'pisillo_kitchen', 'cachama_filleter', 'cachama_smoker', 'cachama_kitchen'],
    level: 10,
    coins: 40000,
    supply: { passion_juice: 1 },
    actions: [
      { id: 'pescado_ollas', icon: ICON.pisillo, name: 'Ollas grandes', desc: 'La Pisillera hace un 50 % más.', cost: 40000, effect: { type: 'stationSpeed', target: 'pisillo_kitchen', mult: 1.5 } },
      { id: 'pescado_ahumaderos', icon: ICON.smokedCachama, name: 'Más ahumaderos', desc: 'La Fileteadora y el Ahumadero hacen un 50 % más.', cost: 230000, effects: [{ type: 'stationSpeed', target: 'cachama_smoker', mult: 1.5 }, { type: 'stationSpeed', target: 'cachama_filleter', mult: 1.5 }] },
      { id: 'pescado_fogones', icon: ICON.cachamaMaracuya, name: 'Más fogones', desc: 'La Cocina de la cachama sirve un 50 % más.', cost: 550000, effect: { type: 'stationSpeed', target: 'cachama_kitchen', mult: 1.5 } },
    ],
    objectives: [
      { kind: 'sold', items: { pisillo: 150, smoked_cachama: 75, cachama_maracuya: 50 }, medals: [570, 870] },
      { kind: 'sold', items: { pisillo: 60, smoked_cachama: 120, cachama_maracuya: 40 }, medals: [615, 915] },
      { kind: 'sold', items: { pisillo: 90, smoked_cachama: 90, cachama_maracuya: 120 }, medals: [615, 915] },
    ],
  },
  {
    id: 'puente_caido',
    blame: 'el puente caído',
    zone: 'hato_llanero',
    icon: '🌉',
    name: 'Se cayó el puente',
    intro:
      'El río creció y se llevó el puente de la carretera de la Palma: el aceite no llega y solo queda lo guardado. Pásalo en canoas, consigue un planchón y espera el puente nuevo.',
    announce: '¡Ay, compadre, el río se llevó el puente y no llega el aceite! Toque 🏅 Eventos.',
    stations: ['llanero_herd', 'llanero_butcher', 'adobadero', 'vara_grill', 'carving_table', 'lunch_llanero', 'parranda_grill'],
    level: 10,
    coins: 1000000,
    supply: { oil_bottle: 0, clean_cachama: 1 },
    stock: { oil_bottle: 60 },
    actions: [
      { id: 'puente_canoas', icon: '🛶', name: 'Canoas por el río', desc: 'Unas canoas cruzan el río: llega una cuarta parte del aceite.', cost: 1000000, effect: { type: 'supply', product: 'oil_bottle', fraction: 0.25 } },
      { id: 'puente_planchon', icon: '⛴️', name: 'Planchón', desc: 'El planchón pasa los carros de a uno: llega el 60 % del aceite.', cost: 3000000, effect: { type: 'supply', product: 'oil_bottle', fraction: 0.6 } },
      { id: 'puente_nuevo', icon: '🌉', name: 'Puente nuevo', desc: 'Con el puente nuevo, el aceite vuelve a llegar todo.', cost: 8000000, effect: { type: 'supply', product: 'oil_bottle', fraction: 1 } },
    ],
    objectives: [
      { kind: 'produced', items: { almuerzo_llanero: 150 }, medals: [495, 795] },
      { kind: 'produced', items: { parranda_llanera: 130 }, medals: [540, 840] },
      { kind: 'produced', items: { almuerzo_llanero: 100, parranda_llanera: 100 }, medals: [615, 915] },
    ],
  },
  {
    id: 'coleo',
    blame: 'la falta de talabarteros',
    zone: 'talabarteria',
    icon: '🐂',
    name: 'Torneo de coleo',
    intro:
      'Se viene el torneo de coleo y todos los coleadores quieren silla nueva, pero hay pocas manos: el Taller de sillas trabaja al 40 %. Consigue aprendices, hormas prestadas y la ayuda de los maestros talabarteros.',
    announce: '¡Compadre, se viene el coleo y todos quieren silla nueva! Toque 🏅 Eventos.',
    stations: ['hide_yard', 'tannery', 'leather_cutter', 'leather_tooler', 'saddler', 'tienda_llanera'],
    level: 10,
    coins: 2500000,
    supply: { pisillo: 1, smoked_cachama: 1 },
    speed: { saddler: 0.4 },
    actions: [
      { id: 'coleo_aprendices', icon: ICON.leatherPieces, name: 'Aprendices', desc: 'Unos muchachos aprenden el oficio: del 40 al 60 %.', cost: 2500000, effect: { type: 'stationSpeed', target: 'saddler', mult: 1.5 } },
      { id: 'coleo_hormas', icon: ICON.saddle, name: 'Hormas prestadas', desc: 'Ninguna silla espera horma: del 60 al 80 %.', cost: 15000000, effect: { type: 'stationSpeed', target: 'saddler', mult: 4 / 3 } },
      { id: 'coleo_maestros', icon: '👴🏽', name: 'Los maestros talabarteros', desc: 'Llegan los maestros del pueblo: el Taller de sillas vuelve al 100 %.', cost: 35000000, effect: { type: 'stationSpeed', target: 'saddler', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { recuerdo_llano: 120 }, medals: [600, 900] },
      { kind: 'produced', items: { silla_montar: 850 }, medals: [765, 1065] },
      { kind: 'produced', items: { tooled_leather: 850 }, medals: [720, 1020] },
    ],
  },
  {
    id: 'torneo_joropo',
    blame: 'la falta de guías',
    zone: 'villavicencio',
    icon: '💃',
    name: 'Torneo del joropo',
    intro:
      'Es el Torneo Internacional del Joropo y Villavicencio se llenó de visitantes que quieren ir a Caño Cristales, pero hay pocos guías: la Salida despacha al 40 %. Trae guías de La Macarena, consigue más avionetas y súmale los jóvenes guías.',
    announce: '¡Compadre, torneo del joropo y la ciudad llena de gente! Toque 🏅 Eventos.',
    stations: ['empanaderia', 'kiosco_parque', 'hotel_campestre', 'plaza_mercado', 'morrales_viaje', 'salida_cano'],
    level: 10,
    coins: 20000000,
    supply: { oil_box: 1, juice_box: 1, recuerdo_llano: 1, cachama_maracuya: 1, almuerzo_llanero: 1, parranda_llanera: 1 },
    speed: { salida_cano: 0.4 },
    actions: [
      { id: 'joropo_guias', icon: '🧭', name: 'Guías de La Macarena', desc: 'Llegan guías de La Macarena: del 40 al 60 %.', cost: 20000000, effect: { type: 'stationSpeed', target: 'salida_cano', mult: 1.5 } },
      { id: 'joropo_avionetas', icon: '✈️', name: 'Más avionetas', desc: 'Más vuelos a La Macarena: del 60 al 80 %.', cost: 130000000, effect: { type: 'stationSpeed', target: 'salida_cano', mult: 4 / 3 } },
      { id: 'joropo_jovenes', icon: '🥾', name: 'Los jóvenes guías', desc: 'Los muchachos de la ciudad también guían: la Salida vuelve al 100 %.', cost: 300000000, effect: { type: 'stationSpeed', target: 'salida_cano', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { excursion_cano: 24 }, medals: [675, 975] },
      { kind: 'produced', items: { fiambre_viaje: 120 }, medals: [690, 990] },
      { kind: 'sold', items: { excursion_cano: 6, noche_villavo: 180 }, medals: [840, 1140] },
    ],
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const EVENT_OF_ZONE = Object.fromEntries(EVENTS.map((e) => [e.zone, e]));
export const EVENT_ACTIONS_BY_ID = Object.fromEntries(EVENTS.flatMap((e) => e.actions.map((a, k) => [a.id, { ...a, event: e.id, requires: e.actions[k - 1]?.id ?? null }])));
