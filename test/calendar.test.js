import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { CALENDAR, DAY_LENGTH, EXTRA_BLOCKS, SEASONS, dayOf, hourOf, isLunch, isWorkTime, nextWorkHour, seasonDay, seasonOf, untilWork, workSeconds, yearOf } from '../src/sim/calendar.js';
import { WORK_COSTS, buyWork, quoteWork, workLevel } from '../src/sim/renown.js';
import { workText } from '../src/ui/calendar.js';
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

test('se trabaja de 6:00 a 12:00 y de 14:00 a 20:00', () => {
  assert.equal(isWorkTime(at(1, 5.9)), false);
  assert.equal(isWorkTime(at(1, 6)), true);
  assert.equal(isWorkTime(at(1, 11.9)), true);
  assert.equal(isWorkTime(at(1, 12)), false, 'la hora del almuerzo');
  assert.ok(isLunch(at(1, 13)));
  assert.equal(nextWorkHour(at(1, 13)), 14);
  assert.equal(isWorkTime(at(1, 14)), true);
  assert.equal(isWorkTime(at(1, 19.9)), true);
  assert.equal(isWorkTime(at(1, 20)), false);
  assert.ok(!isLunch(at(1, 21)));
  assert.ok(Math.abs(untilWork(at(1, 21)) - 9 * HOUR) < 1e-9);
  assert.ok(Math.abs(untilWork(at(1, 12.5)) - 1.5 * HOUR) < 1e-9);
  assert.equal(untilWork(at(1, 9)), 0);
  // Un año entero de trabajo: la mitad de cada día, con las cuatro temporadas.
  const year = workSeconds(at(0, 0), at(16, 0));
  assert.ok(Math.abs(year - 16 * (DAY_LENGTH / 2) * ((1.2 + 1 + 0.8 + 1) / 4)) < 1e-6, year);
});

test('con Renombre la jornada crece de a 2 h, cada bloque al doble del anterior, hasta las 24 h', () => {
  assert.deepEqual(WORK_COSTS, [2, 4, 8, 16, 32, 64]);
  assert.equal(WORK_COSTS.length, EXTRA_BLOCKS.length);
  assert.deepEqual(EXTRA_BLOCKS, [[20, 22], [4, 6], [22, 24], [2, 4], [12, 14], [0, 2]]);
  const profile = { renown: 3 };
  assert.ok(buyWork(profile));
  assert.equal(profile.renown, 1);
  assert.deepEqual(quoteWork(profile), { ok: false, reason: 'renown', cost: 4 });
  profile.renown = 1000;
  while (buyWork(profile));
  assert.equal(workLevel(profile), 6);
  assert.equal(profile.renown, 1000 - (4 + 8 + 16 + 32 + 64));
  assert.equal(quoteWork(profile).reason, 'max');
  const texts = [];
  try {
    for (let n = 0; n <= 6; n++) {
      CALENDAR.extra = n;
      texts.push(workText());
      const hours = workSeconds(at(1, 0), at(2, 0)) / HOUR / seasonOf(at(1, 0)).mult;
      assert.ok(Math.abs(hours - (12 + 2 * n)) < 1e-6, `${n} bloques: ${hours} h`);
    }
    CALENDAR.extra = 1;
    assert.equal(isWorkTime(at(1, 21)), true);
    assert.equal(nextWorkHour(at(1, 23)), 6);
    CALENDAR.extra = 5;
    assert.equal(isWorkTime(at(1, 13)), true, 'el almuerzo es el penúltimo');
    assert.equal(isWorkTime(at(1, 1)), false);
    assert.equal(nextWorkHour(at(1, 1)), 2);
  } finally {
    CALENDAR.extra = 0;
  }
  assert.deepEqual(texts, [
    '6:00 a 12:00 y 14:00 a 20:00',
    '6:00 a 12:00 y 14:00 a 22:00',
    '4:00 a 12:00 y 14:00 a 22:00',
    '4:00 a 12:00 y 14:00 a 0:00',
    '2:00 a 12:00 y 14:00 a 0:00',
    '2:00 a 0:00',
    'las 24 horas',
  ]);
});

test('de noche las estaciones paran y las mulas no salen; al amanecer siguen', () => {
  const game = new Game();
  const s = game.state;
  s.playTime = at(0, 19.5);
  for (let t = 0; t < HOUR; t += 0.1) game.step(0.1); // hasta las 20:30
  const produced = s.stats.produced.cherry ?? 0;
  const mules = s.mules.length;
  for (let t = 0; t < 9 * HOUR; t += 0.1) game.step(0.1); // toda la noche, hasta las 5:30
  assert.equal(s.stations.farm.status, 'resting');
  assert.equal(s.stats.produced.cherry ?? 0, produced);
  assert.ok(s.mules.length <= mules, 'no sale ninguna recua de noche');
  for (let t = 0; t < 2 * HOUR; t += 0.1) game.step(0.1); // hasta las 7:30
  assert.notEqual(s.stations.farm.status, 'resting');
  assert.ok(s.stats.produced.cherry > produced);
});

test('con el bloque de 20 a 22 comprado se sigue trabajando después de las 20:00', () => {
  const game = new Game();
  const s = game.state;
  s.playTime = at(0, 20.5);
  CALENDAR.extra = 1;
  try {
    game.step(0.1);
    assert.notEqual(s.stations.farm.status, 'resting');
  } finally {
    CALENDAR.extra = 0;
  }
  game.step(0.1);
  assert.equal(s.stations.farm.status, 'resting');
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

test('el cálculo sin conexión por partes da lo mismo que de una vez y avisa cuánto va', async () => {
  const setup = () => {
    const g = new Game();
    g.state.coins = 1e6;
    for (const id of ['wetmill', 'dryer']) g.unlock(id);
    for (const st of Object.values(g.state.stations)) st.level = st.transport.level = 15;
    g.state.coins = 0;
    return g;
  };
  const once = setup();
  const a = once.catchUp(3 * 3600, 3 * 3600);
  const parts = setup();
  const seen = [];
  const b = await parts.catchUpAsync(3 * 3600, 3 * 3600, (f) => seen.push(f));
  assert.equal(a.coins, b.coins);
  assert.equal(once.state.playTime, parts.state.playTime);
  assert.equal(seen.at(-1), 1);
  assert.ok(seen.every((f, k) => k === 0 || f >= seen[k - 1]), 'la barra solo avanza');
  assert.equal(parts.bus.muted, false);
});
