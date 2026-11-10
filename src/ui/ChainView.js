import { formatAmount, formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { analyzeChain, expectedCompostValue } from '../sim/analysis.js';
import { hasBelt } from '../sim/rules.js';
import { BY_CHILDREN, CHILDREN, JOIN_FROM, PARENT, branchShare, buildableStations, chainOf } from '../sim/chain.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { pendingRoutes, slowConsumers } from '../sim/transport.js';
import { routeOrigin } from '../sim/routes.js';
import { withArticle } from '../data/lore.js';
import { saleValue } from '../sim/modifiers.js';
import { listJoin, t } from '../i18n/index.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { buyZoneBoostUnlock, planZoneBoost, previewBuild, quoteZoneBoostUnlock, ZONE_BOOST_COST, zoneBoostStatus } from '../sim/zoneBoost.js';
import { toast } from './toast.js';
import { productColors } from '../render/pipeColors.js';

const outIcon = (id) => PRODUCTS[Object.keys(STATIONS_BY_ID[id].out)[0]].icon;
const outOf = (id) => Object.keys(STATIONS_BY_ID[id].out)[0];
const byOf = (id) => Object.keys(STATIONS_BY_ID[id].by)[0];
const byIcon = (id) => PRODUCTS[Object.keys(STATIONS_BY_ID[id].by)[0]].icon;
// «la Mesa de chocolate y la Chocolatería»
const listNames = (ids) => {
  const names = ids.map((id) => withArticle(STATIONS_BY_ID[id].name));
  return listJoin(names);
};
// La cadena (v3.0.1): un diagrama con las estaciones unidas por eslabones y, sobre cada eslabón, cuánto
// pasa por segundo. Al tocar una estación aparece abajo su detalle (lo que recibe y procesa, sus
// arrieros, lo que se desvía o se pierde, lo que llega de otras zonas) con botones para ir a ella.
// Los barrios de Bogotá (v4.5), para las pestañas de la cadena.
const GROUP_NAMES = { candelaria: t('Candelaria'), zona_g: t('Zona G'), usaquen: t('Usaquén'), paloquemao: t('Paloquemao'), centro: t('Centro') };

export class ChainView {
  // getRoot: la partida (el perfil con el Renombre y las regiones), para mejorar toda la zona (v4.1).
  constructor(game, onOpen, getZone, getRoot) {
    this.game = game;
    this.getZone = getZone;
    this.getRoot = getRoot;
    this.foot = document.getElementById('chain-foot');
    this.onOpen = onOpen;
    this.el = document.getElementById('chain');
    this.body = document.getElementById('chain-body');
    this.groupsEl = document.getElementById('chain-groups');
    this.group = null; // el barrio que se ve (v4.5, Bogotá)
    this.detail = document.getElementById('chain-detail');
    this.selected = null;
    document.getElementById('chain-btn').addEventListener('click', () => this.open());
    document.getElementById('chain-close').addEventListener('click', () => this.close());
    // Con el ratón (v4.6), la cadena se arrastra en las cuatro direcciones (en el teléfono, con el dedo, ya se podía).
    this.body.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const sc = this.body.querySelector('.dg-scroll');
      this.drag = { x: e.clientX, y: e.clientY, left: sc?.scrollLeft ?? 0, top: this.body.scrollTop, sc, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      if (d.sc) d.sc.scrollLeft = d.left - dx;
      this.body.scrollTop = d.top - dy;
    });
    window.addEventListener('pointerup', () => {
      // Lo que se suelta después de arrastrar no cuenta como toque.
      this.dragged = Boolean(this.drag?.moved);
      this.drag = null;
      setTimeout(() => (this.dragged = false), 0);
    });
    // Mientras se desliza con el dedo (v4.7) no se redibuja: en Bogotá, rehacer la cadena entera a cada cuadro trababa
    // el desplazamiento (la caja de lado no avisa con burbuja: se escucha en la fase de captura).
    this.scrolledAt = 0;
    this.body.addEventListener('scroll', () => (this.scrolledAt = performance.now()), { capture: true, passive: true });
    this.body.addEventListener('touchstart', () => (this.touching = true), { passive: true });
    window.addEventListener('touchend', () => (this.touching = false), { passive: true });
    window.addEventListener('touchcancel', () => (this.touching = false), { passive: true });
    this.el.addEventListener('click', (e) => {
      if (this.dragged) return;
      if (e.target === this.el) return this.close();
      if (this.footClick(e)) return;
      const tab = e.target.closest('[data-group]');
      if (tab) {
        this.group = tab.dataset.group;
        this.selected = null;
        this.html = this.detailHtml = this.groupsHtml = null;
        this.update();
        this.body.scrollLeft = 0;
        return;
      }
      // Tocar una estación muestra su detalle (tocarla otra vez lo cierra).
      const pick = e.target.closest('[data-pick]');
      if (pick) {
        this.selected = pick.dataset.pick === this.selected ? null : pick.dataset.pick;
        this.html = this.detailHtml = null;
        this.update();
        // Con el detalle abierto queda menos espacio: que la estación elegida siga a la vista.
        this.body.querySelector('.selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
      }
      const target = e.target.closest('[data-open]');
      if (target) {
        this.close();
        this.onOpen(target.dataset.open);
      }
    });
  }

  open() {
    this.selected = null;
    this.html = this.detailHtml = null;
    this.el.hidden = false;
    this.update();
  }

  close() {
    this.el.hidden = true;
  }

  update() {
    if (this.el.hidden) return;
    const state = this.game.state;
    const zone = this.getZone();
    // En red (v4.7, Bogotá) la cadena es grande: se rehace como mucho dos veces por segundo y nunca mientras se
    // desliza (lo que se toca, `this.html = null`, se rehace enseguida).
    const now = performance.now();
    if (ZONES_BY_ID[zone].network && this.html && this.zoneDrawn === zone) {
      if (this.touching || now - this.scrolledAt < 400 || now - this.drawnAt < 500) return;
    }
    this.drawnAt = now;
    this.zoneDrawn = zone;
    const a = analyzeChain(state, zone);
    const rows = Object.fromEntries(a.rows.map((r) => [r.id, r]));
    let locked = buildableStations(state, zone); // las que siguen (con barrios, v4.5, una por barrio)
    this.updateFoot(state, zone);
    // Con barrios (v4.5, Bogotá): una pestaña por barrio, y en el diagrama solo las estaciones del que se ve (las que
    // le faltan, en gris, aunque todavía no se puedan construir).
    const groups = ZONES_BY_ID[zone].groups;
    let only = null;
    if (groups) {
      if (!groups.some((g) => g.id === this.group)) this.group = groups[0].id;
      const tabs = groups.map((g) => `<button class="tab ${g.id === this.group ? 'active' : ''}" data-group="${g.id}">${GROUP_NAMES[g.id] ?? g.name}</button>`).join('');
      if (tabs !== this.groupsHtml) this.groupsEl.innerHTML = this.groupsHtml = tabs;
      const group = groups.find((g) => g.id === this.group);
      only = new Set(group.stations);
      locked = group.stations.filter((id) => !state.stations[id]);
    }
    this.groupsEl.hidden = !groups;
    // Solo se reescribe si algo cambió, para no perder toques a medio hacer.
    // Menos el margen de la caja que se desliza (v4.3.1), para que lo de las orillas no quede cortado.
    const html = diagram(state, a, rows, locked, zone, (this.body.clientWidth || 320) - 2 * DG_PAD, this.selected, only);
    // Se redibuja en cada cuadro: lo que se corrió de lado se conserva (v4.6: en Bogotá la red es ancha). Mientras se
    // arrastra no se redibuja.
    if (html !== this.html && !this.drag?.moved) {
      const left = this.body.querySelector('.dg-scroll')?.scrollLeft ?? 0;
      const top = this.body.scrollTop;
      this.body.innerHTML = this.html = html;
      const sc = this.body.querySelector('.dg-scroll');
      if (sc) sc.scrollLeft = left;
      this.body.scrollTop = top;
    }
    const detail = this.selected ? detailOf(state, a, rows, this.selected, zone) : '';
    this.detail.hidden = !detail;
    if (detail !== this.detailHtml) this.detail.innerHTML = this.detailHtml = detail;
  }

  // Los botones de abajo (v4.1.1): 🏗️ Construir, mientras falten estaciones, y ⬆ Al nivel X, que no se ve hasta
  // reiniciar la región; luego se compra con Renombre y queda para todas sus zonas (y sus eventos ganados con oro).
  updateFoot(state, zone) {
    const root = this.getRoot();
    const buttons = [];
    const build = previewBuild(state, zone);
    if (build) {
      const label = build.count ? t('🏗️ Construir ({n})', { n: build.count }) : t('🏗️ Construir');
      buttons.push(`<button class="btn buy bulk" data-build-all ${build.count ? '' : 'disabled'}>${label} · 💰 ${formatNumber(build.count ? build.cost : build.next)}</button>`);
    }
    const status = zoneBoostStatus(root, state, zone);
    if (status === 'locked') {
      const q = quoteZoneBoostUnlock(root.profile, REGION_OF_ZONE[zone]);
      buttons.push(`<button class="btn buy bulk" data-boost-unlock ${q.ok ? '' : 'disabled'} title="${t('Sube toda la zona al próximo hito de una vez. Sirve en todas las zonas de la región.')}">${t('🔒 ⬆ Todo al próximo hito · {n} ⭐', { n: ZONE_BOOST_COST })}</button>`);
    } else if (status === 'ready') {
      const plan = planZoneBoost(state, zone);
      if (plan) buttons.push(`<button class="btn buy bulk" data-boost ${plan.affordable ? '' : 'disabled'}>${t('⬆ Todo al nivel {n}', { n: plan.level })} · 💰 ${formatNumber(plan.cost)}</button>`);
    }
    const html = buttons.join('');
    if (html !== this.footHtml) this.foot.innerHTML = this.footHtml = html;
  }

  // Los toques en esos botones. Devuelve true si era de ellos.
  footClick(e) {
    const zone = this.getZone();
    if (e.target.closest('[data-build-all]')) {
      const built = this.game.buildAll(zone);
      if (built.length) toast(t('🏗️ Construidas: {list}', { list: listJoin(built.map((id) => STATIONS_BY_ID[id].name)) }), 3500);
    } else if (e.target.closest('[data-boost-unlock]')) {
      const region = REGION_OF_ZONE[zone];
      if (buyZoneBoostUnlock(this.getRoot().profile, region)) toast(t('⬆ ¡Ya puedes subir toda la zona al próximo hito en {region}!', { region: REGIONS_BY_ID[region].name }), 3500);
    } else if (e.target.closest('[data-boost]')) {
      const plan = this.game.boostZone(zone);
      if (plan) toast(t('⬆ ¡Toda la zona al nivel {n}! {k} mejoras (💰 {cost})', { n: plan.level, k: plan.items.length, cost: formatNumber(plan.cost) }), 3000);
    } else return false;
    this.html = null;
    this.update();
    return true;

  }
}

// El nivel de una ruta. En el tablero de un evento (v3.68.1) la ruta va con su estación (ver StationPanel:
// eventRouteInfo): se muestra el de la estación, no el de la ruta, que ahí no cambia.
function routeLevel(state, r) {
  if (!state.event) return state.routes[r.id].level;
  const id = r.stations.find((sid) => state.stations[sid]);
  return id ? state.stations[id].level : state.routes[r.id].level;
}

// El detalle de lo que se tocó: una estación (construida o por construir), una ruta o la bodega.
function detailOf(state, a, rows, sel, zone) {
  const [kind, part] = sel.split(':');
  if (kind === 'dispatch') {
    return `
      <div class="cd-head"><span class="cd-icon">${DISPATCH.icon}</span><b>${t('Bodega y Willys')}</b> <small>${t('Nv')} ${state.zones[zone].dispatch.level}</small></div>
      <p>${t('Todo lo que sale de la cadena llega aquí: <b>{in} u/s</b>. El Willys vende hasta <b>{out} u/s</b>.', { in: formatRate(a.toWarehouse), out: formatRate(a.dispatch) })}</p>
      <p>${t('Ingreso estimado: <b>{n} 💰/s</b>', { n: formatRate(a.income) })}</p>
      <div class="cd-actions"><button class="btn buy" data-open="dispatch:${zone}">${t('🚙 Ir al despacho')}</button><button class="btn" data-open="dispatch:${zone}:stock">${t('📦 Ver la bodega')}</button></div>`;
  }
  if (kind === 'route') {
    const r = ROUTES_BY_ID[part];
    const from = routeOrigin(r);
    const product = PRODUCTS[r.product];
    const id = r.stations.find((sid) => rows[sid]);
    const arriving = id ? r.stations.reduce((n, sid) => n + (rows[sid]?.imported?.[r.product] ?? 0), 0) : 0;
    const short = r.stations.some((sid) => rows[sid]?.importLimited === r.id);
    return `
      <div class="cd-head"><span class="cd-icon">${product.icon}</span><b>${product.name}</b> <small>${t('desde {zone}', { zone: `${from.icon} ${from.name}` })}</small></div>
      <p>${r.icon} ${r.name} · ${t('Nv')} ${routeLevel(state, r)} · ${t('llegan <b>{n}/s</b>', { n: formatRate(arriving) })}</p>
      ${short ? `<p class="lost">${t('⏸️ No alcanza: la estación espera.')}</p>` : ''}
      <div class="cd-actions"><button class="btn buy" data-open="route:${r.id}">${r.icon} ${t('Ir a la ruta')}</button></div>`;
  }
  const id = kind;
  const def = STATIONS_BY_ID[id];
  const row = rows[id];
  // Una rama aparte (v3.12: la Compostera), que no lleva nada a la bodega.
  if (def.side && state.stations[id]) {
    return `
      <div class="cd-head"><span class="cd-icon">${def.icon}</span><b>${def.name}</b> <small>${t('Nv')} ${state.stations[id].level}</small></div>
      <p>${sideText(state, id)}</p>
      <div class="cd-actions"><button class="btn buy" data-open="${id}">${t('🏗️ Ir al edificio')}</button></div>`;
  }
  if (!row) {
    return `
      <div class="cd-head"><span class="cd-icon">${def.icon}</span><b>${def.name}</b> <small>🔒 ${formatNumber(def.unlockCost)} 💰</small></div>
      <p>${t('La siguiente estación por construir.')}</p>
      <div class="cd-actions"><button class="btn buy" data-open="${id}">${t('🏗️ Ir a construirla')}</button></div>`;
  }
  const st = state.stations[id];
  const icon = outIcon(id);
  const lines = [];
  lines.push(row.incoming === null
    ? t('Produce <b>{n}</b>.', { n: `${formatRate(row.output)} ${icon}/s` })
    : t('Recibe {in}/s y procesa hasta {cap}/s → <b>{out}</b>.', { in: formatRate(row.incoming), cap: formatRate(row.capacity), out: `${formatRate(row.output)} ${icon}/s` }));
  // Lo que llega de otras zonas.
  for (const imp of def.imports ?? []) {
    const r = ROUTES_BY_ID[imp.route];
    const from = routeOrigin(r);
    lines.push(`${t('{p} desde {zone}: llegan {n}/s ({route}).', { p: `${PRODUCTS[imp.product].icon} ${PRODUCTS[imp.product].name}`, zone: `${from.icon} ${from.name}`, n: formatRate(row.imported[imp.product]), route: `${r.icon} ${t('Nv')} ${routeLevel(state, r)}` })}${row.importLimited === r.id ? ` <span class="lost">${t('⏸️ No alcanza: la estación espera.')}</span>` : ''}`);
  }
  // Lo que junta de otra estación de su zona (v4.0).
  for (const [product, from] of Object.entries(JOIN_FROM[id] ?? {})) {
    lines.push(`${t('{p} de {station}: llegan {n}/s.', { p: `${PRODUCTS[product].icon} ${PRODUCTS[product].name}`, station: withArticle(STATIONS_BY_ID[from].name), n: formatRate(row.joined?.[product] ?? 0) })}${row.joinLimited === product ? ` <span class="lost">${t('⏸️ No alcanza: la estación espera.')}</span>` : ''}`);
  }
  // Su subproducto, por la canaleta (v4.0).
  if (row.byOutput !== undefined) {
    const by = PRODUCTS[Object.keys(def.by)[0]];
    const kidsBy = BY_CHILDREN[id].filter((c) => rows[c]);
    lines.push(t('Además saca {n} de {p}, que pasan por la canaleta a {stations}.', { n: `${formatRate(row.byOutput)} ${by.icon}/s`, p: by.name.toLowerCase(), stations: listNames(kidsBy) }));
    if (row.byLost > 0.005) lines.push(`<span class="lost">${t('🗑️ {n} se desechan: {stations} no da abasto.', { n: `${formatRate(row.byLost)} ${by.icon}/s`, stations: listNames(kidsBy) })}</span>`);
  }
  // Los arrieros: cuánto llevan y a dónde.
  const kids = [...row.children, ...buildableStations(state, zone).filter((l) => PARENT[l] === id)];
  const route = row.exports?.length ? ` ${t('y {route}', { route: withArticle(ROUTES_BY_ID[row.exports[0]].name) })}` : '';
  const carries = kids.length > 1 || (kids.length && row.exports?.length)
    ? (kids.length > 1 ? t('reparten <b>{n}</b> entre {k} ramas', { n: formatRate(row.toNext), k: kids.length }) : t('reparten <b>{n}</b> entre {k} estación', { n: formatRate(row.toNext), k: kids.length })) + route
    : kids.length ? t('llevan <b>{n}</b> a {station}', { n: formatRate(row.toNext), station: withArticle(STATIONS_BY_ID[kids[0]].name) }) : t('llevan <b>{n}</b> a la bodega', { n: formatRate(row.output) });
  lines.push(t('{who} ({level}) {carries}; pueden llevar hasta {cap}.', { who: hasBelt(st.transport.level) ? t('⚡ La banda') : t('🐴 Los arrieros'), level: `${t('Nv')} ${st.transport.level}`, carries, cap: `${formatRate(row.transport)} ${icon}/s` }));
  if (kids.length && row.diverted > 0.005) {
    const outId = Object.keys(def.out)[0];
    const vars = { n: `${formatRate(row.diverted)} ${icon}/s`, price: formatAmount(saleValue(state, outId)) };
    lines.push(`📦 ${row.children.length ? t('<b>{n}</b> van directo a la bodega y se venden a {price} 💰 cada uno.', vars) : t('Mientras no se construya la siguiente, <b>{n}</b> van directo a la bodega y se venden a {price} 💰 cada uno.', vars)}`);
    if (row.children.length) lines.push(divertNote(state, row, icon));
  }
  if (row.lost > 0.005) {
    // Por qué (v3.67): lo que las siguientes no alcanzan a procesar va a la bodega, más lejos que ellas, y en
    // ese viaje largo el transporte lleva menos.
    const slow = row.children.length && row.diverted > 0.005 ? slowConsumers(state, id) : [];
    const belt = hasBelt(st.transport.level);
    const v = { n: `${formatRate(row.lost)} ${icon}/s`, stations: listNames(slow) };
    const text = !slow.length
      ? t('⛔ {n} no alcanzan a salir.', v)
      : belt
        ? t('⛔ {n} no alcanzan a salir: lo que {stations} no procesa va a la bodega, que queda más lejos, y la banda no da abasto con ese viaje largo (la estación para a ratos). Sube {stations} al nivel de esta estación, o la banda.', v)
        : t('⛔ {n} no alcanzan a salir: lo que {stations} no procesa va a la bodega, que queda más lejos, y los arrieros no dan abasto con ese viaje largo (la estación para a ratos). Sube {stations} al nivel de esta estación, o los arrieros.', v);
    lines.push(`<span class="lost">${text}</span>`);
  }
  const hot = a.bottleneck === id ? `<p class="lost">${t('🔴 Esta estación es la que frena la cadena.')}</p>` : a.bottleneck === `${id}:transport` ? `<p class="lost">${t('🔴 Sus arrieros son los que frenan la cadena.')}</p>` : '';
  return `
    <div class="cd-head"><span class="cd-icon">${def.icon}</span><b>${def.name}</b> <small>${t('Nv')} ${st.level}</small></div>
    ${lines.map((l) => `<p>${l}</p>`).join('')}
    ${hot}
    <div class="cd-actions">
      <button class="btn buy" data-open="${id}">${t('🏗️ Ir al edificio')}</button>
      ${STATIONS_BY_ID[id].side ? '' : `<button class="btn" data-open="${id}:transport">${hasBelt(st.transport.level) ? t('⚡ Banda') : t('🐴 Arrieros')}</button>`}
      <button class="btn" data-open="dispatch:${zone}:stock">${t('📦 Bodega')}</button>
    </div>`;
}

// Lo que se vende sin procesar. La parte de una ruta que aún no abre (lo que no les toca a las ramas)
// no es un problema; lo que pase de ahí, sí.
function divertSplit(state, row) {
  const pending = pendingRoutes(state, row.id);
  const reserved = pending.length ? row.output * Math.max(0, 1 - CHILDREN[row.id].reduce((n, c) => n + branchShare(row.id, c), 0)) : 0;
  return { pending, reserved, extra: row.diverted - reserved };
}

function divertNote(state, row, icon) {
  const { pending, reserved, extra } = divertSplit(state, row);
  const notes = [];
  if (reserved > 0.005) notes.push(`<span>${t('🚌 {n} a la bodega: se venden hasta que abra {route}', { n: `${formatRate(Math.min(reserved, row.diverted))} ${icon}/s`, route: withArticle(pending[0].name) })}</span>`);
  if (extra > 0.005 + row.diverted * 0.02) notes.push(`<span class="divert">${t('↪ {n} se venden sin procesar', { n: `${formatRate(extra)} ${icon}/s` })}</span>`);
  return notes.join('');
}

// ---------- Diagrama (como un plano de producción) ----------
// Cada estación es una tarjeta; las del mismo paso van en la misma fila y las ramas en columnas. Los
// tubos bajan de una a la siguiente (con el producto corriendo, o en rojo donde se frena), lo que
// llega de otras zonas entra como etiquetas azules encima de la estación, y todo termina en la bodega.
const NODE_H = 62;
const DG_PAD = 6; // margen a cada lado del diagrama (lo mismo que .dg-scroll en styles.css)
const GAP = 46; // espacio vertical para los eslabones (y lo que pasa por ellos)
const TAG_H = 26; // alto de cada etiqueta de importación
const JOIN_W = 22; // lo que se angostan esas etiquetas si además le llega algo que junta (v4.0)
const NET_COL = 152; // en red (v4.7), el ancho de cada columna: las tarjetas, todas iguales, de 140
const MIN_COL = 80; // (v4.3.1: antes 98; con tres columnas no cabía en un teléfono angosto y se cortaba la de la derecha)
const NARROW = 118; // más angostas que esto, la tarjeta pone el ícono arriba y el nombre abajo

// Lo que hace una rama aparte: la Compostera vuelve abono la pulpa del Beneficiadero y todo lo que
// vende la Finca vale más.
const sideText = (state, id) => {
  const def = STATIONS_BY_ID[id];
  const from = STATIONS_BY_ID[def.requires];
  const bonus = Math.round((expectedCompostValue(state) - 1) * 100);
  return t('Recibe {in} de {from} y la vuelve {out}: todo lo que vende la zona vale <b>+{n} %</b>.', { in: Object.keys(def.in).map((p) => `${PRODUCTS[p].icon} ${PRODUCTS[p].name.toLowerCase()}`).join(', '), from: withArticle(from.name), out: PRODUCTS[Object.keys(def.out)[0]].name.toLowerCase(), n: bonus });
};

// only: con barrios (v4.5), las estaciones del que se ve; las demás no se dibujan.
function diagram(state, a, rows, locked, zone, width, selected, only = null) {
  const inSet = (id) => !only || only.has(id);
  // Las ramas aparte (v3.12: la Compostera) cuelgan de la estación que las habilita.
  const sides = ZONES_BY_ID[zone].plots.map((p) => p.stationId).filter((id) => STATIONS_BY_ID[id].side);
  // En el árbol, cada estación cuelga de la que le da su entrada principal o su subproducto (v4.0). Lo que una
  // estación junta de otra (v4.0) baja por su propia columna, un carril (`lane:<la que junta>:<la que lo hace>`; desde
  // la v4.6 una estación puede juntar de dos o tres) que cuelga de la que lo hace, y entra por arriba.
  const byKids = (id) => (BY_CHILDREN[id] ?? []).filter((c) => rows[c] && PARENT[c] === id && chainOf(zone).includes(c) && inSet(c));
  const lanes = (id) => (rows[id] ? Object.keys(JOIN_FROM).filter((j) => rows[j] && inSet(j) && Object.values(JOIN_FROM[j]).includes(id)).map((j) => `lane:${j}:${id}`) : []);
  const rawKids = (id) =>
    id.startsWith('lane:')
      ? []
      : [
          ...(rows[id]?.children ?? []).filter((c) => PARENT[c] === id && inSet(c)),
          ...(rows[id] ? byKids(id) : []),
          ...locked.filter((l) => PARENT[l] === id),
          ...(rows[id] ? sides.filter((s) => STATIONS_BY_ID[s].requires === id) : []),
          ...lanes(id),
        ];
  const under = (id) => [id, ...rawKids(id).flatMap(under)];
  // La rama que lleva lo que se junta va justo a la derecha de la rama donde está la que lo junta: así el carril
  // queda al lado y no cruza otras ramas.
  const kidsOf = (id) => {
    const kids = rawKids(id);
    for (const k of [...kids]) {
      const joins = under(k).filter((x) => x.startsWith('lane:')).map((x) => x.split(':')[1]);
      const host = kids.find((m) => m !== k && joins.some((j) => under(m).includes(j)));
      if (!host) continue;
      kids.splice(kids.indexOf(k), 1);
      kids.splice(kids.indexOf(host) + 1, 0, k);
    }
    return kids;
  };
  // Columnas: cada hoja una, cada estación centrada sobre sus ramas.
  const pos = {};
  let leaf = 0;
  const place = (id, depth) => {
    const kids = kidsOf(id);
    const first = leaf;
    for (const k of kids) place(k, depth + 1);
    const x = kids.length ? (pos[kids[0]].x + pos[kids.at(-1)].x) / 2 : leaf++;
    // span: cuántas columnas tiene debajo (la tarjeta puede ser así de ancha).
    pos[id] = { x, depth, span: Math.max(1, leaf - first) };
  };
  // Las raíces: la fuente y, con barrios (v4.5, Bogotá), la primera de cada uno, construida o la que sigue.
  for (const root of chainOf(zone).filter((id) => inSet(id) && (!PARENT[id] || !inSet(PARENT[id])) && (rows[id] || locked.includes(id)))) place(root, 0);
  const cols = Math.max(1, leaf);
  // En red (v4.7, Bogotá) todas las tarjetas tienen el mismo ancho: con tantas ramas, las de una sola columna quedaban
  // muy angostas al lado de las que tienen varias debajo.
  const net = Boolean(ZONES_BY_ID[zone].network);
  const colW = net ? NET_COL : Math.max(MIN_COL, Math.floor((width - 4) / cols));
  const total = colW * cols;
  const widthOf = (id) => (net ? colW - 12 : Math.min(pos[id].span * colW - 12, 210));
  // Los tramos que cruzan de lado (v4.7): cada uno a su propia altura dentro del espacio entre filas, para que en la red
  // no corran unos encima de otros y se vea de dónde viene cada uno.
  const slots = {};
  const slotY = (key, base) => {
    if (!net) return base;
    const k = (slots[key] = (slots[key] ?? -1) + 1);
    return base + (((k % 5) - 2) * 6);
  };
  const ids = Object.keys(pos).filter((id) => !id.startsWith('lane:'));
  const depthMax = Math.max(...ids.map((id) => pos[id].depth));
  // Cada fila deja arriba el alto de las etiquetas de importación que tenga.
  const tagsOf = (id) => STATIONS_BY_ID[id].imports ?? [];
  const rowTop = [];
  let y = 4;
  for (let d = 0; d <= depthMax; d++) {
    const band = Math.max(0, ...ids.filter((id) => pos[id].depth === d).map((id) => tagsOf(id).length)) * TAG_H;
    y += (d ? GAP : 0) + band;
    rowTop.push(y);
    y += NODE_H;
  }
  const box = (id) => {
    const cx = (pos[id].x + 0.5) * colW;
    const w = widthOf(id);
    return { cx, w, left: cx - w / 2, top: rowTop[pos[id].depth], bottom: rowTop[pos[id].depth] + NODE_H };
  };
  const bodega = { top: y + GAP + 6, w: Math.min(230, total - 16) };
  bodega.left = (total - bodega.w) / 2;
  const height = bodega.top + NODE_H + 6;

  // Eslabones: el camino dibujado dos veces (el eslabón y su hueco) en trazos que se mueven.
  const pipes = [];
  // Lo que corre por el tubo lleva el color de su producto; lo que frena va en rojo y lo que falta construir, en gris.
  // Los mismos colores que las bandas del mapa (v4.3.1).
  const colorOf = productColors(zone);
  const pipe = (d, kind, product = null) => {
    const color = kind === 'flow' && colorOf[product] ? ` style="stroke:${colorOf[product]}"` : '';
    pipes.push(`<path d="${d}" class="dg-link ${kind}"${color}/><path d="${d}" class="dg-hole ${kind}"/>`);
  };
  const nodes = [];
  // Lo que pasa por un eslabón: solo el ícono y el número.
  const flow = (x, y, product, rate, hot) =>
    nodes.push(`<span class="dg-flow ${hot ? 'hot' : ''}" style="left:${x}px;top:${y}px">${product} ${formatRate(rate)}</span>`);
  const sel = (key) => (selected === key ? 'selected' : '');
  for (const id of ids) {
    const b = box(id);
    const def = STATIONS_BY_ID[id];
    const row = rows[id];
    const parent = PARENT[id] ?? (def.side ? def.requires : undefined);
    // Una rama aparte: tubo punteado desde la estación que la abastece y, sin seguir a la bodega, lo que
    // suma al valor de lo que se vende.
    if (def.side) {
      const p = box(parent);
      const built = Boolean(state.stations[id]);
      const mid = p.bottom + GAP / 2;
      pipe(`M ${p.cx} ${p.bottom} V ${mid} H ${b.cx} V ${b.top}`, built ? 'flow' : 'locked', Object.keys(def.in ?? {})[0]);
      nodes.push(
        built
          ? `<button class="dg-node dg-side ${b.w < NARROW ? 'narrow' : ''} ${sel(id)}" data-pick="${id}" style="left:${b.left}px;top:${b.top}px;width:${b.w}px">
        <span class="dg-icon">${def.icon}</span><span class="dg-name">${def.name}</span><span class="dg-meta">${t('Nv')} ${state.stations[id].level} · 💰 +${Math.round((expectedCompostValue(state) - 1) * 100)} %</span></button>`
          : `<button class="dg-node locked ${b.w < NARROW ? 'narrow' : ''} ${sel(id)}" data-pick="${id}" style="left:${b.left}px;top:${b.top}px;width:${b.w}px">
        <span class="dg-icon">${def.icon}</span><span class="dg-name">${def.name}</span><span class="dg-meta">🔒 ${formatNumber(def.unlockCost)} 💰</span></button>`,
      );
      continue;
    }
    // Tubo desde la anterior: baja, cruza y entra por la izquierda de la tarjeta (a la derecha van las etiquetas).
    if (parent && pos[parent]) {
      const p = box(parent);
      const ex = tagsOf(id).length ? b.left + (b.w < NARROW ? 12 : 18) : b.cx;
      const mid = slotY(`mid:${pos[parent].depth}`, p.bottom + GAP / 2);
      const kind = !row ? 'locked' : a.bottleneck === `${parent}:transport` || a.bottleneck === id ? 'hot' : 'flow';
      const isBy = BY_CHILDREN[parent]?.includes(id);
      pipe(`M ${p.cx} ${p.bottom} V ${mid} H ${ex} V ${b.top}`, kind, isBy ? byOf(parent) : outOf(parent));
      const icon = isBy ? byIcon(parent) : outIcon(parent);
      if (row) flow(ex, (mid + b.top) / 2 + (pos[parent].x === pos[id].x ? -GAP / 4 : 0), icon, row.incoming, kind === 'hot');
    }
    // Lo que junta de otra estación de su zona (v4.0): baja por su carril, a la derecha, y entra por arriba.
    Object.entries(JOIN_FROM[id] ?? {}).forEach(([product, from], k) => {
      const lane = pos[`lane:${id}:${from}`];
      if (!pos[from] || !lane) return;
      const p = box(from);
      const lx = (lane.x + 0.5) * colW;
      // Con etiquetas de importados encima, entra por la orilla derecha, al lado de ellas (que se angostan).
      const tags = tagsOf(id).length;
      // Con varias (v4.6), cada una entra un poco más a la izquierda que la anterior.
      const ex = (tags ? b.left + b.w - JOIN_W / 2 : b.left + b.w * 0.78) - k * 9;
      const mid = slotY(`mid:${pos[from].depth}`, p.bottom + GAP / 2);
      const turn = slotY(`turn:${pos[id].depth}`, b.top - tags * TAG_H - GAP / 2 + 9);
      const kind = !row ? 'locked' : row.joinLimited === product || a.bottleneck === `${from}:transport` ? 'hot' : 'flow';
      pipe(`M ${p.cx} ${p.bottom} V ${mid} H ${lx} V ${turn} H ${ex} V ${b.top}`, kind, product);
      if (row) flow(lx, (mid + turn) / 2, PRODUCTS[product].icon, row.joined?.[product] ?? 0, kind === 'hot');
    });
    // Etiquetas de lo que llega de otras zonas, apiladas encima de la estación, a la derecha.
    tagsOf(id).forEach((imp, i) => {
      const r = ROUTES_BY_ID[imp.route];
      const from = routeOrigin(r);
      const n = tagsOf(id).length;
      const top = b.top - (n - i) * TAG_H;
      const left = b.left + (b.w < NARROW ? 22 : 32);
      const hot = a.bottleneck === `route:${r.id}` || row?.importLimited === r.id;
      const arriving = row?.imported?.[imp.product] ?? 0;
      nodes.push(`<button class="dg-tag ${hot ? 'hot' : ''} ${sel(`route:${r.id}`)}" data-pick="route:${r.id}" title="${t('{p} desde {zone}', { p: PRODUCTS[imp.product].name, zone: from.name })}" style="left:${left}px;top:${top + 2}px;width:${b.w - (b.w < NARROW ? 22 : 32) - (JOIN_FROM[id] ? JOIN_W : 0)}px">
        ${PRODUCTS[imp.product].icon} <span>${row ? formatRate(arriving) : from.icon}</span></button>`);
      if (i === n - 1) pipe(`M ${left + 10} ${top + TAG_H - 2} V ${b.top}`, hot ? 'hot' : row ? 'import' : 'locked');
    });
    if (!row) {
      nodes.push(`<button class="dg-node locked ${b.w < NARROW ? 'narrow' : ''} ${sel(id)}" data-pick="${id}" style="left:${b.left}px;top:${b.top}px;width:${b.w}px">
        <span class="dg-icon">${def.icon}</span><span class="dg-name">${def.name}</span><span class="dg-meta">🔒 ${formatNumber(def.unlockCost)} 💰</span></button>`);
      continue;
    }
    const hotLink = a.bottleneck === `${id}:transport`;
    nodes.push(`<button class="dg-node ${a.bottleneck === id ? 'hot' : ''} ${hotLink ? 'hot-link' : ''} ${b.w < NARROW ? 'narrow' : ''} ${sel(id)}" data-pick="${id}" style="left:${b.left}px;top:${b.top}px;width:${b.w}px">
      <span class="dg-icon">${def.icon}</span><span class="dg-name">${def.name}</span>
      <span class="dg-meta">${t('Nv')} ${state.stations[id].level}</span></button>`);
    // Las que siguen a otra estación (v3.66): una etiqueta 📦 lleva a la bodega y dice cuánto se manda a
    // vender directo (en naranja si es porque la siguiente no da abasto).
    if (kidsOf(id).length || row.children.length) {
      const sells = row.diverted > 0.005 ? row.diverted : 0;
      const warn = sells && row.children.length && divertSplit(state, row).extra > 0.005 + row.diverted * 0.02;
      const what = sells ? t('{n} por segundo van directo a la bodega', { n: formatRate(sells) }) : t('Nada va directo a la bodega');
      nodes.push(`<button class="dg-sell ${warn ? 'warn' : ''} ${sells ? '' : 'none'}" data-open="dispatch:${zone}:stock" title="${what}" style="left:${b.left + b.w}px;top:${b.bottom}px">📦${sells ? ` ${formatRate(sells)}` : ''}</button>`);
    }
    // Las que no siguen a otra estación terminan en la bodega.
    if (!kidsOf(id).length && !row.children.length) {
      const busY = bodega.top - GAP / 2;
      pipe(`M ${b.cx} ${b.bottom} V ${busY} H ${total / 2} V ${bodega.top}`, hotLink ? 'hot' : 'flow', outOf(id));
      flow(b.cx, (b.bottom + busY) / 2, outIcon(id), row.output - row.lost, hotLink);
    }
  }
  nodes.push(`<button class="dg-node dg-bodega ${a.bottleneck === `dispatch:${zone}` ? 'hot' : ''} ${sel(`dispatch:${zone}`)}" data-pick="dispatch:${zone}" style="left:${bodega.left}px;top:${bodega.top}px;width:${bodega.w}px">
    <span class="dg-icon">${DISPATCH.icon}</span><span class="dg-name">${t('Bodega y Willys')}</span>
    <span class="dg-meta">${t('Nv')} ${state.zones[zone].dispatch.level} · 💰 ${formatRate(a.income)}/s</span></button>`);
  return `
    <div class="dg-scroll"><div class="dg" style="width:${total}px;height:${height}px">
      <svg class="dg-pipes" width="${total}" height="${height}" viewBox="0 0 ${total} ${height}">${pipes.join('')}</svg>
      ${nodes.join('')}
    </div></div>`;
}
