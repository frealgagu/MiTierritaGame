import { formatNumber, formatRate } from '../core/format.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS, shownRegions } from '../data/regions.js';
import { analyzeChain } from '../sim/analysis.js';
import { isOpen, regionState, specialProgress } from '../sim/regions.js';
import { zoneMaxed } from '../sim/legacy.js';
import { ZoneMap } from './ZoneMap.js';
import { toast } from './toast.js';
import { t } from '../i18n/index.js';

// Zone selector (v3.0: by region): which are open, income of each, and where to travel.
// 🗺️ button appears once more than one zone is open (in any region).
//   root: main save   games: Game instance per open region (appended on unlock)
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
    // Colombia map (v3.60): fullscreen in its own modal. Since v3.67 this is what 🗺️ opens;
    // the list opens via «📋 List».
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
    // Opens in last-used view (v3.67.3): map (default) or list.
    this.button.addEventListener('click', () => (this.root.state.settings.zonesView === 'list' ? this.open() : this.openMap()));
    document.getElementById('zones-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      // Collapse or expand a region (v3.54).
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
    this.root.state.settings.zonesView = 'list';
    this.modal.hidden = false;
    this.html = null;
    this.update();
  }

  openMap() {
    this.root.state.settings.zonesView = 'map';
    this.close();
    this.mapModal.hidden = false;
    this.map.show();
  }

  // Travel to another zone with map animation (v3.67): when picked in list or on zone clear.
  // With «⚡ Direct» menu toggle (v4.1.3), skip trip and switch right away.
  travel(zoneId) {
    if (this.map.busy) return;
    this.close();
    if (this.root.state.settings.travel === 'direct') {
      this.mapModal.hidden = true;
      return this.onGo(zoneId);
    }
    this.mapModal.hidden = false;
    this.map.showHere();
    this.map.travel(zoneId);
  }

  close() {
    this.modal.hidden = true;
  }

  // Region stays collapsed if player left it so; untouched defaults to only active region
  // expanded (v3.54).
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

    const html = shownRegions(isOpen(root)).map((region) => {
      const state = regionState(root, region.id);
      if (!state) {
        const head = `<h3 class="research-other">${region.icon} ${region.name}</h3>`;
        const from = ZONES_BY_ID[region.unlock.zone];
        return group(`${head}<div class="research locked"><span class="research-icon">🔒</span><span class="research-text"><b>${region.name}</b><br><small>${region.hidden ? t('Próximamente') : t('Se abre al completar {zone}.', { zone: from.name })}</small></span></div>`);
      }
      // Header toggles collapse; when collapsed, shows zone count and region income.
      const folded = this.folded(region.id);
      const opened = region.zones.filter((z) => state.zones[z]?.unlocked);
      const done = region.zones.filter((z) => state.zones[z]?.complete).length;
      // Maxed (v4.1): 🏁; completed, 🚩. Maxed count hidden while none are maxed.
      const maxed = new Set(region.zones.filter((z) => state.zones[z]?.complete && zoneMaxed(state, z)));
      const income = opened.reduce((sum, z) => sum + analyzeChain(state, z).income, 0);
      // «You are here» on first line right of name (v4.1.1: avoids wrapping to a third line).
      const here = region.zones.includes(this.getZone()) ? `<span class="zones-here">${t('📍 Aquí estás')}</span>` : '';
      // Always two lines (v4.1): name above; below, status and region coin rate.
      const counts = `${done}/${region.zones.length} 🚩${maxed.size ? ` · ${maxed.size}/${region.zones.length} 🏁` : ''}`;
      const head = `<button class="zones-region research-other" data-fold="${region.id}" aria-expanded="${!folded}"><span class="zones-fold">${folded ? '▸' : '▾'}</span> ${region.icon} ${region.name}${here}<small>${counts} · 💰 ${formatNumber(state.coins)} (${formatRate(income)} 💰/s)</small></button>`;
      if (folded) return group(head);
      const rows = region.zones.map((id, i) => {
        const zone = ZONES_BY_ID[id];
        const st = state.zones[id];
        const current = id === this.getZone();
        let status;
        let action = '';
        if (!st.unlocked) status = `<small>${t('🔒 Completa {zone}', { zone: ZONES_BY_ID[region.zones[i - 1]].name })}</small>`;
        else {
          const income = analyzeChain(state, id).income;
          status = `<small>${maxed.has(id) ? t('🏁 Al máximo') : st.complete ? t('🚩 Completada') : t('⏳ En juego')} · ${formatRate(income)} 💰/s</small>`;
          action = current ? `<span class="owned">${t('Aquí estás')}</span>` : `<button class="btn buy small" data-zone="${id}">${t('Ir')}</button>`;
        }
        return `
          <div class="research ${st.unlocked ? '' : 'locked'} ${current ? 'owned' : ''}">
            <span class="research-icon">${zone.icon}</span>
            <span class="research-text"><b>${region.zones.length > 1 ? `${t('Zona {n}', { n: i + 1 })} · ` : ''}${zone.name}</b><br>${status}</span>
            ${action}
          </div>`;
      });
      // Upcoming ones (arriving in future versions).
      const soon = (region.soon ?? []).map(
        (name, k) => `<div class="research locked"><span class="research-icon">🚧</span><span class="research-text"><b>${t('Zona {n}', { n: region.zones.length + k + 1 })} · ${t(name)}</b><br><small>${t('Llega pronto')}</small></span></div>`,
      );
      return group(head + rows.join('') + soon.join(''));
    }).join('');
    // Special zone (v4.7.1): future reward. Unlocks with second ending (all at level 100) in
    // each region, or already reset once; shows progress toward it.
    // (v5.4) Once open, it is listed above like any other region.
    const { n, total } = specialProgress(root);
    const special = REGIONS.some((r) => r.special && !regionState(root, r.id))
      ? group(`<div class="research locked"><span class="research-icon">⭐</span><span class="research-text"><b>${t('Zona especial')}</b><br><small>${t('Se abre cuando logres el segundo final (todo al nivel 100) en cada región, o la hayas reiniciado: {n} de {total}.', { n, total })}</small></span></div>`)
      : '';
    const all = html + special;
    if (all !== this.html) this.body.innerHTML = this.html = all;
  }
}

// Each region inside its shaded card (v3.59): header above and zones indented inside so
// each zone clearly belongs to its region.
const group = (html) => `<div class="zones-group">${html}</div>`;
