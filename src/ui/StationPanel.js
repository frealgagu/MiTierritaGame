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
  stationInputCap,
  stationOutputRate,
  muleCount,
  muleLoad,
  transportCapacity,
  warehouseCapacity,
} from '../sim/rules.js';
import { sumValues } from '../sim/state.js';
import { busyMules, inTransit, legTime } from '../sim/transport.js';
import { analyzeChain } from '../sim/analysis.js';
import { CHAIN, nextStation } from '../sim/chain.js';

const MODES = [
  { key: 1, label: '×1' },
  { key: 10, label: '×10' },
  { key: 'max', label: 'Máx' },
];

const recipe = (obj) => Object.entries(obj).map(([id, n]) => `${n} ${PRODUCTS[id].icon}`).join(' + ');
const nameOf = (id) => (id === 'dispatch' ? DISPATCH.name : id === 'warehouse' ? 'la bodega' : STATIONS_BY_ID[id].name);

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
    this.built = null;
  }

  // tab: 'station' | 'transport'
  open(id, tab = 'station') {
    this.id = id;
    this.tab = tab;
    this.el.hidden = false;
    this.render();
    this.update();
  }

  render() {
    const id = this.id;
    this.built = id === 'dispatch' || Boolean(this.game.state.stations[id]);
    if (id === 'dispatch') this.renderUpgradable(dispatchInfo());
    else if (this.built) this.renderUpgradable(this.tab === 'transport' ? transportInfo(id) : stationInfo(id));
    else this.renderLocked(STATIONS_BY_ID[id]);
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
      ${
        info.tabs
          ? `<div class="tabs">
              <button class="tab ${this.tab === 'station' ? 'active' : ''}" data-tab="station">⚙️ Estación</button>
              <button class="tab ${this.tab === 'transport' ? 'active' : ''}" data-tab="transport">🐴 Arrieros</button>
            </div>`
          : ''
      }
      ${info.recipe ? `<div class="recipe small">${info.recipe}</div>` : ''}
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
      this.game.buy(info.upgradeId, this.mode);
      this.update();
    });
    for (const btn of this.el.querySelectorAll('[data-tab]')) {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab;
        this.render();
        this.update();
      });
    }
    for (const btn of this.el.querySelectorAll('[data-mode]')) {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode === 'max' ? 'max' : Number(btn.dataset.mode);
        this.update();
      });
    }
  }

  renderLocked(def) {
    this.info = null;
    const [outId] = Object.keys(def.out);
    const [inId] = Object.keys(def.in);
    const gain = PRODUCTS[outId].value * def.out[outId] - PRODUCTS[inId].value * def.in[inId];
    this.el.innerHTML = `
      ${this.head(def.icon, def.name, 'Siguiente paso de la cadena')}
      <div class="recipe">${recipe(def.in)} <span>➜</span> ${recipe(def.out)}</div>
      <div class="stats">
        <div class="stat"><span>Produce</span><b>${PRODUCTS[outId].name}</b></div>
        <div class="stat"><span>Precio de venta</span><b>${PRODUCTS[outId].value} 💰 por unidad</b></div>
        <div class="stat"><span>Ganancia por proceso</span><b class="next">+${gain} 💰</b></div>
        <div class="status-line" data-ref="status"></div>
      </div>
      <button class="btn buy" data-unlock><span>Construir</span><span data-ref="unlockCost"></span></button>
    `;
    this.collectRefs();
    this.el.querySelector('[data-unlock]').addEventListener('click', () => {
      if (this.game.unlock(this.id)) this.render();
      this.update();
    });
  }

  collectRefs() {
    this.refs = {};
    for (const el of this.el.querySelectorAll('[data-ref]')) this.refs[el.dataset.ref] = el;
    this.el.querySelector('[data-close]').addEventListener('click', () => this.close());
  }

  update() {
    if (!this.id) return;
    const state = this.game.state;
    const r = this.refs;
    // Si la estación se construyó por otra vía, rehacer el panel.
    const built = this.id === 'dispatch' || Boolean(state.stations[this.id]);
    if (built !== this.built) this.render();

    if (!this.info) {
      const q = this.game.quoteUnlock(this.id);
      r.unlockCost.textContent = `💰 ${formatNumber(q.cost)}`;
      this.el.querySelector('[data-unlock]').disabled = !q.ok;
      r.status.textContent =
        q.reason === 'order' ? `🔒 Primero construye: ${nameOf(q.previous)}.` : q.ok ? '✅ ¡Listo para construir!' : `💰 Te faltan ${formatNumber(q.cost - state.coins)} monedas.`;
      r.status.classList.toggle('bad', q.reason === 'order');
      return;
    }

    const info = this.info;
    const level = info.level(state);
    const q = this.game.quote(info.upgradeId, this.mode);
    const after = level + Math.max(q.levels, 1);

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

function stationInfo(id) {
  const def = STATIONS_BY_ID[id];
  const [outId] = Object.keys(def.out);
  const out = PRODUCTS[outId];
  const inId = def.in ? Object.keys(def.in)[0] : null;
  const rows = [
    { key: 'rate', label: 'Producción', value: (s, l) => `${formatRate(stationOutputRate(def, l))} ${out.icon}/s`, next: (l) => formatRate(stationOutputRate(def, l)) },
  ];
  if (inId) {
    rows.push({ key: 'input', label: 'Entrada', value: (s, l) => `${formatNumber(s.stations[id].input)} / ${formatNumber(stationInputCap(def, l))} ${PRODUCTS[inId].icon}` });
  }
  rows.push(
    { key: 'buffer', label: 'Patio (por enviar)', value: (s, l) => `${formatNumber(s.stations[id].buffer)} / ${formatNumber(stationBufferCap(def, l))} ${out.icon}` },
    { key: 'value', label: 'Precio de venta', value: () => `${out.value} 💰 por ${out.name.toLowerCase()}` },
  );
  return {
    icon: def.icon,
    title: def.name,
    subtitle: inId ? `Convierte ${PRODUCTS[inId].name.toLowerCase()} en ${out.name.toLowerCase()}` : 'Fuente ilimitada de cerezas de café',
    recipe: inId ? `${recipe(def.in)} <span>➜</span> ${recipe(def.out)}` : null,
    milestoneWhat: 'velocidad',
    upgradeId: id,
    tabs: true,
    level: (s) => s.stations[id].level,
    rows,
    status: (s) => stationStatus(s, id),
  };
}

function transportInfo(id) {
  const def = STATIONS_BY_ID[id];
  const out = PRODUCTS[Object.keys(def.out)[0]];
  const dest = (s) => nextStation(s, id) ?? 'warehouse';
  const roundTrip = (s) => 2 * legTime(id, dest(s));
  return {
    icon: '🐴',
    title: `Arrieros · ${def.name}`,
    subtitle: 'Llevan el producto a la siguiente estación y vuelven',
    milestoneWhat: 'carga',
    upgradeId: `${id}:transport`,
    tabs: true,
    level: (s) => s.stations[id].transport.level,
    rows: [
      { key: 'mules', label: 'Mulas', value: (s, l) => `${muleCount(l)} (${busyMules(s, id)} en camino)`, next: (l) => muleCount(l) },
      { key: 'load', label: 'Carga por mula', value: (s, l) => `${formatNumber(muleLoad(def, l))} ${out.icon}`, next: (l) => formatNumber(muleLoad(def, l)) },
      { key: 'trip', label: 'Viaje (ida y vuelta)', value: (s) => `${formatRate(roundTrip(s))} s hasta ${nameOf(dest(s))}` },
      {
        key: 'cap',
        label: 'Capacidad',
        value: (s, l) => `${formatRate(transportCapacity(def, l, roundTrip(s)))} ${out.icon}/s`,
        next: null,
      },
    ],
    status: (s) => {
      const st = s.stations[id];
      const produce = stationOutputRate(def, st.level);
      const cap = transportCapacity(def, st.transport.level, roundTrip(s));
      if (st.status === 'blocked' && st.waiting === 'mules') return { text: '⛔ Las mulas no dan abasto y el patio se llenó: mejora a los arrieros.', bad: true };
      if (cap < produce) return { text: `⚠️ La estación produce ${formatRate(produce)} ${out.icon}/s y las mulas llevan ${formatRate(cap)}/s.`, bad: true };
      return { text: `✅ Los arrieros llevan todo lo que produce la estación (${formatRate(produce)} ${out.icon}/s).`, bad: false };
    },
  };
}

// Explica en una línea qué le pasa a la estación y qué hacer.
function stationStatus(state, id) {
  const st = state.stations[id];
  const analysis = analyzeChain(state);
  const row = analysis.rows.find((r) => r.id === id);
  const def = STATIONS_BY_ID[id];
  if (st.status === 'blocked') {
    if (st.waiting === 'mules') return { text: '⛔ Patio lleno: las mulas no dan abasto. Mejora a los arrieros (pestaña 🐴).', bad: true };
    return { text: '⛔ Patio lleno: la bodega no tiene espacio. Mejora el Despacho.', bad: true };
  }
  if (row && row.diverted > row.incoming * 0.02) {
    const inIcon = PRODUCTS[Object.keys(def.in)[0]].icon;
    return {
      text: `↪️ Le llegan ${formatRate(row.incoming)} ${inIcon}/s y procesa ${formatRate(row.capacity)}/s. El resto se vende sin procesar: mejóralo.`,
      bad: true,
    };
  }
  if (st.status === 'starved' && st.idle > 3) {
    const prev = CHAIN[CHAIN.indexOf(id) - 1];
    return { text: `⏸️ Esperando producto de: ${nameOf(prev)}. Mejora las estaciones anteriores.`, bad: false };
  }
  const next = nextStation(state, id);
  const dest = next ? nameOf(next) : 'la bodega';
  return { text: `✅ Trabajando. Las mulas llevan el producto a ${dest}.`, bad: false };
}

function dispatchInfo() {
  return {
    icon: DISPATCH.icon,
    title: DISPATCH.name,
    subtitle: 'El Willys vende en el pueblo lo que llega a la bodega',
    milestoneWhat: 'carga',
    upgradeId: 'dispatch',
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
