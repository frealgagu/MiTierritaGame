import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { setCredit } from '../src/sim/upgrades.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Pruebas de la cadena: siempre de día y sin temporada (el calendario se prueba en calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('las cerezas viajan a la bodega y el Willys las vende', () => {
  const game = new Game();
  const events = [];
  game.bus.on('sold', (e) => events.push(e));
  run(game, 60);
  assert.ok(events.length > 0, 'debió haber ventas');
  assert.ok(game.state.coins > 0);
  // Al principio limitan los arrieros: una mula hasta la bodega, el viaje más largo del mapa.
  assert.ok(game.state.coins >= 5 && game.state.coins <= 30, `monedas: ${game.state.coins}`);
});

test('las opciones de desarrollador aceleran el tiempo de juego', () => {
  const game = new Game();
  game.timeScale = 10;
  for (let i = 0; i < 60; i++) game.update(1 / 60);
  assert.ok(Math.abs(game.state.playTime - 10) < 0.11, `tiempo jugado: ${game.state.playTime}`);
});

test('con saldo negativo permitido se compra sin monedas y el saldo queda en deuda', () => {
  const game = new Game();
  const s = game.state;
  assert.equal(game.buy('farm', 1), false, 'sin el ajuste, no alcanza');
  setCredit(true);
  try {
    assert.ok(game.unlock('wetmill'));
    assert.ok(game.buy('farm', 'max'));
    assert.equal(s.stations.farm.level, 100, '«máx» llega al tope');
    assert.ok(game.buy('farm:transport', 'max'));
    assert.ok(game.research('abono'), 'investiga sin monedas');
    assert.ok(s.coins < 0, `saldo: ${s.coins}`);
  } finally {
    setCredit(false);
  }
  // Sin el ajuste, la deuda se queda pero no se puede comprar más hasta pagarla.
  assert.equal(game.buy('wetmill', 1), false);
});

test('mejorar el cafetal cuesta monedas y sube el nivel', () => {
  const game = new Game();
  game.state.coins = 100;
  assert.ok(game.buy('farm', 1));
  assert.equal(game.state.stations.farm.level, 2);
  assert.equal(game.state.coins, 95);
  assert.ok(game.buy('farm', 'max'));
  assert.ok(game.state.coins < game.quote('farm', 1).cost);
});

test('si el despacho no da abasto, la bodega se llena y el cafetal se detiene', () => {
  const game = new Game();
  game.state.stations.farm.level = 60; // produce mucho más de lo que el Willys nivel 1 vende
  run(game, 120);
  assert.equal(game.state.stations.farm.status, 'blocked');
});

test('el progreso sin conexión genera monedas y respeta el tope', () => {
  const game = new Game();
  const { seconds, coins } = game.catchUp(10 * 3600);
  assert.equal(seconds, 2 * 3600);
  assert.ok(coins > 0);
});

test('al cruzar un hito se anuncia el hito alcanzado', () => {
  const game = new Game();
  game.state.coins = 1e6;
  const events = [];
  game.bus.on('levelUp', (e) => events.push(e));
  game.buy('farm', 10); // 1 → 11
  game.buy('farm', 1); // 11 → 12
  assert.equal(events[0].milestone, 10);
  assert.equal(events[1].milestone, null);
});

test('una partida de la v0.1 se carga en la v0.2', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const v1 = {
    version: 1, coins: 12, totalEarned: 30, playTime: 100, savedAt: Date.now(), nextId: 5,
    stations: { farm: { level: 7, buffer: 3, progress: 0.5, sinceDeparture: 1, blocked: false } },
    dispatch: { level: 2 }, warehouse: { cherry: 4 },
    mules: [{ id: 4, productId: 'cherry', amount: 5, t: 2, duration: 9 }],
    jeep: { phase: 'idle', t: 0, waited: 0, load: {} }, stats: { produced: {}, sold: { cherry: 30 } },
  };
  store.set('mitierrita.save', JSON.stringify(v1));
  const game = new Game(loadGame());
  assert.equal(game.state.stations.farm.level, 7);
  assert.equal(game.state.stations.farm.input, 0);
  assert.equal(game.state.mules[0].to, 'warehouse');
  run(game, 30);
  assert.ok(game.state.coins > 12);
});

test('una partida de la v0.2 se carga en la v0.3 con arrieros', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const v2 = {
    version: 2, coins: 100, totalEarned: 300, playTime: 500, savedAt: Date.now(), nextId: 9,
    stations: { farm: { level: 12, input: 0, buffer: 3, progress: 0, sinceDeparture: 1, idle: 0, status: 'working' }, wetmill: { level: 4, input: 5, buffer: 0, progress: 0, sinceDeparture: 0, idle: 0, status: 'working' } },
    dispatch: { level: 3 }, warehouse: {},
    mules: [{ id: 8, productId: 'cherry', amount: 5, from: 'farm', to: 'wetmill', s0: 0, s1: 2, t: 0.2, duration: 1.5 }],
    jeep: { phase: 'idle', t: 0, waited: 0, load: {} }, stats: { produced: {}, sold: {} }, hints: ['wetmill'],
  };
  localStorage.setItem('mitierrita.save', JSON.stringify(v2));
  const game = new Game(loadGame());
  assert.equal(game.state.stations.wetmill.transport.level, 1);
  assert.equal(game.state.mules[0].phase, 'go');
  run(game, 10);
  assert.ok(game.state.stations.wetmill.input > 0 || game.state.stats.produced.washed > 0);
});

test('mucho tiempo sin conexión (p. ej. acelerado) se extrapola sin perder ganancias', () => {
  const setup = () => {
    const g = new Game();
    g.state.coins = 1e6;
    for (const id of ['wetmill', 'dryer', 'huller']) g.unlock(id);
    for (const st of Object.values(g.state.stations)) {
      st.level = 20;
      st.transport.level = 20;
    }
    g.state.zones.finca.dispatch.level = 20;
    g.state.coins = 0;
    return g;
  };
  // 6 h de juego: simuladas paso a paso frente a la vuelta rápida (2 h simuladas + 4 h extrapoladas).
  const live = setup();
  for (let t = 0; t < 6 * 3600; t += 1) live.step(1);
  const offline = setup();
  const t0 = performance.now();
  const r = offline.catchUp(6 * 3600, 6 * 3600);
  assert.equal(r.seconds, 6 * 3600);
  const ratio = offline.state.coins / live.state.coins;
  assert.ok(ratio > 0.95 && ratio < 1.05, `rápida / paso a paso = ${ratio.toFixed(3)}`);
  assert.ok(Math.abs(offline.state.playTime - live.state.playTime) < 1e-6);
  const sold = offline.state.stats.sold.green / live.state.stats.sold.green;
  assert.ok(sold > 0.95 && sold < 1.05, `ventas para los objetivos: ${sold.toFixed(3)}`);
  assert.ok(performance.now() - t0 < 5000);
});
