// Barra del tablero de un evento (v2.0): el objetivo, el reloj del evento, las medallas y las compras
// del evento (cada una pide la anterior).
import { formatNumber } from '../core/format.js';
import { allActionsBought, buyAction, boardObjective, EVENT_CLOCK_MAX, eventClock, eventDef, eventHandicaps, eventItems, eventProgress, handicapText, medalFor, quoteAction } from '../sim/events.js';
import { EVENT_ACTIONS_BY_ID, MEDALS } from '../data/events.js';
import { PRODUCTS } from '../data/products.js';
import { setFitted } from './fit.js';
import { toast } from './toast.js';
import { listJoin, t } from '../i18n/index.js';

// Pasado 999:59, el reloj del evento dice ∞ (v4.1; antes el de arriba seguía a 1000:00).
export const formatClock = (s) => (s >= EVENT_CLOCK_MAX ? '∞' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

// «Vende 120 🧀 queso, 60 🧈 mantequilla y 40 🍮 arequipe».
export function objectiveText(obj) {
  const parts = Object.entries(obj.items).map(([id, n]) => `${formatNumber(n)} ${PRODUCTS[id].icon} ${PRODUCTS[id].name.toLowerCase()}`);
  return obj.kind === 'sold' ? t('Vende {list}', { list: listJoin(parts) }) : t('Produce {list}', { list: listJoin(parts) });
}

const FOLD_KEY = 'mitierrita-eventbar-folded';

export class EventBar {
  // onPause: volver al mapa, con el evento en pausa o corriendo por detrás según el menú (v3.67.4).
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
    // Recoger y abrir el tablero (v4.4.7): en teléfonos pequeños tapaba las estaciones. Se recuerda en el teléfono.
    this.foldBtn = document.getElementById('event-fold');
    let folded = false;
    try {
      folded = localStorage.getItem(FOLD_KEY) === '1';
    } catch {
      /* sin almacenamiento: abierto */
    }
    this.setFolded(folded);
    this.foldBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setFolded(!this.folded);
    });
    // Recogido, toda la fila del título lo abre (un blanco más grande que el botón).
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
      /* sin almacenamiento */
    }
  }

  // Señala una compra (la mejora recomendada del tablero) y dice qué hace.
  highlight(id) {
    const a = EVENT_ACTIONS_BY_ID[id];
    const btn = this.actions.querySelector(`[data-action="${id}"]`);
    if (!a || !btn) return;
    if (this.folded) this.setFolded(false); // recogido, la compra señalada no se vería
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
    this.paintExit();
    if (game) this.paint();
  }

  // ⏸️ Pausar o 🚪 Salir, según la opción del menú.
  paintExit() {
    this.pauseBtn.textContent = this.exitMode() === 'leave' ? t('🚪 Salir') : t('⏸️ Pausar');
  }

  paint() {
    const board = this.game.state;
    const def = eventDef(board);
    const obj = boardObjective(board);
    const items = eventItems(board);
    setFitted(document.getElementById('event-title'), `${def.icon} ${def.name}`);
    // Con el objetivo cumplido, la medalla queda fija con su tiempo (v3.7): falta comprar las mejoras.
    const secured = board.event.medal;
    // El reloj llega hasta 999:59 y ahí se queda (v3.67.4); desde ahí dice ∞ (v4.1).
    const medal = MEDALS[secured ?? medalFor(obj, eventClock(board))];
    document.getElementById('event-clock').textContent = `${medal.icon} ⏱ ${formatClock(secured ? board.event.time : eventClock(board))}`;
    // Ganado (v3.30): se sigue mirando (y se puede pausar); ya no se reinicia. Se cierra con «Terminar».
    const done = Boolean(board.event.done);
    this.restartBtn.disabled = done;
    this.endBtn.textContent = done ? t('🏁 Terminar evento') : t('🏁 Terminar');
    const missing = def.actions.filter((a) => !board.research.includes(a.id)).map((a) => a.name);
    const goal = done
      ? t('🏁 ¡Ganado con {medal}!', { medal: `${medal.icon} ${medal.name}` })
      : secured && !allActionsBought(board) ? t('✅ {icon} asegurada. Para terminar, compra: {list}', { icon: medal.icon, list: missing.join(', ') }) : obj.kind === 'sold' ? t('Vende:') : t('Produce:');
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
    if (hs.length) setFitted(hEl, `${def.icon} ${[...new Set(hs.map((h) => handicapText(board, h, true)))].join(' · ')}${def.blame ? ` ${t('por {what}', { what: def.blame })}` : ''}`);
    setFitted(document.getElementById('event-medals'), t('🥇 hasta {gold} · 🥈 hasta {silver} · 🥉 después', { gold: formatClock(obj.medals[0]), silver: formatClock(obj.medals[1]) }));
    // Las compras: se redibujan solo si cambió algo (para no perder el toque a mitad de un clic).
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

  update() {
    if (this.game) this.paint();
  }
}
