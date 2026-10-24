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
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const EVENT_OF_ZONE = Object.fromEntries(EVENTS.map((e) => [e.zone, e]));
export const EVENT_ACTIONS_BY_ID = Object.fromEntries(EVENTS.flatMap((e) => e.actions.map((a, k) => [a.id, { ...a, event: e.id, requires: e.actions[k - 1]?.id ?? null }])));
