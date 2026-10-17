// Simula una partida con un jugador automático, zona por zona, y muestra cuándo se cumple cada
// objetivo y cuánto tarda cada zona. Uso: npm run balance -- [horas] [bloque|casual] [--detalle]
//   bloque: elige la compra más rentable y puede subir toda la cadena +1 de una vez (jugador atento)
//   casual: hace caso a la «mejora recomendada», cumple objetivos y ahorra para construir si le faltan menos de 10 min
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade } from '../src/sim/analysis.js';
import { nextToUnlock, zoneOf } from '../src/sim/chain.js';
import { createStationState } from '../src/sim/production.js';
import { activeGoals, goalProgress, goalText } from '../src/sim/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { formatNumber } from '../src/core/format.js';
import { ROUTES } from '../src/data/routes.js';
import { routeActive } from '../src/sim/routes.js';

const hours = Number(process.argv[2] ?? 8);
const style = process.argv[3] ?? 'bloque';
const verbose = process.argv.includes('--detalle');
let dumpAt = process.env.BALANCE_DUMP ? { minute: Number(process.env.BALANCE_DUMP.split(':')[0]), file: process.env.BALANCE_DUMP.split(':').slice(1).join(':') } : null;
const game = new Game();
const s = game.state;
const clone = (x) => JSON.parse(JSON.stringify(x));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const openZones = () => ZONE_LIST.filter((z) => s.zones[z.id].unlocked).map((z) => z.id);
// La zona en juego: la primera abierta sin completar.
const currentZone = () => openZones().find((z) => !s.zones[z].complete) ?? null;
// Ingreso del final de cada cadena (sin los desvíos, como la mejora recomendada): si contara lo que
// se vende desviado, el bot subiría las fuentes al máximo para vender materia prima.
const totalIncome = (st) => openZones().reduce((n, z) => n + analyzeChain(st, z).mainIncome, 0);
const bump = (t, id) => {
  const [sid, part] = id.split(':');
  if (sid === 'dispatch') return t.zones[part].dispatch.level++;
  if (sid === 'route') return t.routes[part].level++;
  (part ? t.stations[sid].transport : t.stations[sid]).level++;
};

// La compra que más 💰/s añade por moneda gastada (sumando todas las zonas), entre las que puede pagar.
function bestOption() {
  const base = totalIncome(s);
  const opts = [];
  const ids = openZones().map((z) => `dispatch:${z}`);
  for (const id of Object.keys(s.stations)) {
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  for (const r of ROUTES) if (routeActive(s, r.id)) ids.push(`route:${r.id}`);
  const consider = (kind, id, cost, mutate) => {
    if (cost > s.coins) return;
    const t = clone(s);
    mutate(t);
    opts.push({ kind, id, cost, gain: totalIncome(t) - base });
  };
  for (const id of ids) {
    // La Compostera se mide de 10 en 10, como en la mejora recomendada.
    const step = STATIONS_BY_ID[id]?.side ? 10 : 1;
    const q = game.quote(id, step);
    if (!q.maxed && q.levels > 0) consider(step > 1 ? 'up10' : 'up', id, q.cost, (t) => { for (let k = 0; k < q.levels; k++) bump(t, id); });
  }
  if (style === 'bloque') {
    for (const z of openZones()) {
      const all = ids.filter((i) => !i.startsWith('dispatch') && !i.startsWith('route') && zoneOf(i.split(':')[0]) === z);
      const cost = all.reduce((n, id) => n + game.quote(id, 1).cost, 0);
      consider('all', all, cost, (t) => all.forEach((id) => bump(t, id)));
    }
  }
  for (const z of openZones()) {
    const next = nextToUnlock(s, z);
    if (next) consider('unlock', next, game.quoteUnlock(next).cost, (t) => (t.stations[next] = createStationState()));
  }
  for (const r of RESEARCH) {
    const q = game.quoteResearch(r.id);
    if (q.reason === 'owned' || q.reason === 'locked' || q.reason === 'zone') continue;
    consider('research', r.id, r.cost, (t) => t.research.push(r.id));
  }
  return opts.filter((o) => o.gain > 0).sort((a, b) => b.gain / b.cost - a.gain / a.cost)[0];
}

const events = [];
const zoneStart = { finca: 0 };
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
game.bus.on('zoneUnlocked', ({ zone }) => {
  zoneStart[zone] = s.playTime;
  events.push(`${mmss(s.playTime)}  🗺️  se abre ${zone}`);
});

for (let step = 0; step < hours * 36000 && currentZone(); step++) {
  game.step(0.1);
  // Guarda la partida en ese minuto (BALANCE_DUMP=minuto:archivo) para estudiarla aparte.
  if (dumpAt && s.playTime >= dumpAt.minute * 60) {
    (await import('node:fs')).writeFileSync(dumpAt.file, JSON.stringify(s));
    dumpAt = null;
  }
  if (verbose && step % 18000 === 0) {
    const lv = Object.entries(s.stations).map(([k, v]) => `${k}:${v.level}/${v.transport.level}`).join(' ');
    events.push(`${mmss(s.playTime)}  📊 ${formatNumber(totalIncome(s))} 💰/s · ${lv} · 💰${formatNumber(s.coins)}`);
  }
  // Decide cada 5 s de juego (más rápido que una persona; con cuatro zonas, cada decisión cuesta).
  if (step % 50) continue;
  const zone = currentZone();
  if (!zone) break;
  for (const g of activeGoals(s, zone)) if (goalProgress(s, g).done) game.claimGoal(g.id);
  // Como una persona: lo que piden los objetivos visibles, en cuanto puede.
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
  // El capataz no sube el ingreso: se compra cuando sobra.
  if (game.quoteResearch('capataz').ok && s.coins > 3 * 10000) game.research('capataz');

  if (style === 'casual') {
    const next = nextToUnlock(s, zone);
    if (next && game.quoteUnlock(next).ok) game.unlock(next);
    // Ahorra si la siguiente estación cuesta menos de 10 minutos de ingresos (como quien sigue los objetivos).
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
  // También ahorra para construir si le falta menos de 5 minutos de ingresos.
  const nextUnlock = nextToUnlock(s, zone);
  const unlockCost = nextUnlock ? game.quoteUnlock(nextUnlock).cost : Infinity;
  if (nextUnlock && game.quoteUnlock(nextUnlock).ok) game.unlock(nextUnlock);
  else if (unlockCost - s.coins < 300 * totalIncome(s)) continue;
  for (let k = 0; k < 30; k++) {
    const o = bestOption();
    if (!o) {
      // Ninguna compra suelta rinde (hay que subir varias a la vez): como una persona, sigue la recomendada.
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

console.log(events.join('\n'));
const zone = currentZone();
if (zone) {
  const pending = activeGoals(s, zone).map((g) => `${goalText(g)} (${formatNumber(goalProgress(s, g).current)}/${formatNumber(goalProgress(s, g).target)})`);
  console.log(`\n⏱️  Sin terminar ${zone} a las ${mmss(s.playTime)}. Objetivos pendientes: ${pending.join(' · ')}`);
}
console.log('');
for (const z of ZONE_LIST) {
  if (!s.zones[z.id].unlocked) continue;
  const done = s.zones[z.id].complete;
  const took = done ? ` → ${mmss(zoneEnd[z.id] - zoneStart[z.id])} en la zona` : '';
  console.log(`${z.icon} ${z.name}: ${done ? `🏁 completada (empezó ${mmss(zoneStart[z.id])}, terminó ${mmss(zoneEnd[z.id])}${took})` : 'sin terminar'}`);
}
console.log(`Ingreso total al final: ${formatNumber(totalIncome(s))} 💰/s`);
