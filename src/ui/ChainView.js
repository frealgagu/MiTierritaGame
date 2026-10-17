import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { analyzeChain } from '../sim/analysis.js';
import { nextToUnlock } from '../sim/chain.js';

const outIcon = (id) => PRODUCTS[Object.keys(STATIONS_BY_ID[id].out)[0]].icon;

// Diagrama de la cadena: qué procesa cada estación, cuánto llevan sus arrieros y dónde se pierde.
export class ChainView {
  constructor(game, onOpen) {
    this.game = game;
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
    const a = analyzeChain(state);
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
      parts.push(`
        <button class="chain-card ${isBottleneck ? 'hot' : ''}" data-open="${row.id}">
          <span class="chain-icon">${def.icon}</span>
          <span class="chain-text"><b>${def.name}</b> <small>Nv ${st.level}</small><br><span>${processing}</span></span>
        </button>
        <button class="chain-link ${transportBottleneck ? 'hot' : ''}" data-open="${row.id}:transport">
          <span>🐴 Nv ${st.transport.level}</span>
          <span>${row.next ? `lleva <b>${formatRate(row.toNext)}</b>` : `lleva <b>${formatRate(row.diverted)}</b> a la bodega`} · máx ${formatRate(row.transport)} ${icon}/s</span>
          ${row.next && row.diverted > 0.005 ? `<span class="divert">↪️ ${formatRate(row.diverted)} ${icon}/s se venden sin procesar</span>` : ''}
          ${row.lost > 0.005 ? `<span class="lost">⛔ ${formatRate(row.lost)} ${icon}/s no alcanzan a salir</span>` : ''}
        </button>`);
    }
    const locked = nextToUnlock(state);
    if (locked) {
      const def = STATIONS_BY_ID[locked];
      parts.push(`
        <button class="chain-card locked" data-open="${locked}">
          <span class="chain-icon">${def.icon}</span>
          <span class="chain-text"><b>${def.name}</b> <small>🔒 ${formatNumber(def.unlockCost)} 💰</small><br><span>Siguiente estación por construir</span></span>
        </button>`);
    }
    parts.push(`
      <button class="chain-card ${a.bottleneck === 'dispatch' ? 'hot' : ''}" data-open="dispatch">
        <span class="chain-icon">${DISPATCH.icon}</span>
        <span class="chain-text"><b>Bodega y Willys</b> <small>Nv ${state.dispatch.level}</small><br>
        <span>Llegan ${formatRate(a.toWarehouse)} u/s · vende hasta ${formatRate(a.dispatch)} u/s</span></span>
      </button>
      <p class="chain-total">Ingreso estimado: <b>${formatRate(a.income)} 💰/s</b></p>`);
    // Solo se reescribe si algo cambió, para no perder toques a medio hacer.
    const html = parts.join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
