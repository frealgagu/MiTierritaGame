// Simula una partida con un jugador automático, zona por zona, y muestra cuándo se cumple cada
// objetivo y cuánto tarda cada zona. Uso: npm run balance -- [horas] [bloque|casual] [--detalle]
//   bloque: elige la compra más rentable y puede subir toda la cadena +1 de una vez (jugador atento)
//   casual: hace caso a la «mejora recomendada», cumple objetivos y ahorra para construir si le faltan menos de 10 min
// Variables: BALANCE_PROGRESS=1 muestra el avance cada hora de juego; BALANCE_DUMP=minuto:archivo guarda la
// partida en ese minuto (para estudiarla aparte); BALANCE_LOAD=archivo sigue una partida guardada así;
// BALANCE_RESETS=n empieza como tras n reinicios del segundo final (producción ×2ⁿ).
// Tras el Pueblo, los dos bots siguen hasta el segundo final (todas las estaciones al nivel 100).
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

const hours = Number(process.argv[2] ?? 8);
const style = process.argv[3] ?? 'bloque';
const verbose = process.argv.includes('--detalle');
let dumpAt = process.env.BALANCE_DUMP ? { minute: Number(process.env.BALANCE_DUMP.split(':')[0]), file: process.env.BALANCE_DUMP.split(':').slice(1).join(':') } : null;
const game = new Game(process.env.BALANCE_LOAD ? JSON.parse((await import('node:fs')).readFileSync(process.env.BALANCE_LOAD)) : undefined);
const s = game.state;
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const openZones = () => ZONE_LIST.filter((z) => s.zones[z.id].unlocked).map((z) => z.id);
// La zona en juego: la primera abierta sin completar.
const currentZone = () => openZones().find((z) => !s.zones[z].complete) ?? null;
// Ingreso del final de cada cadena (sin los desvíos, como la mejora recomendada): si contara lo que
// se vende desviado, el bot subiría las fuentes al máximo para vender materia prima.
// `memo`: análisis ya hechos para este estado (las zonas comparten los de las rutas entre ellas).
const totalIncome = (st, memo = new Map()) => openZones().reduce((n, z) => n + analyzeChain(st, z, { memo }).mainIncome, 0);
// Sube un nivel en una copia ligera del estado (copia solo lo que toca) y anota qué cambió, para
// reutilizar los análisis de lo demás (ver sim/analysis.js: reusable).
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

// La compra que más 💰/s añade por moneda gastada (sumando todas las zonas), entre las que puede pagar.
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
    // La Compostera se mide de 10 en 10, como en la mejora recomendada.
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
    // Una estación nueva puede abrir una ruta: cambia lo que piden las rutas que la abastecen.
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
      // Una investigación cambia su zona entera (y lo que piden las rutas si acelera una estación).
      touched.zones.add(r.zone);
      touched.all = !r.effect.target;
      for (const x of ROUTES) if (x.stations.includes(r.effect.target)) touched.demand.add(x.id);
    });
  }
  return opts.filter((o) => o.gain > 0).sort((a, b) => b.gain / b.cost - a.gain / a.cost)[0];
}

// Tras completar las seis zonas, como un completista: compra las investigaciones que falten y sube
// siempre lo más atrasado (estaciones, arrieros, rutas y despachos parejos: a igual nivel todo cuadra).
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
  // Guarda la partida en ese minuto (BALANCE_DUMP=minuto:archivo) para estudiarla aparte.
  if (dumpAt && s.playTime >= dumpAt.minute * 60) {
    (await import('node:fs')).writeFileSync(dumpAt.file, JSON.stringify(s));
    dumpAt = null;
  }
  // Progreso cada hora de juego (a stderr), para seguir una simulación larga.
  if (process.env.BALANCE_PROGRESS && step % 36000 === 0) console.error(`⏱️ ${mmss(s.playTime)} · ${currentZone()} · ${formatNumber(totalIncome(s))} 💰/s`);
  if (verbose && step % 18000 === 0) {
    const lv = Object.entries(s.stations).map(([k, v]) => `${k}:${v.level}/${v.transport.level}`).join(' ');
    events.push(`${mmss(s.playTime)}  📊 ${formatNumber(totalIncome(s))} 💰/s · ${lv} · 💰${formatNumber(s.coins)}`);
  }
  // Decide cada 5 s de juego (más rápido que una persona; con cuatro zonas, cada decisión cuesta).
  if (step % 50) continue;
  const zone = currentZone();
  if (!zone) {
    completionist();
    continue;
  }
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
    // Ninguna compra suelta rinde (hay que subir varias a la vez): como una persona, sigue la recomendada.
    // En el Pueblo, que depende de cinco zonas, también si la mejor rinde menos del 1 %: si no, se quedaba
    // comprando migajas en las otras zonas. (En las demás zonas, esa regla lo trababa en el Maizal.)
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
  if (!s.zones[z.id].unlocked) continue;
  const done = s.zones[z.id].complete;
  const took = done ? ` → ${mmss(zoneEnd[z.id] - zoneStart[z.id])} en la zona` : '';
  console.log(`${z.icon} ${z.name}: ${done ? `🏁 completada (empezó ${mmss(zoneStart[z.id])}, terminó ${mmss(zoneEnd[z.id])}${took})` : 'sin terminar'}`);
}
console.log(`Ingreso total al final: ${formatNumber(totalIncome(s))} 💰/s`);
