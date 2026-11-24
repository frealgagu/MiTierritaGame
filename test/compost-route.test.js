import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, expectedCompostValue } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { RESEARCH } from '../src/data/research.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { COMPOST_VALUE } from '../src/sim/modifiers.js';
import { exportSave, importSave } from '../src/core/SaveSystem.js';
import { CALENDAR } from '../src/sim/calendar.js';
import { newGame, cafeOf, format9 } from './helpers/game.js';

// (v5.18) Bagazo is the Hornilla's required input, and the Compostera's compost goes half to the Cacaotal (Ruta del
// abono) and half to the Finca's bonus: with every station at the same level, nothing but the final products is sold.
const ZONES = ['finca', 'trapiche', 'lecheria', 'cacaotal'];
function sameLevel(level, research) {
  const game = new Game(cafeOf(newGame()));
  const s = game.state;
  s.coins = 1e30;
  for (const z of ZONES.slice(1)) game.unlockZone(z);
  for (const z of ZONES) for (const id of chainOf(z).slice(1)) assert.ok(game.unlock(id), id);
  assert.ok(game.unlock('composter'));
  for (const st of Object.values(s.stations)) st.level = st.transport.level = level;
  for (const z of Object.values(s.zones)) z.dispatch.level = level;
  for (const r of Object.values(s.routes)) r.level = level;
  // Every station research of these zones (speed ×2 each), not the Maestrías.
  if (research) s.research = RESEARCH.filter((r) => ZONES.includes(r.zone) && r.effect?.type === 'stationSpeed').map((r) => r.id);
  return game;
}
const sold = (s, zone, product) => analyzeChain(s, zone).sold.find((x) => x.product === product)?.units ?? 0;

for (const research of [false, true]) {
  test(`at the same level ${research ? 'with' : 'without'} research, pulp, compost and bagazo are all used: none is sold (v5.18)`, () => {
    for (const level of [10, 50, 100]) {
      const { state: s } = sameLevel(level, research);
      const finca = analyzeChain(s, 'finca');
      const wet = finca.rows.find((r) => r.id === 'wetmill');
      const comp = finca.rows.find((r) => r.id === 'composter');
      assert.ok(wet.byOutput > 0);
      assert.ok(Math.abs(comp.incoming - wet.byOutput) < wet.byOutput * 1e-9, `lv ${level}: the Compostera takes all the pulp`);
      assert.ok(Math.abs(comp.toRoutes - comp.output / 2) < comp.output * 1e-6, `lv ${level}: half the compost to the Cacaotal (${comp.toRoutes} of ${comp.output})`);
      assert.ok(Math.abs(comp.spent - comp.output / 2) < comp.output * 1e-6, `lv ${level}: half to the bonus`);
      assert.ok(comp.diverted < comp.output * 1e-6, `lv ${level}: no compost left to sell`);
      assert.equal(expectedCompostValue(s), COMPOST_VALUE, 'the bonus is always on');
      for (const [zone, product] of [['finca', 'pulp'], ['finca', 'compost'], ['trapiche', 'bagasse']]) {
        assert.ok(sold(s, zone, product) < 1e-9, `lv ${level}: ${product} sold ${sold(s, zone, product)}`);
      }
      const grove = analyzeChain(s, 'cacaotal').rows.find((r) => r.id === 'cacao_grove');
      assert.equal(grove.importLimited, null, `lv ${level}: the cacao trees get all the compost they need`);
      assert.ok(Math.abs(grove.imported.compost - comp.toRoutes) < comp.toRoutes * 1e-6);
    }
  });
}

test('the cacao trees need the Finca\'s compost: without the Compostera they stop (v5.18)', () => {
  assert.deepEqual(STATIONS_BY_ID.cacao_grove.imports, [{ product: 'compost', perCycle: 1, route: 'abono' }]);
  assert.deepEqual(STATIONS_BY_ID.cacao_grove.out, { cacao_pod: 4 });
  assert.equal(STATIONS_BY_ID.cacao_grove.cycle, 8, 'four pods every 8 s: the same pace as one every 2 s');
  const run = (withComposter) => {
    const game = sameLevel(20, false);
    if (!withComposter) delete game.state.stations.composter;
    const on = CALENDAR.on;
    CALENDAR.on = false;
    try {
      for (let t = 0; t < 600; t += 0.5) game.step(0.5);
    } finally {
      CALENDAR.on = on;
    }
    return game.state;
  };
  const yes = run(true);
  const no = run(false);
  assert.ok(yes.stats.imported.compost > 0, 'the chiva brings compost');
  assert.ok(yes.stats.produced.cacao_pod > 0, 'and the cacao trees give pods');
  assert.equal(no.stats.produced.cacao_pod ?? 0, 0, 'no Compostera, no pods');
  assert.ok((yes.stats.sold.compost ?? 0) < (yes.stats.produced.compost ?? 0) * 0.05, 'and the compost is not sold');
});

test('an older save with the Cacaotal open gets its Compostera and the Ruta del abono at their levels; the Hornilla\'s fuel becomes its input (v5.18)', () => {
  const old = format9(0, []);
  for (const z of ['trapiche', 'lecheria', 'cacaotal']) old.zones[z].unlocked = true;
  for (const z of ZONES) for (const id of chainOf(z)) old.stations[id] = { level: 40, input: 0, buffer: 0, byBuffer: 0, fuel: 0, imported: {}, joined: {}, progress: 0, transport: { level: 35 } };
  old.stations.furnace.fuel = 12;
  delete old.routes.abono; // saved before v5.18
  const s = cafeOf(importSave(exportSave(old)));
  assert.equal(s.stations.composter.level, 40, 'the Compostera at the Beneficiadero\'s level');
  assert.equal(s.stations.composter.transport.level, 35);
  assert.equal(s.routes.abono.level, 40, 'the route at the cacao trees\' level');
  assert.equal(s.stations.furnace.joined.bagasse, 12, 'the bagazo it had is now its input');
  assert.equal(s.stations.furnace.fuel, undefined);
  // Loaded again, nothing changes.
  const again = cafeOf(importSave(exportSave({ ...newGame(), regions: { cafetero: s } })));
  assert.equal(again.stations.composter.level, 40);
});
