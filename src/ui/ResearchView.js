import { formatNumber } from '../core/format.js';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research.js';
import { researchBlocker } from '../sim/upgrades.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Investigaciones: compras únicas que mejoran toda la finca.
export class ResearchView {
  // onGo(id): ir a una estación (v3.12: la que le falta a una investigación bloqueada).
  constructor(game, getZone, onGo = () => {}) {
    this.game = game;
    this.getZone = getZone;
    this.onGo = onGo;
    this.modal = document.getElementById('research');
    this.body = document.getElementById('research-body');
    this.badge = document.getElementById('research-badge');
    document.getElementById('research-btn').addEventListener('click', () => this.open());
    document.getElementById('research-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      const btn = e.target.closest('[data-research]');
      if (btn) return void this.game.research(btn.dataset.research);
      // Una bloqueada: a la estación que le falta.
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
    this.update();
  }

  close() {
    this.modal.hidden = true;
  }

  update() {
    // Todas las de la zona que se está viendo y, aparte, las que ya se pueden investigar en las demás
    // (las ×2 se habilitan al nivel 25, muchas veces cuando ya se está en otra zona). El número del
    // botón cuenta las que alcanza el dinero, de todas las zonas.
    const zone = this.getZone();
    const all = RESEARCH.map((r) => [r, this.game.quoteResearch(r.id)]);
    const affordable = all.filter(([, q]) => q.ok).length;
    this.badge.hidden = affordable === 0;
    this.badge.textContent = affordable;
    if (this.modal.hidden) return;

    const here = all.filter(([r]) => r.zone === zone);
    const elsewhere = all.filter(([r, q]) => r.zone !== zone && (q.ok || q.reason === 'coins'));
    const html =
      this.rows(here) +
      (elsewhere.length ? `<h3 class="research-other">En otras zonas</h3>${this.rows(elsewhere, true)}` : '');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }

  // withZone: con la zona en el nombre (las de otras zonas).
  rows(quotes, withZone = false) {
    return quotes
      .map(([r, q]) => {
        let action;
        if (q.reason === 'owned') action = '<span class="owned">✅ Investigado</span>';
        else if (q.reason === 'locked' && r.minLevel) action = `<span class="locked">🔒 Todo al nivel ${r.minLevel} (${atLevel(this.game.state, r)})</span>`;
        else if (q.reason === 'locked' && r.stationLevel && this.game.state.stations[r.requires]) action = `<span class="locked">${stationLevelText(this.game.state, r)}</span>`;
        else if (q.reason === 'locked') action = `<span class="locked">🔒 Construye ${STATIONS_BY_ID[r.requires].name}</span>`;
        else action = `<button class="btn buy small" data-research="${r.id}" ${q.ok ? '' : 'disabled'}>💰 ${formatNumber(r.cost)}</button>`;
        return `
          <div class="research ${q.reason === 'owned' ? 'owned' : ''} ${q.reason === 'locked' ? 'locked goto' : ''}" ${q.reason === 'locked' ? `data-blocked="${r.id}" title="Ir a lo que falta"` : ''}>
            <span class="research-icon">${r.icon}</span>
            <span class="research-text"><b>${r.name}</b>${withZone ? ` <small>· ${ZONES_BY_ID[r.zone].icon} ${ZONES_BY_ID[r.zone].name}</small>` : ''}<br><small>${r.desc}</small></span>
            ${action}
          </div>`;
      })
      .join('');
  }
}

// «🔒 Nv 25 y 🐴 25 · va en 12 y 🐴 8»: lo que le falta a una de las que duplican una estación (la
// estación misma y sus arrieros; la Compostera no tiene arrieros).
function stationLevelText(state, r) {
  const st = state.stations[r.requires];
  const n = r.stationLevel;
  if (STATIONS_BY_ID[r.requires].side) return `🔒 Nv ${n}<br><small>va en ${st.level}</small>`;
  return `🔒 Nv ${n} y 🐴 ${n}<br><small>va en ${st.level} y 🐴 ${st.transport.level}</small>`;
}

// Cuántos edificios de la zona ya llegaron al nivel que pide la Maestría o la Supremacía: «5/7».
function atLevel(state, r) {
  const z = ZONES_BY_ID[r.zone];
  const ids = [...z.chain, ...z.plots.map((p) => p.stationId)];
  return `${ids.filter((id) => (state.stations[id]?.level ?? 0) >= r.minLevel).length}/${ids.length}`;
}
