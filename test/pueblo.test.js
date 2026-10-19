import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, routeFlow } from '../src/sim/analysis.js';
import { CHILDREN, chainOf } from '../src/sim/chain.js';
import { stationImportRate } from '../src/sim/routes.js';
import { ROUTES, ROUTES_BY_ID } from '../src/data/routes.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Pruebas de la cadena: siempre de día y sin temporada (el calendario se prueba en calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Partida con las seis zonas abiertas y todo construido al mismo nivel.
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

test('el Pueblo no tiene fuente: la Casa del café reparte su café entre la Greca y el Taller', () => {
  assert.deepEqual(CHILDREN.coffee_house, ['greca', 'basket_shop']);
  assert.deepEqual(CHILDREN.greca, ['fonda']);
  assert.deepEqual(CHILDREN.basket_shop, ['gift_wrap']);
  assert.deepEqual(CHILDREN.gift_wrap, ['export_dock']);
  assert.equal(PUEBLO_ROUTES.length, 6);
});

test('a igual nivel, cada zona manda justo lo que el Pueblo gasta', () => {
  const game = withPueblo();
  const s = game.state;
  for (const id of PUEBLO_ROUTES) {
    const r = ROUTES_BY_ID[id];
    const need = r.stations.reduce((n, st) => n + stationImportRate(s, r, st), 0);
    assert.ok(Math.abs(routeFlow(s, id) - need) < 1e-9, `${id}: ${routeFlow(s, id)} de ${need}`);
  }
  const a = analyzeChain(s, 'pueblo');
  for (const row of a.rows) {
    if (row.imported) assert.equal(row.importLimited, null, `${row.id} espera ${row.importLimited}`);
    // Nada se pierde ni se desvía: cada estación procesa todo lo que le llega.
    assert.ok(row.lost < 1e-9 && (row.children.length === 0 || row.diverted < 1e-9), `${row.id} desvía ${row.diverted}`);
  }
  // Las rutas de la panela se reparten todo lo que hace el Trapiche, y nada queda para vender.
  const panela = ['panela', 'panela_cacao', 'panela_pueblo'].reduce((n, id) => n + routeFlow(s, id), 0);
  const pulverizer = analyzeChain(s, 'trapiche').rows.find((r) => r.id === 'pulverizer');
  assert.ok(Math.abs(panela - pulverizer.output) < 1e-9, `${panela} de ${pulverizer.output}`);
});

test('el Pueblo ingresa más de lo que dejan de vender las zonas que lo abastecen', () => {
  const game = withPueblo();
  const s = game.state;
  const zones = ['finca', 'trapiche', 'lecheria', 'cacaotal', 'maizal'];
  const withPueblo_ = zones.reduce((n, z) => n + analyzeChain(s, z).income, 0) + analyzeChain(s, 'pueblo').income;
  // Sin el Pueblo (sus estaciones apagadas), lo mismo se vendería en cada zona.
  const off = { ...s, zones: { ...s.zones, pueblo: { ...s.zones.pueblo, unlocked: false } } };
  const without = zones.reduce((n, z) => n + analyzeChain(off, z).income, 0);
  assert.ok(withPueblo_ > 3 * without, `${withPueblo_} frente a ${without}`);
});

test('las chivas llegan al Pueblo y sale el primer contenedor', () => {
  const game = withPueblo();
  run(game, 900);
  const s = game.state;
  for (const p of ['coffee_bag', 'panela_powder', 'cheese_arepa', 'arequipe', 'table_chocolate', 'milk_chocolate']) {
    assert.ok((s.stats.imported[p] ?? 0) > 0, `llegó ${p}`);
  }
  assert.ok((s.stats.sold.breakfast ?? 0) > 0, 'vendió desayunos');
  assert.ok((s.stats.sold.container ?? 0) > 0, 'exportó contenedores');
});

test('sin bolsas de café, la Casa del café espera y lo dice', () => {
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
  // La cadena lo ve: lo que frena es la ruta o la Finca, no la Casa del café.
  const row = analyzeChain(s, 'pueblo').rows.find((r) => r.id === 'coffee_house');
  assert.equal(row.importLimited, 'cafe');
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  assert.ok(rec.id.startsWith('packer') || rec.id.startsWith('route:cafe'), `recomendó ${rec.id}`);
});

test('un Patio de contenedores recién construido: se recomienda subirlo junto con sus arrieros', () => {
  const game = withPueblo(40);
  const s = game.state;
  // Como en una partida casual de prueba: el Patio en nivel 5 y sus arrieros en 1 no sacan nada.
  s.stations.export_dock.level = 5;
  s.stations.export_dock.transport.level = 1;
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  assert.equal(rec.id, 'export_dock:transport');
  assert.ok(rec.gain > 0);
});

test('si la Fonda espera arepas y el Maizal espera queso, la recomendación señala la Lechería', () => {
  const game = withPueblo(40);
  const s = game.state;
  // El Maizal y la Fonda muy por encima de la Lechería: lo que falta de verdad es queso.
  for (const id of chainOf('maizal')) s.stations[id].level = s.stations[id].transport.level = 70;
  for (const id of ['arepas', 'queso', 'mantequilla']) s.routes[id].level = 70;
  s.stations.fonda.level = s.stations.fonda.transport.level = 70;
  s.coins = 0; // sin dinero para investigaciones
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  const [sid] = rec.id.split(':');
  assert.ok(['pasture', 'pasteurizer', 'cheesery', 'separator', 'churn'].includes(sid), `recomendó ${rec.id}`);
});

test('al nivel 100 en las seis zonas, con todas las investigaciones, ningún patio se llena', async () => {
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

test('la mejora recomendada del Pueblo se calcula rápido aunque mire cinco zonas', () => {
  const game = withPueblo(40);
  const s = game.state;
  s.stations.fonda.level = 20;
  const t0 = performance.now();
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'pueblo');
  const ms = performance.now() - t0;
  assert.ok(rec, 'recomienda algo');
  assert.ok(ms < 400, `${ms.toFixed(0)} ms`);
});

test('una partida de la v1.4 con el Maizal completo abre el Pueblo', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 8;
  for (const z of ['trapiche', 'lecheria', 'cacaotal', 'maizal']) old.zones[z] = { ...old.zones[z], unlocked: true, complete: true };
  delete old.zones.pueblo;
  for (const id of PUEBLO_ROUTES) delete old.routes[id];
  const store = { 'cafetal.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.equal(s.zones.pueblo.unlocked, true);
  assert.ok(s.stations.coffee_house, 'la Casa del café está en la plaza');
  assert.equal(s.routes.cafe.level, 1);
});
