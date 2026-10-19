import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { DAY_LENGTH, SEASONS, dayOf, hourOf, isWorkTime, seasonDay, seasonOf, untilWork, workSeconds, yearOf } from '../src/sim/calendar.js';
import { speedMult } from '../src/sim/modifiers.js';

const HOUR = DAY_LENGTH / 24; // s de juego por hora
// playTime de un día (desde 0) a una hora.
const at = (day, hour) => (day * 24 + hour - 8) * HOUR;

test('la partida empieza el primer día a las 8:00, en verano; el año tiene 16 días', () => {
  assert.equal(hourOf(0), 8);
  assert.equal(dayOf(0), 0);
  assert.equal(seasonOf(0).id, 'verano');
  assert.equal(seasonDay(0), 1);
  assert.equal(dayOf(at(1, 0)), 1);
  assert.equal(seasonOf(at(4, 7)).id, 'entrada');
  assert.equal(seasonOf(at(8, 7)).id, 'invierno');
  assert.equal(seasonOf(at(12, 7)).id, 'veranillo');
  assert.equal(seasonOf(at(16, 7)).id, 'verano');
  assert.equal(yearOf(at(15, 23)), 1);
  assert.equal(yearOf(at(16, 0)), 2);
  assert.deepEqual(SEASONS.map((s) => s.mult), [1.2, 1, 0.8, 1]);
});

test('se trabaja de 6:00 a 18:00', () => {
  assert.equal(isWorkTime(at(1, 5.9)), false);
  assert.equal(isWorkTime(at(1, 6)), true);
  assert.equal(isWorkTime(at(1, 17.9)), true);
  assert.equal(isWorkTime(at(1, 18)), false);
  assert.ok(Math.abs(untilWork(at(1, 20)) - 10 * HOUR) < 1e-9);
  assert.equal(untilWork(at(1, 9)), 0);
  // Un año entero de trabajo: la mitad de cada día, con las cuatro temporadas.
  const year = workSeconds(at(0, 0), at(16, 0));
  assert.ok(Math.abs(year - 16 * (DAY_LENGTH / 2) * ((1.2 + 1 + 0.8 + 1) / 4)) < 1e-6, year);
});

test('de noche las estaciones paran y las mulas no salen; al amanecer siguen', () => {
  const game = new Game();
  const s = game.state;
  s.playTime = at(0, 17.5);
  for (let t = 0; t < HOUR; t += 0.1) game.step(0.1); // hasta las 18:30
  const produced = s.stats.produced.cherry ?? 0;
  const mules = s.mules.length;
  for (let t = 0; t < 10 * HOUR; t += 0.1) game.step(0.1); // toda la noche, hasta las 4:30
  assert.equal(s.stations.farm.status, 'resting');
  assert.equal(s.stats.produced.cherry ?? 0, produced);
  assert.ok(s.mules.length <= mules, 'no sale ninguna recua de noche');
  for (let t = 0; t < 3 * HOUR; t += 0.1) game.step(0.1); // hasta las 7:30
  assert.notEqual(s.stations.farm.status, 'resting');
  assert.ok(s.stats.produced.cherry > produced);
});

test('la temporada sube o baja todas las estaciones a la vez', () => {
  const game = new Game();
  const s = game.state;
  s.playTime = at(1, 10);
  const summer = speedMult(s, 'farm');
  s.playTime = at(9, 10);
  const winter = speedMult(s, 'farm');
  assert.ok(Math.abs(summer / winter - 1.5) < 1e-9);
});

test('sin conexión cuenta las noches y las temporadas al sumar lo que no simula', () => {
  const setup = () => {
    const g = new Game();
    g.state.coins = 1e6;
    for (const id of ['wetmill', 'dryer', 'huller']) g.unlock(id);
    for (const st of Object.values(g.state.stations)) st.level = st.transport.level = 20;
    g.state.zones.finca.dispatch.level = 20;
    g.state.coins = 0;
    return g;
  };
  // 6 h de juego (45 días): paso a paso frente a la vuelta rápida (2 h simuladas + 4 h sumadas).
  const live = setup();
  for (let t = 0; t < 6 * 3600; t += 1) live.step(1);
  const offline = setup();
  offline.catchUp(6 * 3600, 6 * 3600);
  const ratio = offline.state.coins / live.state.coins;
  assert.ok(ratio > 0.95 && ratio < 1.05, `rápida / paso a paso = ${ratio.toFixed(3)}`);
});
