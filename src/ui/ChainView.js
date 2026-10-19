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
