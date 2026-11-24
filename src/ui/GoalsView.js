import { formatMult, formatNumber } from '../core/format.js';
import { GOALS_BY_ZONE } from '../data/goals.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { activeGoals, claimableGoals, goalProgress, goalText, stoppedFor } from '../sim/goals.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { finalZone, masteryParts } from '../sim/legacy.js';
import { t } from '../i18n/index.js';
import { regionOf } from '../data/regions.js';
import { MAX_LEGACY_RESETS, legacyMult, nextLegacyMult } from '../sim/modifiers.js';
import { fit } from './fit.js';

// Goals: bottom-left pill showing current goal plus modal listing all zone goals
// (v3.67; previously only the three visible ones).
export class GoalsView {
  constructor(game, getZone) {
    this.game = game;
    this.getZone = getZone;
    this.modal = document.getElementById('goals');
    this.body = document.getElementById('goals-body');
    this.foot = document.getElementById('goals-foot'); // «Claim all», pinned below outside the scroll list (v3.57)
    this.tracker = document.getElementById('tracker');
    this.badge = document.getElementById('goals-badge');
    document.getElementById('goals-btn').addEventListener('click', () => this.open());
    document.getElementById('goals-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
      const btn = e.target.closest('[data-claim]');
      if (btn) this.game.claimGoal(btn.dataset.claim);
      if (e.target.closest('[data-claim-all]')) this.game.claimAllGoals(this.getZone());
      if (e.target.closest('[data-mastery]')) this.onMastery?.();
    });
    this.tracker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-claim]');
      if (btn) this.game.claimGoal(btn.dataset.claim);
      else if (e.target.closest('[data-mastery]')) this.onMastery?.();
      else this.open();
    });
    this.onMastery = null; // main.js: opens the second-ending screen
  }

  open() {
    this.modal.hidden = false;
    this.html = null;
    this.scroll = true;
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
    // Badge counts all claimable goals in the zone, not just the first three (v3.57).
    const ready = claimableGoals(state, zone);
    // (v4.7) Also the already-met finale even if not yet first in queue: otherwise badge read one too low
    // and collecting earlier goals caused it to repeat when the finale reached the front.
    const won = state.zones[zone]?.unlocked ? (GOALS_BY_ZONE[zone] ?? []).filter((x) => !state.goals.claimed.includes(x.id) && goalProgress(state, x).done) : [];
    this.badge.hidden = won.length === 0;
    this.badge.textContent = won.length;

    // Pill: first claimable goal (v4.7: even if deeper in the list, so it can be claimed
    // directly from outside) or, if none, first pending goal. With all zones completed and no
    // goals left here, the second ending: all stations at level 100.
    const first = ready.find((x) => !x.final) ?? ready[0];
    const i = Math.max(0, progress.findIndex((p) => p.done));
    const g = first ?? goals[i];
    const gProgress = first ? goalProgress(state, first) : progress[i];
    // (v3.12: with the region's final zone, not just Pueblo: Santander's didn't show.)
    const finished = Boolean(state.zones[finalZone(state)]?.complete) && !regionOf(state).wip;
    // Once multiplier hits cap (v3.68.2) the bar no longer offers reset: just says so; resetting
    // remains accessible from inside the goals modal.
    const atMax = (state.keep?.resets ?? 0) >= MAX_LEGACY_RESETS;
    const master = !g && finished ? (atMax ? maxCard(state) : masteryCard(state, true)) : null;
    this.tracker.hidden = !g && !master;
    const trackerHtml = g ? goalCard(g, gProgress, true, stoppedFor(state, g)) : master;
    if (trackerHtml && trackerHtml !== this.trackerHtml) {
      this.tracker.innerHTML = this.trackerHtml = trackerHtml;
      this.trackerFit = false;
    }
    // Pill has fixed height: long text shrinks (when visible; hidden can't be measured).
    if (!this.trackerFit && this.tracker.clientWidth) {
      fit(this.tracker.querySelector('.goal-text'));
      this.trackerFit = true;
    }

    if (this.modal.hidden) return;
    const list = GOALS_BY_ZONE[zone] ?? []; // (La plaza de las fiestas has none, v5.19)
    const done = list.filter((g) => state.goals.claimed.includes(g.id)).length;
    // «Claim all» (v3.57): all completed zone goals, even unshown ones; finale handled separately.
    const bulk = ready.filter((g) => !g.final);
    const bulkReward = bulk.reduce((n, g) => n + g.reward, 0);
    const claimAll = bulk.length > 0 ? `<button class="btn claim bulk" data-claim-all>${t('✅ Cobrar todos ({n})', { n: bulk.length })} · +${formatNumber(bulkReward)} 💰</button>` : '';
    if (claimAll !== this.footHtml) this.foot.innerHTML = this.footHtml = claimAll;
    // Full list (v3.67, like research): claimed ones compact at top, and all pending ones
    // with progress below (previously only three showed so completed ones could hide).
    const claimed = new Set(state.goals.claimed);
    const html = `
      <p class="goals-count">${ZONES_BY_ID[zone].icon} ${ZONES_BY_ID[zone].name} · ${t('{done} de {total} cobrados', { done, total: list.length })}</p>
      ${list.map((goal) => (claimed.has(goal.id) ? claimedCard(goal) : goalCard(goal, goalProgress(state, goal), false, stoppedFor(state, goal)))).join('')}
      ${done === list.length ? `<p class="goals-count">${t('¡Completaste todos los objetivos de {zone}!', { zone: ZONES_BY_ID[zone].name })}</p>` : ''}
      ${finished ? masteryCard(state, false) : ''}`;
    if (html !== this.html) {
      this.body.innerHTML = this.html = html;
      // On open, scroll list to the first incomplete goal.
      if (this.scroll) {
        this.scroll = false;
        this.body.querySelector('.goal:not(.claimed)')?.scrollIntoView({ block: 'start' });
      }
    }
  }
}

// Second ending: requirements (v3.12: stations, haulers, and routes at level 100, all goals
// and all research), progress on each, and once met, the reset button.
// «🏆 Max multiplier (×1.15Qi)», in bottom bar.
const maxCard = (state) =>
  `<div class="goal final done compact"><div class="goal-text">${t('🏆 Multiplicador al máximo ({mult})', { mult: formatMult(legacyMult(state)) })}</div></div>`;

function masteryCard(state, compact) {
  const parts = masteryParts(state);
  const have = parts.reduce((n, p) => n + Math.min(p.have, p.need), 0);
  const need = parts.reduce((n, p) => n + p.need, 0);
  const action = state.mastered
    ? `<button class="btn claim" data-mastery>${t('🔁 Volver a empezar {mult}', { mult: formatMult(nextLegacyMult(state)) })}</button>`
    : `<span class="goal-reward">${t('🏅 Segundo final')}</span>`;
  const rows = compact ? '' : `<ul class="mastery-parts">${parts.map((p) => `<li class="${p.have >= p.need ? 'ok' : ''}">${p.have >= p.need ? '✅' : p.icon} ${t(p.label)}<span>${Math.min(p.have, p.need)} / ${p.need}</span></li>`).join('')}</ul>`;
  return `
    <div class="goal final ${state.mastered ? 'done' : ''} ${compact ? 'compact' : ''}">
      <div class="goal-text">${state.mastered ? '✅' : '🏅'} ${t('Todo al nivel 100, con todos los objetivos y las investigaciones')}</div>
      <div class="goal-row">
        <div class="bar"><div style="width:${Math.round((have / need) * 100)}%"></div></div>
        <span class="goal-count">${Math.round((have / need) * 100)} %</span>
      </div>${rows}
      <div class="goal-foot">${action}</div>
    </div>`;
}

// stopped (v5.14): a station the goal depends on that the player stopped (or null), to say so.
function goalCard(goal, p, compact, stopped = null) {
  const warn = stopped && !p.done ? t('⏹️ {station} no está en marcha.', { station: STATIONS_BY_ID[stopped].name }) : '';
  const pct = Math.round((p.current / p.target) * 100);
  const showCount = p.target > 1;
  const reward = goal.final ? t('🚩 Final de la zona') : `+${formatNumber(goal.reward)} 💰`;
  const action = p.done
    ? `<button class="btn claim" data-claim="${goal.id}">${goal.final ? t('¡Completar zona!') : t('Cobrar {reward}', { reward })}</button>`
    : `<span class="goal-reward">${reward}</span>`;
  return `
    <div class="goal ${p.done ? 'done' : ''} ${goal.final ? 'final' : ''} ${compact ? 'compact' : ''}">
      <div class="goal-text">${p.done ? '✅' : warn ? '⏹️' : '🎯'} ${goalText(goal)}</div>
      <div class="goal-row">
        <div class="bar"><div style="width:${pct}%"></div></div>
        ${showCount ? `<span class="goal-count">${formatNumber(p.current)} / ${formatNumber(p.target)}</span>` : ''}
      </div>
      ${warn && !compact ? `<div class="goal-warn">${warn}</div>` : ''}
      <div class="goal-foot">${action}</div>
    </div>`;
}

// Already claimed goal: single row, no progress bar.
function claimedCard(goal) {
  return `<div class="goal claimed"><div class="goal-text">✅ ${goalText(goal)}</div><span class="goal-reward">${goal.final ? t('🚩 Zona completada') : t('Cobrado')}</span></div>`;
}

