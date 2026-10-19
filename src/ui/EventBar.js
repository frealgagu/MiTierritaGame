// Barra del tablero de un evento (v2.0): el objetivo, el reloj del evento, las medallas y las compras
// del evento (cada una pide la anterior).
import { formatNumber } from '../core/format.js';
import { buyAction, boardObjective, eventDef, eventProgress, medalFor, quoteAction } from '../sim/events.js';
import { goalText } from '../sim/goals.js';
import { MEDALS } from '../data/events.js';
import { setFitted } from './fit.js';
import { toast } from './toast.js';

export const formatClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class EventBar {
  constructor(onExit) {
    this.el = document.getElementById('event-bar');
    this.actions = document.getElementById('event-actions');
    this.game = null;
    document.getElementById('event-exit').addEventListener('click', () => onExit());
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

  // game: el Game del tablero, o null para esconder la barra.
  show(game) {
    this.game = game;
    this.el.hidden = !game;
    this.drawn = null;
    if (game) this.paint();
  }

  paint() {
    const board = this.game.state;
    const def = eventDef(board);
    const obj = boardObjective(board);
    const done = Math.min(eventProgress(board), obj.amount);
    setFitted(document.getElementById('event-title'), `${def.icon} ${def.name} · año ${board.event.year}`);
    const medal = MEDALS[medalFor(obj, board.playTime)];
    document.getElementById('event-clock').textContent = `${medal.icon} ⏱ ${formatClock(board.playTime)}`;
    setFitted(document.getElementById('event-goal'), goalText({ type: obj.kind, amount: obj.amount, product: obj.product }));
    document.getElementById('event-count').textContent = `${formatNumber(Math.floor(done))} / ${formatNumber(obj.amount)}`;
    document.getElementById('event-fill').style.width = `${(100 * done) / obj.amount}%`;
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
