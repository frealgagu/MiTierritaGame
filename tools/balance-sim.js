// Simula una partida completa de la Zona 1 con un jugador automático y muestra cuándo
// se cumple cada objetivo. Uso: npm run balance -- [horas] [bloque|estacion]
//   bloque:   puede subir toda la cadena +1 nivel de una vez (jugador atento)
//   casual:   hace caso a la «mejora recomendada», cumple objetivos y ahorra para construir si le queda cerca
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade } from '../src/sim/analysis.js';
import { nextToUnlock } from '../src/sim/chain.js';
import { createStationState } from '../src/sim/production.js';
import { activeGoals, goalProgress, goalText } from '../src/sim/goals.js';
import { RESEARCH } from '../src/data/research.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { formatNumber } from '../src/core/format.js';

const hours = Number(process.argv[2] ?? 4);
const style = process.argv[3] ?? 'bloque';
const game = new Game();
const s = game.state;
const clone = (x) => JSON.parse(JSON.stringify(x));
const bump = (t, id) => {
  if (id === 'dispatch') return t.dispatch.level++;
  const [sid, part] = id.split(':');
  (part ? t.stations[sid].transport : t.stations[sid]).level++;
};
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// La compra que más 💰/s añade por moneda gastada, entre las que puede pagar.
function bestOption() {
  const base = analyzeChain(s).income;
  const opts = [];
  const ids = ['dispatch'];
  for (const id of Object.keys(s.stations)) {
    ids.push(id);
    if (!STATIONS_BY_ID[id].side) ids.push(`${id}:transport`);
  }
  const consider = (kind, id, cost, mutate) => {
    const t = clone(s);
    mutate(t);
    opts.push({ kind, id, cost, gain: analyzeChain(t).income - base });
  };
  for (const id of ids) {
    const q = game.quote(id, 1);
    if (!q.maxed) consider('up', id, q.cost, (t) => bump(t, id));
  }
  if (style === 'bloque') {
    const all = ids.filter((i) => i !== 'dispatch');
    const cost = all.reduce((n, id) => n + game.quote(id, 1).cost, 0);
    consider('all', all, cost, (t) => all.forEach((id) => bump(t, id)));
  }
  const next = nextToUnlock(s);
  if (next) consider('unlock', next, game.quoteUnlock(next).cost, (t) => (t.stations[next] = createStationState()));
  for (const r of RESEARCH) {
    const q = game.quoteResearch(r.id);
    if (q.reason === 'owned' || q.reason === 'locked') continue;
    consider('research', r.id, r.cost, (t) => t.research.push(r.id));
  }
  // Entre lo que ya puede pagar, lo más rentable (no ahorra para cosas caras).
  return opts.filter((o) => o.cost <= s.coins && o.gain > 0).sort((a, b) => b.gain / b.cost - a.gain / a.cost)[0];
}

const events = [];
game.bus.on('goalClaimed', ({ goal }) => events.push(`${mmss(s.playTime)}  ✅ ${goalText(goal)}  (+${formatNumber(goal.reward)} 💰)`));
game.bus.on('unlocked', ({ id }) => events.push(`${mmss(s.playTime)}  🏗️  construye ${id}`));
game.bus.on('research', ({ id }) => events.push(`${mmss(s.playTime)}  🔬 investiga ${id}`));

const verbose = process.argv.includes('--detalle');
for (let step = 0; step < hours * 36000 && !s.zoneComplete; step++) {
  game.step(0.1);
  if (verbose && step % 18000 === 0) {
    const a = analyzeChain(s);
    const lv = Object.entries(s.stations).map(([k, v]) => `${k}:${v.level}/${v.transport.level}`).join(' ');
    events.push(`${mmss(s.playTime)}  📊 ${formatNumber(a.income)} 💰/s · ${lv} · despacho:${s.dispatch.level} · cuello:${a.bottleneck} · 💰${formatNumber(s.coins)}`);
  }
  if (step % 10) continue;
  for (const g of activeGoals(s)) if (goalProgress(s, g).done) game.claimGoal(g.id);
  // Como una persona: si un objetivo visible pide construir o investigar algo, lo hace en cuanto puede.
  for (const g of activeGoals(s)) {
    if (g.type === 'research' && game.quoteResearch(g.id).ok) game.research(g.id);
    if (g.type === 'unlock' && game.quoteUnlock(g.station).ok) game.unlock(g.station);
  }
  // El capataz no sube el ingreso: se compra cuando sobra.
  if (game.quoteResearch('capataz').ok && s.coins > 3 * 10000) game.research('capataz');
  // Objetivos de subir niveles: los dos jugadores los atienden.
  for (const g of activeGoals(s)) {
    if (goalProgress(s, g).done) continue;
    if (g.type === 'level') game.buy(g.target, 1);
    if (g.type === 'allLevels') {
      const lowest = Object.entries(s.stations).filter(([id]) => !STATIONS_BY_ID[id].side).sort((a, b) => a[1].level - b[1].level)[0][0];
      game.buy(lowest, 1);
    }
  }
  if (style === 'casual') {
    const next = nextToUnlock(s);
    if (next && game.quoteUnlock(next).ok) game.unlock(next);
    // Ahorra si la siguiente estación cuesta menos de 2 minutos de ingresos.
    const saving = next && game.quoteUnlock(next).cost < 120 * Math.max(analyzeChain(s).income, 0.5);
    if (!saving) {
      for (let k = 0; k < 30; k++) {
        const r = recommendUpgrade(s, (id, mode) => game.quote(id, mode));
        if (!r || !game.buy(r.id, 1)) break;
      }
    }
    continue;
  }
  for (let k = 0; k < 30; k++) {
    const o = bestOption();
    if (!o) break;
    if (o.kind === 'unlock') game.unlock(o.id);
    else if (o.kind === 'research') game.research(o.id);
    else if (o.kind === 'all') o.id.forEach((id) => game.buy(id, 1));
    else game.buy(o.id, 1);
  }
}

console.log(events.join('\n'));
if (!s.zoneComplete) console.log('Objetivos pendientes:', activeGoals(s).map((g) => `${goalText(g)} (${formatNumber(goalProgress(s, g).current)}/${formatNumber(goalProgress(s, g).target)})`).join(' · '));
console.log(`\n${s.zoneComplete ? '🏁 Zona completada' : '⏱️  Sin terminar'} en ${mmss(s.playTime)} · ingreso ${formatNumber(analyzeChain(s).income)} 💰/s · bolsas vendidas ${Math.round(s.stats.sold.coffee_bag ?? 0)}`);
