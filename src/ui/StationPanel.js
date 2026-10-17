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
  stationImportCap,
  stationInputCap,
  stationOutputRate,
  stationRate,
  muleCount,
  BELT_LEVEL,
  hasBelt,
  warehouseCapacity,
} from '../sim/rules.js';
import { sumValues } from '../sim/state.js';
import { busyMules, inTransit, legTime, normalDest, productionMult, teamCapacity, teamLoad } from '../sim/transport.js';
import { analyzeChain, expectedCompostValue } from '../sim/analysis.js';
import { COMPOST_VALUE, compostValueBoost, muleSpeedMult, saleValue } from '../sim/modifiers.js';
import { PARENT, consumers, zoneOf } from '../sim/chain.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { routeActive, routeCapacity, routeRate } from '../sim/routes.js';
import { speedMult } from '../sim/modifiers.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { dispatchMult } from '../sim/modifiers.js';

const MODES = [
  { key: 1, label: '×1' },
  { key: 10, label: '×10' },
  { key: 'max', label: 'Máx' },
];

const recipe = (obj) => Object.entries(obj).map(([id, n]) => `${n} ${PRODUCTS[id].icon}`).join(' + ');
const nameOf = (id) => (id.startsWith('dispatch') ? DISPATCH.name : id === 'warehouse' ? 'la bodega' : STATIONS_BY_ID[id].name);
// «la Descremadora, la Quesera y la Paila de arequipe»
const listNames = (ids) => {
  const names = ids.map((id) => STATIONS_BY_ID[id].name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0];
};
const isBuilt = (state, id) => id.startsWith('dispatch') || id.startsWith('route:') || Boolean(state.stations[id]);
const TABS = [
  ['station', '⚙️ Estación'],
  ['transport', '🐴 Arrieros'],
  ['route', '🚌 Ruta'],
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
    this.built = null;
  }

  // tab: 'station' | 'transport' | 'route' (estaciones que reciben un producto de otra zona)
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
    this.built = isBuilt(this.game.state, id);
    if (id.startsWith('dispatch')) this.renderUpgradable(dispatchInfo(id.split(':')[1] ?? 'finca'));
    else if (id.startsWith('route:')) this.renderUpgradable(routeInfo(id.split(':')[1], false));
    else if (this.built && this.tab === 'transport') this.renderUpgradable(transportInfo(id));
    else if (this.built && this.tab === 'route' && STATIONS_BY_ID[id].import) this.renderUpgradable(routeInfo(STATIONS_BY_ID[id].import.route, true));
    else if (this.built) this.renderUpgradable(stationInfo(id));
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
    this.variant = info.variant?.(this.game.state);
    const look = info.look?.(this.game.state) ?? info;
    this.el.innerHTML = `
      ${this.head(look.icon, look.title, look.subtitle, '<span class="level-badge" data-ref="level"></span>')}
      ${
        info.tabs
          ? `<div class="tabs">
              ${TABS.filter(([key]) => key !== 'route' || STATIONS_BY_ID[this.id]?.import)
                .map(([key, label]) => [key, key === 'transport' && hasBelt(this.game.state.stations[this.id]?.transport.level ?? 0) ? '⚡ Banda' : label])
                .map(([key, label]) => `<button class="tab ${this.tab === key ? 'active' : ''}" data-tab="${key}">${label}</button>`)
                .join('')}
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
    this.variant = undefined;
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
    const built = isBuilt(state, this.id);
    // Si cambió algo que se ve en la cabecera (los arrieros pasaron a banda eléctrica), rehacer el panel.
    if (built !== this.built || this.info?.variant?.(state) !== this.variant) this.render();

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
      const what = typeof info.milestoneWhat === 'function' ? info.milestoneWhat(next) : info.milestoneWhat;
      r.milestoneText.textContent = `Próximo hito: nivel ${next} (×2 ${what})`;
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
  if (def.import) {
    const imp = PRODUCTS[def.import.product];
    const r = ROUTES_BY_ID[def.import.route];
    rows.push({
      key: 'import',
      label: `${imp.name} (de ${ZONES_BY_ID[r.from].name})`,
      value: (s, l) => `${formatAmount(s.stations[id].imported ?? 0)} / ${formatNumber(stationImportCap(def, l, speedMult(s, id)))} ${imp.icon}`,
    });
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
    recipe: inId ? `${recipe(def.in)}${def.import ? ` + ${def.import.perCycle} ${PRODUCTS[def.import.product].icon}🚌` : ''} <span>➜</span> ${recipe(def.out)}` : null,
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
  // Desde el nivel 50, las mulas se cambian por una banda eléctrica (lleva lo mismo).
  const belt = (s) => hasBelt(s.stations[id].transport.level);
  return {
    icon: '🐴',
    title: `Arrieros · ${def.name}`,
    subtitle: 'A igual nivel que la estación, llevan todo lo que produce',
    variant: belt,
    look: (s) => (belt(s) ? { icon: '⚡', title: `Banda eléctrica · ${def.name}`, subtitle: 'Las mulas se cambiaron por una banda: lleva lo mismo y deja libre el camino' } : null),
    milestoneWhat: (next) => (next === BELT_LEVEL ? 'carga y banda eléctrica' : 'carga'),
    upgradeId: `${id}:transport`,
    tabs: true,
    level: (s) => s.stations[id].transport.level,
    rows: [
      { key: 'mules', label: 'Envíos a la vez', value: (s, l) => `${muleCount(l)} ${hasBelt(l) ? 'cajas' : 'mulas'} (${busyMules(s, id)} en camino)`, next: (l) => muleCount(l) },
      { key: 'load', label: 'Carga por envío', value: (s, l) => `${formatAmount(teamLoad(s, id, l))} ${out.icon}`, next: (l, s) => formatAmount(teamLoad(s, id, l)) },
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
      const who = belt(s) ? 'la banda' : 'las mulas';
      if (st.status === 'blocked' && st.waiting === 'mules') return { text: `⛔ ${belt(s) ? 'La banda no da' : 'Las mulas no dan'} abasto y el patio se llenó: mejora el transporte.`, bad: true };
      if (cap < produce(s)) return { text: `⚠️ La estación produce ${formatRate(produce(s))} ${out.icon}/s y ${who} ${belt(s) ? 'lleva' : 'llevan'} ${formatRate(cap)}/s. Sube el transporte al nivel de la estación (${st.level}).`, bad: true };
      if (!belt(s)) return { text: `✅ Los arrieros llevan todo lo que produce la estación. En el nivel ${BELT_LEVEL}, las mulas se cambian por una banda eléctrica.`, bad: false };
      return { text: '✅ La banda lleva todo lo que produce la estación.', bad: false };
    },
  };
}

// Explica en una línea qué le pasa a la estación y qué hacer.
function stationStatus(state, id) {
  const st = state.stations[id];
  const def = STATIONS_BY_ID[id];
  if (def.side) return composterStatus(state, st);
  const analysis = analyzeChain(state, zoneOf(id));
  const row = analysis.rows.find((r) => r.id === id);
  const parent = analysis.rows.find((r) => r.id === PARENT[id]);
  if (st.status === 'blocked') {
    if (st.waiting === 'mules') return { text: hasBelt(st.transport.level) ? '⛔ Patio lleno: la banda no da abasto. Mejórala (pestaña ⚡).' : '⛔ Patio lleno: las mulas no dan abasto. Mejora a los arrieros (pestaña 🐴).', bad: true };
    return { text: '⛔ Patio lleno: la bodega no tiene espacio. Mejora el Despacho.', bad: true };
  }
  // Falta el producto que llega de otra zona.
  if (def.import && (st.missing === 'import' || row?.importLimited)) {
    const r = ROUTES_BY_ID[def.import.route];
    const imp = PRODUCTS[def.import.product];
    const routeShort = routeRate(state, r.id) < (row?.imported ?? 0) * 1.02 + 1e-9;
    return {
      text: routeShort
        ? `⏸️ Falta ${imp.name.toLowerCase()}: la ${r.name} no da abasto. Mejórala (pestaña 🚌).`
        : `⏸️ Falta ${imp.name.toLowerCase()}: ${ZONES_BY_ID[r.from].name} no produce suficiente. Mejora allá la cadena.`,
      bad: true,
    };
  }
  // Le llega más de lo que puede procesar.
  if (row && parent && parent.diverted > 0.005 && row.incoming >= row.capacity * 0.98) {
    const inIcon = PRODUCTS[Object.keys(def.in)[0]].icon;
    const text = parent.children.length > 1
      ? `↪️ ${nameOf(parent.id)} reparte más ${inIcon} de los que procesan sus ramas (esta, ${formatRate(row.capacity)}/s). El resto se vende sin procesar: mejórala.`
      : `↪️ La estación anterior produce ${formatRate(parent.output)} ${inIcon}/s y esta procesa ${formatRate(row.capacity)}/s. El resto se vende sin procesar: mejórala.`;
    return { text, bad: true };
  }
  if (st.status === 'starved' && st.idle > 3) {
    return { text: `⏸️ Esperando producto de: ${nameOf(PARENT[id])}. Mejora las estaciones anteriores.`, bad: false };
  }
  const targets = consumers(state, id);
  return { text: `✅ Trabajando. Las mulas llevan el producto a ${targets.length ? listNames(targets) : 'la bodega'}.`, bad: false };
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

// Ruta entre zonas: la Chiva que trae el producto importado. `tabs`: si se ve como pestaña de la estación.
function routeInfo(routeId, tabs) {
  const r = ROUTES_BY_ID[routeId];
  const def = STATIONS_BY_ID[r.station];
  const imp = PRODUCTS[r.product];
  const need = (s) => (s.stations[r.station] ? stationRate(def, s.stations[r.station].level) * speedMult(s, r.station) * def.import.perCycle : 0);
  return {
    icon: r.icon,
    title: r.name,
    subtitle: `La ${r.vehicle} trae ${imp.name.toLowerCase()} de ${ZONES_BY_ID[r.from].name}. A igual nivel que la estación, lleva todo lo que gasta.`,
    milestoneWhat: 'carga',
    upgradeId: `route:${routeId}`,
    tabs,
    level: (s) => s.routes[routeId].level,
    rows: [
      { key: 'cap', label: 'Carga por viaje', value: (s, l) => `${formatAmount(routeCapacity(s, routeId, l))} ${imp.icon}`, next: (l, s) => formatAmount(routeCapacity(s, routeId, l)) },
      { key: 'rate', label: 'Lleva', value: (s, l) => `${formatRate(routeRate(s, routeId, l))} ${imp.icon}/s`, next: (l, s) => formatRate(routeRate(s, routeId, l)) },
      { key: 'need', label: `La ${def.name} gasta`, value: (s) => `${formatRate(need(s))} ${imp.icon}/s` },
      { key: 'stock', label: `Bodega de ${ZONES_BY_ID[r.from].name}`, value: (s) => `${formatAmount(s.zones[r.from].warehouse[r.product] ?? 0)} ${imp.icon}` },
      { key: 'trip', label: 'Viaje (ida y vuelta)', value: () => `${r.tripTime} s` },
    ],
    status: (s) => {
      const route = s.routes[routeId];
      if (!routeActive(s, routeId)) return { text: `🔒 Construye la ${def.name} para abrir la ruta.`, bad: false };
      if (routeRate(s, routeId) < need(s) * 0.99) return { text: `⚠️ La ${def.name} gasta ${formatRate(need(s))} ${imp.icon}/s y la ${r.vehicle} lleva ${formatRate(routeRate(s, routeId))}/s. Sube la ruta al nivel de la ${def.name} (${s.stations[r.station].level}).`, bad: true };
      if (route.phase === 'go') return { text: `🚌 La ${r.vehicle} va camino a ${ZONES_BY_ID[r.to].name} con ${formatAmount(route.load)} ${imp.icon}.`, bad: false };
      if (route.phase === 'back') return { text: `↩️ La ${r.vehicle} vuelve a ${ZONES_BY_ID[r.from].name}.`, bad: false };
      if ((s.zones[r.from].warehouse[r.product] ?? 0) <= 0) return { text: `⏳ Esperando ${imp.name.toLowerCase()} en la bodega de ${ZONES_BY_ID[r.from].name}.`, bad: false };
      return { text: `🅿️ La ${r.vehicle} está cargando en ${ZONES_BY_ID[r.from].name}.`, bad: false };
    },
  };
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
