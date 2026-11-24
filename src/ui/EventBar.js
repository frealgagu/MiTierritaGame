// Event board HUD bar (v2.0): goal, event clock, medals, and event upgrades
// (each requires the previous).
import { formatDuration, formatNumber } from '../core/format.js';
import { FIESTAS_BY_ID } from '../data/fiestas.js';
import { today } from '../sim/fiestas.js';
import { daysBetween } from '../sim/seasonEvents.js';
import { allActionsBought, buyAction, boardObjective, EVENT_CLOCK_MAX, eventClock, eventDef, eventHandicaps, eventItems, eventProgress, handicapText, medalFor, quoteAction } from '../sim/events.js';
import { EVENT_ACTIONS_BY_ID, MEDALS } from '../data/events.js';
import { PRODUCTS } from '../data/products.js';
import { setFitted } from './fit.js';
import { toast } from './toast.js';
import { listJoin, t } from '../i18n/index.js';

// Past 999:59, the event clock displays ∞ (v4.1; previously header kept counting at 1000:00).
export const formatClock = (s) => (s >= EVENT_CLOCK_MAX ? '∞' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

// «Vende 120 🧀 queso, 60 🧈 mantequilla y 40 🍮 arequipe».
export function objectiveText(obj) {
  const parts = Object.entries(obj.items).map(([id, n]) => `${formatNumber(n)} ${PRODUCTS[id].icon} ${PRODUCTS[id].name.toLowerCase()}`);
  return obj.kind === 'sold' ? t('Vende {list}', { list: listJoin(parts) }) : t('Produce {list}', { list: listJoin(parts) });
}

const FOLD_KEY = 'mitierrita-eventbar-folded';

export class EventBar {
  // onPause: return to map, leaving event paused or running in background per menu setting (v3.67.4).
  // onRestart / onEnd: reiniciarlo o terminarlo (v3.30).   exitMode(): 'pause' o 'leave'
  constructor(onPause, onRestart, onEnd, exitMode = () => 'pause') {
    this.exitMode = exitMode;
    this.el = document.getElementById('event-bar');
    this.actions = document.getElementById('event-actions');
    this.game = null;
    this.pauseBtn = document.getElementById('event-exit');
    this.restartBtn = document.getElementById('event-restart');
    this.endBtn = document.getElementById('event-end');
    this.pauseBtn.addEventListener('click', () => onPause());
    this.restartBtn.addEventListener('click', () => onRestart());
    this.endBtn.addEventListener('click', () => onEnd());
    // Collapse and expand the bar (v4.4.7): on small phones it covered stations. Persisted locally.
    this.foldBtn = document.getElementById('event-fold');
    let folded = false;
    try {
      folded = localStorage.getItem(FOLD_KEY) === '1';
    } catch {
      /* storage unavailable: expanded */
    }
    this.setFolded(folded);
    this.foldBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setFolded(!this.folded);
    });
    // When collapsed, the whole title row toggles it open (larger tap target than the button).
    this.el.querySelector('.event-top').addEventListener('click', () => {
      if (this.folded) this.setFolded(false);
    });
    this.actions.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !this.game) return;
      const board = this.game.state;
      const list = eventDef(board).actions;
      const a = list.find((x) => x.id === btn.dataset.action);
      const q = quoteAction(board, a.id);
      const before = list[list.indexOf(a) - 1];
      if (buyAction(board, a.id, this.game.bus)) toast(`${a.icon} ${a.name}: ${a.desc}`, 4500);
      else if (q.reason === 'owned') toast(t('{action}: ya está.', { action: `${a.icon} ${a.name}` }), 2500);
      else if (q.reason === 'locked') toast(t('{action}: primero, {before}.', { action: `${a.icon} ${a.name}`, before: `${before.icon} ${before.name}` }), 3000);
      else toast(t('{action} (faltan monedas): {desc}', { action: `${a.icon} ${a.name}`, desc: a.desc }), 4500);
      this.paint();
    });
  }

  setFolded(folded) {
    this.folded = folded;
    this.el.classList.toggle('folded', folded);
    this.foldBtn.textContent = folded ? '▴' : '▾';
    this.foldBtn.setAttribute('aria-expanded', String(!folded));
    this.foldBtn.setAttribute('aria-label', folded ? t('Abrir el tablero') : t('Recoger el tablero'));
    try {
      localStorage.setItem(FOLD_KEY, folded ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  // Highlights an upgrade (recommended board upgrade) and explains its effect.
  highlight(id) {
    const a = EVENT_ACTIONS_BY_ID[id];
    const btn = this.actions.querySelector(`[data-action="${id}"]`);
    if (!a || !btn) return;
    if (this.folded) this.setFolded(false); // collapsed, highlighted purchase wouldn't be visible
    btn.classList.remove('flash');
    void btn.offsetWidth; // so the animation restarts cleanly
    btn.classList.add('flash');
    toast(`${a.icon} ${a.name} (💰 ${formatNumber(a.cost)}): ${a.desc}`, 4500);
  }

  // game: board Game instance, or null to hide the bar.
  show(game) {
    this.game = game;
    this.el.hidden = !game;
    this.drawn = null;
    this.itemsHtml = null;
    this.paintExit();
    if (game) this.paint();
  }

  // ⏸️ Pause or 🚪 Exit, depending on the menu toggle.
  paintExit() {
    // (v5.19) A season event never pauses.
    const season = Boolean(this.game && eventDef(this.game.state).season);
    this.pauseBtn.textContent = season || this.exitMode() === 'leave' ? t('🚪 Salir') : t('⏸️ Pausar');
  }

  paint() {
    const board = this.game.state;
    const def = eventDef(board);
    if (def.season) return this.paintSeason(board, def);
    const obj = boardObjective(board);
    const items = eventItems(board);
    setFitted(document.getElementById('event-title'), `${def.icon} ${def.name}`);
    // Once goal is met, medal locks in at its timestamp (v3.7): remaining upgrades still needed.
    const secured = board.event.medal;
    // Clock caps at 999:59 and stops there (v3.67.4); beyond that shows ∞ (v4.1).
    const medal = MEDALS[secured ?? medalFor(obj, eventClock(board))];
    document.getElementById('event-clock').textContent = `${medal.icon} ⏱ ${formatClock(secured ? board.event.time : eventClock(board))}`;
    // Won (v3.30): stays inspectable (and can be paused); no longer auto-resets. Closed with «Finish».
    const done = Boolean(board.event.done);
    this.restartBtn.disabled = done;
    this.endBtn.textContent = done ? t('🏁 Terminar evento') : t('🏁 Terminar');
    const missing = def.actions.filter((a) => !board.research.includes(a.id)).map((a) => a.name);
    const goal = done
      ? t('🏁 ¡Ganado con {medal}!', { medal: `${medal.icon} ${medal.name}` })
      : secured && !allActionsBought(board) ? t('✅ {icon} asegurada. Para terminar, compra: {list}', { icon: medal.icon, list: missing.join(', ') }) : obj.kind === 'sold' ? t('Vende:') : t('Produce:');
    setFitted(document.getElementById('event-goal'), goal, 0.6);
    // One product per line, with progress (v3.67: previously single-line clipping the third item).
    // Always three lines, so bar height stays fixed.
    const rows = items.map((i) => {
      const p = PRODUCTS[i.product];
      const ok = i.have >= i.need;
      return `<li class="${ok ? 'ok' : ''}"><span>${p.icon} ${p.name}</span><b>${ok ? '✓ ' : ''}${formatNumber(Math.floor(Math.min(i.have, i.need)))} / ${formatNumber(i.need)}</b></li>`;
    });
    while (rows.length < 3) rows.push('<li></li>');
    const list = rows.join('');
    if (list !== this.itemsHtml) document.getElementById('event-items').innerHTML = this.itemsHtml = list;
    document.getElementById('event-fill').style.width = `${100 * eventProgress(board)}%`;
    // What slows the event (v3.12): «🪲 Cafetal at 40 % due to borer».
    const hs = eventHandicaps(board).filter((h) => h.pct < 1);
    const hEl = document.getElementById('event-handicap');
    hEl.hidden = !hs.length;
    if (hs.length) setFitted(hEl, `${def.icon} ${[...new Set(hs.map((h) => handicapText(board, h, true)))].join(' · ')}${def.blame ? ` ${t('por {what}', { what: def.blame })}` : ''}`);
    setFitted(document.getElementById('event-medals'), t('🥇 hasta {gold} · 🥈 hasta {silver} · 🥉 después', { gold: formatClock(obj.medals[0]), silver: formatClock(obj.medals[1]) }));
    // Upgrades: only re-rendered if changed (avoid losing taps mid-click).
    const states = def.actions.map((a) => {
      const q = quoteAction(board, a.id);
      return q.ok ? 'ready' : q.reason === 'owned' ? 'owned' : q.reason === 'locked' ? 'locked' : 'wait';
    });
    const key = states.join();
    if (key === this.drawn) return;
    this.drawn = key;
    this.actions.innerHTML = def.actions
      .map((a, k) => `<button class="event-action ${states[k]}" data-action="${a.id}"><b>${a.icon} ${a.name}</b>${states[k] === 'owned' ? t('✓ listo') : `💰 ${formatNumber(a.cost)}`}</button>`)
      .join('');
  }

  // (v5.19) A season event (sim/seasonEvents.js): no medals, upgrades or handicap; the clock, the objective, how long
  // it will take at this pace, its prize and the days it has left.
  paintSeason(board, def) {
    const items = eventItems(board);
    const done = Boolean(board.event.done);
    setFitted(document.getElementById('event-title'), `${def.icon} ${def.name}`);
    document.getElementById('event-clock').textContent = `⏱ ${formatClock(done ? board.event.time : eventClock(board))}`;
    this.restartBtn.disabled = done;
    this.endBtn.textContent = done ? t('🏁 Terminar evento') : t('🏁 Terminar');
    setFitted(document.getElementById('event-goal'), done ? t('🏁 ¡Objetivo cumplido!') : t('Produce:'), 0.6);
    const rows = items.map((i) => {
      const p = PRODUCTS[i.product];
      const ok = i.have >= i.need;
      return `<li class="${ok ? 'ok' : ''}"><span>${p.icon} ${p.name}</span><b>${ok ? '✓ ' : ''}${formatNumber(Math.floor(Math.min(i.have, i.need)))} / ${formatNumber(i.need)}</b></li>`;
    });
    while (rows.length < 3) rows.push('<li></li>');
    const list = rows.join('');
    if (list !== this.itemsHtml) document.getElementById('event-items').innerHTML = this.itemsHtml = list;
    document.getElementById('event-fill').style.width = `${100 * eventProgress(board)}%`;
    document.getElementById('event-handicap').hidden = true;
    // At this pace: from what was made over the last minute of the board's clock.
    const have = items.reduce((n, i) => n + Math.min(i.have, i.need), 0);
    const need = items.reduce((n, i) => n + i.need, 0);
    const now = board.playTime;
    if (this.paceBoard !== board) {
      this.paceBoard = board;
      this.pace = [];
    }
    if (!this.pace.length || now - this.pace.at(-1)[0] >= 1) this.pace.push([now, have]);
    while (this.pace.length > 2 && now - this.pace[0][0] > 60) this.pace.shift();
    const [t0, h0] = this.pace[0];
    const rate = now - t0 >= 5 ? (have - h0) / (now - t0) : 0;
    const fiesta = FIESTAS_BY_ID[board.event.season.fiesta];
    const [y, m, d] = board.event.season.until.split('-').map(Number);
    const left = Math.max(0, daysBetween(today(), new Date(y, m - 1, d)) + 1);
    const pace = done ? '' : rate > 0 ? t('a este ritmo, {time}', { time: formatDuration((need - have) / rate) }) : t('mejora las estaciones para avanzar');
    const prize = !board.event.season.prize ? t('lámina ya ganada') : t('premio: lámina {icon}', { icon: fiesta.icon });
    setFitted(document.getElementById('event-medals'), [pace, prize, done ? '' : t('quedan {n} días', { n: left })].filter(Boolean).join(' · '));
    if (this.drawn !== 'season') {
      this.drawn = 'season';
      this.actions.innerHTML = '';
    }
  }

  update() {
    if (this.game) this.paint();
  }
}
