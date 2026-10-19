// Eventos (v2.0, GDD §10.2): cada zona tiene un evento al año, que se juega en un tablero aparte con
// las piezas de esa zona, sus propias monedas y niveles y su propio reloj (que solo corre mientras se
// juega). El objetivo cambia de un año al siguiente; según lo rápido que se cumpla se gana una medalla.
//   announce: lo que dice la persona de la zona cuando el evento se abre (una vez al año)
//   stations: estaciones que ya están construidas al empezar (en el nivel `level`)
//   speed:    lo que el evento le hace a la velocidad de cada estación (la broca: el Cafetal al 40 %)
//   supply:   lo que llega de afuera por cada importado, de 0 (nada) a 1 (todo lo que piden): en el
//             tablero no hay otras zonas; stock: lo que ya tienen guardado las estaciones al empezar
//   actions:  compras del evento (como las investigaciones, solo en el tablero); cada una pide la anterior.
//             Efecto (effect, o varios en effects): los de las investigaciones o { type: 'supply', product, fraction }
//   objectives: uno por año, en orden (y vuelve a empezar): kind ('sold' o 'produced'), items
//             (producto → cantidad) y medals = [s para el oro, s para la plata]
// Las medallas se calibran con tools/event-sim.js: el oro pide jugar un poco mejor que el jugador
// automático atento (que no compra todo lo del evento); la plata, casi la mitad más.
export const MEDALS = {
  gold: { icon: '🥇', name: 'oro', renown: 4 },
  silver: { icon: '🥈', name: 'plata', renown: 2 },
  bronze: { icon: '🥉', name: 'bronce', renown: 1 },
};

export const EVENTS = [
  {
    id: 'broca',
    zone: 'finca',
    icon: '🪲',
    name: 'La broca',
    intro:
      'La broca, un cucarroncito que se mete en la cereza, tiene el cafetal produciendo al 40 %. Contrólala con trampas, el hongo Beauveria y el re-re, y saca la cosecha a tiempo.',
    announce: '¡Llegó la broca al cafetal, patrón! Toque 🏅 Eventos para controlarla.',
    stations: ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer'],
    level: 10,
    coins: 0,
    speed: { farm: 0.4 },
    actions: [
      { id: 'broca_trampas', icon: '🪤', name: 'Trampas', desc: 'Trampas con alcohol atrapan las brocas: el Cafetal pasa del 40 al 60 %.', cost: 400, effect: { type: 'stationSpeed', target: 'farm', mult: 1.5 } },
      { id: 'broca_hongo', icon: '🍄', name: 'Hongo Beauveria', desc: 'Un hongo que enferma a la broca sin dañar el café: del 60 al 80 %.', cost: 2500, effect: { type: 'stationSpeed', target: 'farm', mult: 4 / 3 } },
      { id: 'broca_rere', icon: '🧺', name: 'Re-re', desc: 'Recoger los granos caídos y los que quedan en la mata: la broca ya no tiene dónde esconderse. Del 80 al 100 %.', cost: 6000, effect: { type: 'stationSpeed', target: 'farm', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { coffee_bag: 100 }, medals: [660, 960] },
      { kind: 'produced', items: { roasted: 500 }, medals: [720, 1020] },
      { kind: 'produced', items: { green: 1000 }, medals: [660, 960] },
    ],
  },
  {
    id: 'molienda',
    zone: 'trapiche',
    icon: '🔥',
    name: 'La gran molienda',
    intro:
      'Llegó la molienda grande y se acabó la leña: la hornilla apenas calienta con bagazo húmedo y cocina al 40 %. Seca el bagazo, arregla la hornilla y ponle un fuelle para sacar la panela.',
    announce: '¡Llegó la gran molienda y no hay leña! Toque 🏅 Eventos y ayúdeme con la hornilla.',
    stations: ['canefield', 'cane_mill', 'furnace', 'molds', 'pulverizer'],
    level: 10,
    coins: 0,
    speed: { furnace: 0.4 },
    actions: [
      { id: 'molienda_bagacera', icon: '☀️', name: 'Bagacera', desc: 'Un techo para secar el bagazo al sol: la Hornilla pasa del 40 al 60 %.', cost: 2400, effect: { type: 'stationSpeed', target: 'furnace', mult: 1.5 } },
      { id: 'molienda_hornilla', icon: '🧱', name: 'Hornilla reparada', desc: 'Ladrillos nuevos que no dejan escapar el calor: del 60 al 80 %.', cost: 15000, effect: { type: 'stationSpeed', target: 'furnace', mult: 4 / 3 } },
      { id: 'molienda_fuelle', icon: '🌬️', name: 'Fuelle', desc: 'Más aire para el fuego: la Hornilla vuelve al 100 %.', cost: 35000, effect: { type: 'stationSpeed', target: 'furnace', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'produced', items: { panela_powder: 500 }, medals: [660, 960] },
      { kind: 'produced', items: { panela: 550 }, medals: [690, 990] },
      { kind: 'produced', items: { melado: 1100 }, medals: [690, 990] },
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
    coins: 0,
    supply: { panela_powder: 1 },
    actions: [
      { id: 'feria_moldes', icon: '🧀', name: 'Moldes nuevos', desc: 'La Quesera hace un 50 % más.', cost: 40000, effect: { type: 'stationSpeed', target: 'cheesery', mult: 1.5 } },
      { id: 'feria_batidora', icon: '🧈', name: 'Batidora', desc: 'La Mantequera y la Descremadora hacen un 50 % más.', cost: 230000, effects: [{ type: 'stationSpeed', target: 'churn', mult: 1.5 }, { type: 'stationSpeed', target: 'separator', mult: 1.5 }] },
      { id: 'feria_paila', icon: '🍯', name: 'Paila de cobre', desc: 'La Paila hace un 50 % más de arequipe.', cost: 550000, effect: { type: 'stationSpeed', target: 'arequipe_pot', mult: 1.5 } },
    ],
    objectives: [
      { kind: 'sold', items: { cheese: 150, butter: 75, arequipe: 50 }, medals: [630, 930] },
      { kind: 'sold', items: { cheese: 60, butter: 120, arequipe: 40 }, medals: [630, 930] },
      { kind: 'sold', items: { cheese: 90, butter: 90, arequipe: 120 }, medals: [660, 960] },
    ],
  },
  {
    id: 'derrumbe',
    zone: 'cacaotal',
    icon: '🪨',
    name: 'Derrumbe en la vía',
    intro:
      'Un derrumbe tapó la vía del Trapiche: la panela no llega y solo queda la guardada. Mándala por el monte en mulas, abre una trocha y despeja la vía para que el chocolate no pare.',
    announce: '¡Un derrumbe tapó la vía y no llega la panela! Toque 🏅 Eventos y busquemos cómo pasarla.',
    stations: ['cacao_grove', 'fermenter', 'cacao_dryer', 'cacao_roaster', 'cacao_mill', 'chocolate_table', 'chocolatier'],
    level: 10,
    coins: 0,
    supply: { panela_powder: 0, milk: 1 },
    stock: { panela_powder: 60 },
    actions: [
      { id: 'derrumbe_mulas', icon: '🫏', name: 'Mulas por el monte', desc: 'Unas mulas pasan la panela por el monte: llega una cuarta parte de la que se necesita.', cost: 1000000, effect: { type: 'supply', product: 'panela_powder', fraction: 0.25 } },
      { id: 'derrumbe_trocha', icon: '🛻', name: 'Trocha', desc: 'Un camino destapado por donde pasa un carro: llega el 60 % de la panela.', cost: 3000000, effect: { type: 'supply', product: 'panela_powder', fraction: 0.6 } },
      { id: 'derrumbe_via', icon: '🚧', name: 'Despejar la vía', desc: 'Con la vía libre, la panela vuelve a llegar toda.', cost: 8000000, effect: { type: 'supply', product: 'panela_powder', fraction: 1 } },
    ],
    objectives: [
      { kind: 'produced', items: { table_chocolate: 150 }, medals: [630, 930] },
      { kind: 'produced', items: { milk_chocolate: 130 }, medals: [690, 990] },
      { kind: 'produced', items: { table_chocolate: 100, milk_chocolate: 100 }, medals: [660, 960] },
    ],
  },
  {
    id: 'fiesta',
    zone: 'maizal',
    icon: '🎉',
    name: 'Fiesta del maíz',
    intro:
      'Es la fiesta del maíz y todo el pueblo quiere arepas, pero el budare grande se rajó: asa al 40 %. Consigue uno prestado, leña seca y la ayuda de las vecinas.',
    announce: '¡Llegó la fiesta del maíz y se rajó el budare! Toque 🏅 Eventos, que hay mucha arepa por hacer.',
    stations: ['cornfield', 'sheller', 'corn_huller', 'dough_mill', 'budare', 'arepa_stand'],
    level: 10,
    coins: 0,
    supply: { cheese: 1, butter: 1 },
    speed: { budare: 0.4 },
    actions: [
      { id: 'fiesta_budare', icon: '🍳', name: 'Budare prestado', desc: 'La vecina presta su budare: del 40 al 60 %.', cost: 2500000, effect: { type: 'stationSpeed', target: 'budare', mult: 1.5 } },
      { id: 'fiesta_lena', icon: '🪵', name: 'Leña seca', desc: 'Fuego parejo: del 60 al 80 %.', cost: 15000000, effect: { type: 'stationSpeed', target: 'budare', mult: 4 / 3 } },
      { id: 'fiesta_vecinas', icon: '👵', name: 'Las vecinas ayudan', desc: 'Más manos para voltear las arepas: el Budare vuelve al 100 %.', cost: 35000000, effect: { type: 'stationSpeed', target: 'budare', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { cheese_arepa: 120 }, medals: [600, 900] },
      { kind: 'produced', items: { arepa: 850 }, medals: [720, 1020] },
      { kind: 'produced', items: { corn_dough: 850 }, medals: [690, 990] },
    ],
  },
  {
    id: 'barco',
    zone: 'pueblo',
    icon: '🚢',
    name: 'El barco sale el viernes',
    intro:
      'El barco zarpa el viernes y hay que llenar los contenedores, pero la grúa del puerto está varada: carga al 40 %. Consigue repuestos, arregla la grúa y pon un turno extra.',
    announce: '¡El barco sale el viernes y la grúa está varada! Toque 🏅 Eventos y llenemos esos contenedores.',
    stations: ['coffee_house', 'greca', 'fonda', 'basket_shop', 'gift_wrap', 'export_dock'],
    level: 10,
    coins: 0,
    supply: { coffee_bag: 1, panela_powder: 1, cheese_arepa: 1, arequipe: 1, table_chocolate: 1, milk_chocolate: 1 },
    speed: { export_dock: 0.4 },
    actions: [
      { id: 'barco_repuestos', icon: '🔧', name: 'Repuestos', desc: 'Llegan los repuestos de la grúa: del 40 al 60 %.', cost: 20000000, effect: { type: 'stationSpeed', target: 'export_dock', mult: 1.5 } },
      { id: 'barco_grua', icon: '🏗️', name: 'Grúa arreglada', desc: 'La grúa vuelve a subir los contenedores: del 60 al 80 %.', cost: 130000000, effect: { type: 'stationSpeed', target: 'export_dock', mult: 4 / 3 } },
      { id: 'barco_turno', icon: '👷', name: 'Turno extra', desc: 'Los estibadores trabajan de corrido: el Patio vuelve al 100 %.', cost: 300000000, effect: { type: 'stationSpeed', target: 'export_dock', mult: 1.25 } },
    ],
    objectives: [
      { kind: 'sold', items: { container: 24 }, medals: [630, 930] },
      { kind: 'produced', items: { gift_basket: 120 }, medals: [660, 960] },
      { kind: 'sold', items: { container: 6, breakfast: 180 }, medals: [810, 1110] },
    ],
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const EVENT_OF_ZONE = Object.fromEntries(EVENTS.map((e) => [e.zone, e]));
export const EVENT_ACTIONS_BY_ID = Object.fromEntries(EVENTS.flatMap((e) => e.actions.map((a, k) => [a.id, { ...a, event: e.id, requires: e.actions[k - 1]?.id ?? null }])));
