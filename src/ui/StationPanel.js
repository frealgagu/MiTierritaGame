import { formatAmount, formatNumber, formatRate } from '../core/format.js';
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
  warehouseCapacity,
} from '../sim/rules.js';
import { sumValues } from '../sim/state.js';
import { busyMules, inTransit, legTime, normalDest, productionMult, teamCapacity, teamLoad } from '../sim/transport.js';
import { analyzeChain, expectedCompostValue } from '../sim/analysis.js';
import { COMPOST_VALUE, compostValueBoost, muleSpeedMult, saleValue } from '../sim/modifiers.js';
import { chainOf, nextStation, zoneOf } from '../sim/chain.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { dispatchMult } from '../sim/modifiers.js';

const MODES = [
  { key: 1, label: '×1' },
  { key: 10, label: '×10' },
  { key: 'max', label: 'Máx' },
];

const recipe = (obj) => Object.entries(obj).map(([id, n]) => `${n} ${PRODUCTS[id].icon}`).join(' + ');
const nameOf = (id) => (id.startsWith('dispatch') ? DISPATCH.name : id === 'warehouse' ? 'la bodega' : STATIONS_BY_ID[id].name);

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
    document.body.classList.add('panel-open');
    this.render();
    this.update();
  }

  render() {
    const id = this.id;
    this.built = id.startsWith('dispatch') || Boolean(this.game.state.stations[id]);
    if (id.startsWith('dispatch')) this.renderUpgradable(dispatchInfo(id.split(':')[1] ?? 'finca'));
    else if (this.built) this.renderUpgradable(this.tab === 'transport' ? transportInfo(id) : stationInfo(id));
    else this.renderLocked(STATIONS_BY_ID[id]);
  }

  close() {
    this.id = null;
    this.el.hidden = true;
    document.body.classList.remove('panel-open');
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
    const rows = def.side
      ? `<div class="stat"><span>Produce</span><b>${PRODUCTS[outId].name}</b></div>
         <div class="stat"><span>Efecto</span><b class="next">Todo lo que vende la Finca +${pct(COMPOST_VALUE)} mientras haya compost</b></div>
         <div class="stat"><span>Transporte</span><b>Canaleta directa, sin mulas</b></div>`
      : `<div class="stat"><span>Produce</span><b>${PRODUCTS[outId].name}</b></div>
         <div class="stat"><span>Precio de venta</span><b>${PRODUCTS[outId].value} 💰 por unidad</b></div>
         <div class="stat"><span>Ganancia por proceso</span><b class="next">+${gain} 💰</b></div>`;
    this.el.innerHTML = `
      ${this.head(def.icon, def.name, def.side ? 'Rama opcional: aprovecha la pulpa del Beneficiadero' : 'Siguiente paso de la cadena')}
      <div class="recipe">${recipe(def.in)} <span>➜</span> ${recipe(def.out)}</div>
      <div class="stats">
        ${rows}
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
    const built = this.id.startsWith('dispatch') || Boolean(state.stations[this.id]);
    if (built !== this.built) this.render();

    if (!this.info) {
      const q = this.game.quoteUnlock(this.id);
      r.unlockCost.textContent = `💰 ${formatNumber(q.cost)}`;
      this.el.querySelector('[data-unlock]').disabled = !q.ok;
      r.status.textContent =
        q.reason === 'order' ? `🔒 Primero construye: ${nameOf(q.previous)}.` : q.ok ? '✅ ¡Listo para construir!' : `💰 Te faltan ${formatNumber(Math.ceil(q.cost - state.coins))} monedas.`;
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
      r[`${row.key}Next`].textContent = row.next && level < MAX_LEVEL ? `→ ${row.next(after, state)}` : '';
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
    {
      key: 'rate',
      label: 'Producción',
      value: (s, l) => `${formatRate(stationOutputRate(def, l) * productionMult(s, id))} ${out.icon}/s`,
      next: (l, s) => formatRate(stationOutputRate(def, l) * productionMult(s, id)),
    },
  ];
  if (inId) {
    rows.push({ key: 'input', label: 'Entrada', value: (s, l) => `${formatNumber(s.stations[id].input)} / ${formatNumber(stationInputCap(def, l))} ${PRODUCTS[inId].icon}` });
  }
  if (def.fuel) {
    const fuel = PRODUCTS[def.fuel.product];
    rows.push({
      key: 'fuel',
      label: `${fuel.name} (combustible)`,
      value: (s, l) => `${formatAmount(s.stations[id].fuel ?? 0)} / ${formatNumber(stationInputCap(def, l))} ${fuel.icon} · ${(s.stations[id].fuel ?? 0) > 0 ? `×${def.fuel.boost} 🔥` : 'sin fuego extra'}`,
    });
  }
  if (def.side) {
    rows.push(
      { key: 'buffer', label: 'Compost guardado', value: (s, l) => `${formatNumber(s.stations[id].buffer)} / ${formatNumber(stationBufferCap(def, l))} ${out.icon}` },
      { key: 'effect', label: 'Ventas de la Finca ahora', value: (s) => (compostValueBoost(s) > 1 ? `+${pct(COMPOST_VALUE)} (hay compost)` : 'sin bono (no hay compost)') },
      { key: 'sustain', label: 'Puede sostener', value: (s) => `+${pct(expectedCompostValue(s))} de +${pct(COMPOST_VALUE)}` },
    );
  } else {
    rows.push(
      { key: 'buffer', label: 'Patio (por enviar)', value: (s, l) => `${formatNumber(s.stations[id].buffer)} / ${formatNumber(stationBufferCap(def, l))} ${out.icon}` },
      {
        key: 'value',
        label: 'Precio de venta',
        value: (s) => `${formatAmount(saleValue(s, outId))} 💰 por ${out.name.toLowerCase()}${out.zone === 'finca' && compostValueBoost(s) > 1 ? ' 🪱' : ''}`,
      },
    );
  }
  return {
    icon: def.icon,
    title: def.name,
    subtitle: inId ? `Convierte ${PRODUCTS[inId].name.toLowerCase()} en ${out.name.toLowerCase()}` : `Fuente ilimitada de ${out.name.toLowerCase()}`,
    recipe: inId ? `${recipe(def.in)} <span>➜</span> ${recipe(def.out)}` : null,
    milestoneWhat: 'velocidad',
    upgradeId: id,
    tabs: !def.side,
    level: (s) => s.stations[id].level,
    rows,
    status: (s) => stationStatus(s, id),
  };
}

function transportInfo(id) {
  const def = STATIONS_BY_ID[id];
  const out = PRODUCTS[Object.keys(def.out)[0]];
  const produce = (s) => stationOutputRate(def, s.stations[id].level) * productionMult(s, id);
  return {
    icon: '🐴',
    title: `Arrieros · ${def.name}`,
    subtitle: 'A igual nivel que la estación, llevan todo lo que produce',
    milestoneWhat: 'carga',
    upgradeId: `${id}:transport`,
    tabs: true,
    level: (s) => s.stations[id].transport.level,
    rows: [
      { key: 'mules', label: 'Mulas', value: (s, l) => `${muleCount(l)} (${busyMules(s, id)} en camino)`, next: (l) => muleCount(l) },
      { key: 'load', label: 'Carga por mula', value: (s, l) => `${formatAmount(teamLoad(s, id, l))} ${out.icon}`, next: (l, s) => formatAmount(teamLoad(s, id, l)) },
      { key: 'trip', label: 'Viaje (ida y vuelta)', value: (s) => `${formatRate(2 * legTime(id, normalDest(s, id), muleSpeedMult(s)))} s hasta ${nameOf(normalDest(s, id))}` },
      {
        key: 'cap',
        label: 'Llevan',
        value: (s, l) => `${formatRate(teamCapacity(s, id, undefined, l))} ${out.icon}/s`,
        next: (l, s) => formatRate(teamCapacity(s, id, undefined, l)),
      },
      { key: 'produce', label: 'La estación produce', value: (s) => `${formatRate(produce(s))} ${out.icon}/s` },
    ],
    status: (s) => {
      const st = s.stations[id];
      const cap = teamCapacity(s, id);
      if (st.status === 'blocked' && st.waiting === 'mules') return { text: '⛔ Las mulas no dan abasto y el patio se llenó: mejora a los arrieros.', bad: true };
      if (cap < produce(s)) return { text: `⚠️ La estación produce ${formatRate(produce(s))} ${out.icon}/s y las mulas llevan ${formatRate(cap)}/s. Sube los arrieros al nivel de la estación (${st.level}).`, bad: true };
      return { text: '✅ Los arrieros llevan todo lo que produce la estación.', bad: false };
    },
  };
}

// Explica en una línea qué le pasa a la estación y qué hacer.
function stationStatus(state, id) {
  const st = state.stations[id];
  const def = STATIONS_BY_ID[id];
  if (def.side) return composterStatus(state, st);
  const analysis = analyzeChain(state, zoneOf(id));
  const i = analysis.rows.findIndex((r) => r.id === id);
  const row = analysis.rows[i];
  const prev = analysis.rows[i - 1];
  if (st.status === 'blocked') {
    if (st.waiting === 'mules') return { text: '⛔ Patio lleno: las mulas no dan abasto. Mejora a los arrieros (pestaña 🐴).', bad: true };
    return { text: '⛔ Patio lleno: la bodega no tiene espacio. Mejora el Despacho.', bad: true };
  }
  // La estación anterior produce más de lo que esta puede procesar.
  if (row && prev && prev.output > row.capacity * 1.02) {
    const inIcon = PRODUCTS[Object.keys(def.in)[0]].icon;
    return {
      text: `↪️ La estación anterior produce ${formatRate(prev.output)} ${inIcon}/s y esta procesa ${formatRate(row.capacity)}/s. El resto se vende sin procesar: mejórala.`,
      bad: true,
    };
  }
  if (st.status === 'starved' && st.idle > 3) {
    const chain = chainOf(zoneOf(id));
    const prevId = chain[chain.indexOf(id) - 1];
    return { text: `⏸️ Esperando producto de: ${nameOf(prevId)}. Mejora las estaciones anteriores.`, bad: false };
  }
  const next = nextStation(state, id);
  const dest = next ? nameOf(next) : 'la bodega';
  return { text: `✅ Trabajando. Las mulas llevan el producto a ${dest}.`, bad: false };
}

// Bono como porcentaje: 1,3 → «30 %».
const pct = (mult) => `${Math.round((mult - 1) * 100)} %`;

function composterStatus(state, st) {
  const bonus = expectedCompostValue(state);
  if (st.status === 'blocked') return { text: `✅ Compost de sobra: todo lo que vende la Finca vale +${pct(COMPOST_VALUE)}.`, bad: false };
  if (st.status === 'starved' && st.idle > 3) {
    const w = state.stations.wetmill;
    if (w?.status === 'blocked') return { text: '⏸️ Sin pulpa: el Beneficiadero está detenido (patio lleno). Mejora sus arrieros o la estación siguiente.', bad: true };
    return { text: '⏸️ Esperando pulpa del Beneficiadero.', bad: false };
  }
  if (bonus < COMPOST_VALUE - 0.005) return { text: `⚠️ El Beneficiadero gasta más compost del que se produce: el bono solo dura parte del tiempo (+${pct(bonus)} en promedio). Mejora la Compostera.`, bad: true };
  return { text: `✅ Produciendo compost: todo lo que vende la Finca vale +${pct(COMPOST_VALUE)}.`, bad: false };
}

function dispatchInfo(zoneId) {
  const z = (s) => s.zones[zoneId];
  const mult = (s) => dispatchMult(s, zoneId);
  return {
    icon: DISPATCH.icon,
    title: `${DISPATCH.name} · ${ZONES_BY_ID[zoneId].name}`,
    subtitle: 'El Willys vende en el pueblo lo que llega a la bodega',
    milestoneWhat: 'carga',
    upgradeId: `dispatch:${zoneId}`,
    level: (s) => z(s).dispatch.level,
    rows: [
      { key: 'cap', label: 'Carga por viaje', value: (s, l) => `${formatNumber(dispatchCapacity(l, mult(s)))}`, next: (l, s) => formatNumber(dispatchCapacity(l, mult(s))) },
      { key: 'rate', label: 'Ritmo de venta', value: (s, l) => `${formatRate(dispatchRate(l, mult(s)))} u/s`, next: (l, s) => formatRate(dispatchRate(l, mult(s))) },
      { key: 'stock', label: 'Bodega', value: (s, l) => `${formatNumber(sumValues(z(s).warehouse))} / ${formatNumber(warehouseCapacity(l, mult(s)))}` },
      { key: 'trip', label: 'Viaje (ida y vuelta)', value: () => `${DISPATCH.tripTime} s` },
    ],
    status: (s) => {
      const full = sumValues(z(s).warehouse) + inTransit(s, 'warehouse', zoneId) >= warehouseCapacity(z(s).dispatch.level, mult(s));
      if (full) return { text: '⛔ Bodega llena: el Willys no da abasto.', bad: true };
      const phase = { idle: '🅿️ El Willys está cargando en la bodega.', out: '🚙 El Willys va camino al pueblo.', back: '↩️ El Willys vuelve a la bodega.' };
      return { text: phase[z(s).jeep.phase], bad: false };
    },
  };
}
