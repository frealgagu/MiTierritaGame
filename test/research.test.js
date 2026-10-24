import { test } from 'node:test';
import assert from 'node:assert/strict';

test('una investigación bloqueada dice qué le falta: la estación, sus arrieros o la primera bajo el nivel (v3.12)', async () => {
  const { researchBlocker } = await import('../src/sim/upgrades.js');
  const { RESEARCH } = await import('../src/data/research.js');
  const { createInitialState } = await import('../src/sim/state.js');
  const { createStationState } = await import('../src/sim/production.js');
  const s = createInitialState(0);
  const dup = RESEARCH.find((r) => r.stationLevel && r.zone === 'finca' && r.requires === 'wetmill');
  assert.equal(researchBlocker(s, dup), 'wetmill', 'sin construir');
  s.stations.wetmill = createStationState();
  assert.equal(researchBlocker(s, dup), 'wetmill', 'la estación bajo el nivel');
  s.stations.wetmill.level = dup.stationLevel;
  assert.equal(researchBlocker(s, dup), 'wetmill:transport', 'sus arrieros');
  s.stations.wetmill.transport.level = dup.stationLevel;
  assert.equal(researchBlocker(s, dup), null);
  const master = RESEARCH.find((r) => r.minLevel && r.zone === 'finca');
  assert.equal(researchBlocker(s, master), 'farm');
});
