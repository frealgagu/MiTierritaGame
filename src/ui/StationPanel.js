import { formatAmount, formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import {
  maxLevel,
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
  milestoneBoost,
} from '../sim/rules.js';
import { sumValues } from '../sim/state.js';
import { busyMules, dockStock, exportsOf, pendingRoutes, slowConsumers, legTime, normalDest, productionMult, teamCapacity, teamLoad } from '../sim/transport.js';
import { analyzeChain, expectedCompostValue, routeFlow } from '../sim/analysis.js';
import { COMPOST_VALUE, compostValueBoost, jeepCount, muleSpeedMult, saleValue } from '../sim/modifiers.js';
import { BY_CHILDREN, JOIN_FROM, PARENT, branchShare, consumers, zoneOf } from '../sim/chain.js';
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { jeepResting } from '../sim/dispatch.js';
import { routeActive, routeCapacity, routeRate, routeReserve, routeStations, stationImportRate, tripTimeOf } from '../sim/routes.js';
import { capMult, speedMult } from '../sim/modifiers.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { dispatchMult } from '../sim/modifiers.js';
import { fit, setFitted } from './fit.js';
import { alerts } from '../sim/alerts.js';
import { FACTS, WithArticle, withArticle } from '../data/lore.js';
import { clockOf, hourLabel, isLunch, nextWorkHour, resting, workOf } from '../sim/calendar.js';
import { eventDef, eventHandicaps, handicapText, supplyFraction } from '../sim/events.js';
import { harvestFactor, waitingHarvest } from '../sim/production.js';
import { LANG, listJoin, t } from '../i18n/index.js';

const SUBTITLE_MS = 7000; // cada cuánto cambia el subtítulo (descripción y datos reales)

const MODES = [
  { key: 1, label: '×1' },
  { key: 10, label: '×10' },
  { key: 'max', label: 'Máx' }, // (se traduce al dibujar)
];

const recipe = (obj) => Object.entries(obj).map(([id, n]) => `${n} ${PRODUCTS[id].icon}`).join(' + ');
const nameOf = (id) => (id.startsWith('dispatch') ? DISPATCH.name : id === 'warehouse' ? t('la bodega') : STATIONS_BY_ID[id].name);
// «la Descremadora, la Quesera y la Paila de arequipe»
const listNames = (ids, article = false) => {
  const names = ids.map((id) => (article ? withArticle(STATIONS_BY_ID[id].name) : STATIONS_BY_ID[id].name));
  return listJoin(names);
};
// Con cuatro pestañas, las de la estación y el transporte muestran solo el ícono.
const tabButtons = (tabs, active) =>
  tabs
    .map(([key, icon, name]) => {
      const short = tabs.length > 3 && !key.startsWith('route:') ? 'short' : '';
      return `<button class="tab ${short} ${active === key ? 'active' : ''}" data-tab="${key}" title="${name}">${icon}<span class="tab-name"> ${name}</span></button>`;
    })
    .join('');
const isBuilt = (state, id) => id.startsWith('dispatch') || id.startsWith('route:') || Boolean(state.stations[id]);
// Pestañas de una estación: la estación, su transporte y una por cada ruta que la abastece.
// [clave, ícono, nombre]
function tabsOf(state, id) {
  if (id.startsWith('dispatch')) return [['station', DISPATCH.icon, t('Despacho')], ['stock', '📦', t('Bodega')]];
  const tabs = [
    ['station', '⚙️', t('Estación')],
    ['transport', ...(hasBelt(state.stations[id]?.transport.level ?? 0) ? ['⚡', t('Banda')] : ['🐴', t('Arrieros')])],
  ];
  for (const imp of STATIONS_BY_ID[id]?.imports ?? []) tabs.push([`route:${imp.route}`, '🚌', ROUTES_BY_ID[imp.route].tab]);
  return tabs;
}

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
    // Al girar el teléfono cambia el ancho: los textos se vuelven a ajustar.
    window.addEventListener('resize', () => this.id && this.fitAll());
  }

  // tab: 'station' | 'transport' | 'route:<ruta>' (estaciones que reciben un producto de otra zona)
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
    this.stock = null;
    if (id.startsWith('dispatch') && this.tab === 'stock') this.renderStock(id.split(':')[1] ?? 'finca');
    else if (id.startsWith('dispatch')) this.renderUpgradable(dispatchInfo(id.split(':')[1] ?? 'finca'));
    else if (id.startsWith('route:')) this.renderUpgradable(routeInfo(id.split(':')[1], null));
    else if (this.built && this.tab === 'transport') this.renderUpgradable(transportInfo(id));
    else if (this.built && this.tab.startsWith('route:')) this.renderUpgradable((this.game.state.event ? eventRouteInfo : routeInfo)(this.tab.split(':')[1], id));
    else if (this.built) this.renderUpgradable(stationInfo(id));
    else this.renderLocked(STATIONS_BY_ID[id]);
  }

  close() {
    this.id = null;
    this.el.hidden = true;
    document.body.classList.remove('panel-open');
    this.onClose();
  }

  // El panel tiene un alto fijo (el de la vista más llena) y cada parte el suyo: lo que sobra queda
  // debajo de los datos, y el aviso y los botones van siempre abajo. Así no cambia de tamaño al
  // pasar de pestaña ni cuando cambian los textos.
  frame({ icon, title, subtitle, tabs = '', recipe, rows, milestone = '', modes = '', button }) {
    return `
      <div class="panel-head">
        <div class="panel-icon">${icon}</div>
        <div class="panel-title"><h3 data-fit>${title}</h3><p data-fit data-ref="subtitle">${subtitle}</p></div>
        <button class="close-btn" data-close aria-label="${t('Cerrar')}">✕</button>
      </div>
      ${tabs ? `<div class="tabs">${tabs}</div>` : ''}
      <div class="recipe small" data-fit>${recipe}</div>
      <div class="stats">${rows}</div>
      <div class="status-line" data-ref="status"></div>
      ${milestone ? `<div class="milestone">${milestone}</div>` : ''}
      ${modes ? `<div class="modes">${modes}</div>` : ''}
      ${button}`;
  }

  renderUpgradable(info) {
    this.info = info;
    this.variant = info.variant?.(this.game.state);
    const look = info.look?.(this.game.state) ?? info;
    // En la pestaña de la estación, el subtítulo va alternando con datos reales de lo que hace.
    this.subtitles = look === info && info.facts?.length ? [look.subtitle, ...info.facts.map((f) => `💡 ${f}`)] : null;
    this.el.innerHTML = this.frame({
      icon: look.icon,
      title: look.title,
      subtitle: look.subtitle,
      tabs: info.tabs ? tabButtons(tabsOf(this.game.state, this.id), this.tab) : '',
      recipe: typeof info.recipe === 'function' ? info.recipe(this.game.state) : info.recipe,
      rows: info.rows.map((r) => `<div class="stat"><span>${r.label}</span><b><span data-ref="${r.key}"></span> <span class="next" data-ref="${r.key}Next"></span></b></div>`).join(''),
      milestone: `<div class="milestone-top"><span class="level-badge" data-ref="level"></span><span data-ref="milestoneText"></span></div>
        <div class="bar"><div data-ref="milestoneBar"></div></div>`,
      modes: info.fixed ? '' : MODES.map((m) => `<button class="mode" data-mode="${m.key}">${m.key === 'max' ? t('Máx') : m.label}</button>`).join(''),
      button: '<button class="btn buy" data-buy><span data-ref="buyLabel"></span><span data-ref="buyCost"></span></button>',
    });
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
      ? `<div class="stat"><span>${t('Produce')}</span><b>${PRODUCTS[outId].name}</b></div>
         <div class="stat"><span>${t('Efecto')}</span><b class="next">${t('+{pct} a las ventas de la Finca', { pct: pct(COMPOST_VALUE) })}</b></div>
         <div class="stat"><span>${t('Transporte')}</span><b>${t('Canaleta directa, sin mulas')}</b></div>`
      : `<div class="stat"><span>${t('Produce')}</span><b>${PRODUCTS[outId].name}</b></div>
         <div class="stat"><span>${t('Precio de venta')}</span><b>${t('{n} 💰 por unidad', { n: PRODUCTS[outId].value })}</b></div>
         <div class="stat"><span>${t('Ganancia por proceso')}</span><b class="next">+${gain} 💰</b></div>`;
    this.el.innerHTML = this.frame({
      icon: def.icon,
      title: def.name,
      subtitle: def.side ? t('Rama opcional: aprovecha la pulpa del Beneficiadero') : t('Siguiente paso de la cadena'),
      recipe: `${recipe(def.in)} <span>➜</span> ${recipe(def.out)}`,
      rows,
      button: `<button class="btn buy" data-unlock><span>${t('Construir')}</span><span data-ref="unlockCost"></span></button>`,
    });
    this.collectRefs();
    this.el.querySelector('[data-unlock]').addEventListener('click', () => {
      if (this.game.unlock(this.id)) this.render();
      this.update();
    });
  }

  // La bodega por dentro (v3.66): cuánto hay de cada producto de la zona y a cuánto se vende. Lo de las
  // estaciones que todavía no se construyen no sale; lo que espera una ruta se marca 🚌.
  renderStock(zoneId) {
    this.info = null;
    this.variant = undefined;
    this.stock = zoneId;
    this.el.innerHTML = this.frame({
      icon: DISPATCH.icon,
      title: DISPATCH.name,
      subtitle: t('{zone}: lo que hay en la bodega y a cuánto lo vende el Willys', { zone: ZONES_BY_ID[zoneId].name }),
      tabs: tabButtons(tabsOf(this.game.state, this.id), 'stock'),
      recipe: '<span data-ref="stockTotal"></span>',
      rows: '',
      button: '',
    });
    this.el.querySelector('.stats').outerHTML = '<div class="stock-list" data-ref="stockList"></div>';
    this.collectRefs();
    for (const btn of this.el.querySelectorAll('[data-tab]')) {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab;
        this.render();
        this.update();
      });
    }
    this.stockHtml = null;
  }

  updateStock() {
    const s = this.game.state;
    const zoneId = this.stock;
    const z = s.zones[zoneId];
    const dock = dockStock(s, zoneId);
    const cap = warehouseCapacity(z.dispatch.level, dispatchMult(s, zoneId));
    setFitted(this.refs.stockTotal, `📦 ${formatNumber(sumValues(z.warehouse) - dock)} / ${formatNumber(cap)}${dock > 0.5 ? ` · ${t('🚌 {n} para las rutas', { n: formatNumber(dock) })}` : ''}`);
    const html = stockRows(s, zoneId);
    if (html !== this.stockHtml) this.refs.stockList.innerHTML = this.stockHtml = html;
    const value = Object.entries(z.warehouse).reduce((n, [p, q]) => n + q * saleValue(s, p), 0);
    this.setStatus({ text: t('💰 Todo lo que hay vale {coins}. El Willys se lo lleva al pueblo y cada producto se vende a su precio.', { coins: formatNumber(value) }), bad: false });
  }

  collectRefs() {
    this.refs = {};
    for (const el of this.el.querySelectorAll('[data-ref]')) this.refs[el.dataset.ref] = el;
    this.el.querySelector('[data-close]').addEventListener('click', () => this.close());
    this.fitAll();
  }

  fitAll() {
    for (const el of this.el.querySelectorAll('[data-fit], .stat, .tab, .status-line, .milestone-top > span:last-child')) fit(el);
  }

  // Textos que cambian solos: se ajustan a su caja cuando cambian.
  setStatus(status) {
    setFitted(this.refs.status, status.text);
    this.refs.status.classList.toggle('bad', status.bad);
  }

  update() {
    if (!this.id) return;
    if (this.stock) return this.updateStock();
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
      this.setStatus({
        text: q.reason === 'order' ? t('🔒 Primero construye: {station}.', { station: nameOf(q.previous) }) : q.ok ? t('✅ ¡Listo para construir!') : t('💰 Te faltan {n} monedas.', { n: formatNumber(Math.ceil(q.cost - state.coins)) }),
        bad: q.reason === 'order',
      });
      return;
    }

    const info = this.info;
    if (this.subtitles) setFitted(this.refs.subtitle, this.subtitles[Math.floor(performance.now() / SUBTITLE_MS) % this.subtitles.length]);
    const level = info.level(state);
    // Lo que no se mejora aparte (v3.67: la ruta en un evento, que va con su estación).
    const q = info.fixed ? { levels: 0, cost: 0, affordable: false, maxed: false } : this.game.quote(info.upgradeId, this.mode);
    const after = level + Math.max(q.levels, 1);

    r.level.textContent = t('Nv {n}', { n: level });
    for (const row of info.rows) {
      const value = row.value(state, level);
      const next = row.next && level < maxLevel(state) ? `→ ${row.next(after, state)}` : '';
      if (r[row.key].textContent === value && r[`${row.key}Next`].textContent === next) continue;
      r[row.key].textContent = value;
      r[`${row.key}Next`].textContent = next;
      fit(r[row.key].closest('.stat'));
    }
    this.setStatus(info.status(state));

    // En un evento no hay hitos más allá del nivel 50 (v3.10.1).
    const next = nextMilestone(level);
    if (next && next <= maxLevel(state)) {
      const prev = [...MILESTONES].reverse().find((m) => m <= level) ?? 1;
      const what = typeof info.milestoneWhat === 'function' ? info.milestoneWhat(next) : info.milestoneWhat;
      setFitted(r.milestoneText, t('Hito del nivel {n}: ×{mult} {what}', { n: next, mult: milestoneBoost(next), what }));
      r.milestoneBar.style.width = `${((level - prev) / (next - prev)) * 100}%`;
    } else {
      setFitted(r.milestoneText, state.event ? t('¡Todos los hitos del evento! (hasta el nivel {n})', { n: maxLevel(state) }) : t('¡Todos los hitos conseguidos!'));
      r.milestoneBar.style.width = '100%';
    }

    for (const btn of this.el.querySelectorAll('[data-mode]')) btn.classList.toggle('active', String(this.mode) === btn.dataset.mode);
    const buy = this.el.querySelector('[data-buy]');
    buy.disabled = !q.affordable;
    if (info.fixed) {
      r.buyLabel.textContent = info.fixed;
      r.buyCost.textContent = '';
    } else if (q.maxed) {
      r.buyLabel.textContent = state.event ? t('Nivel máximo del evento ({n})', { n: maxLevel(state) }) : t('Nivel máximo');
      r.buyCost.textContent = '';
    } else {
      r.buyLabel.textContent = t('Mejorar +{n}', { n: Math.max(q.levels, 1) });
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
      label: t('Producción'),
      value: (s, l) => `${formatRate(stationOutputRate(def, l) * productionMult(s, id) * harvestFactor(s, def))} ${out.icon}/s`,
      next: (l, s) => formatRate(stationOutputRate(def, l) * productionMult(s, id) * harvestFactor(s, def)),
    },
  ];
  if (inId) {
    rows.push({ key: 'input', label: t('Entrada'), value: (s, l) => `${formatNumber(s.stations[id].input)} / ${formatNumber(stationInputCap(def, l, capMult(s, id)))} ${PRODUCTS[inId].icon}` });
  }
  // Lo que junta de otra estación de su zona (v4.0), con su propio espacio.
  for (const j of def.joins ?? []) {
    const product = PRODUCTS[j.product];
    rows.push({ key: `join_${j.product}`, label: `🔗 ${product.name}`, value: (s, l) => `${formatAmount(s.stations[id].joined?.[j.product] ?? 0)} / ${formatNumber(stationInputCap(def, l, capMult(s, id)))} ${product.icon}` });
  }
  // Su subproducto, que pasa por la canaleta a las que lo usan (v4.0; la pulpa del Beneficiadero).
  const byId = def.by && BY_CHILDREN[id]?.length ? Object.keys(def.by)[0] : null;
  if (byId) {
    rows.push({ key: 'by', label: t('{p} (subproducto)', { p: PRODUCTS[byId].name }), value: (s, l) => `${formatNumber(s.stations[id].byBuffer ?? 0)} / ${formatNumber(stationBufferCap(def, l, capMult(s, id)))} ${PRODUCTS[byId].icon}` });
  }
  for (const imp of def.imports ?? []) {
    const product = PRODUCTS[imp.product];
    const r = ROUTES_BY_ID[imp.route];
    rows.push({
      key: `import_${imp.product}`,
      label: `🚌 ${product.name}`,
      value: (s, l) => `${formatAmount(s.stations[id].imported[imp.product] ?? 0)} / ${formatNumber(stationImportCap(def, l, speedMult(s, id), imp))} ${product.icon}`,
    });
  }
  if (def.fuel) {
    const fuel = PRODUCTS[def.fuel.product];
    rows.push({
      key: 'fuel',
      label: t('{fuel} (combustible)', { fuel: fuel.name }),
      value: (s, l) => `${formatAmount(s.stations[id].fuel ?? 0)} / ${formatNumber(stationInputCap(def, l, capMult(s, id)))} ${fuel.icon} · ${(s.stations[id].fuel ?? 0) > 0 ? `×${def.fuel.boost} 🔥` : t('sin 🔥')}`,
    });
  }
  if (def.side) {
    rows.push(
      { key: 'buffer', label: t('Compost guardado'), value: (s, l) => `${formatNumber(s.stations[id].buffer)} / ${formatNumber(stationBufferCap(def, l, capMult(s, id)))} ${out.icon}` },
      { key: 'effect', label: t('Bono a las ventas'), value: (s) => (compostValueBoost(s) > 1 ? t('+{pct} (hay compost)', { pct: pct(COMPOST_VALUE) }) : t('sin bono (no hay compost)')) },
      { key: 'sustain', label: t('Puede sostener'), value: (s) => t('+{a} de +{b}', { a: pct(expectedCompostValue(s)), b: pct(COMPOST_VALUE) }) },
    );
  } else {
    rows.push(
      { key: 'buffer', label: def.harvest ? t('Despensa (por enviar)') : t('Patio (por enviar)'), value: (s, l) => `${formatNumber(s.stations[id].buffer)} / ${formatNumber(stationBufferCap(def, l, capMult(s, id)))} ${out.icon}` },
      {
        key: 'value',
        label: t('Precio de venta'),
        value: (s) => `${t('{n} 💰 por {icon}', { n: formatAmount(saleValue(s, outId)), icon: out.icon })}${out.zone === 'finca' && compostValueBoost(s) > 1 ? ' 🪱' : ''}`,
      },
    );
  }
  return {
    icon: def.icon,
    title: def.name,
    subtitle: inId && def.joins
      ? t('Junta {a} y {b} en {c}', { a: PRODUCTS[inId].name.toLowerCase(), b: listJoin(def.joins.map((j) => PRODUCTS[j.product].name.toLowerCase())), c: out.name.toLowerCase() })
      : inId && byId
        ? t('Convierte {a} en {b} y {c}', { a: PRODUCTS[inId].name.toLowerCase(), b: out.name.toLowerCase(), c: PRODUCTS[byId].name.toLowerCase() })
        : inId
      ? t('Convierte {a} en {b}', { a: PRODUCTS[inId].name.toLowerCase(), b: out.name.toLowerCase() })
      : def.imports
        ? t('Convierte {a} de otras zonas en {b}', { a: listProducts(def.imports), b: out.name.toLowerCase() })
        : t('Fuente ilimitada de {p}', { p: out.name.toLowerCase() }),
    recipe: inId || def.imports
      ? `${[...(inId ? [recipe(def.in)] : []), ...(def.joins ?? []).map((j) => `${j.perCycle} ${PRODUCTS[j.product].icon}`), ...(def.imports ?? []).map((imp) => `${imp.perCycle} ${PRODUCTS[imp.product].icon}🚌`)].join(' + ')} <span>➜</span> ${recipe(def.out)}${byId ? ` + ${recipe(def.by)}` : ''}`
      : `${def.icon} <span>➜</span> ${recipe(def.out)}`,
    facts: FACTS[id],
    milestoneWhat: t('velocidad'),
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
  // La cabecera es la de la estación (no cambia al pasar de pestaña); el subtítulo dice qué se ve.
  return {
    icon: def.icon,
    title: def.name,
    subtitle: t('🐴 Arrieros: al nivel de la estación, llevan todo lo que produce'),
    variant: belt,
    look: (s) => (belt(s) ? { icon: def.icon, title: def.name, subtitle: t('⚡ Banda eléctrica: reemplaza a las mulas y deja libre el camino') } : null),
    // Qué lleva y adónde: «🍒 ➜ 🐴 ➜ Beneficiadero».
    recipe: (s) => `${out.icon} <span>➜</span> ${belt(s) ? '⚡' : '🐴'} <span>➜</span> ${nameOf(normalDest(s, id))}`,
    milestoneWhat: (next) => (next === BELT_LEVEL ? t('carga y banda eléctrica') : t('carga')),
    upgradeId: `${id}:transport`,
    tabs: true,
    level: (s) => s.stations[id].transport.level,
    rows: [
      { key: 'mules', label: t('Envíos a la vez'), value: (s, l) => t('{n} ({busy} en camino)', { n: muleCount(l), busy: busyMules(s, id) }), next: (l) => muleCount(l) },
      { key: 'load', label: t('Carga por envío'), value: (s, l) => `${formatAmount(teamLoad(s, id, l))} ${out.icon}`, next: (l, s) => formatAmount(teamLoad(s, id, l)) },
      { key: 'trip', label: t('Ida y vuelta'), value: (s) => t('{n} s, hasta {station}', { n: formatRate(2 * legTime(id, normalDest(s, id), muleSpeedMult(s))), station: nameOf(normalDest(s, id)) }) },
      {
        key: 'cap',
        label: t('Llevan'),
        value: (s, l) => `${formatRate(teamCapacity(s, id, undefined, l))} ${out.icon}/s`,
        next: (l, s) => formatRate(teamCapacity(s, id, undefined, l)),
      },
      { key: 'produce', label: t('La estación produce'), value: (s) => `${formatRate(produce(s))} ${out.icon}/s` },
    ],
    status: (s) => {
      const st = s.stations[id];
      const cap = teamCapacity(s, id);
      if (resting(s)) return { text: belt(s) ? t('{when} la banda se apaga: sigue a las {hour}.', { when: pause(s), hour: hourLabel(nextWorkHour(clockOf(s), workOf(s))) }) : t('{when} los arrieros descansan; los que van de camino terminan el viaje.', { when: pause(s) }), bad: false };
      const a = alerts(st);
      if (a.blocked && a.waiting === 'mules') return { text: belt(s) ? t('⛔ La banda no da abasto y el patio se llenó: mejora el transporte.') : t('⛔ Las mulas no dan abasto y el patio se llenó: mejora el transporte.'), bad: true };
      if (cap < produce(s)) return { text: ((v) => (belt(s) ? t('⚠️ La estación produce {rate} y la banda lleva {cap}/s. Sube el transporte al nivel de la estación ({level}).', v) : t('⚠️ La estación produce {rate} y las mulas llevan {cap}/s. Sube el transporte al nivel de la estación ({level}).', v)))({ rate: `${formatRate(produce(s))} ${out.icon}/s`, cap: formatRate(cap), level: st.level }), bad: true };
      if (!belt(s)) return { text: t('✅ Los arrieros llevan todo lo que produce la estación. En el nivel {n}, las mulas se cambian por una banda eléctrica.', { n: BELT_LEVEL }), bad: false };
      return { text: t('✅ La banda lleva todo lo que produce la estación.'), bad: false };
    },
  };
}

// Fuera de la jornada (v3.8: también a la hora del almuerzo).
const pause = (state) => (isLunch(clockOf(state), workOf(state)) ? t('🍲 A la hora del almuerzo') : t('🌙 De noche'));
const restText = (state) => t('{when} no se trabaja: la jornada sigue a las {hour}.', { when: pause(state), hour: hourLabel(nextWorkHour(clockOf(state), workOf(state))) });

// Explica en una línea qué le pasa a la estación y qué hacer.
function stationStatus(state, id) {
  const st = state.stations[id];
  const def = STATIONS_BY_ID[id];
  if (resting(state)) return { text: restText(state), bad: false };
  // En un evento (v3.12), lo que lo frena y cuánto rinde, con la compra que sigue.
  const h = eventHandicaps(state).find((x) => x.station === id && x.pct < 1);
  if (h) {
    const next = eventDef(state).actions.find((a) => !state.research.includes(a.id));
    return { text: `${handicapText(state, h)}${next ? ` ${t('Compra {action} en la barra del evento.', { action: `${next.icon} ${next.name}` })}` : ''}`, bad: true };
  }
  if (def.side) return composterStatus(state, st);
  // Cosecha de temporada (v3.4): fuera de ella no produce, y no es un problema.
  if (!def.harvest && st.status === 'starved' && waitingHarvest(state, def.zone)) {
    return { text: t('🐜 Se acabó lo de la despensa del Hormiguero: la cadena sigue cuando salgan las hormigas, en la entrada de aguas 🌦️.'), bad: false };
  }
  if (def.harvest && st.status === 'season') {
    const left = st.buffer > 0 ? t('los arrieros siguen llevando lo de la despensa ({n})', { n: `${formatNumber(st.buffer)} ${PRODUCTS[Object.keys(def.out)[0]].icon}` }) : t('la despensa está vacía: a esperar la próxima cosecha');
    return { text: t('🐜 Las hormigas solo salen en la entrada de aguas 🌦️: {left}.', { left }), bad: false };
  }
  if (def.harvest && st.status === 'working' && harvestFactor(state, def) > 1) {
    return { text: t('🐜 ¡Salieron las hormigas! En la entrada de aguas se cosecha ×{n}: lo que no alcanza a salir se guarda en la despensa para el resto del año.', { n: def.harvest.mult }), bad: false };
  }
  const analysis = analyzeChain(state, zoneOf(id));
  const row = analysis.rows.find((r) => r.id === id);
  const parent = analysis.rows.find((r) => r.id === PARENT[id]);
  // Solo los problemas que duran (ver alerts.js), como el ícono del mapa.
  const a = alerts(st);
  if (a.blocked) {
    // Lo que sobra porque las siguientes no dan abasto: es a ellas a las que hay que subir.
    const slow = a.waiting === 'mules' ? slowConsumers(state, id) : [];
    if (slow.length) {
      // Lo que sobra va a la bodega, más lejos: en ese viaje el transporte lleva menos (v3.67: se explica).
      const text = slow.length > 1
        ? t('↪ Patio lleno: {stations} no alcanzan a procesar todo lo que produce esta; lo que sobra va a la bodega, que queda lejos, y el transporte no da abasto. Súbelas de nivel.', { stations: listNames(slow, true) })
        : t('↪ Patio lleno: {stations} no alcanza a procesar todo lo que produce esta; lo que sobra va a la bodega, que queda lejos, y el transporte no da abasto. Súbela de nivel.', { stations: listNames(slow, true) });
      return { text, bad: true };
    }
    if (a.waiting === 'mules') return { text: hasBelt(st.transport.level) ? t('⛔ Patio lleno: la banda no da abasto. Mejórala (pestaña ⚡).') : t('⛔ Patio lleno: las mulas no dan abasto. Mejora a los arrieros (pestaña 🐴).'), bad: true };
    return { text: t('⛔ Patio lleno: la bodega no tiene espacio. Mejora el Despacho.'), bad: true };
  }
  // Falta el producto que llega de otra zona.
  const lacking = row?.importLimited ?? (a.starved ? def.imports?.find((imp) => imp.product === st.missing)?.route : null);
  if (lacking) {
    const r = ROUTES_BY_ID[lacking];
    const imp = PRODUCTS[r.product];
    const routeShort = routeRate(state, r.id) < routeFlow(state, r.id) * 1.02 + 1e-9;
    return {
      text: routeShort
        ? t('⏸️ Falta {p}: {route} no da abasto. Mejórala (pestaña 🚌 {tab}).', { p: imp.name.toLowerCase(), route: withArticle(r.name), tab: r.tab })
        : t('⏸️ Falta {p}: {zone} no produce suficiente. Mejora allá la cadena.', { p: imp.name.toLowerCase(), zone: ZONES_BY_ID[r.from].name }),
      bad: true,
    };
  }
  // Espera lo que junta de otra estación de su zona (v4.0): es esa la que hay que subir (o construir).
  const joinLack = row?.joinLimited ?? (a.starved ? st.lacking : null);
  if (joinLack) {
    const from = JOIN_FROM[id][joinLack];
    const p = PRODUCTS[joinLack].name.toLowerCase();
    return { text: state.stations[from] ? t('⏸️ Falta {p}: {station} no produce suficiente. Mejórala.', { p, station: nameOf(from) }) : t('⏸️ Falta {p}: construye {station}.', { p, station: nameOf(from) }), bad: true };
  }
  // Le llega más de lo que puede procesar: procesa menos de lo que le toca de la anterior (en una rama,
  // su parte; lo que la anterior guarda para una ruta que aún no abre se vende y no es culpa de esta).
  const share = parent ? parent.output * branchShare(parent.id, id) : 0;
  if (row && parent && parent.diverted > 0.005 && row.incoming >= row.capacity * 0.98 && row.capacity < share * 0.98) {
    const inIcon = PRODUCTS[Object.keys(def.in)[0]].icon;
    const text = parent.children.length > 1
      ? t('↪ De {station} a esta rama le tocan {share} y procesa {cap}/s. El resto se vende sin procesar: mejórala.', { station: nameOf(parent.id), share: `${formatRate(share)} ${inIcon}/s`, cap: formatRate(row.capacity) })
      : t('↪ La estación anterior produce {rate} y esta procesa {cap}/s. El resto se vende sin procesar: mejórala.', { rate: `${formatRate(parent.output)} ${inIcon}/s`, cap: formatRate(row.capacity) });
    return { text, bad: true };
  }
  if (a.starved) {
    return { text: t('⏸️ Esperando producto de: {station}. Mejora las estaciones anteriores.', { station: nameOf(PARENT[id]) }), bad: false };
  }
  const targets = consumers(state, id);
  const routes = exportsOf(state, id);
  // En español sin artículo («a Molino», no «a el Molino»); en los otros, con él («para o Moinho», «to the Grinder»).
  const where = [...(targets.length ? [listNames(targets, LANG !== 'es')] : []), ...(routes.length || !targets.length ? [t('la bodega')] : [])].join(` ${t('y a')} `);
  const why = routes.length > 1 ? ` ${t('(para {n} rutas)', { n: routes.length })}` : routes.length ? ` ${t('(para {route})', { route: withArticle(routes[0].name) })}` : '';
  // La parte de una ruta que aún no abre va a la bodega y se vende.
  const pending = pendingRoutes(state, id);
  const later = pending.length ? ` ${t('Su parte para {route} se vende hasta que abra {zone}.', { route: withArticle(pending[0].name), zone: ZONES_BY_ID[pending[0].to].name })}` : '';
  return { text: `${t('✅ Trabajando. Las mulas llevan el producto a {where}', { where: where + why })}.${later}`, bad: false };
}

// «bolsas de café y panela pulverizada»: los importados de una estación, en minúsculas.
const listProducts = (imports) => listJoin(imports.map((imp) => PRODUCTS[imp.product].name.toLowerCase()));

// Bono como porcentaje: 1,3 → «30 %».
const pct = (mult) => `${Math.round((mult - 1) * 100)} %`;

function composterStatus(state, st) {
  const bonus = expectedCompostValue(state);
  const a = alerts(st);
  if (a.blocked) return { text: t('✅ Compost de sobra: todo lo que vende la Finca vale +{pct}.', { pct: pct(COMPOST_VALUE) }), bad: false };
  if (a.starved) {
    const w = state.stations.wetmill;
    if (alerts(w).blocked) return { text: t('⏸️ Sin pulpa: el Beneficiadero está detenido (patio lleno). Mejora sus arrieros o la estación siguiente.'), bad: true };
    return { text: t('⏸️ Esperando pulpa del Beneficiadero.'), bad: false };
  }
  if (bonus < COMPOST_VALUE - 0.005) return { text: t('⚠️ El Beneficiadero gasta más compost del que se produce: el bono solo dura parte del tiempo (+{pct} en promedio). Mejora la Compostera.', { pct: pct(bonus) }), bad: true };
  return { text: t('✅ Produciendo compost: todo lo que vende la Finca vale +{pct}.', { pct: pct(COMPOST_VALUE) }), bad: false };
}

// Ruta entre zonas: la Chiva que trae el producto importado. `station`: la estación de cuyo panel es
// una pestaña (o null si se abre sola).
function routeInfo(routeId, station) {
  const r = ROUTES_BY_ID[routeId];
  const imp = PRODUCTS[r.product];
  // Estaciones que abastece (las construidas) y lo que gastan entre todas.
  const names = (s) => listNames(routeStations(s, routeId).length ? routeStations(s, routeId) : r.stations);
  const need = (s) => routeStations(s, routeId).reduce((n, id) => n + stationImportRate(s, r, id), 0);
  const top = (s) => Math.max(0, ...routeStations(s, routeId).map((id) => s.stations[id].level));
  return {
    icon: station ? STATIONS_BY_ID[station].icon : r.icon,
    title: station ? STATIONS_BY_ID[station].name : r.name,
    subtitle: `${station ? '🚌 ' : ''}${t('{vehicle} trae {p} de {zone}', { vehicle: WithArticle(r.vehicle), p: imp.name.toLowerCase(), zone: ZONES_BY_ID[r.from].name })}`,
    recipe: `${ZONES_BY_ID[r.from].icon} ${imp.icon} <span>➜</span> ${r.icon} <span>➜</span> ${station ? STATIONS_BY_ID[station].name : ZONES_BY_ID[r.to].name}`,
    milestoneWhat: t('carga'),
    upgradeId: `route:${routeId}`,
    tabs: Boolean(station),
    level: (s) => s.routes[routeId].level,
    rows: [
      { key: 'cap', label: t('Carga por viaje'), value: (s, l) => `${formatAmount(routeCapacity(s, routeId, l))} ${imp.icon}`, next: (l, s) => formatAmount(routeCapacity(s, routeId, l)) },
      { key: 'rate', label: t('Lleva'), value: (s, l) => `${formatRate(routeRate(s, routeId, l))} ${imp.icon}/s`, next: (l, s) => formatRate(routeRate(s, routeId, l)) },
      { key: 'need', label: t('Gastan'), value: (s) => `${formatRate(need(s))} ${imp.icon}/s (${routeStations(s, routeId).length > 1 ? t('{n} estaciones', { n: routeStations(s, routeId).length }) : names(s)})` },
      { key: 'stock', label: t('Bodega de {zone}', { zone: ZONES_BY_ID[r.from].name }), value: (s) => `${formatAmount(s.zones[r.from].warehouse[r.product] ?? 0)} ${imp.icon}` },
      { key: 'trip', label: t('Ida y vuelta'), value: (s) => `${tripTimeOf(s, r)} s` },
    ],
    status: (s) => {
      const route = s.routes[routeId];
      if (!routeActive(s, routeId)) return { text: t('🔒 Construye {stations} para abrir la ruta.', { stations: listNames(r.stations) }), bad: false };
      if (routeRate(s, routeId) < need(s) * 0.99) return { text: ((v) => (routeStations(s, routeId).length > 1 ? t('⚠️ {stations} gastan {need} y {vehicle} lleva {rate}/s. Sube la ruta al nivel de esas estaciones ({level}).', v) : t('⚠️ {stations} gasta {need} y {vehicle} lleva {rate}/s. Sube la ruta al nivel de la estación ({level}).', v)))({ stations: names(s), need: `${formatRate(need(s))} ${imp.icon}/s`, vehicle: withArticle(r.vehicle), rate: formatRate(routeRate(s, routeId)), level: top(s) }), bad: true };
      if (route.phase === 'go') return { text: t('🚌 {vehicle} va camino a {zone} con {load}.', { vehicle: WithArticle(r.vehicle), zone: ZONES_BY_ID[r.to].name, load: `${formatAmount(route.load)} ${imp.icon}` }), bad: false };
      if (route.phase === 'back') return { text: t('↩ {vehicle} vuelve a {zone}.', { vehicle: WithArticle(r.vehicle), zone: ZONES_BY_ID[r.from].name }), bad: false };
      if ((s.zones[r.from].warehouse[r.product] ?? 0) <= 0) return { text: t('⏳ Esperando {p} en la bodega de {zone}.', { p: imp.name.toLowerCase(), zone: ZONES_BY_ID[r.from].name }), bad: false };
      return { text: t('🅿️ {vehicle} está cargando en {zone}.', { vehicle: WithArticle(r.vehicle), zone: ZONES_BY_ID[r.from].name }), bad: false };
    },
  };
}

function dispatchInfo(zoneId) {
  const z = (s) => s.zones[zoneId];
  const mult = (s) => dispatchMult(s, zoneId);
  return {
    icon: DISPATCH.icon,
    title: DISPATCH.name,
    subtitle: t('{zone}: el Willys vende lo que llega a la bodega', { zone: ZONES_BY_ID[zoneId].name }),
    recipe: `📦 ${t('Bodega')} <span>➜</span> ${DISPATCH.icon} <span>➜</span> 💰 ${t('Pueblo')}`,
    milestoneWhat: t('carga'),
    upgradeId: `dispatch:${zoneId}`,
    tabs: true,
    level: (s) => z(s).dispatch.level,
    rows: [
      { key: 'cap', label: t('Carga por viaje'), value: (s, l) => `${formatNumber(dispatchCapacity(l, mult(s)))}`, next: (l, s) => formatNumber(dispatchCapacity(l, mult(s))) },
      // Con el segundo Willys (v3.9), cada uno lleva su carga: se vende el doble.
      { key: 'rate', label: t('Ritmo de venta'), value: (s, l) => `${formatRate(dispatchRate(l, mult(s)) * jeepCount(s))} u/s${jeepCount(s) > 1 ? ' · 🚙🚙' : ''}`, next: (l, s) => formatRate(dispatchRate(l, mult(s)) * jeepCount(s)) },
      {
        key: 'stock',
        label: t('Bodega'),
        value: (s, l) => {
          const dock = dockStock(s, zoneId);
          return `${formatNumber(sumValues(z(s).warehouse) - dock)} / ${formatNumber(warehouseCapacity(l, mult(s)))}${dock > 0.5 ? ` · ${t('andén de las rutas: {n}', { n: formatNumber(dock) })}` : ''}`;
        },
      },
      { key: 'trip', label: t('Ida y vuelta'), value: () => `${DISPATCH.tripTime} s` },
    ],
    status: (s) => {
      const full = alerts(z(s)).full;
      if (full) return { text: t('⛔ Bodega llena: el Willys no da abasto.'), bad: true };
      if (jeepResting(s, zoneId)) {
        const routes = ROUTES.filter((r) => r.from === zoneId && routeActive(s, r.id));
        if (routes.length) {
          // «al Pueblo», «a Barichara» (si todas van a la misma) o «a las otras zonas».
          const to = ZONES_BY_ID[routes[0].to].name;
          const same = routes.every((r) => r.to === routes[0].to);
          const name = ZONES_BY_ID[zoneId].name.replace(/^(El|La|The) /, (a) => a.toLowerCase());
          if (!same) return { text: t('☕ Todo lo que produce {zone} se lo lleva la chiva a las otras zonas; el Willys solo sale con lo que sobra.', { zone: name }), bad: false };
          const where = LANG === 'es' ? (to.startsWith('El ') ? `al ${to.slice(3)}` : `a ${to}`) : to;
          return { text: t('☕ Todo lo que produce {zone} se lo lleva la chiva {where}; el Willys solo sale con lo que sobra.', { zone: name, where }), bad: false };
        }
      }
      const phase = { idle: t('🅿️ El Willys está cargando en la bodega.'), out: t('🚙 El Willys va camino al pueblo.'), back: t('↩ El Willys vuelve a la bodega.') };
      return { text: phase[z(s).jeep.phase], bad: false };
    },
  };
}

// Una fila por producto: el de cada estación construida de la zona (en el orden de la cadena) y cualquier
// otro que haya en la bodega.
function stockRows(state, zoneId) {
  const zone = ZONES_BY_ID[zoneId];
  const wh = state.zones[zoneId].warehouse;
  const ids = [...zone.chain, ...zone.plots.map((p) => p.stationId)].filter((id) => state.stations[id] && !STATIONS_BY_ID[id].side);
  const products = [...new Set([...ids.map((id) => Object.keys(STATIONS_BY_ID[id].out)[0]), ...Object.keys(wh)])];
  const reserved = routeReserve(state, zoneId);
  return products
    .map((p) => {
      const product = PRODUCTS[p];
      const n = wh[p] ?? 0;
      const route = reserved[p] > 0 ? ' 🚌' : '';
      return `<div class="stock-row ${n < 0.5 ? 'empty' : ''}"><span class="stock-icon">${product.icon}</span><span class="stock-name">${product.name}${route}</span><b>${formatNumber(n)}</b><span class="stock-price">${t('{n} 💰 c/u', { n: formatAmount(saleValue(state, p)) })}</span></div>`;
    })
    .join('');
}

// La ruta en el tablero de un evento (v3.67). Ahí no hay otras zonas ni chivas: lo de afuera llega solo, a
// cada estación lo que gasta a toda marcha y un 25 % más (sim/events.js: stepSupply). Por eso la ruta va
// al nivel de su estación y no se mejora aparte; lo que se ve es exacto. Con un derrumbe o una creciente,
// llega solo una parte, hasta comprar lo de la barra del evento.
function eventRouteInfo(routeId, station) {
  const r = ROUTES_BY_ID[routeId];
  const product = PRODUCTS[r.product];
  const def = STATIONS_BY_ID[station];
  const imp = def.imports.find((i) => i.route === routeId);
  const use = (s, l) => stationRate(def, l) * speedMult(s, station) * imp.perCycle;
  return {
    icon: def.icon,
    title: def.name,
    subtitle: t('🚌 En el evento, {p} llega sola de {zone}', { p: product.name.toLowerCase(), zone: ZONES_BY_ID[r.from].name }),
    recipe: `${ZONES_BY_ID[r.from].icon} ${product.icon} <span>➜</span> ${r.icon} <span>➜</span> ${def.name}`,
    milestoneWhat: t('carga (con la estación)'),
    upgradeId: `route:${routeId}`,
    fixed: t('🚌 Sube con la estación'),
    tabs: true,
    level: (s) => s.stations[station].level,
    rows: [
      { key: 'supply', label: t('Llega de afuera'), value: (s) => t('{n} % de lo que se necesita', { n: Math.round(supplyFraction(s, r.product) * 100) }) },
      { key: 'rate', label: t('Llega'), value: (s, l) => `${formatRate(supplyFraction(s, r.product) * use(s, l) * 1.25)} ${product.icon}/s` },
      { key: 'need', label: t('La estación gasta'), value: (s, l) => `${formatRate(use(s, l))} ${product.icon}/s` },
      { key: 'stock', label: t('En la estación'), value: (s, l) => `${formatAmount(s.stations[station].imported[r.product] ?? 0)} / ${formatNumber(stationImportCap(def, l, speedMult(s, station), imp))} ${product.icon}` },
    ],
    status: (s) => {
      const f = supplyFraction(s, r.product);
      if (f >= 1) return { text: t('✅ Llega todo lo que gasta {station} y un 25 % más. Al subir la estación sube también la ruta.', { station: withArticle(def.name) }), bad: false };
      const next = eventDef(s).actions.find((a) => !s.research.includes(a.id) && (a.effects ?? (a.effect ? [a.effect] : [])).some((e) => e.type === 'supply' && e.product === r.product));
      const p = product.name.toLowerCase();
      const now = f > 0 ? t('Llega solo el {n} % de {p}', { n: Math.round(f * 100), p }) : t('No llega nada de {p}', { p });
      const blame = eventDef(s).blame ? ` ${t('por {what}', { what: eventDef(s).blame })}` : '';
      return { text: `⛔ ${now}${blame}.${next ? ` ${t('Compra {action} en la barra del evento.', { action: `${next.icon} ${next.name}` })}` : ''}`, bad: true };
    },
  };
}

