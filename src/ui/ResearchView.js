import { formatNumber } from '../core/format.js';
import { RESEARCH } from '../data/research.js';
import { STATIONS_BY_ID } from '../data/stations.js';

// Investigaciones: compras únicas que mejoran toda la finca.
export class ResearchView {
  constructor(game) {
    this.game = game;
    this.modal = document.getElementById('research');
    this.body = document.getElementById('research-body');
    this.badge = document.getElementById('research-badge');
    document.getElementById('research-btn').addEventListener('click', () => this.open());
    document.getElementById('research-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      const btn = e.target.closest('[data-research]');
      if (btn) this.game.research(btn.dataset.research);
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
    const quotes = RESEARCH.map((r) => [r, this.game.quoteResearch(r.id)]);
    const affordable = quotes.filter(([, q]) => q.ok).length;
    this.badge.hidden = affordable === 0;
    this.badge.textContent = affordable;
    if (this.modal.hidden) return;

    const html = quotes
      .map(([r, q]) => {
        let action;
        if (q.reason === 'owned') action = '<span class="owned">✅ Investigado</span>';
        else if (q.reason === 'locked') action = `<span class="locked">🔒 Construye ${STATIONS_BY_ID[r.requires].name}</span>`;
        else action = `<button class="btn buy small" data-research="${r.id}" ${q.ok ? '' : 'disabled'}>💰 ${formatNumber(r.cost)}</button>`;
        return `
          <div class="research ${q.reason === 'owned' ? 'owned' : ''} ${q.reason === 'locked' ? 'locked' : ''}">
            <span class="research-icon">${r.icon}</span>
            <span class="research-text"><b>${r.name}</b><br><small>${r.desc}</small></span>
            ${action}
          </div>`;
      })
      .join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
