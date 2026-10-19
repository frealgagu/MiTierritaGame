import { formatRate } from '../core/format.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS } from '../data/regions.js';
import { analyzeChain } from '../sim/analysis.js';
import { regionState } from '../sim/regions.js';

// Selector de zonas (v3.0: por regiones): cuáles están abiertas, cuánto rinde cada una y a cuál ir.
// El botón 🗺️ aparece cuando hay más de una zona abierta (en cualquier región).
//   root: la partida principal   games: el Game de cada región abierta (se agregan al abrirse)
export class ZonesView {
  constructor(root, games, getZone, onGo) {
    this.root = root;
    this.games = games;
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
    const root = this.root.state;
    const visited = (root.settings.visited ??= ['finca']);
    if (!visited.includes(this.getZone())) visited.push(this.getZone());
    const open = [];
    for (const region of REGIONS) {
      const st = regionState(root, region.id);
      if (st) for (const z of region.zones) if (st.zones[z]?.unlocked) open.push(z);
    }
    this.button.hidden = open.length < 2;
    const fresh = open.filter((z) => !visited.includes(z)).length;
    this.badge.hidden = fresh === 0;
    this.badge.textContent = fresh;
    if (this.modal.hidden) return;

    const html = REGIONS.map((region) => {
      const state = regionState(root, region.id);
      const head = `<h3 class="research-other">${region.icon} ${region.name}</h3>`;
      if (!state) {
        const from = ZONES_BY_ID[region.unlock.zone];
        return `${head}<div class="research locked"><span class="research-icon">🔒</span><span class="research-text"><b>${region.name}</b><br><small>Se abre al completar ${from.name}.</small></span></div>`;
      }
      const rows = region.zones.map((id, i) => {
        const zone = ZONES_BY_ID[id];
        const st = state.zones[id];
        const current = id === this.getZone();
        let status;
        let action = '';
        if (!st.unlocked) status = `<small>🔒 Completa ${ZONES_BY_ID[region.zones[i - 1]].name}</small>`;
        else {
          const income = analyzeChain(state, id).income;
          status = `<small>${st.complete ? '🏁 Completada' : '⏳ En juego'} · ${formatRate(income)} 💰/s</small>`;
          action = current ? '<span class="owned">Aquí estás</span>' : `<button class="btn buy small" data-zone="${id}">Ir</button>`;
        }
        return `
          <div class="research ${st.unlocked ? '' : 'locked'} ${current ? 'owned' : ''}">
            <span class="research-icon">${zone.icon}</span>
            <span class="research-text"><b>Zona ${i + 1} · ${zone.name}</b><br>${status}</span>
            ${action}
          </div>`;
      });
      // Las que todavía no existen (llegan en las próximas versiones).
      const soon = (region.soon ?? []).map(
        (name, k) => `<div class="research locked"><span class="research-icon">🚧</span><span class="research-text"><b>Zona ${region.zones.length + k + 1} · ${name}</b><br><small>Llega pronto</small></span></div>`,
      );
      return head + rows.join('') + soon.join('');
    }).join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
