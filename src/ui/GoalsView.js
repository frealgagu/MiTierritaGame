import { formatMult, formatNumber } from '../core/format.js';
import { GOALS_BY_ZONE } from '../data/goals.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { activeGoals, goalProgress, goalText } from '../sim/goals.js';
import { ALL_STATIONS, maxedCount } from '../sim/legacy.js';
import { legacyMult } from '../sim/modifiers.js';
import { fit } from './fit.js';

// Objetivos: un marcador abajo a la izquierda con el objetivo actual y una lista con los tres visibles.
export class GoalsView {
  constructor(game, getZone) {
    this.game = game;
    this.getZone = getZone;
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
      if (e.target.closest('[data-mastery]')) this.onMastery?.();
    });
    this.tracker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-claim]');
      if (btn) this.game.claimGoal(btn.dataset.claim);
      else if (e.target.closest('[data-mastery]')) this.onMastery?.();
      else this.open();
    });
    this.onMastery = null; // main.js: abre la pantalla del segundo final
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
    const zone = this.getZone();
    const goals = activeGoals(state, zone);
    const progress = goals.map((g) => goalProgress(state, g));
    const claimable = progress.filter((p) => p.done).length;
    this.badge.hidden = claimable === 0;
    this.badge.textContent = claimable;

    // Marcador: el primer objetivo (o el primero que ya se puede cobrar). Con todas las zonas
    // completas y sin objetivos aquí, el segundo final: todas las estaciones al nivel 100.
    const i = Math.max(0, progress.findIndex((p) => p.done));
    const g = goals[i];
    const master = !g && state.zones.pueblo?.complete ? masteryCard(state, true) : null;
    this.tracker.hidden = !g && !master;
    const trackerHtml = g ? goalCard(g, progress[i], true) : master;
    if (trackerHtml && trackerHtml !== this.trackerHtml) {
      this.tracker.innerHTML = this.trackerHtml = trackerHtml;
      this.trackerFit = false;
    }
    // El marcador tiene alto fijo: un texto largo se achica (cuando se ve; oculto no se puede medir).
    if (!this.trackerFit && this.tracker.clientWidth) {
      fit(this.tracker.querySelector('.goal-text'));
      this.trackerFit = true;
    }

    if (this.modal.hidden) return;
    const list = GOALS_BY_ZONE[zone];
    const done = list.filter((g) => state.goals.claimed.includes(g.id)).length;
    const html = `
      <p class="goals-count">${ZONES_BY_ID[zone].icon} ${ZONES_BY_ID[zone].name} · objetivo ${Math.min(done + 1, list.length)} de ${list.length}</p>
      ${goals.map((goal, k) => goalCard(goal, progress[k], false)).join('')}
      ${goals.length === 0 ? `<p class="goals-count">¡Completaste todos los objetivos de ${ZONES_BY_ID[zone].name}!</p>` : ''}
      ${goals.length === 0 && state.zones.pueblo?.complete ? masteryCard(state, false) : ''}`;
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}

// Segundo final: cuántas estaciones van en el nivel 100 y, al lograrlo, el botón para volver a empezar.
function masteryCard(state, compact) {
  const n = maxedCount(state);
  const total = ALL_STATIONS.length;
  const action = state.mastered
    ? `<button class="btn claim" data-mastery>🔁 Volver a empezar ${formatMult(legacyMult(state) * 2)}</button>`
    : `<span class="goal-reward">🏅 Segundo final</span>`;
  return `
    <div class="goal final ${state.mastered ? 'done' : ''} ${compact ? 'compact' : ''}">
      <div class="goal-text">${state.mastered ? '✅' : '🏅'} Lleva todas las estaciones de las seis zonas al nivel 100</div>
      <div class="goal-row">
        <div class="bar"><div style="width:${Math.round((n / total) * 100)}%"></div></div>
        <span class="goal-count">${n} / ${total}</span>
      </div>
      <div class="goal-foot">${action}</div>
    </div>`;
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
