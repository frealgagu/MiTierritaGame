import { formatRate } from '../core/format.js';
import { ZONE_LIST } from '../data/zones/index.js';
import { ZONES as ALL_ZONES } from '../data/products.js';
import { analyzeChain } from '../sim/analysis.js';

// Selector de zonas: cuáles están abiertas, cuánto rinde cada una y a cuál ir.
// El botón 🗺️ aparece cuando hay más de una zona abierta.
export class ZonesView {
  constructor(game, getZone, onGo) {
    this.game = game;
    this.getZone = getZone;
    this.onGo = onGo;
    this.modal = document.getElementById('zones');
    this.body = document.getElementById('zones-body');
    this.button = document.getElementById('zones-btn');
    this.badge = document.getElementById('zones-badge');
    this.button.addEventListener('click', () => this.open());
    document.getElementById('zones-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      const btn = e.target.closest('[data-zone]');
      if (btn) {
        this.close();
        this.onGo(btn.dataset.zone);
      }
    });
  }

  open() {
    this.modal.hidden = false;
    this.html = null;
    this.update();
  }

  close() {
    this.modal.hidden = true;
  }

  update() {
    const state = this.game.state;
    const visited = (state.settings.visited ??= ['finca']);
    if (!visited.includes(this.getZone())) visited.push(this.getZone());
    const open = ZONE_LIST.filter((z) => state.zones[z.id].unlocked);
    this.button.hidden = open.length < 2;
    const fresh = open.filter((z) => !visited.includes(z.id)).length;
    this.badge.hidden = fresh === 0;
    this.badge.textContent = fresh;
    if (this.modal.hidden) return;

    const html = ALL_ZONES.map((info, i) => {
      const zone = ZONE_LIST.find((z) => z.id === info.id);
      const st = state.zones[info.id];
      const current = info.id === this.getZone();
      let status;
      let action = '';
      if (!zone) status = `<small>🚧 Llega en la v${info.release}</small>`;
      else if (!st.unlocked) status = `<small>🔒 Completa ${ZONE_LIST[i - 1].name}</small>`;
      else {
        const income = analyzeChain(state, info.id).income;
        status = `<small>${st.complete ? '🏁 Completada' : '⏳ En juego'} · ${formatRate(income)} 💰/s</small>`;
        action = current ? '<span class="owned">Aquí estás</span>' : `<button class="btn buy small" data-zone="${info.id}">Ir</button>`;
      }
      return `
        <div class="research ${zone && st.unlocked ? '' : 'locked'} ${current ? 'owned' : ''}">
          <span class="research-icon">${zone?.icon ?? '❔'}</span>
          <span class="research-text"><b>Zona ${i + 1} · ${info.name}</b><br>${status}</span>
          ${action}
        </div>`;
    }).join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
