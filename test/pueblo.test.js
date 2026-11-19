import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, routeFlow } from '../src/sim/analysis.js';
import { CHILDREN, chainOf } from '../src/sim/chain.js';
import { stationImportRate } from '../src/sim/routes.js';
import { ROUTES, ROUTES_BY_ID } from '../src/data/routes.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Chain tests: always daytime and no season (calendar is tested in calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Save with all six zones open and everything built at the same level.
function withPueblo(level = 30) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e18;
  for (const z of ['trapiche', 'lecheria', 'cacaotal', 'maizal', 'pueblo']) {
    game.unlockZone(z);
    for (const id of chainOf(z).slice(1)) assert.ok(game.unlock(id), id);
  }
  for (const id of chainOf('finca').slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) {
    st.level = level;
    st.transport.level = level;
  }
  for (const z of Object.values(s.zones)) z.dispatch.level = Math.max(40, level);
  for (const r of Object.values(s.routes)) r.level = level;
  return game;
}

const PUEBLO_ROUTES = ROUTES.filter((r) => r.to === 'pueblo').map((r) => r.id);

test('the Pueblo has no source: the Casa del café splits its coffee between the Greca and the Taller', () => {
  assert.deepEqual(CHILDREN.coffee_house, ['greca', 'basket_shop']);
  assert.deepEqual(CHILDREN.greca, ['fonda']);
  assert.deepEqual(CHILDREN.basket_shop, ['gift_wrap']);
  assert.deepEqual(CHILDREN.gift_wrap, ['export_dock']);
  assert.equal(PUEBLO_ROUTES.length, 6);
});

test('at the same level, every zone sends just what the Pueblo uses', () => {
  const game = withPueblo();
  const s = game.state;
  for (const id of PUEBLO_ROUTES) {
    const r = ROUTES_BY_ID[id];
    const need = r.stations.reduce((n, st) => n + stationImportRate(s, r, st), 0);
    assert.ok(Math.abs(routeFlow(s, id) - need) < 1e-9, `${id}: ${routeFlow(s, id)} of ${need}`);
  }
  const a = analyzeChain(s, 'pueblo');
  for (const row of a.rows) {
    if (row.imported) assert.equal(row.importLimited, null, `${row.id} waits for ${row.importLimited}`);
    // Nothing is lost or bypassed: each station processes everything that arrives.
    assert.ok(row.lost < 1e-9 && (row.children.length === 0 || row.diverted < 1e-9), `${row.id} diverts ${row.diverted}`);
  }
  // The panela routes split everything Trapiche makes, leaving nothing to sell.
  const panela = ['panela', 'panela_cacao', 'panela_pueblo'].reduce((n, id) => n + routeFlow(s, id), 0);
  const pulverizer = analyzeChain(s, 'trapiche').rows.find((r) => r.id === 'pulverizer');
  assert.ok(Math.abs(panela - pulverizer.output) < 1e-9, `${panela} of ${pulverizer.output}`);
});

test('the Pueblo earns more than what the zones that supply it stop selling', () => {
  const game = withPueblo();
  const s = game.state;
  const zones = ['finca', 'trapiche', 'lecheria', 'cacaotal', 'maizal'];
  const withPueblo_ = zones.reduce((n, z) => n + analyzeChain(s, z).income, 0) + analyzeChain(s, 'pueblo').income;
  // Without Pueblo (its stations off), the exact same amount would be sold in each zone.
  const off = { ...s, zones: { ...s.zones, pueblo: { ...s.zones.pueblo, unlocked: false } } };
  const without = zones.reduce((n, z) => n + analyzeChain(off, z).income, 0);
  assert.ok(withPueblo_ > 3 * without, `${withPueblo_} versus ${without}`);
});

test('the chivas reach the Pueblo and the first container leaves', () => {
  const game = withPueblo();
  run(game, 900);
  const s = game.state;
  for (const p of ['coffee_bag', 'panela_powder', 'cheese_arepa', 'arequipe', 'table_chocolate', 'milk_chocolate']) {
    assert.ok((s.stats.imported[p] ?? 0) > 0, `${p} arrived`);
  }
  assert.ok((s.stats.sold.breakfast ?? 0) > 0, 'it sold breakfasts');
  assert.ok((s.stats.sold.container ?? 0) > 0, 'it exported containers');
});

test('without coffee bags, the Casa del café waits and says so', () => {
  const game = withPueblo();
  const s = game.state;
  s.stations.coffee_house.imported = {};
  s.routes.cafe.phase = 'idle';
  s.zones.finca.warehouse = {};
  s.stations.packer.level = 1;
  s.stations.packer.buffer = 0;
  s.stations.packer.input = 0;
  s.mules = s.mules.filter((m) => m.from !== 'packer');
  game.step(0.1);
  assert.equal(s.stations.coffee_house.missing, 'coffee_bag');
  assert.equal(s.stations.coffee_house.status, 'starved');
  // The chain sees it: the bottleneck is the route or Finca, not Casa del café.
  const row = analyzeChain(s, 'pueblo').rows.find((r) => r.id === 'coffee_house');
  assert.equal(row.importLimited, 'cafe');
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  assert.ok(rec.id.startsWith('packer') || rec.id.startsWith('route:cafe'), `it recommended ${rec.id}`);
});

test('a newly built Container yard: raising it together with its mule drivers is recommended', () => {
  const game = withPueblo(40);
  const s = game.state;
  // Like in a casual test save: Patio at level 5 and its haulers at 1 get nothing out.
  s.stations.export_dock.level = 5;
  s.stations.export_dock.transport.level = 1;
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  assert.equal(rec.id, 'export_dock:transport');
  assert.ok(rec.gain > 0);
});

test('if the Fonda waits for arepas and the Maizal waits for cheese, the recommendation points to the Lechería', () => {
  const game = withPueblo(40);
  const s = game.state;
  // Maizal and Fonda far ahead of Lechería: what is truly missing is cheese.
  for (const id of chainOf('maizal')) s.stations[id].level = s.stations[id].transport.level = 70;
  for (const id of ['arepas', 'queso', 'mantequilla']) s.routes[id].level = 70;
  s.stations.fonda.level = s.stations.fonda.transport.level = 70;
  s.coins = 0; // with no money for research
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  const [sid] = rec.id.split(':');
  assert.ok(['pasture', 'pasteurizer', 'cheesery', 'separator', 'churn'].includes(sid), `it recommended ${rec.id}`);
});

test('at level 100 in the six zones, with all the research, no yard fills up', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const game = withPueblo(100);
  const s = game.state;
  for (const r of RESEARCH) s.research.push(r.id);
  run(game, 400);
  const blocked = {};
  for (let i = 0; i < 1000; i++) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.deepEqual(blocked, {});
});

test(`the Pueblo's recommended upgrade is computed quickly even though it looks at five zones`, () => {
  const game = withPueblo(40);
  const s = game.state;
  s.stations.fonda.level = 20;
  const t0 = performance.now();
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  const ms = performance.now() - t0;
  assert.ok(rec, 'it recommends something');
  assert.ok(ms < 400, `${ms.toFixed(0)} ms`);
});

test('a v1.4 save with the Maizal complete opens the Pueblo', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 8;
  for (const z of ['trapiche', 'lecheria', 'cacaotal', 'maizal']) old.zones[z] = { ...old.zones[z], unlocked: true, complete: true };
  delete old.zones.pueblo;
  for (const id of PUEBLO_ROUTES) delete old.routes[id];
  const store = { 'mitierrita.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame().regions.cafetero;
  delete globalThis.localStorage;
  assert.equal(s.zones.pueblo.unlocked, true);
  assert.ok(s.stations.coffee_house, 'the Casa del café is on the plaza');
  assert.equal(s.routes.cafe.level, 1);
});
