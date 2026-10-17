import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { analyzeChain } from '../sim/analysis.js';
import { hasBelt } from '../sim/rules.js';
import { CHILDREN, PARENT, nextToUnlock } from '../sim/chain.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

const outIcon = (id) => PRODUCTS[Object.keys(STATIONS_BY_ID[id].out)[0]].icon;
// Una estación está en una rama si algún antecesor reparte su producto entre varias.
const inBranch = (id) => {
  for (let p = PARENT[id], c = id; p; c = p, p = PARENT[p]) if (CHILDREN[p].length > 1) return true;
  return false;
};

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
    const parts = [];
    for (const row of a.rows) {
      const def = STATIONS_BY_ID[row.id];
      const st = state.stations[row.id];
      const icon = outIcon(row.id);
      const isBottleneck = a.bottleneck === row.id;
      const transportBottleneck = a.bottleneck === `${row.id}:transport`;
      const processing = row.incoming === null
        ? `Produce <b>${formatRate(row.output)} ${icon}/s</b>`
        : `Recibe ${formatRate(row.incoming)}/s · procesa hasta ${formatRate(row.capacity)}/s → <b>${formatRate(row.output)} ${icon}/s</b>`;
      const branch = inBranch(row.id) ? 'branch' : '';
      const carries = row.children.length > 1
        ? `reparte <b>${formatRate(row.toNext)}</b> entre ${row.children.length}`
        : row.next ? `lleva <b>${formatRate(row.toNext)}</b>` : `lleva <b>${formatRate(row.diverted)}</b> a la bodega`;
      const imp = def.import;
      const route = imp ? ROUTES_BY_ID[imp.route] : null;
      parts.push(`
        ${route ? `<button class="chain-link ${branch} ${a.bottleneck === `route:${route.id}` ? 'hot' : ''}" data-open="route:${route.id}">
          <span>${route.icon} ${route.name} · Nv ${state.routes[route.id].level}</span>
          <span>desde ${ZONES_BY_ID[route.from].name}: llegan <b>${formatRate(row.imported)}</b> ${PRODUCTS[imp.product].icon}/s</span>
          ${row.importLimited ? `<span class="lost">⏸️ Falta ${PRODUCTS[imp.product].name.toLowerCase()} para trabajar a toda marcha</span>` : ''}
        </button>` : ''}
        <button class="chain-card ${branch} ${isBottleneck ? 'hot' : ''}" data-open="${row.id}">
          <span class="chain-icon">${def.icon}</span>
          <span class="chain-text"><b>${def.name}</b> <small>Nv ${st.level}</small><br><span>${processing}</span></span>
        </button>
        <button class="chain-link ${branch} ${transportBottleneck ? 'hot' : ''}" data-open="${row.id}:transport">
          <span>${hasBelt(st.transport.level) ? '⚡' : '🐴'} Nv ${st.transport.level}</span>
          <span>${carries} · máx ${formatRate(row.transport)} ${icon}/s</span>
          ${row.next && row.diverted > 0.005 ? `<span class="divert">↪️ ${formatRate(row.diverted)} ${icon}/s se venden sin procesar</span>` : ''}
          ${row.lost > 0.005 ? `<span class="lost">⛔ ${formatRate(row.lost)} ${icon}/s no alcanzan a salir</span>` : ''}
        </button>`);
    }
    const locked = nextToUnlock(state, zone);
    if (locked) {
      const def = STATIONS_BY_ID[locked];
      parts.push(`
        <button class="chain-card locked ${inBranch(locked) ? 'branch' : ''}" data-open="${locked}">
          <span class="chain-icon">${def.icon}</span>
          <span class="chain-text"><b>${def.name}</b> <small>🔒 ${formatNumber(def.unlockCost)} 💰</small><br><span>Siguiente estación por construir${PARENT[locked] && CHILDREN[PARENT[locked]].length > 1 ? ` (otra rama de ${STATIONS_BY_ID[PARENT[locked]].name})` : ''}</span></span>
        </button>`);
    }
    parts.push(`
      <button class="chain-card ${a.bottleneck === `dispatch:${zone}` ? 'hot' : ''}" data-open="dispatch:${zone}">
        <span class="chain-icon">${DISPATCH.icon}</span>
        <span class="chain-text"><b>Bodega y Willys</b> <small>Nv ${state.zones[zone].dispatch.level}</small><br>
        <span>Llegan ${formatRate(a.toWarehouse)} u/s · vende hasta ${formatRate(a.dispatch)} u/s</span></span>
      </button>
      <p class="chain-total">Ingreso estimado: <b>${formatRate(a.income)} 💰/s</b></p>`);
    // Solo se reescribe si algo cambió, para no perder toques a medio hacer.
    const html = parts.join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
