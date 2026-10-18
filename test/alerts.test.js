import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { chainOf } from '../src/sim/chain.js';
import { alerts, stepAlerts } from '../src/sim/alerts.js';

// Una estación de mentira: solo lo que mira stepAlerts.
function fake() {
  const st = { status: 'working', idle: 0 };
  const state = { playTime: 0, stations: { a: st }, zones: {} };
  const run = (status, seconds) => {
    st.status = status;
    for (let t = 0; t < seconds; t += 0.1) {
      state.playTime += 0.1;
      if (status === 'starved') st.idle += 0.1;
      else st.idle = 0;
      stepAlerts(state, 0.1);
    }
  };
  return { st, run };
}

test('un patio lleno un momento no es un aviso; si dura, sí', () => {
  const { st, run } = fake();
  run('working', 30);
  run('blocked', 10); // un tercio de la ventana: normal con las mulas por tandas
  assert.equal(alerts(st).blocked, false);
  run('working', 30);
  run('blocked', 16); // más de la mitad de los últimos 30 s
  assert.equal(alerts(st).blocked, true);
  // No parpadea: un respiro corto no lo quita.
  run('working', 5);
  assert.equal(alerts(st).blocked, true);
  // Se quita cuando ya casi no pasa.
  run('working', 25);
  assert.equal(alerts(st).blocked, false);
});

test('esperar entre tanda y tanda no es un aviso; quedarse sin nada largo rato, sí', () => {
  const { st, run } = fake();
  // Llega algo cada 5 s: espera la mitad del tiempo, pero nunca 8 s seguidos.
  for (let k = 0; k < 12; k++) {
    run('starved', 4);
    run('working', 1);
  }
  assert.equal(alerts(st).starved, false);
  run('starved', 30);
  assert.equal(alerts(st).starved, true);
});

test('la Finca nivelada no avisa nada; con los arrieros atrás, avisa que no dan abasto', () => {
  const game = new Game();
  const s = game.state;
  s.coins = 1e12;
  for (const id of chainOf('finca').slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) st.level = st.transport.level = 30;
  s.zones.finca.dispatch.level = 30;
  for (let t = 0; t < 300; t += 0.1) game.step(0.1);
  for (let t = 0; t < 120; t += 0.1) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) {
      const a = alerts(st);
      assert.ok(!a.blocked && !a.starved && !a.diverting, `${id} avisa ${JSON.stringify(a)}`);
    }
    assert.equal(alerts(s.zones.finca).full, false);
  }
  s.stations.wetmill.transport.level = 1;
  for (let t = 0; t < 5; t += 0.1) game.step(0.1);
  assert.equal(alerts(s.stations.wetmill).blocked, false, 'todavía no: puede ser un momento');
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  assert.equal(alerts(s.stations.wetmill).blocked, true);
  assert.equal(alerts(s.stations.wetmill).waiting, 'mules');
});
