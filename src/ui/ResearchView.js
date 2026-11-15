import { formatNumber } from '../core/format.js';
import { t } from '../i18n/index.js';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research.js';
import { bulkResearch, previewAllResearch, researchBlocker } from '../sim/upgrades.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Research: one-time purchases improving the whole estate.
export class ResearchView {
  // onGo(id): jump to a station (v3.12: station missing for a locked research upgrade).
  constructor(game, getZone, onGo = () => {}) {
    this.game = game;
    this.getZone = getZone;
    this.onGo = onGo;
    this.modal = document.getElementById('research');
    this.body = document.getElementById('research-body');
    this.foot = document.getElementById('research-foot'); // «Buy all», pinned below outside the scroll list (v3.57)
    this.badge = document.getElementById('research-badge');
    document.getElementById('research-btn').addEventListener('click', () => this.open());
    document.getElementById('research-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      // (v5.8) «In other zones» folds and unfolds; the choice is kept.
      if (e.target.closest('[data-rfold]')) {
        const settings = this.game.state.settings;
        settings.researchOtherFolded = !settings.researchOtherFolded;
        return void this.update();
      }
      const btn = e.target.closest('[data-research]');
      if (btn) return void this.game.research(btn.dataset.research);
      if (e.target.closest('[data-research-all]')) {
        this.game.researchAll(this.getZone());
        this.scrollPending = true;
        return void this.update();
      }
      // Locked one: jumps to its missing station.
      const row = e.target.closest('[data-blocked]');
      if (!row) return;
      const target = researchBlocker(this.game.state, RESEARCH_BY_ID[row.dataset.blocked]);
      if (!target) return;
      this.close();
      this.onGo(target);
    });
  }

  open() {
    this.modal.hidden = false;
    this.html = null;
    this.scrollPending = true;
    this.update();
  }

  // On open and after «Buy all» (v3.57): scrolls to cheapest unbought research in this zone or, if
  // all done, to Mastery and Supremacy (listed separately), keeping them in view.
  scrollToPending() {
    const zone = this.getZone();
    const left = bulkResearch(this.game.state, zone).filter((r) => !this.game.state.research.includes(r.id));
    const target = left[0] ?? RESEARCH.find((r) => r.zone === zone && r.minLevel && !this.game.state.research.includes(r.id));
    const row = target && this.body.querySelector(`[data-row="${target.id}"]`);
    if (row) this.body.scrollTop = Math.max(0, row.offsetTop - this.body.offsetTop - 60);
  }

  close() {
    this.modal.hidden = true;
  }

  update() {
    // All upgrades in viewed zone plus currently researchable ones in other zones
    // (×2 ones unlock at level 25, often when already playing in another zone). Badge count
    // includes affordable ones across all zones.
    const zone = this.getZone();
    const all = RESEARCH.map((r) => [r, this.game.quoteResearch(r.id)]);
    const affordable = all.filter(([, q]) => q.ok).length;
    this.badge.hidden = affordable === 0;
    this.badge.textContent = affordable;
    if (this.modal.hidden) return;

    const here = all.filter(([r]) => r.zone === zone);
    const elsewhere = all.filter(([r, q]) => r.zone !== zone && (q.ok || q.reason === 'coins'));
    // «Buy all» (v3.57): affordable ones in this zone, cheapest to costliest
    // (excluding Mastery and Supremacy).
    const preview = previewAllResearch(this.game.state, zone);
    const buyAll = preview.count > 0 ? `<button class="btn buy bulk" data-research-all>${t('🛒 Comprar todas ({n})', { n: preview.count })} · 💰 ${formatNumber(preview.cost)}</button>` : '';
    if (buyAll !== this.footHtml) this.foot.innerHTML = this.footHtml = buyAll;
    const html =
      this.rows(here) +
      (elsewhere.length ? this.otherZones(elsewhere) : '');
    if (html !== this.html) this.body.innerHTML = this.html = html;
    if (this.scrollPending) {
      this.scrollPending = false;
      this.scrollToPending();
    }
  }

  // Research in other zones (v5.8): a header that folds the list, with how many there are.
  otherZones(quotes) {
    const folded = Boolean(this.game.state.settings.researchOtherFolded);
    const head = `<button class="zones-region research-other" data-rfold aria-expanded="${!folded}"><span class="zones-fold">${folded ? '▸' : '▾'}</span> ${t('En otras zonas')} (${quotes.length})</button>`;
    return head + (folded ? '' : this.rows(quotes, true));
  }

  // withZone: include zone name (upgrades in other zones).
  rows(quotes, withZone = false) {
    return quotes
      .map(([r, q]) => {
        let action;
        if (q.reason === 'owned') action = `<span class="owned">${t('✅ Investigado')}</span>`;
        else if (q.reason === 'locked' && r.minLevel) action = `<span class="locked">${t('🔒 Todo al nivel {n} ({have})', { n: r.minLevel, have: atLevel(this.game.state, r) })}</span>`;
        else if (q.reason === 'locked' && r.stationLevel && this.game.state.stations[r.requires]) action = `<span class="locked">${stationLevelText(this.game.state, r)}</span>`;
        else if (q.reason === 'locked') action = `<span class="locked">${t('🔒 Construye {station}', { station: STATIONS_BY_ID[r.requires].name })}</span>`;
        else action = `<button class="btn buy small" data-research="${r.id}" ${q.ok ? '' : 'disabled'}>💰 ${formatNumber(r.cost)}</button>`;
        return `
          <div data-row="${r.id}" class="research ${q.reason === 'owned' ? 'owned' : ''} ${q.reason === 'locked' ? 'locked goto' : ''}" ${q.reason === 'locked' ? `data-blocked="${r.id}" title="${t('Ir a lo que falta')}"` : ''}>
            <span class="research-icon">${r.icon}</span>
            <span class="research-text"><b>${r.name}</b>${withZone ? ` <small>· ${ZONES_BY_ID[r.zone].icon} ${ZONES_BY_ID[r.zone].name}</small>` : ''}<br><small>${r.desc}</small></span>
            ${action}
          </div>`;
      })
      .join('');
  }
}

// «🔒 Lv 25 and 🐴 25 · at 12 and 🐴 8»: requirements for station-doubling research (the
// station itself and its haulers; Compostera has no haulers).
function stationLevelText(state, r) {
  const st = state.stations[r.requires];
  const n = r.stationLevel;
  if (STATIONS_BY_ID[r.requires].side) return `🔒 ${t('Nv')} ${n}<br><small>${t('va en {n}', { n: st.level })}</small>`;
  return `🔒 ${t('Nv')} ${n} ${t('y')} 🐴 ${n}<br><small>${t('va en {n}', { n: st.level })} ${t('y')} 🐴 ${st.transport.level}</small>`;
}

// How many zone buildings already meet Mastery or Supremacy level requirement: «5/7».
function atLevel(state, r) {
  const z = ZONES_BY_ID[r.zone];
  // (Deduplicated: chain stations also sit on lots; counting both showed 9/11 with one missing.)
  const ids = [...new Set([...z.chain, ...z.plots.map((p) => p.stationId)])];
  return `${ids.filter((id) => (state.stations[id]?.level ?? 0) >= r.minLevel).length}/${ids.length}`;
}
