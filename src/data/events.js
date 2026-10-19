// Eventos (v2.0, GDD §10.2): cada zona tiene un evento al año, que se juega en un tablero aparte con
// las piezas de esa zona, sus propias monedas y niveles y su propio reloj (que solo corre mientras se
// juega). El objetivo cambia de un año al siguiente; según lo rápido que se cumpla se gana una medalla.
//   announce: lo que dice la persona de la zona cuando el evento se abre (una vez al año)
//   stations: estaciones que ya están construidas al empezar (en el nivel `level`)
//   speed:    lo que el evento le hace a la velocidad de cada estación (la broca: el Cafetal al 40 %)
//   actions:  compras del evento (como las investigaciones, solo en el tablero); cada una pide la anterior
//   objectives: uno por año, en orden (y vuelve a empezar); medals = [s para el oro, s para la plata]
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
      { kind: 'sold', product: 'coffee_bag', amount: 100, medals: [660, 960] },
      { kind: 'produced', product: 'roasted', amount: 500, medals: [720, 1020] },
      { kind: 'produced', product: 'green', amount: 1000, medals: [660, 960] },
    ],
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const EVENT_OF_ZONE = Object.fromEntries(EVENTS.map((e) => [e.zone, e]));
export const EVENT_ACTIONS_BY_ID = Object.fromEntries(EVENTS.flatMap((e) => e.actions.map((a, k) => [a.id, { ...a, event: e.id, requires: e.actions[k - 1]?.id ?? null }])));
