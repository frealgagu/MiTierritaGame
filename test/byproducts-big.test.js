import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState, linkRegion } from '../src/sim/state.js';
import { STATIONS, STATIONS_BY_ID } from '../src/data/stations.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { REGION_OF_ZONE } from '../src/data/regions.js';
import { CALENDAR } from '../src/sim/calendar.js';
import { createStationState } from '../src/sim/production.js';
import { FUEL_CHILDREN, PARENT } from '../src/sim/chain.js';
import { ROUTES_BY_ID } from '../src/data/routes.js';
import { newGame } from './helpers/game.js';

// Byproducts in a late game (v5.16.3): every station at level 100 and ×2⁶⁰, where amounts reach 10²⁴. The
// Compostera stopped selling there because a rule that worked with small numbers rounded to nothing; this checks
// that no byproduct is lost that way: alone, it is sold; with its whole zone, what is made is used or sold.
const SECONDS = 300;

function lateGame(def, wholeZone) {
  const root = newGame();
  const regionId = REGION_OF_ZONE[def.zone];
  root.regions[regionId] ??= createInitialState(0, regionId);
  const s = linkRegion(root, regionId);
  s.keep.resets = 60;
  for (const z of Object.values(s.zones)) z.unlocked = true;
  const zone = ZONES_BY_ID[def.zone];
  const ids = new Set();
  if (wholeZone) for (const id of [...zone.chain, ...(zone.plots ?? []).map((p) => p.stationId)]) ids.add(id);
  else {
    // Only what the station needs: its suppliers up the chain.
    const walk = (id) => {
      if (!id || ids.has(id)) return;
      ids.add(id);
      walk(PARENT[id]);
      for (const j of STATIONS_BY_ID[id].joins ?? []) walk(j.from);
    };
    walk(def.id);
  }
  for (const id of ids) s.stations[id] ??= createStationState();
  for (const st of Object.values(s.stations)) st.level = st.transport.level = 100;
  for (const z of Object.values(s.zones)) z.dispatch.level = 100;
  const game = new Game(s);
  const on = CALENDAR.on;
  CALENDAR.on = false; // always daytime
  try {
    for (let t = 0; t < SECONDS; t++) {
      // Goods from other zones arrive without end: the test is about the byproduct alone.
      for (const id of ids) for (const imp of STATIONS_BY_ID[id].imports ?? []) s.stations[id].imported[imp.product] = 1e40;
      game.step(1);
    }
  } finally {
    CALENDAR.on = on;
  }
  return s;
}

// What the stations using `product` consumed: the cycles they ran × what each cycle takes of it.
function usedOf(s, product) {
  let used = 0;
  for (const id of Object.keys(s.stations)) {
    const def = STATIONS_BY_ID[id];
    const per = def.in?.[product] ?? def.joins?.find((j) => j.product === product)?.perCycle;
    if (!per) continue;
    const [out, amount] = Object.entries(def.out)[0];
    used += ((s.stats.produced[out] ?? 0) / amount) * per;
  }
  return used;
}

for (const def of STATIONS.filter((x) => x.by)) {
  const product = Object.keys(def.by)[0];
  test(`late game: ${product} from ${def.id} is sold when nobody uses it, and used or sold with its zone (v5.16.3)`, () => {
    const alone = lateGame(def, false);
    const made = alone.stats.produced[product];
    assert.ok(made > 1e20, `huge numbers (${made})`);
    assert.ok(alone.stats.sold[product] > made * 0.9, `alone it is sold: ${alone.stats.sold[product]} of ${made}`);

    const zone = lateGame(def, true);
    const zMade = zone.stats.produced[product];
    const sold = zone.stats.sold[product] ?? 0;
    const used = usedOf(zone, product);
    // Still on hand: in the station's chute yard, in the warehouse (a route's stock), on the Willys or on a route's vehicle.
    const held = (zone.stations[def.id].byBuffer ?? 0) + (zone.zones[def.zone].warehouse[product] ?? 0) + (zone.zones[def.zone].jeep.load?.[product] ?? 0) + Object.entries(zone.routes ?? {}).reduce((n, [id, r]) => n + (ROUTES_BY_ID[id]?.product === product ? r.load ?? 0 : 0), 0);
    // A byproduct burned as fuel (bagazo in the Hornilla) is not counted as used here: it must still sell some.
    if (FUEL_CHILDREN[def.id]?.length) assert.ok(sold > 0, 'what the furnace does not burn is sold');
    else assert.ok(sold + used + held > zMade * 0.98, `with its zone it is used, sold or on hand: ${sold} sold + ${used} used + ${held} held of ${zMade}`);
  });
}

test('late game: the Compostera sells the compost the Finca does not spend (v5.16.3)', () => {
  const s = lateGame(STATIONS_BY_ID.wetmill, true);
  assert.ok(s.stations.composter, 'the Finca has its Compostera');
  assert.ok(s.stats.sold.compost > s.stats.produced.compost * 0.2, `${s.stats.sold.compost} of ${s.stats.produced.compost}`);
});
