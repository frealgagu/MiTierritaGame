import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { analyzeChain } from '../sim/analysis.js';
import { hasBelt } from '../sim/rules.js';
import { CHILDREN, PARENT, branchShare, nextToUnlock } from '../sim/chain.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { pendingRoutes } from '../sim/transport.js';

const outIcon = (id) => PRODUCTS[Object.keys(STATIONS_BY_ID[id].out)[0]].icon;
// Diagrama de la cadena: qué procesa cada estación, cuánto llevan sus arrieros y dónde se pierde.
export class ChainView {
  constructor(game, onOpen, getZone) {
    this.game = game;
    this.getZone = getZone;
    this.onOpen = onOpen;
    this.el = document.getElementById('chain');
    this.body = document.getElementById('chain-body');
    document.getElementById('chain-btn').addEventListener('click', () => this.open());
    document.getElementById('chain-close').addEventListener('click', () => this.close());
    // Dos vistas: el diagrama (de un vistazo, como un plano) y el detalle (la lista con los números).
    this.help = document.getElementById('chain-help');
    for (const btn of this.el.querySelectorAll('[data-chain-tab]')) {
      btn.addEventListener('click', () => {
        this.game.state.settings.chainTab = btn.dataset.chainTab;
        this.html = null;
        this.update();
      });
    }
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
      const target = e.target.closest('[data-open]');
      if (target) {
        this.close();
        this.onOpen(target.dataset.open);
      }
    });
  }

  open() {
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
    const tab = state.settings.chainTab ?? 'diagram';
    for (const btn of this.el.querySelectorAll('[data-chain-tab]')) btn.classList.toggle('active', btn.dataset.chainTab === tab);
    this.help.textContent = tab === 'diagram'
      ? 'De arriba hacia abajo, cómo pasa el producto de una estación a otra. En azul lo que llega de otras zonas; en rojo, lo que frena.'
      : 'Toca una estación o sus arrieros para mejorarlos. En rojo, lo que frena la cadena.';
    if (tab === 'diagram') {
      const html = diagram(state, a, rows, locked, zone, this.body.clientWidth || 320);
      if (html !== this.html) this.body.innerHTML = this.html = html;
      return;
    }
    // Árbol: cada estación con lo que le llega de otras zonas, sus arrieros y, debajo, la siguiente;
    // si reparte entre varias, cada rama va en su propio bloque, de su color y con su nombre.
    const html = `
      ${this.station(state, a, rows, a.rows[0].id, locked, true)}
      <div class="chain-end">
        <button class="chain-card ${a.bottleneck === `dispatch:${zone}` ? 'hot' : ''}" data-open="dispatch:${zone}">
          <span class="chain-icon">${DISPATCH.icon}</span>
          <span class="chain-text"><b>Bodega y Willys</b> <small>Nv ${state.zones[zone].dispatch.level}</small><br>
          <span>Todo lo que sale llega aquí: ${formatRate(a.toWarehouse)} u/s · vende hasta ${formatRate(a.dispatch)} u/s</span></span>
        </button>
      </div>
      <p class="chain-total">Ingreso estimado: <b>${formatRate(a.income)} 💰/s</b></p>`;
    // Solo se reescribe si algo cambió, para no perder toques a medio hacer.
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }

  // Una estación (con sus importaciones y sus arrieros) y, debajo, lo que sigue.
  station(state, a, rows, id, locked, first = false) {
    const row = rows[id];
    const def = STATIONS_BY_ID[id];
    if (!row) {
      // La siguiente por construir, en su lugar del árbol.
      return `
        <div class="chain-step">
          <button class="chain-card locked" data-open="${id}">
            <span class="chain-icon">${def.icon}</span>
            <span class="chain-text"><b>${def.name}</b> <small>🔒 ${formatNumber(def.unlockCost)} 💰</small><br><span>Siguiente estación por construir</span></span>
          </button>
        </div>`;
    }
    const st = state.stations[id];
    const icon = outIcon(id);
    const processing = row.incoming === null
      ? `Produce <b>${formatRate(row.output)} ${icon}/s</b>`
      : `Recibe ${formatRate(row.incoming)}/s · procesa hasta ${formatRate(row.capacity)}/s → <b>${formatRate(row.output)} ${icon}/s</b>`;
    const kids = [...row.children, ...(locked && PARENT[locked] === id ? [locked] : [])];
    const route = row.exports?.length ? ` y la ${ROUTES_BY_ID[row.exports[0]].name}` : '';
    const carries = kids.length > 1 || (kids.length && row.exports?.length)
      ? `reparte <b>${formatRate(row.toNext)}</b> entre ${kids.length} ${kids.length > 1 ? 'ramas' : 'estación'}${route}`
      : kids.length ? `lleva <b>${formatRate(row.toNext)}</b>` : `lleva <b>${formatRate(row.diverted)}</b> a la bodega`;
    // Lo que llega de otras zonas: una caja aparte, de la ruta, que se suma a esta estación.
    const imports = (def.imports ?? []).map((imp) => {
      const r = ROUTES_BY_ID[imp.route];
      const from = ZONES_BY_ID[r.from];
      const product = PRODUCTS[imp.product];
      return `
        <button class="chain-import ${a.bottleneck === `route:${r.id}` ? 'hot' : ''}" data-open="route:${r.id}">
          <span class="chain-import-icon">${product.icon}</span>
          <span><b>${product.name}</b> desde ${from.icon} ${from.name}<br>
          <small>${r.icon} ${r.name} · Nv ${state.routes[r.id].level} · llegan ${formatRate(row.imported[imp.product])}/s</small>
          ${row.importLimited === r.id ? `<br><span class="lost">⏸️ No alcanza: la estación espera</span>` : ''}</span>
        </button>`;
    });
    const step = `
      <div class="chain-step ${first ? 'first' : ''}">
        ${imports.length ? `<div class="chain-imports">${imports.join('')}</div>` : ''}
        <button class="chain-card ${a.bottleneck === id ? 'hot' : ''}" data-open="${id}">
          <span class="chain-icon">${def.icon}</span>
          <span class="chain-text"><b>${def.name}</b> <small>Nv ${st.level}</small><br><span>${processing}</span></span>
        </button>
        <button class="chain-link ${a.bottleneck === `${id}:transport` ? 'hot' : ''}" data-open="${id}:transport">
          <span>${hasBelt(st.transport.level) ? '⚡' : '🐴'} Nv ${st.transport.level} · ${carries} · máx ${formatRate(row.transport)} ${icon}/s</span>
          ${kids.length && row.diverted > 0.005 ? divertNote(state, row, icon) : ''}
          ${row.lost > 0.005 ? `<span class="lost">⛔ ${formatRate(row.lost)} ${icon}/s no alcanzan a salir</span>` : ''}
        </button>
      </div>`;
    if (kids.length === 1) return step + this.station(state, a, rows, kids[0], locked);
    if (!kids.length) return step;
    // Varias ramas: un bloque por rama, con su color y el nombre de lo que la forma.
    const branches = kids.map((kid, i) => {
      const names = [];
      for (let k = kid; k; k = rows[k]?.children[0] ?? (locked && PARENT[locked] === k ? locked : null)) names.push(STATIONS_BY_ID[k].name);
      return `
        <div class="chain-branch b${i}">
          <div class="chain-branch-head">Rama ${'ABCD'[i]} · ${names.join(' → ')}</div>
          ${this.station(state, a, rows, kid, locked)}
        </div>`;
    });
    return step + `<div class="chain-fork">🔀 ${STATIONS_BY_ID[id].name} reparte en ${kids.length} ramas</div>${branches.join('')}`;
  }
}

// Lo que se vende sin procesar. La parte de una ruta que aún no abre (lo que no les toca a las ramas)
// no es un problema; lo que pase de ahí, sí.
function divertNote(state, row, icon) {
  const pending = pendingRoutes(state, row.id);
  const reserved = pending.length ? row.output * Math.max(0, 1 - CHILDREN[row.id].reduce((n, c) => n + branchShare(row.id, c), 0)) : 0;
  const extra = row.diverted - reserved;
  const notes = [];
  if (reserved > 0.005) notes.push(`<span>🚌 ${formatRate(Math.min(reserved, row.diverted))} ${icon}/s a la bodega: se venden hasta que abra la ${pending[0].name}</span>`);
  if (extra > 0.005 + row.diverted * 0.02) notes.push(`<span class="divert">↪️ ${formatRate(extra)} ${icon}/s se venden sin procesar</span>`);
  return notes.join('');
}

// ---------- Diagrama (como el plano de producción de Frozen City) ----------
// Cada estación es una tarjeta; las del mismo paso van en la misma fila y las ramas en columnas. Los
// tubos bajan de una a la siguiente (con el producto corriendo, o en rojo donde se frena), lo que
// llega de otras zonas entra como etiquetas azules encima de la estación, y todo termina en la bodega.
const NODE_H = 70;
const GAP = 38; // espacio vertical para los tubos
const TAG_H = 26; // alto de cada etiqueta de importación
const MIN_COL = 98;
const NARROW = 118; // más angostas que esto, la tarjeta pone el ícono arriba y el nombre abajo

function diagram(state, a, rows, locked, zone, width) {
  const kidsOf = (id) => [...(rows[id]?.children ?? []), ...(locked && PARENT[locked] === id ? [locked] : [])];
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
  const height = bodega.top + 58 + 6;

  const pipes = [];
  const pipe = (d, kind) => pipes.push(`<path d="${d}" class="dg-pipe ${kind}"/>`);
  const nodes = [];
  for (const id of ids) {
    const b = box(id);
    const def = STATIONS_BY_ID[id];
    const row = rows[id];
    const parent = PARENT[id];
    // Tubo desde la anterior: baja, cruza y entra por la izquierda de la tarjeta (a la derecha van las etiquetas).
    if (parent && pos[parent]) {
      const p = box(parent);
      const ex = tagsOf(id).length ? b.left + (b.w < NARROW ? 12 : 18) : b.cx;
      const mid = p.bottom + GAP / 2;
      const kind = !row ? 'locked' : a.bottleneck === `${parent}:transport` || a.bottleneck === id ? 'hot' : 'flow';
      pipe(`M ${p.cx} ${p.bottom} V ${mid} H ${ex} V ${b.top}`, kind);
    }
    // Etiquetas de lo que llega de otras zonas, apiladas encima de la estación, a la derecha.
    tagsOf(id).forEach((imp, i) => {
      const r = ROUTES_BY_ID[imp.route];
      const from = ZONES_BY_ID[r.from];
      const n = tagsOf(id).length;
      const top = b.top - (n - i) * TAG_H;
      const left = b.left + (b.w < NARROW ? 22 : 32);
      const hot = a.bottleneck === `route:${r.id}` || row?.importLimited === r.id;
      nodes.push(`<button class="dg-tag ${hot ? 'hot' : ''}" data-open="route:${r.id}" title="${PRODUCTS[imp.product].name} desde ${from.name}" style="left:${left}px;top:${top + 2}px;width:${b.w - (b.w < NARROW ? 22 : 32)}px">
        ${PRODUCTS[imp.product].icon} <span>${b.w < NARROW ? `← ${from.icon}` : `${from.icon} ${from.name.replace(/^(La|El) /, '')}`}</span></button>`);
      if (i === n - 1) pipe(`M ${left + 10} ${top + TAG_H - 2} V ${b.top}`, hot ? 'hot' : 'import');
    });
    if (!row) {
      nodes.push(`<button class="dg-node locked ${b.w < NARROW ? 'narrow' : ''}" data-open="${id}" style="left:${b.left}px;top:${b.top}px;width:${b.w}px">
        <span class="dg-icon">${def.icon}</span><span class="dg-name">${def.name}</span><span class="dg-meta">🔒 ${formatNumber(def.unlockCost)} 💰</span></button>`);
      continue;
    }
    const icon = outIcon(id);
    nodes.push(`<button class="dg-node ${a.bottleneck === id ? 'hot' : ''} ${b.w < NARROW ? 'narrow' : ''}" data-open="${id}" style="left:${b.left}px;top:${b.top}px;width:${b.w}px">
      <span class="dg-icon">${def.icon}</span><span class="dg-name">${def.name}</span>
      <span class="dg-meta">Nv ${state.stations[id].level} · ${formatRate(row.output)} ${icon}/s</span></button>`);
    // Las que no siguen a otra estación terminan en la bodega.
    if (!kidsOf(id).length) {
      const busY = bodega.top - GAP / 2;
      pipe(`M ${b.cx} ${b.bottom} V ${busY} H ${total / 2} V ${bodega.top}`, a.bottleneck === `${id}:transport` ? 'hot' : 'flow');
    }
  }
  nodes.push(`<button class="dg-node dg-bodega ${a.bottleneck === `dispatch:${zone}` ? 'hot' : ''}" data-open="dispatch:${zone}" style="left:${bodega.left}px;top:${bodega.top}px;width:${bodega.w}px">
    <span class="dg-icon">${DISPATCH.icon}</span><span class="dg-name">Bodega y Willys</span>
    <span class="dg-meta">Nv ${state.zones[zone].dispatch.level} · ${formatRate(a.income)} 💰/s</span></button>`);
  return `
    <div class="dg-scroll"><div class="dg" style="width:${total}px;height:${height}px">
      <svg class="dg-pipes" width="${total}" height="${height}" viewBox="0 0 ${total} ${height}">${pipes.join('')}</svg>
      ${nodes.join('')}
    </div></div>`;
}
