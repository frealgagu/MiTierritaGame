import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { branchShare, chainOf } from '../src/sim/chain.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { pendingRoutes } from '../src/sim/transport.js';
import { alerts } from '../src/sim/alerts.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// La Lechería (con la Finca y el Trapiche) toda al mismo nivel, sin abrir el Cacaotal.
function lecheria(level = 50) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e12;
  game.unlockZone('trapiche');
  game.unlockZone('lecheria');
  for (const z of ['finca', 'trapiche', 'lecheria']) for (const id of chainOf(z).slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) st.level = st.transport.level = level;
  for (const z of ['finca', 'trapiche', 'lecheria']) s.zones[z].dispatch.level = level;
  s.routes.panela.level = level;
  return game;
}

test('a cada rama le toca un cuarto de la leche; el último es para la Ruta de la leche', () => {
  for (const id of ['cheesery', 'separator', 'arequipe_pot']) assert.equal(branchShare('pasteurizer', id), 0.25);
  assert.equal(branchShare('farm', 'wetmill'), 1);
  const s = lecheria().state;
  assert.deepEqual(pendingRoutes(s, 'pasteurizer').map((r) => r.id), ['leche']);
});

test('la leche que se guarda para la ruta que aún no abre no es un desvío', () => {
  const game = lecheria();
  const s = game.state;
  run(game, 300);
  const row = analyzeChain(s, 'lecheria').rows.find((r) => r.id === 'pasteurizer');
  assert.ok(Math.abs(row.diverted - row.output / 4) < 1e-6, `se vende ${row.diverted} de ${row.output}`);
  for (let t = 0; t < 60; t += 0.1) {
    game.step(0.1);
    assert.equal(alerts(s.stations.pasteurizer).diverting, false);
  }
});

test('una rama por debajo de la anterior recibe lo que le cabe (antes no recibía nada)', () => {
  const game = lecheria();
  const s = game.state;
  // En el nivel 45, la entrada de la Quesera no alcanza para una carga entera de las mulas (nivel 50).
  s.stations.cheesery.level = 45;
  run(game, 300);
  const expected = analyzeChain(s, 'lecheria').rows.find((r) => r.id === 'cheesery').output;
  const before = s.stats.produced.cheese ?? 0;
  run(game, 120);
  const real = ((s.stats.produced.cheese ?? 0) - before) / 120;
  assert.ok(real > expected * 0.95, `queso ${real.toFixed(2)}/s de ${expected.toFixed(2)}/s`);
  assert.equal(alerts(s.stations.cheesery).starved, false);
});
