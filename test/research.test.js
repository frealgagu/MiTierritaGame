import { test } from 'node:test';
import assert from 'node:assert/strict';

test('a locked research says what it is missing: the station, its mule drivers or the first one under the level (v3.12)', async () => {
  const { researchBlocker } = await import('../src/sim/upgrades.js');
  const { RESEARCH } = await import('../src/data/research.js');
  const { createInitialState } = await import('../src/sim/state.js');
  const { createStationState } = await import('../src/sim/production.js');
  const s = createInitialState(0);
  const dup = RESEARCH.find((r) => r.stationLevel && r.zone === 'finca' && r.requires === 'wetmill');
  assert.equal(researchBlocker(s, dup), 'wetmill', 'not built');
  s.stations.wetmill = createStationState();
  assert.equal(researchBlocker(s, dup), 'wetmill', 'the station under the level');
  s.stations.wetmill.level = dup.stationLevel;
  assert.equal(researchBlocker(s, dup), 'wetmill:transport', 'its mule drivers');
  s.stations.wetmill.transport.level = dup.stationLevel;
  assert.equal(researchBlocker(s, dup), null);
  const master = RESEARCH.find((r) => r.minLevel && r.zone === 'finca');
  assert.equal(researchBlocker(s, master), 'farm');
});
