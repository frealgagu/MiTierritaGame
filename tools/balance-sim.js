// Simulates a playthrough with an automated player, zone by zone, and shows when each
// goal is met and how long each zone takes. Usage: npm run balance -- [hours] [bloque|casual] [--detalle]
//   bloque: picks the most profitable purchase and can upgrade the entire chain +1 at once (attentive player)
//   casual: follows the «recommended upgrade», completes goals, and saves up to build if under 10 min away
//   parejo: levels evenly (v5.4, for the special zone): always the lowest station or haulers first, the warehouse
//           only when it can't keep up, research as soon as affordable, and builds the next station when it can
//           (saving up for it if under 10 minutes of income away)
// Env vars: BALANCE_PROGRESS=1 prints progress per game hour; BALANCE_DUMP=minute:file saves the
// game at that minute (for separate study); BALANCE_LOAD=file resumes a game saved that way;
// BALANCE_DETAIL=minutes spaces the --detalle lines; BALANCE_RESETS=n starts as after n second-ending resets (production ×2ⁿ); BALANCE_REGION=region plays that
// region from scratch (v4.5).
// After Pueblo, both bots continue to the second ending (all stations at level 100).
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, reusable } from '../src/sim/analysis.js';
import { nextToUnlock, sourceOf, zoneOf } from '../src/sim/chain.js';
import { createStationState } from '../src/sim/production.js';
import { activeGoals, goalProgress, goalText } from '../src/sim/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { formatNumber } from '../src/core/format.js';
import { ROUTES } from '../src/data/routes.js';
import { routeActive } from '../src/sim/routes.js';
import { createInitialState } from '../src/sim/state.js';

const hours = Number(process.argv[2] ?? 8);
const style = process.argv[3] ?? 'bloque';
const verbose = process.argv.includes('--detalle');
// With --detalle, a 📊 line every BALANCE_DETAIL game minutes (30 by default).
const detailSteps = Math.max(1, Math.round(Number(process.env.BALANCE_DETAIL ?? 30) * 600));
let dumpAt = process.env.BALANCE_DUMP ? { minute: Number(process.env.BALANCE_DUMP.split(':')[0]), file: process.env.BALANCE_DUMP.split(':').slice(1).join(':') } : null;
const game = new Game(process.env.BALANCE_LOAD ? JSON.parse((await import('node:fs')).readFileSync(process.env.BALANCE_LOAD)) : process.env.BALANCE_REGION ? createInitialState(0, process.env.BALANCE_REGION) : undefined);
const s = game.state;
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const openZones = () => ZONE_LIST.filter((z) => s.zones[z.id]?.unlocked).map((z) => z.id);
// The active zone in play: the first opened zone not yet completed.
const currentZone = () => openZones().find((z) => !s.zones[z].complete) ?? null;
// Income at the end of each chain (without diversions, like the recommended upgrade): if bypassed
// sales were counted, the bot would max out sources just to sell raw material.
// `memo`: analyses already computed for this state (zones share those for inter-zone routes).
const totalIncome = (st, memo = new Map()) => openZones().reduce((n, z) => n + analyzeChain(st, z, { memo }).mainIncome, 0);
// Levels up by one in a lightweight copy of state (copies only what is touched) and tracks what changed, to
// reuse analyses for everything else (see sim/analysis.js: reusable).
const bump = (t, id, touched) => {
  const [sid, part] = id.split(':');
  if (sid === 'dispatch') {
    t.zones[part] = { ...t.zones[part], dispatch: { level: t.zones[part].dispatch.level + 1 } };
    touched.zones.add(part);
  } else if (sid === 'route') {
    t.routes[part] = { ...t.routes[part], level: t.routes[part].level + 1 };
    touched.demand.add(part);
  } else {
    const st = { ...t.stations[sid], transport: { ...t.stations[sid].transport } };
    (part ? st.transport : st).level++;
    t.stations[sid] = st;
    touched.zones.add(zoneOf(sid));
    if (!part) for (const r of ROUTES) if (r.stations.includes(sid)) touched.demand.add(r.id);
  }
};
const lightCopy = (st) => ({ ...st, stations: { ...st.stations }, zones: { ...st.zones }, routes: { ...st.routes } });

// The purchase adding the most 💰/s per coin spent (across all zones), among those affordable.
function bestOption() {
  const baseMemo = new Map();
  const base = totalIncome(s, baseMemo);
  const opts = [];
  const ids = openZones().map((z) => `dispatch:${z}`);
  for (const id of Object.keys(s.stations)) {
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  for (const r of ROUTES) if (routeActive(s, r.id)) ids.push(`route:${r.id}`);
  const consider = (kind, id, cost, mutate) => {
    if (cost > s.coins) return;
    const t = lightCopy(s);
    const touched = { zones: new Set(), demand: new Set() };
    mutate(t, touched);
    opts.push({ kind, id, cost, gain: totalIncome(t, reusable(baseMemo, touched)) - base });
  };
  for (const id of ids) {
    // Compostera is measured in steps of 10, as in the recommended upgrade.
    const step = STATIONS_BY_ID[id]?.side ? 10 : 1;
    const q = game.quote(id, step);
    if (!q.maxed && q.levels > 0) consider(step > 1 ? 'up10' : 'up', id, q.cost, (t, touched) => { for (let k = 0; k < q.levels; k++) bump(t, id, touched); });
  }
  if (style === 'bloque') {
    for (const z of openZones()) {
      const all = ids.filter((i) => !i.startsWith('dispatch') && !i.startsWith('route') && zoneOf(i.split(':')[0]) === z);
      const cost = all.reduce((n, id) => n + game.quote(id, 1).cost, 0);
      consider('all', all, cost, (t, touched) => all.forEach((id) => bump(t, id, touched)));
    }
  }
  for (const z of openZones()) {
    const next = nextToUnlock(s, z);
    // A new station can open a route: changes what upstream supplying routes demand.
    if (next) {
      consider('unlock', next, game.quoteUnlock(next).cost, (t, touched) => {
        t.stations[next] = createStationState();
        touched.zones.add(z);
        for (const r of ROUTES) if (r.stations.includes(next)) touched.demand.add(r.id);
      });
    }
  }
  for (const r of RESEARCH) {
    const q = game.quoteResearch(r.id);
    if (q.reason === 'owned' || q.reason === 'locked' || q.reason === 'zone') continue;
    consider('research', r.id, r.cost, (t, touched) => {
      t.research = [...t.research, r.id];
      // A research upgrade changes its entire zone (and route demands if it speeds up a station).
      touched.zones.add(r.zone);
      touched.all = !r.effect.target;
      for (const x of ROUTES) if (x.stations.includes(r.effect.target) || (r.effect.type === 'zoneSpeed' && x.to === r.effect.target)) touched.demand.add(x.id);
    });
  }
  return opts.filter((o) => o.gain > 0).sort((a, b) => b.gain / b.cost - a.gain / a.cost)[0];
}

// After completing all six zones, like a completionist: buys any missing research and always
// upgrades whatever lags behind (stations, haulers, routes, and dispatches even: at equal levels everything balances).
function completionist() {
  for (const r of RESEARCH) if (game.quoteResearch(r.id).ok) game.research(r.id);
  const ids = [...openZones().map((z) => `dispatch:${z}`), ...ROUTES.filter((r) => routeActive(s, r.id)).map((r) => `route:${r.id}`)];
  for (const id of Object.keys(s.stations)) ids.push(id, ...(STATIONS_BY_ID[id].side ? [] : [`${id}:transport`]));
  const level = (id) => {
    const [sid, part] = id.split(':');
    if (sid === 'dispatch') return s.zones[part].dispatch.level;
    if (sid === 'route') return s.routes[part].level;
    return part ? s.stations[sid].transport.level : s.stations[sid].level;
  };
  for (let k = 0; k < 30; k++) {
    const open = ids.filter((id) => !game.quote(id, 1).maxed);
    if (!open.length) break;
    const next = open.reduce((a, b) => (level(b) < level(a) || (level(b) === level(a) && game.quote(b, 1).cost < game.quote(a, 1).cost) ? b : a));
    if (!game.buy(next, 1)) break;
  }
}

// Even player (v5.4): every station and its haulers rise together, lowest first.
function parejo(zone) {
  for (const r of RESEARCH) if (r.zone === zone && game.quoteResearch(r.id).ok) game.research(r.id);
  const next = nextToUnlock(s, zone);
  if (next && game.quoteUnlock(next).ok) game.unlock(next);
  if (next && game.quoteUnlock(next).cost < 600 * Math.max(totalIncome(s), 0.5)) return;
  const ids = Object.keys(s.stations).filter((id) => zoneOf(id) === zone).flatMap((id) => [id, `${id}:transport`]);
  const level = (id) => (id.endsWith(':transport') ? s.stations[id.split(':')[0]].transport.level : s.stations[id].level);
  for (let k = 0; k < 50; k++) {
    // The warehouse first if it can't carry what reaches it.
    const a = analyzeChain(s, zone);
    if (a.dispatch < a.toWarehouse * 1.02 && game.buy(`dispatch:${zone}`, 1)) continue;
    const open = ids.filter((id) => !game.quote(id, 1).maxed);
    if (!open.length) break;
    const pick = open.reduce((x, y) => (level(y) < level(x) || (level(y) === level(x) && game.quote(y, 1).cost < game.quote(x, 1).cost) ? y : x));
    if (!game.buy(pick, 1)) break;
  }
}

const events = [];
const zoneStart = { finca: 0, [currentZone()]: s.playTime };
const zoneEnd = {};
game.bus.on('goalClaimed', ({ goal, zone }) => {
  events.push(`${mmss(s.playTime)}  ✅ ${goalText(goal)}  (+${formatNumber(goal.reward)} 💰)`);
  if (goal.final) {
    zoneEnd[zone] = s.playTime;
    console.error(`🏁 ${zone}: ${mmss(zoneEnd[zone] - zoneStart[zone])} en la zona (total ${mmss(s.playTime)})`);
  }
});
game.bus.on('unlocked', ({ id }) => events.push(`${mmss(s.playTime)}  🏗️  construye ${id}`));
game.bus.on('research', ({ id }) => events.push(`${mmss(s.playTime)}  🔬 investiga ${id}`));
if (process.env.BALANCE_RESETS) s.legacy.resets = Number(process.env.BALANCE_RESETS);
game.bus.on('mastered', () => {
  events.push(`${mmss(s.playTime)}  🏅 segundo final: todo al nivel 100`);
  console.error(`🏅 segundo final: ${mmss(s.playTime - (zoneEnd.pueblo ?? s.playTime))} después del Pueblo (total ${mmss(s.playTime)})`);
});
game.bus.on('zoneUnlocked', ({ zone }) => {
  zoneStart[zone] = s.playTime;
  events.push(`${mmss(s.playTime)}  🗺️  se abre ${zone}`);
});

for (let step = 0; step < hours * 36000 && (currentZone() || !s.mastered); step++) {
  game.step(0.1);
  // Saves the playthrough at that minute (BALANCE_DUMP=minute:file) to study separately.
  if (dumpAt && s.playTime >= dumpAt.minute * 60) {
    (await import('node:fs')).writeFileSync(dumpAt.file, JSON.stringify(s));
    dumpAt = null;
  }
  // Progress every game hour (to stderr), to follow a long simulation.
  if (process.env.BALANCE_PROGRESS && step % 36000 === 0) console.error(`⏱️ ${mmss(s.playTime)} · ${currentZone()} · ${formatNumber(totalIncome(s))} 💰/s`);
  if (verbose && step % detailSteps === 0) {
    const lv = Object.entries(s.stations).map(([k, v]) => `${k}:${v.level}/${v.transport.level}`).join(' ');
    events.push(`${mmss(s.playTime)}  📊 ${formatNumber(totalIncome(s))} 💰/s · ${lv} · 💰${formatNumber(s.coins)}`);
  }
  // Decides every 5 s of game time (faster than a person; with four zones, every decision matters).
  if (step % 50) continue;
  const zone = currentZone();
  if (!zone) {
    completionist();
    continue;
  }
  for (const g of activeGoals(s, zone)) if (goalProgress(s, g).done) game.claimGoal(g.id);
  // Like a person: whatever visible goals ask for, as soon as affordable.
  for (const g of activeGoals(s, zone)) {
    if (goalProgress(s, g).done) continue;
    if (g.type === 'research' && game.quoteResearch(g.research).ok) game.research(g.research);
    if (g.type === 'unlock' && game.quoteUnlock(g.station).ok) game.unlock(g.station);
    if (g.type === 'level') game.buy(g.target, 1);
    if (g.type === 'allLevels') {
      const lowest = Object.entries(s.stations)
        .filter(([id]) => zoneOf(id) === g.zone && !STATIONS_BY_ID[id].side)
        .sort((a, b) => a[1].level - b[1].level)[0][0];
      game.buy(lowest, 1);
    }
  }
  // Foreman doesn't raise income: bought when spare coins allow.
  if (RESEARCH.some((r) => r.id === 'capataz') && game.quoteResearch('capataz').ok && s.coins > 3 * 10000) game.research('capataz');

  if (style === 'parejo') {
    parejo(zone);
    continue;
  }
  if (style === 'casual') {
    const next = nextToUnlock(s, zone);
    if (next && game.quoteUnlock(next).ok) game.unlock(next);
    // Saves up if the next station costs less than 10 minutes of income (like someone following goals).
    const saving = next && game.quoteUnlock(next).cost < 600 * Math.max(totalIncome(s), 0.5);
    if (!saving) {
      for (let k = 0; k < 30; k++) {
        const r = recommendUpgrade(s, (id, mode) => game.quote(id, mode), zone);
        if (!r) break;
        const bought = r.id.startsWith('research:') ? game.research(r.id.split(':')[1]) : game.buy(r.id, 1);
        if (!bought) break;
      }
    }
    continue;
  }
  // Also saves up to build if under 5 minutes of income away.
  const nextUnlock = nextToUnlock(s, zone);
  const unlockCost = nextUnlock ? game.quoteUnlock(nextUnlock).cost : Infinity;
  if (nextUnlock && game.quoteUnlock(nextUnlock).ok) game.unlock(nextUnlock);
  else if (unlockCost - s.coins < 300 * totalIncome(s)) continue;
  for (let k = 0; k < 30; k++) {
    const o = bestOption();
    // No single purchase pays off (several must be upgraded together): like a person, follows the recommendation.
    // In Pueblo, which depends on five zones, also if best gain is under 1 %: otherwise it got stuck
    // buying crumbs in the other zones. (In other zones, that rule stalled it in Maizal.)
    if (!o || (!STATIONS_BY_ID[sourceOf(zone)].infinite && o.gain < totalIncome(s) * 0.01)) {
      const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), zone);
      if (!rec || !(rec.id.startsWith('research:') ? game.research(rec.id.split(':')[1]) : game.buy(rec.id, 1))) break;
      continue;
    }
    if (o.kind === 'unlock') game.unlock(o.id);
    else if (o.kind === 'research') game.research(o.id);
    else if (o.kind === 'all') o.id.forEach((id) => game.buy(id, 1));
    else if (o.kind === 'up10') game.buy(o.id, 10);
    else game.buy(o.id, 1);
  }
}

if (s.mastered) console.log(`🏅 Segundo final a las ${mmss(s.playTime)}`);
console.log(events.join('\n'));
const zone = currentZone();
if (zone) {
  const pending = activeGoals(s, zone).map((g) => `${goalText(g)} (${formatNumber(goalProgress(s, g).current)}/${formatNumber(goalProgress(s, g).target)})`);
  console.log(`\n⏱️  Sin terminar ${zone} a las ${mmss(s.playTime)}. Objetivos pendientes: ${pending.join(' · ')}`);
}
console.log('');
for (const z of ZONE_LIST) {
  if (!s.zones[z.id]?.unlocked) continue;
  const done = s.zones[z.id].complete;
  const took = done ? ` → ${mmss(zoneEnd[z.id] - zoneStart[z.id])} en la zona` : '';
  console.log(`${z.icon} ${z.name}: ${done ? `🏁 completada (empezó ${mmss(zoneStart[z.id])}, terminó ${mmss(zoneEnd[z.id])}${took})` : 'sin terminar'}`);
}
console.log(`Ingreso total al final: ${formatNumber(totalIncome(s))} 💰/s`);
