import { formatAmount, formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { analyzeChain, expectedCompostValue } from '../sim/analysis.js';
import { hasBelt } from '../sim/rules.js';
import { CHILDREN, PARENT, branchShare, nextToUnlock } from '../sim/chain.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { pendingRoutes, slowConsumers } from '../sim/transport.js';
import { withArticle } from '../data/lore.js';
import { saleValue } from '../sim/modifiers.js';
import { listJoin, t } from '../i18n/index.js';

const outIcon = (id) => PRODUCTS[Object.keys(STATIONS_BY_ID[id].out)[0]].icon;
// «la Mesa de chocolate y la Chocolatería»
const listNames = (ids) => {
  const names = ids.map((id) => withArticle(STATIONS_BY_ID[id].name));
  return listJoin(names);
};
// La cadena (v3.0.1): un diagrama con las estaciones unidas por eslabones y, sobre cada eslabón, cuánto
// pasa por segundo. Al tocar una estación aparece abajo su detalle (lo que recibe y procesa, sus
// arrieros, lo que se desvía o se pierde, lo que llega de otras zonas) con botones para ir a ella.
export class ChainView {
  constructor(game, onOpen, getZone) {
    this.game = game;
    this.getZone = getZone;
    this.onOpen = onOpen;
    this.el = document.getElementById('chain');
    this.body = document.getElementById('chain-body');
    this.detail = document.getElementById('chain-detail');
    this.selected = null;
    document.getElementById('chain-btn').addEventListener('click', () => this.open());
    document.getElementById('chain-close').addEventListener('click', () => this.close());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) return this.close();
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
    const a = analyzeChain(state, zone);
    const rows = Object.fromEntries(a.rows.map((r) => [r.id, r]));
    const locked = nextToUnlock(state, zone);
    // Solo se reescribe si algo cambió, para no perder toques a medio hacer.
    const html = diagram(state, a, rows, locked, zone, this.body.clientWidth || 320, this.selected);
    if (html !== this.html) this.body.innerHTML = this.html = html;
    const detail = this.selected ? detailOf(state, a, rows, this.selected, zone) : '';
    this.detail.hidden = !detail;
    if (detail !== this.detailHtml) this.detail.innerHTML = this.detailHtml = detail;
  }
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
    const from = ZONES_BY_ID[r.from];
    const product = PRODUCTS[r.product];
    const id = r.stations.find((sid) => rows[sid]);
    const arriving = id ? r.stations.reduce((n, sid) => n + (rows[sid]?.imported?.[r.product] ?? 0), 0) : 0;
    const short = r.stations.some((sid) => rows[sid]?.importLimited === r.id);
    return `
      <div class="cd-head"><span class="cd-icon">${product.icon}</span><b>${product.name}</b> <small>${t('desde {zone}', { zone: `${from.icon} ${from.name}` })}</small></div>
      <p>${r.icon} ${r.name} · ${t('Nv')} ${state.routes[r.id].level} · ${t('llegan <b>{n}/s</b>', { n: formatRate(arriving) })}</p>
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
    const from = ZONES_BY_ID[r.from];
    lines.push(`${t('{p} desde {zone}: llegan {n}/s ({route}).', { p: `${PRODUCTS[imp.product].icon} ${PRODUCTS[imp.product].name}`, zone: `${from.icon} ${from.name}`, n: formatRate(row.imported[imp.product]), route: `${r.icon} ${t('Nv')} ${state.routes[r.id].level}` })}${row.importLimited === r.id ? ` <span class="lost">${t('⏸️ No alcanza: la estación espera.')}</span>` : ''}`);
  }
  // Los arrieros: cuánto llevan y a dónde.
  const kids = [...row.children, ...(PARENT[nextToUnlock(state, zone)] === id ? [nextToUnlock(state, zone)] : [])];
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
  if (extra > 0.005 + row.diverted * 0.02) notes.push(`<span class="divert">${t('↪️ {n} se venden sin procesar', { n: `${formatRate(extra)} ${icon}/s` })}</span>`);
  return notes.join('');
}

// ---------- Diagrama (como un plano de producción) ----------
// Cada estación es una tarjeta; las del mismo paso van en la misma fila y las ramas en columnas. Los
// tubos bajan de una a la siguiente (con el producto corriendo, o en rojo donde se frena), lo que
// llega de otras zonas entra como etiquetas azules encima de la estación, y todo termina en la bodega.
const NODE_H = 62;
const GAP = 46; // espacio vertical para los eslabones (y lo que pasa por ellos)
const TAG_H = 26; // alto de cada etiqueta de importación
const MIN_COL = 98;
const NARROW = 118; // más angostas que esto, la tarjeta pone el ícono arriba y el nombre abajo

// Lo que hace una rama aparte: la Compostera vuelve abono la pulpa del Beneficiadero y todo lo que
// vende la Finca vale más.
const sideText = (state, id) => {
  const def = STATIONS_BY_ID[id];
  const from = STATIONS_BY_ID[def.requires];
  const bonus = Math.round((expectedCompostValue(state) - 1) * 100);
  return t('Recibe {in} de {from} y la vuelve {out}: todo lo que vende la zona vale <b>+{n} %</b>.', { in: Object.keys(def.in).map((p) => `${PRODUCTS[p].icon} ${PRODUCTS[p].name.toLowerCase()}`).join(', '), from: withArticle(from.name), out: PRODUCTS[Object.keys(def.out)[0]].name.toLowerCase(), n: bonus });
};

function diagram(state, a, rows, locked, zone, width, selected) {
  // Las ramas aparte (v3.12: la Compostera) cuelgan de la estación que las habilita.
  const sides = ZONES_BY_ID[zone].plots.map((p) => p.stationId).filter((id) => STATIONS_BY_ID[id].side);
  const kidsOf = (id) => [
    ...(rows[id]?.children ?? []),
    ...(locked && PARENT[locked] === id ? [locked] : []),
    ...(rows[id] ? sides.filter((s) => STATIONS_BY_ID[s].requires === id) : []),
  ];
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
  const root = a.rows[0].id;
  place(root, 0);
  const cols = Math.max(1, leaf);
  const colW = Math.max(MIN_COL, Math.floor((width - 4) / cols));
  const total = colW * cols;
  const widthOf = (id) => Math.min(pos[id].span * colW - 12, 210);
  const ids = Object.keys(pos);
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
  const pipe = (d, kind) => pipes.push(`<path d="${d}" class="dg-link ${kind}"/><path d="${d}" class="dg-hole ${kind}"/>`);
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
      pipe(`M ${p.cx} ${p.bottom} V ${mid} H ${b.cx} V ${b.top}`, built ? 'import' : 'locked');
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
      const mid = p.bottom + GAP / 2;
      const kind = !row ? 'locked' : a.bottleneck === `${parent}:transport` || a.bottleneck === id ? 'hot' : 'flow';
      pipe(`M ${p.cx} ${p.bottom} V ${mid} H ${ex} V ${b.top}`, kind);
      if (row) flow(ex, (mid + b.top) / 2 + (pos[parent].x === pos[id].x ? -GAP / 4 : 0), outIcon(parent), row.incoming, kind === 'hot');
    }
    // Etiquetas de lo que llega de otras zonas, apiladas encima de la estación, a la derecha.
    tagsOf(id).forEach((imp, i) => {
      const r = ROUTES_BY_ID[imp.route];
      const from = ZONES_BY_ID[r.from];
      const n = tagsOf(id).length;
      const top = b.top - (n - i) * TAG_H;
      const left = b.left + (b.w < NARROW ? 22 : 32);
      const hot = a.bottleneck === `route:${r.id}` || row?.importLimited === r.id;
      const arriving = row?.imported?.[imp.product] ?? 0;
      nodes.push(`<button class="dg-tag ${hot ? 'hot' : ''} ${sel(`route:${r.id}`)}" data-pick="route:${r.id}" title="${t('{p} desde {zone}', { p: PRODUCTS[imp.product].name, zone: from.name })}" style="left:${left}px;top:${top + 2}px;width:${b.w - (b.w < NARROW ? 22 : 32)}px">
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
    if (kidsOf(id).length) {
      const sells = row.diverted > 0.005 ? row.diverted : 0;
      const warn = sells && row.children.length && divertSplit(state, row).extra > 0.005 + row.diverted * 0.02;
      const what = sells ? t('{n} por segundo van directo a la bodega', { n: formatRate(sells) }) : t('Nada va directo a la bodega');
      nodes.push(`<button class="dg-sell ${warn ? 'warn' : ''} ${sells ? '' : 'none'}" data-open="dispatch:${zone}:stock" title="${what}" style="left:${b.left + b.w}px;top:${b.bottom}px">📦${sells ? ` ${formatRate(sells)}` : ''}</button>`);
    }
    // Las que no siguen a otra estación terminan en la bodega.
    if (!kidsOf(id).length) {
      const busY = bodega.top - GAP / 2;
      pipe(`M ${b.cx} ${b.bottom} V ${busY} H ${total / 2} V ${bodega.top}`, hotLink ? 'hot' : 'flow');
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
