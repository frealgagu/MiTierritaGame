import { formatNumber } from '../core/format.js';
import { GOALS } from '../data/goals.js';
import { activeGoals, goalProgress, goalText } from '../sim/goals.js';

// Objetivos: un marcador abajo a la izquierda con el objetivo actual y una lista con los tres visibles.
export class GoalsView {
  constructor(game) {
    this.game = game;
    this.modal = document.getElementById('goals');
    this.body = document.getElementById('goals-body');
    this.tracker = document.getElementById('tracker');
    this.badge = document.getElementById('goals-badge');
    document.getElementById('goals-btn').addEventListener('click', () => this.open());
    document.getElementById('goals-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      const btn = e.target.closest('[data-claim]');
      if (btn) this.game.claimGoal(btn.dataset.claim);
    });
    this.tracker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-claim]');
      if (btn) this.game.claimGoal(btn.dataset.claim);
      else this.open();
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
    const goals = activeGoals(state);
    const progress = goals.map((g) => goalProgress(state, g));
    const claimable = progress.filter((p) => p.done).length;
    this.badge.hidden = claimable === 0;
    this.badge.textContent = claimable;

    // Marcador: el primer objetivo (o el primero que ya se puede cobrar).
    const i = Math.max(0, progress.findIndex((p) => p.done));
    const g = goals[i];
    this.tracker.hidden = !g;
    if (g) {
      const html = goalCard(g, progress[i], true);
      if (html !== this.trackerHtml) this.tracker.innerHTML = this.trackerHtml = html;
    }

    if (this.modal.hidden) return;
    const done = state.goals.claimed.length;
    const html = `
      <p class="goals-count">Objetivo ${Math.min(done + 1, GOALS.length)} de ${GOALS.length}</p>
      ${goals.map((goal, k) => goalCard(goal, progress[k], false)).join('')}
      ${goals.length === 0 ? '<p class="goals-count">¡Completaste todos los objetivos de la Zona 1!</p>' : ''}`;
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}

function goalCard(goal, p, compact) {
  const pct = Math.round((p.current / p.target) * 100);
  const showCount = p.target > 1;
  const reward = goal.final ? '🏁 Final de la zona' : `+${formatNumber(goal.reward)} 💰`;
  const action = p.done
    ? `<button class="btn claim" data-claim="${goal.id}">${goal.final ? '¡Completar zona!' : `Cobrar ${reward}`}</button>`
    : `<span class="goal-reward">${reward}</span>`;
  return `
    <div class="goal ${p.done ? 'done' : ''} ${goal.final ? 'final' : ''} ${compact ? 'compact' : ''}">
      <div class="goal-text">${p.done ? '✅' : '🎯'} ${goalText(goal)}</div>
      <div class="goal-row">
        <div class="bar"><div style="width:${pct}%"></div></div>
        ${showCount ? `<span class="goal-count">${formatNumber(p.current)} / ${formatNumber(p.target)}</span>` : ''}
      </div>
      <div class="goal-foot">${action}</div>
    </div>`;
}
