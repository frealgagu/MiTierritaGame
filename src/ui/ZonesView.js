import { formatRate } from '../core/format.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS } from '../data/regions.js';
import { analyzeChain } from '../sim/analysis.js';
import { regionState } from '../sim/regions.js';
import { ZoneMap } from './ZoneMap.js';
import { toast } from './toast.js';

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
    // El mapa de Colombia (v3.60): en grande, en su propia ventana. Desde la v3.67 es lo que abre el botón 🗺️;
    // la lista se ve con «📋 Lista».
    this.mapModal = document.getElementById('zones-map-modal');
    this.map = new ZoneMap(document.getElementById('zones-map'), {
      root,
      getZone,
      say: (text) => toast(text, 2500),
      onGo: (z) => {
        this.mapModal.hidden = true;
        this.close();
        this.onGo(z);
      },
    });
    document.getElementById('zones-map-btn').addEventListener('click', () => this.openMap());
    document.getElementById('zones-map-close').addEventListener('click', () => !this.map.busy && (this.mapModal.hidden = true));
    document.getElementById('zones-list-btn').addEventListener('click', () => {
      if (this.map.busy) return;
      this.mapModal.hidden = true;
      this.open();
    });
    this.button.addEventListener('click', () => this.openMap());
    document.getElementById('zones-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      // Plegar o desplegar una región (v3.54).
      const fold = e.target.closest('[data-fold]');
      if (fold) {
        const folds = (this.root.state.settings.zonesFold ??= {});
        folds[fold.dataset.fold] = !this.folded(fold.dataset.fold);
        this.update();
        return;
      }
      const btn = e.target.closest('[data-zone]');
      if (btn) this.travel(btn.dataset.zone);
    });
  }

  open() {
    this.modal.hidden = false;
    this.html = null;
    this.update();
  }

  openMap() {
    this.close();
    this.mapModal.hidden = false;
    this.map.show();
  }

  // Ir a otra zona mostrando el viaje en el mapa (v3.67): al elegirla en la lista o al terminar una zona.
  travel(zoneId) {
    if (this.map.busy) return;
    this.close();
    this.mapModal.hidden = false;
    this.map.show();
    this.map.travel(zoneId);
  }

  close() {
    this.modal.hidden = true;
  }

  // Una región está plegada si así la dejó el jugador; si no la ha tocado, solo se ve abierta la de la zona
  // donde está (v3.54).
  folded(regionId) {
    const fold = this.root.state.settings.zonesFold?.[regionId];
    if (fold !== undefined) return fold;
    return !REGIONS.find((r) => r.id === regionId).zones.includes(this.getZone());
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
      if (!state) {
        const head = `<h3 class="research-other">${region.icon} ${region.name}</h3>`;
        const from = ZONES_BY_ID[region.unlock.zone];
        return group(`${head}<div class="research locked"><span class="research-icon">🔒</span><span class="research-text"><b>${region.name}</b><br><small>Se abre al completar ${from.name}.</small></span></div>`);
      }
      // La cabecera pliega la región; plegada, dice cuántas zonas lleva y cuánto rinde.
      const folded = this.folded(region.id);
      const opened = region.zones.filter((z) => state.zones[z]?.unlocked);
      const done = region.zones.filter((z) => state.zones[z]?.complete).length;
      const income = opened.reduce((sum, z) => sum + analyzeChain(state, z).income, 0);
      const here = region.zones.includes(this.getZone()) ? ' · 📍 Aquí estás' : '';
      const head = `<button class="zones-region research-other" data-fold="${region.id}" aria-expanded="${!folded}"><span class="zones-fold">${folded ? '▸' : '▾'}</span> ${region.icon} ${region.name}<small>${done}/${region.zones.length} 🏁 · ${formatRate(income)} 💰/s${here}</small></button>`;
      if (folded) return group(head);
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
      return group(head + rows.join('') + soon.join(''));
    }).join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}

// Cada región en su panel sombreado (v3.59): la cabecera arriba y sus zonas adentro, un poco más angostas, para
// que se vea a qué región pertenece cada una.
const group = (html) => `<div class="zones-group">${html}</div>`;
