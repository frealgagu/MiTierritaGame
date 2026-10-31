// Barra del tablero de un evento (v2.0): el objetivo, el reloj del evento, las medallas y las compras
// del evento (cada una pide la anterior).
import { formatNumber } from '../core/format.js';
import { allActionsBought, boardRound, buyAction, boardObjective, eventDef, eventHandicaps, eventItems, eventProgress, handicapText, medalFor, quoteAction } from '../sim/events.js';
import { EVENT_ACTIONS_BY_ID, MEDALS } from '../data/events.js';
import { PRODUCTS } from '../data/products.js';
import { setFitted } from './fit.js';
import { toast } from './toast.js';

export const formatClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// «Vende 120 🧀 queso, 60 🧈 mantequilla y 40 🍮 arequipe».
export function objectiveText(obj) {
  const parts = Object.entries(obj.items).map(([id, n]) => `${formatNumber(n)} ${PRODUCTS[id].icon} ${PRODUCTS[id].name.toLowerCase()}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : parts[0];
  return `${obj.kind === 'sold' ? 'Vende' : 'Produce'} ${list}`;
}

export class EventBar {
  // onPause: volver al mapa con el evento en pausa. onRestart / onEnd: reiniciarlo o terminarlo (v3.30).
  constructor(onPause, onRestart, onEnd) {
    this.el = document.getElementById('event-bar');
    this.actions = document.getElementById('event-actions');
    this.game = null;
    this.pauseBtn = document.getElementById('event-exit');
    this.restartBtn = document.getElementById('event-restart');
    this.endBtn = document.getElementById('event-end');
    this.pauseBtn.addEventListener('click', () => onPause());
    this.restartBtn.addEventListener('click', () => onRestart());
    this.endBtn.addEventListener('click', () => onEnd());
    this.actions.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !this.game) return;
      const board = this.game.state;
      const list = eventDef(board).actions;
      const a = list.find((x) => x.id === btn.dataset.action);
      const q = quoteAction(board, a.id);
      const before = list[list.indexOf(a) - 1];
      if (buyAction(board, a.id, this.game.bus)) toast(`${a.icon} ${a.name}: ${a.desc}`, 4500);
      else if (q.reason === 'owned') toast(`${a.icon} ${a.name}: ya está.`, 2500);
      else if (q.reason === 'locked') toast(`${a.icon} ${a.name}: primero, ${before.icon} ${before.name}.`, 3000);
      else toast(`${a.icon} ${a.name} (faltan monedas): ${a.desc}`, 4500);
      this.paint();
    });
  }

  // Señala una compra (la mejora recomendada del tablero) y dice qué hace.
  highlight(id) {
    const a = EVENT_ACTIONS_BY_ID[id];
    const btn = this.actions.querySelector(`[data-action="${id}"]`);
    if (!a || !btn) return;
    btn.classList.remove('flash');
    void btn.offsetWidth; // para que la animación vuelva a empezar
    btn.classList.add('flash');
    toast(`${a.icon} ${a.name} (💰 ${formatNumber(a.cost)}): ${a.desc}`, 4500);
  }

  // game: el Game del tablero, o null para esconder la barra.
  show(game) {
    this.game = game;
    this.el.hidden = !game;
    this.drawn = null;
    this.itemsHtml = null;
    if (game) this.paint();
  }

  paint() {
    const board = this.game.state;
    const def = eventDef(board);
    const obj = boardObjective(board);
    const items = eventItems(board);
    setFitted(document.getElementById('event-title'), `${def.icon} ${def.name} ${boardRound(board)}`);
    // Con el objetivo cumplido, la medalla queda fija con su tiempo (v3.7): falta comprar las mejoras.
    const secured = board.event.medal;
    const medal = MEDALS[secured ?? medalFor(obj, board.playTime)];
    document.getElementById('event-clock').textContent = `${medal.icon} ⏱ ${formatClock(secured ? board.event.time : board.playTime)}`;
    // Ganado (v3.30): se sigue mirando (y se puede pausar); ya no se reinicia. Se cierra con «Terminar».
    const done = Boolean(board.event.done);
    this.restartBtn.disabled = done;
    this.endBtn.textContent = done ? '🏁 Terminar evento' : '🏁 Terminar';
    const missing = def.actions.filter((a) => !board.research.includes(a.id)).map((a) => a.name);
    const goal = done
      ? `🏁 ¡Ganado con ${medal.icon} ${medal.name}!`
      : secured && !allActionsBought(board) ? `✅ ${medal.icon} asegurada. Para terminar, compra: ${missing.join(', ')}` : `${obj.kind === 'sold' ? 'Vende' : 'Produce'}:`;
    setFitted(document.getElementById('event-goal'), goal, 0.6);
    // Un producto por renglón, con cuánto lleva (v3.67: antes en una sola línea y el tercero no se veía).
    // Siempre tres renglones, para que la barra no cambie de alto.
    const rows = items.map((i) => {
      const p = PRODUCTS[i.product];
      const ok = i.have >= i.need;
      return `<li class="${ok ? 'ok' : ''}"><span>${p.icon} ${p.name}</span><b>${ok ? '✓ ' : ''}${formatNumber(Math.floor(Math.min(i.have, i.need)))} / ${formatNumber(i.need)}</b></li>`;
    });
    while (rows.length < 3) rows.push('<li></li>');
    const list = rows.join('');
    if (list !== this.itemsHtml) document.getElementById('event-items').innerHTML = this.itemsHtml = list;
    document.getElementById('event-fill').style.width = `${100 * eventProgress(board)}%`;
    // Lo que frena el evento (v3.12): «🪲 Cafetal al 40 % por la broca».
    const hs = eventHandicaps(board).filter((h) => h.pct < 1);
    const hEl = document.getElementById('event-handicap');
    hEl.hidden = !hs.length;
    if (hs.length) setFitted(hEl, `${def.icon} ${[...new Set(hs.map((h) => handicapText(board, h, true)))].join(' · ')}${def.blame ? ` por ${def.blame}` : ''}`);
    setFitted(document.getElementById('event-medals'), `🥇 hasta ${formatClock(obj.medals[0])} · 🥈 hasta ${formatClock(obj.medals[1])} · 🥉 después`);
    // Las compras: se redibujan solo si cambió algo (para no perder el toque a mitad de un clic).
    const states = def.actions.map((a) => {
      const q = quoteAction(board, a.id);
      return q.ok ? 'ready' : q.reason === 'owned' ? 'owned' : q.reason === 'locked' ? 'locked' : 'wait';
    });
    const key = states.join();
    if (key === this.drawn) return;
    this.drawn = key;
    this.actions.innerHTML = def.actions
      .map((a, k) => `<button class="event-action ${states[k]}" data-action="${a.id}"><b>${a.icon} ${a.name}</b>${states[k] === 'owned' ? '✓ listo' : `💰 ${formatNumber(a.cost)}`}</button>`)
      .join('');
  }

  update() {
    if (this.game) this.paint();
  }
}
