import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import {
  MAX_LEVEL,
  MILESTONES,
  dispatchCapacity,
  dispatchRate,
  nextMilestone,
  stationBufferCap,
  stationOutputRate,
  warehouseCapacity,
} from '../sim/rules.js';
import { sumValues } from '../sim/state.js';
import { inTransit } from '../sim/transport.js';

const MODES = [
  { key: 1, label: '×1' },
  { key: 10, label: '×10' },
  { key: 'max', label: 'Máx' },
];

// Panel inferior con la información y las mejoras de la estación seleccionada.
// Se construye al abrir y luego solo se actualizan los textos (para no perder clics).
export class StationPanel {
  constructor(game, onClose) {
    this.game = game;
    this.onClose = onClose;
    this.el = document.getElementById('panel');
    this.id = null;
    this.mode = 1;
    this.refs = {};
  }

  open(id) {
    this.id = id;
    this.el.hidden = false;
    if (id === 'farm') this.renderUpgradable(farmInfo());
    else if (id === 'dispatch') this.renderUpgradable(dispatchInfo());
    else this.renderLocked(STATIONS_BY_ID[id]);
    this.update();
  }

  close() {
    this.id = null;
    this.el.hidden = true;
    this.onClose();
  }

  head(icon, title, subtitle, badge = '') {
    return `
      <div class="panel-head">
        <div class="panel-icon">${icon}</div>
        <div class="panel-title"><h3>${title}</h3><p>${subtitle}</p></div>
        ${badge}
        <button class="close-btn" data-close aria-label="Cerrar">✕</button>
      </div>`;
  }

  renderUpgradable(info) {
    this.info = info;
    this.el.innerHTML = `
      ${this.head(info.icon, info.title, info.subtitle, '<span class="level-badge" data-ref="level"></span>')}
      <div class="stats">
        ${info.rows.map((r) => `<div class="stat"><span>${r.label}</span><b><span data-ref="${r.key}"></span> <span class="next" data-ref="${r.key}Next"></span></b></div>`).join('')}
        <div class="status-line" data-ref="status"></div>
      </div>
      <div class="milestone">
        <span data-ref="milestoneText"></span>
        <div class="bar"><div data-ref="milestoneBar"></div></div>
      </div>
      <div class="modes">${MODES.map((m) => `<button class="mode" data-mode="${m.key}">${m.label}</button>`).join('')}</div>
      <button class="btn buy" data-buy><span data-ref="buyLabel"></span><span data-ref="buyCost"></span></button>
    `;
    this.collectRefs();
    this.el.querySelector('[data-buy]').addEventListener('click', () => {
      this.game.buy(this.id, this.mode);
      this.update();
    });
    for (const btn of this.el.querySelectorAll('[data-mode]')) {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode === 'max' ? 'max' : Number(btn.dataset.mode);
        this.update();
      });
    }
  }

  renderLocked(def) {
    this.info = null;
    const recipe = (obj) => Object.entries(obj).map(([id, n]) => `${n} ${PRODUCTS[id].icon}`).join(' + ');
    const [outId] = Object.keys(def.out);
    this.el.innerHTML = `
      ${this.head(def.icon, def.name, 'Próxima estación de la cadena')}
      <div class="recipe">${recipe(def.in)} <span>➜</span> ${recipe(def.out)} ${def.by ? `<small>(+ ${recipe(def.by)})</small>` : ''}</div>
      <div class="stats">
        <div class="stat"><span>Produce</span><b>${PRODUCTS[outId].name}</b></div>
        <div class="stat"><span>Valor por unidad</span><b>${PRODUCTS[outId].value} 💰</b></div>
        <div class="stat"><span>Desbloqueo</span><b>${formatNumber(def.unlockCost)} 💰</b></div>
      </div>
      <p class="soon">🚧 Llega en la v${def.release}</p>
    `;
    this.collectRefs();
  }

  collectRefs() {
    this.refs = {};
    for (const el of this.el.querySelectorAll('[data-ref]')) this.refs[el.dataset.ref] = el;
    this.el.querySelector('[data-close]').addEventListener('click', () => this.close());
  }

  update() {
    if (!this.id || !this.info) return;
    const state = this.game.state;
    const info = this.info;
    const level = info.level(state);
    const q = this.game.quote(this.id, this.mode);
    const after = level + Math.max(q.levels, 1);
    const r = this.refs;

    r.level.textContent = `Nv ${level}`;
    for (const row of info.rows) {
      r[row.key].textContent = row.value(state, level);
      r[`${row.key}Next`].textContent = row.next && level < MAX_LEVEL ? `→ ${row.next(after)}` : '';
    }
    const status = info.status(state);
    r.status.textContent = status.text;
    r.status.classList.toggle('bad', status.bad);

    const next = nextMilestone(level);
    if (next) {
      const prev = [...MILESTONES].reverse().find((m) => m <= level) ?? 1;
      r.milestoneText.textContent = `Próximo hito: nivel ${next} (×2 ${info.milestoneWhat})`;
      r.milestoneBar.style.width = `${((level - prev) / (next - prev)) * 100}%`;
    } else {
      r.milestoneText.textContent = '¡Todos los hitos conseguidos!';
      r.milestoneBar.style.width = '100%';
    }

    for (const btn of this.el.querySelectorAll('[data-mode]')) btn.classList.toggle('active', String(this.mode) === btn.dataset.mode);
    const buy = this.el.querySelector('[data-buy]');
    buy.disabled = !q.affordable;
    if (q.maxed) {
      r.buyLabel.textContent = 'Nivel máximo';
      r.buyCost.textContent = '';
    } else {
      r.buyLabel.textContent = `Mejorar +${Math.max(q.levels, 1)}`;
      r.buyCost.textContent = `💰 ${formatNumber(q.cost)}`;
    }
  }
}

function farmInfo() {
  const def = STATIONS_BY_ID.farm;
  return {
    icon: def.icon,
    title: def.name,
    subtitle: 'Fuente ilimitada de cerezas de café',
    milestoneWhat: 'velocidad',
    level: (s) => s.stations.farm.level,
    rows: [
      { key: 'rate', label: 'Producción', value: (s, l) => `${formatRate(stationOutputRate(def, l))} 🍒/s`, next: (l) => formatRate(stationOutputRate(def, l)) },
      { key: 'buffer', label: 'Patio', value: (s, l) => `${formatNumber(s.stations.farm.buffer)} / ${formatNumber(stationBufferCap(def, l))} 🍒` },
      { key: 'value', label: 'Precio de venta', value: () => `${PRODUCTS.cherry.value} 💰 por cereza` },
    ],
    status: (s) =>
      s.stations.farm.blocked
        ? { text: '⛔ Patio lleno: la bodega no tiene espacio. Mejora el Despacho.', bad: true }
        : { text: '✅ Cosechando. Las mulas llevan las cerezas a la bodega.', bad: false },
  };
}

function dispatchInfo() {
  return {
    icon: DISPATCH.icon,
    title: DISPATCH.name,
    subtitle: 'El Willys vende en el pueblo lo que llega a la bodega',
    milestoneWhat: 'carga',
    level: (s) => s.dispatch.level,
    rows: [
      { key: 'cap', label: 'Carga por viaje', value: (s, l) => `${formatNumber(dispatchCapacity(l))}`, next: (l) => formatNumber(dispatchCapacity(l)) },
      { key: 'rate', label: 'Ritmo de venta', value: (s, l) => `${formatRate(dispatchRate(l))} u/s`, next: (l) => formatRate(dispatchRate(l)) },
      { key: 'stock', label: 'Bodega', value: (s, l) => `${formatNumber(sumValues(s.warehouse))} / ${formatNumber(warehouseCapacity(l))}` },
      { key: 'trip', label: 'Viaje (ida y vuelta)', value: () => `${DISPATCH.tripTime} s` },
    ],
    status: (s) => {
      const full = sumValues(s.warehouse) + inTransit(s) >= warehouseCapacity(s.dispatch.level);
      if (full) return { text: '⛔ Bodega llena: el Willys no da abasto.', bad: true };
      const phase = { idle: '🅿️ El Willys está cargando en la bodega.', out: '🚙 El Willys va camino al pueblo.', back: '↩️ El Willys vuelve a la finca.' };
      return { text: phase[s.jeep.phase], bad: false };
    },
  };
}
