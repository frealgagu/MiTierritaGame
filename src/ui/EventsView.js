// Events modal (v2.0): this year's event per zone, status, best medal, and Renown.
// «Play» or «Continue» enters the event board (main.js).
import { EVENTS, MEDALS, eventKey } from '../data/events.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { EVENT_SLOTS, FREE_EVENTS_COST, MEDAL_BONUS, ON_DEMAND_COST, boardClockNow, boardObjective, buyFreeEvents, buyOnDemand, canPlayOnDemand, eventObjective, eventStatus, hasFreeEvents, hasOnDemand, medalCount, quoteFreeEvents, quoteOnDemand, regionAllGold, regionEvents } from '../sim/events.js';
import { toast } from './toast.js';
import { clockOf } from '../sim/calendar.js';
import { formatDuration } from '../core/format.js';
import { formatClock, objectiveText } from './EventBar.js';
import { moreButton, refreshMore } from './more.js';
import { t } from '../i18n/index.js';
import { maxLevel } from '../sim/rules.js';
import { upgradeTarget } from '../sim/upgrades.js';
import { zoneBoostTargets } from '../sim/zoneBoost.js';
import { cappedPrestige, cappedRenown } from './capped.js';

export const medalLine = (obj) => t('🥇 hasta {gold} · 🥈 hasta {silver} · 🥉 después', { gold: formatClock(obj.medals[0]), silver: formatClock(obj.medals[1]) });

export class EventsView {
  // onPlay(zone): enter the board. Root save (game) stores profile (medals and Renown) and
  // event slots (v3.30).
  constructor(game, onPlay) {
    this.game = game;
    this.onPlay = onPlay;
    this.modal = document.getElementById('events');
    this.body = document.getElementById('events-body');
    this.btn = document.getElementById('events-btn');
    this.badge = document.getElementById('events-badge');
    this.btn.addEventListener('click', () => this.open());
    document.getElementById('events-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) return this.close();
      // Collapse or expand a region (v3.67, same as zone list).
      const fold = e.target.closest('[data-efold]');
      if (fold) {
        const settings = this.game.state.settings;
        settings.eventsFold = { ...settings.eventsFold, [fold.dataset.efold]: !this.folded(fold.dataset.efold) };
        return this.render();
      }
      // Events without waiting (v5.9): every ready event, any time, as many at once as wanted.
      if (e.target.closest('[data-free-events]')) {
        if (buyFreeEvents(this.game.state.profile)) toast(t('⚡ Ya puedes jugar cualquier evento cuando quieras, y los que quieras a la vez.'), 4000);
        return this.render();
      }
      // Purchase events on demand for a region (v4.7.3).
      const od = e.target.closest('[data-ondemand]');
      if (od) {
        const region = od.dataset.ondemand;
        if (buyOnDemand(this.game.state.profile, region)) toast(t('🔁 Ya puedes jugar los eventos de {region} cuando quieras.', { region: REGIONS_BY_ID[region].name }), 4000);
        return this.render();
      }
      const play = e.target.closest('[data-play]');
      if (!play || play.disabled) return;
      this.close();
      this.onPlay(play.dataset.play);
    });
  }

  open() {
    // Attach to DOM first: so overflowing texts can be measured for «See more» (v3.67.5).
    this.modal.hidden = false;
    this.html = this.shape = null;
    this.body.scrollTop = 0;
    this.render();
  }

  // Collapsed if player left it so; otherwise only regions with nothing playable right now.
  folded(regionId) {
    const saved = this.game.state.settings.eventsFold?.[regionId];
    if (saved !== undefined) return saved;
    return this.playable(regionId) === 0 && !this.offerOnDemand(regionId) && !EVENTS.some((def) => REGION_OF_ZONE[def.zone] === regionId && eventStatus(this.game.state, eventKey(def))?.kind === 'won');
  }

  // How many in the region can be played right now: open ones, ready slots, and (v4.7.3) on-demand events.
  playable(regionId) {
    const s = this.game.state;
    return EVENTS.filter((def) => {
      if (REGION_OF_ZONE[def.zone] !== regionId) return false;
      const kind = eventStatus(s, eventKey(def))?.kind;
      return kind === 'active' || kind === 'available' || ((kind === 'waiting' || kind === 'available') && canPlayOnDemand(s, eventKey(def)));
    }).length;
  }

  // If region has gold in all events and doesn't yet have events on demand (v4.7.3).
  offerOnDemand(regionId) {
    const p = this.game.state.profile;
    return regionAllGold(p, regionId) && !hasOnDemand(p, regionId) && !hasFreeEvents(p);
  }

  close() {
    this.modal.hidden = true;
  }

  render() {
    const s = this.game.state;
    const profile = s.profile ?? { renown: 0, medals: {} };
    document.getElementById('events-renown').textContent = t('⭐ Renombre: {n} · 🏆 Prestigio: {total}', { n: cappedRenown(profile.renown), total: cappedPrestige(profile.renownTotal ?? profile.renown) });
    const card = (def) => {
      const st = eventStatus(s, eventKey(def));
      if (!st) return '';
      const zone = ZONES_BY_ID[def.zone];
      const best = profile.medals[def.id]?.best;
      const obj = st.board ? boardObjective(st.board) : eventObjective(def);
      const title = `<h3><span>${def.icon} ${def.name} · ${zone.icon} ${zone.name}</span><span>${best ? MEDALS[best].icon : ''}</span></h3>`;
      // Waiting ones (no slot or missing stations), single-line (v3.7).
      if (st.kind === 'locked' && st.after) return `<div class="event-card locked">${title}<p>${t('🔒 Sale cuando ganes medalla en los otros eventos de {zone}.', { zone: zone.name })}</p></div>`;
      if (st.kind === 'locked') return `<div class="event-card locked">${title}<p>${t('🔒 Sale cuando construyas todas las estaciones de {zone}.', { zone: zone.name })}</p></div>`;
      // On demand (v4.7.3): with gold in every event in the region and unlock purchased, playable anytime.
      const region = REGION_OF_ZONE[def.zone];
      if ((st.kind === 'waiting' || st.kind === 'available') && hasOnDemand(profile, region) && regionAllGold(profile, region)) {
        const can = canPlayOnDemand(s, eventKey(def));
        const note = can ? '' : `<p>${t('⏳ Hay {n} eventos abiertos: termina uno para jugar otro.', { n: EVENT_SLOTS })}</p>`;
        return `<div class="event-card">${title}${note}<button class="btn buy" data-play="${eventKey(def)}" ${can ? '' : 'disabled'}>${t('🔁 Jugar otra vez')}</button></div>`;
      }
      if (st.kind === 'waiting') {
        const when = st.nextAt === null ? t('cuando termines uno de los dos eventos y pasen 2 años') : t('en {time} se libera un cupo (los dos eventos nunca son de la misma región)', { time: live(formatDuration(st.nextAt - clockOf(s))) });
        return `<div class="event-card locked">${title}<p>${t('⏳ Espera turno: {when}.', { when })}</p></div>`;
      }
      let foot;
      // (v4.7.3) On open events, elapsed time, whether everything is at max board level (50), and whether
      // each board was left running (🚪 Exit) or paused (⏸️ Pause). (v5.7.1) The button has three fixed
      // columns (action, clock and state) so it looks the same at any width; «everything at max» moved
      // to the line above it.
      const maxed = st.board && boardMaxed(st.board, def.zone);
      const maxedText = maxed ? t('⬆ Todo al {n}', { n: maxLevel(st.board) }) : '';
      const playBtn = (label) => {
        const away = st.board.event.away !== undefined;
        return `<button class="btn buy event-play" data-play="${eventKey(def)}"><span class="event-play-row"><span class="event-play-label">${label}</span><span class="event-play-clock">⏱ ${live(formatClock(boardClockNow(st.board, s)))}</span><span class="event-play-state">${away ? t('🚪 corriendo') : t('⏸️ pausado')}</span></span></button>`;
      };
      if (st.kind === 'won') {
        const m = MEDALS[st.board.event.medal];
        foot = `<p>${t('🏁 ¡Ganado con {medal}!', { medal: `${m.icon} ${m.name}` })}${maxed ? ` · ${maxedText}` : ''}</p>${playBtn(t('Ver y terminar'))}`;
      } else if (st.kind === 'active') {
        const secured = st.board.event.medal;
        const note = [secured ? t('✅ {icon} Medalla asegurada. Para terminar, compra las mejoras que faltan.', { icon: MEDALS[secured].icon }) : '', maxedText].filter(Boolean).join(' · ');
        foot = `${note ? `<p>${note}</p>` : ''}${playBtn(t('Seguir'))}`;
      } else foot = `<button class="btn buy" data-play="${eventKey(def)}">${t('Jugar')}</button>`;
      return `<div class="event-card" data-ekey="${eventKey(def)}">
        ${title}
        <p class="clamp" style="--lines: 2">${def.intro}</p>${moreButton()}
        <p class="event-year">${objectiveText(obj)}.<br>${medalLine(obj)}</p>
        ${foot}
      </div>`;
    };
    // By region (with header if more than one); unopened zones are hidden.
    // Playable ones first; waiting ones after.
    const rank = (def) => {
      const kind = eventStatus(s, eventKey(def))?.kind;
      return kind === 'active' || kind === 'won' || kind === 'available' ? 0 : 1;
    };
    // With gold on all in the region (v4.7.3) they no longer auto-spawn: on-demand purchase sits at top.
    const onDemandCard = (r) => {
      if (!regionAllGold(profile, r.id) || hasOnDemand(profile, r.id) || hasFreeEvents(profile)) return [];
      const q = quoteOnDemand(profile, r.id);
      return [`<div class="event-card"><h3><span>🔁 ${t('Eventos a demanda')}</span></h3><p>${t('Tienes oro en todos los eventos de {region}: ya no salen solos. Compra esta opción y juega cualquiera otra vez cuando quieras, sin esperar.', { region: r.name })}</p><button class="btn buy" data-ondemand="${r.id}" ${q.ok ? '' : 'disabled'}>${t('Comprar · {n} ⭐', { n: ON_DEMAND_COST })}</button></div>`];
    };
    const groups = REGIONS.map((r) => ({ r, cards: [...onDemandCard(r), ...EVENTS.filter((def) => REGION_OF_ZONE[def.zone] === r.id).sort((a, b) => rank(a) - rank(b)).map(card).filter(Boolean)] })).filter((g) => g.cards.length);
    // Each region collapses (v3.67): its header shows how many can be played.
    const html = groups
      .map((g) => {
        if (groups.length < 2) return g.cards.join('');
        const folded = this.folded(g.r.id);
        // (v4.7.3) Won events still open no longer count toward «playable».
        const ready = this.playable(g.r.id);
        const sub = ready ? t('{n} para jugar', { n: ready }) : this.offerOnDemand(g.r.id) ? `🔁 ${t('Eventos a demanda')}` : t('nada por ahora');
        const head = `<button class="zones-region research-other" data-efold="${g.r.id}" aria-expanded="${!folded}"><span class="zones-fold">${folded ? '▸' : '▾'}</span> ${g.r.icon} ${g.r.name}<small>${sub}</small></button>`;
        return `<div class="zones-group events-group">${head}${folded ? '' : g.cards.join('')}</div>`;
      })
      .join('');
    this.paint(`${freeEventsHtml(profile)}${html}<p class="event-soon">${t('Cada zona que abras trae su evento.')}</p>${medalsHtml(profile)}`);
  }

  // Redraws only what changed (v5.7): when only the clocks and countdowns moved, it rewrites
  // just those texts; otherwise it rebuilds the list keeping the scroll, the open «See more»
  // texts and the medals box as they were.
  paint(html) {
    if (html === this.html) return;
    const shape = html.replace(LIVE, '');
    if (shape === this.shape) {
      const values = [...html.matchAll(LIVE)].map((m) => m[1]);
      this.body.querySelectorAll('[data-live]').forEach((el, i) => {
        if (el.textContent !== values[i]) el.textContent = values[i];
      });
    } else {
      const top = this.body.scrollTop;
      const medals = this.body.querySelector('.medals-box')?.open;
      const more = new Set([...this.body.querySelectorAll('.event-card[data-ekey]')].filter((c) => c.querySelector('.clamp.open')).map((c) => c.dataset.ekey));
      this.body.innerHTML = html;
      for (const key of more) {
        const card = this.body.querySelector(`.event-card[data-ekey="${key}"]`);
        const clamp = card?.querySelector('.clamp');
        if (!clamp) continue;
        clamp.classList.add('open');
        clamp.nextElementSibling.textContent = t('Ver menos ▴');
      }
      if (medals) this.body.querySelector('.medals-box').open = true;
      this.body.scrollTop = top;
      refreshMore(this.body);
    }
    this.html = html;
    this.shape = shape;
  }

  update() {
    const statuses = EVENTS.map((def) => eventStatus(this.game.state, eventKey(def))).filter(Boolean);
    // Button appears when any event is open or player has some Renown stuff (v3.8.1:
    // after reset album, achievements, and hours remained even without an active event); badge count
    // shows those ready to start.
    const p = this.game.state.profile ?? {};
    const progress = p.renown > 0 || p.history?.length > 0 || Object.keys(p.logros ?? {}).length > 0 || (this.game.state.legacy?.resets ?? 0) > 0;
    this.btn.hidden = !progress && !statuses.some((st) => st.kind !== 'locked');
    // (v4.7.3) Only startable ones: a won event still open (goal met and all 3 upgrades) no
    // longer counts.
    // (v5.9) With events without waiting every ready event is available: only those still without gold count.
    const free = hasFreeEvents(p);
    const ready = statuses.filter((st) => st.kind === 'available' && (!free || p.medals?.[st.def.id]?.best !== 'gold')).length;
    this.badge.hidden = ready === 0;
    this.badge.textContent = ready;
    // Open (v5.7): clocks, countdowns and newly available events refresh on their own.
    if (!this.modal.hidden) this.render();
  }
}

// Texts that change every second (board clocks, time until a slot frees up).
const LIVE = /<span data-live>([^<]*)<\/span>/g;
const live = (text) => `<span data-live>${text}</span>`;

// Events without waiting (v5.9): the purchase card on top of the list, or a short line once owned.
function freeEventsHtml(profile) {
  if (hasFreeEvents(profile)) return `<p class="event-soon">${t('⚡ Eventos sin espera: juegas cualquiera cuando quieras, y los que quieras a la vez.')}</p>`;
  const q = quoteFreeEvents(profile);
  return `<div class="event-card"><h3><span>⚡ ${t('Eventos sin espera')}</span></h3><p>${t('Juega cualquier evento listo cuando quieras: sin los 2 años de espera y sin el límite de 2 eventos abiertos a la vez.')}</p><button class="btn buy" data-free-events ${q.ok ? '' : 'disabled'}>${t('Comprar · {n} ⭐', { n: FREE_EVENTS_COST })}</button></div>`;
}

// Whether everything on the board is at max level (v4.7.3): stations, haulers, and warehouse.
function boardMaxed(board, zoneId) {
  const max = maxLevel(board);
  const ids = zoneBoostTargets(board, zoneId);
  return ids.length > 0 && ids.every((id) => upgradeTarget(board, id).holder.level >= max);
}

// All your medals (v3.12): best per event by region, and the reward for earning all of them.
function medalsHtml(profile) {
  // (v5.4) Only regions with events: a region without any (the special zone, for now) has nothing to list.
  const regions = REGIONS.filter((r) => regionEvents(r.id).length).map((r) => {
    const rows = regionEvents(r.id)
      .map((def) => {
        const best = profile.medals?.[def.id]?.best;
        return `<li><span>${def.icon} ${def.name}</span><span>${best ? `${MEDALS[best].icon} ${MEDALS[best].name}` : t('— sin medalla')}</span></li>`;
      })
      .join('');
    const n = regionEvents(r.id).length;
    const bonus = ['bronze', 'silver', 'gold']
      .map((m) => {
        const got = (profile.medalBonus?.[r.id] ?? []).includes(m);
        return `<span class="${got ? 'got' : ''}">${MEDALS[m].icon} ${medalCount(profile, r.id, m)}/${n} → ${got ? '✅' : `+${MEDAL_BONUS[m]} ⭐`}</span>`;
      })
      .join('');
    return `<h4>${r.icon} ${r.name}</h4><ul class="medal-list">${rows}</ul><p class="medal-bonus">${bonus}</p>`;
  });
  return `<details class="medals-box"><summary>${t('🏅 Tus medallas')}</summary>
    <p class="chain-help">${t('La mejor medalla de cada evento. Con todos los de una región en bronce o mejor ganas {b} ⭐; en plata o mejor, {s} ⭐; todos en oro, {g} ⭐.', { b: MEDAL_BONUS.bronze, s: MEDAL_BONUS.silver, g: MEDAL_BONUS.gold })}</p>
    ${regions.join('')}</details>`;
}
