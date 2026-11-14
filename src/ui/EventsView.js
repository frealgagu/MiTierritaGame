// Ventana de eventos (v2.0): el evento de cada zona este año, cómo va, la mejor medalla y el Renombre.
// «Jugar» o «Seguir» lleva al tablero del evento (main.js).
import { EVENTS, MEDALS, eventKey } from '../data/events.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { EVENT_SLOTS, MEDAL_BONUS, ON_DEMAND_COST, boardClockNow, boardObjective, buyOnDemand, canPlayOnDemand, eventObjective, eventStatus, hasOnDemand, medalCount, quoteOnDemand, regionAllGold, regionEvents } from '../sim/events.js';
import { toast } from './toast.js';
import { clockOf } from '../sim/calendar.js';
import { formatDuration } from '../core/format.js';
import { formatClock, objectiveText } from './EventBar.js';
import { moreButton, refreshMore } from './more.js';
import { t } from '../i18n/index.js';
import { maxLevel } from '../sim/rules.js';
import { upgradeTarget } from '../sim/upgrades.js';
import { zoneBoostTargets } from '../sim/zoneBoost.js';

export const medalLine = (obj) => t('🥇 hasta {gold} · 🥈 hasta {silver} · 🥉 después', { gold: formatClock(obj.medals[0]), silver: formatClock(obj.medals[1]) });

export class EventsView {
  // onPlay(zona): entrar al tablero. La partida principal (game) guarda el perfil (medallas y Renombre) y
  // los cupos de los eventos (v3.30).
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
      // Plegar o desplegar una región (v3.67, como en la lista de zonas).
      const fold = e.target.closest('[data-efold]');
      if (fold) {
        const settings = this.game.state.settings;
        settings.eventsFold = { ...settings.eventsFold, [fold.dataset.efold]: !this.folded(fold.dataset.efold) };
        return this.render();
      }
      // Comprar los eventos a demanda de una región (v4.7.3).
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
    // Primero a la vista: así se sabe qué textos no caben y llevan «Ver más» (v3.67.5).
    this.modal.hidden = false;
    this.render();
  }

  // Plegada si así la dejó el jugador; si no, solo las regiones sin nada que jugar ahora.
  folded(regionId) {
    const saved = this.game.state.settings.eventsFold?.[regionId];
    if (saved !== undefined) return saved;
    return this.playable(regionId) === 0 && !this.offerOnDemand(regionId) && !EVENTS.some((def) => REGION_OF_ZONE[def.zone] === regionId && eventStatus(this.game.state, eventKey(def))?.kind === 'won');
  }

  // Cuántos de la región se pueden jugar ahora: los abiertos, los que tienen cupo y (v4.7.3) los que se juegan a demanda.
  playable(regionId) {
    const s = this.game.state;
    return EVENTS.filter((def) => {
      if (REGION_OF_ZONE[def.zone] !== regionId) return false;
      const kind = eventStatus(s, eventKey(def))?.kind;
      return kind === 'active' || kind === 'available' || ((kind === 'waiting' || kind === 'available') && canPlayOnDemand(s, eventKey(def)));
    }).length;
  }

  // Si la región ya tiene oro en todos y todavía no tiene los eventos a demanda (v4.7.3).
  offerOnDemand(regionId) {
    const p = this.game.state.profile;
    return regionAllGold(p, regionId) && !hasOnDemand(p, regionId);
  }

  close() {
    this.modal.hidden = true;
  }

  render() {
    const s = this.game.state;
    const profile = s.profile ?? { renown: 0, medals: {} };
    document.getElementById('events-renown').textContent = t('⭐ Renombre: {n} · 🏆 Prestigio: {total}', { n: profile.renown, total: profile.renownTotal ?? profile.renown });
    const card = (def) => {
      const st = eventStatus(s, eventKey(def));
      if (!st) return '';
      const zone = ZONES_BY_ID[def.zone];
      const best = profile.medals[def.id]?.best;
      const obj = st.board ? boardObjective(st.board) : eventObjective(def);
      const title = `<h3><span>${def.icon} ${def.name} · ${zone.icon} ${zone.name}</span><span>${best ? MEDALS[best].icon : ''}</span></h3>`;
      // Los que esperan (sin cupo o sin todas sus estaciones), en una línea (v3.7).
      if (st.kind === 'locked' && st.after) return `<div class="event-card locked">${title}<p>${t('🔒 Sale cuando ganes medalla en los otros eventos de {zone}.', { zone: zone.name })}</p></div>`;
      if (st.kind === 'locked') return `<div class="event-card locked">${title}<p>${t('🔒 Sale cuando construyas todas las estaciones de {zone}.', { zone: zone.name })}</p></div>`;
      // A demanda (v4.7.3): con oro en todos los de la región y la compra hecha, se juega otra vez cuando se quiera.
      const region = REGION_OF_ZONE[def.zone];
      if ((st.kind === 'waiting' || st.kind === 'available') && hasOnDemand(profile, region) && regionAllGold(profile, region)) {
        const can = canPlayOnDemand(s, eventKey(def));
        const note = can ? '' : `<p>${t('⏳ Hay {n} eventos abiertos: termina uno para jugar otro.', { n: EVENT_SLOTS })}</p>`;
        return `<div class="event-card">${title}${note}<button class="btn buy" data-play="${eventKey(def)}" ${can ? '' : 'disabled'}>${t('🔁 Jugar otra vez')}</button></div>`;
      }
      if (st.kind === 'waiting') {
        const when = st.nextAt === null ? t('cuando termines uno de los dos eventos y pasen 2 años') : t('en {time} se libera un cupo (los dos eventos nunca son de la misma región)', { time: formatDuration(st.nextAt - clockOf(s)) });
        return `<div class="event-card locked">${title}<p>${t('⏳ Espera turno: {when}.', { when })}</p></div>`;
      }
      let foot;
      // (v4.7.3) En los que están abiertos, el tiempo que llevan, si ya está todo al nivel máximo del tablero (50) y si
      // cada tablero quedó corriendo (🚪 Salir) o pausado (⏸️ Pausar).
      const maxed = st.board && boardMaxed(st.board, def.zone);
      const maxedLabel = maxed ? ` · ${t('⬆ Todo al {n}', { n: maxLevel(st.board) })}` : '';
      const clock = st.board ? `⏱ ${formatClock(boardClockNow(st.board, s))}` : '';
      const running = st.board ? ` · ${st.board.event.away !== undefined ? t('🚪 corriendo') : t('⏸️ pausado')}` : '';
      const maxTip = maxed ? ` title="${t('Todo al nivel máximo')}"` : '';
      if (st.kind === 'won') {
        const m = MEDALS[st.board.event.medal];
        foot = `<p>${t('🏁 ¡Ganado con {medal}!', { medal: `${m.icon} ${m.name}` })}${maxedLabel}</p><button class="btn buy" data-play="${eventKey(def)}">${t('Ver y terminar')} · ${clock}${running}</button>`;
      } else if (st.kind === 'active') {
        const secured = st.board.event.medal;
        foot = secured
          ? `<p>${t('✅ {icon} Medalla asegurada. Para terminar, compra las mejoras que faltan.', { icon: MEDALS[secured].icon })}</p><button class="btn buy" data-play="${eventKey(def)}"${maxTip}>${t('Seguir')} · ${clock}${maxedLabel}${running}</button>`
          : `<button class="btn buy" data-play="${eventKey(def)}"${maxTip}>${t('Seguir')} · ${clock}${maxedLabel}${running}</button>`;
      } else foot = `<button class="btn buy" data-play="${eventKey(def)}">${t('Jugar')}</button>`;
      return `<div class="event-card">
        ${title}
        <p class="clamp" style="--lines: 2">${def.intro}</p>${moreButton()}
        <p class="event-year">${objectiveText(obj)}.<br>${medalLine(obj)}</p>
        ${foot}
      </div>`;
    };
    // Por región (con su título, si ya hay más de una); las zonas que todavía no se abren no se muestran.
    // Primero los que se pueden jugar; luego los que esperan.
    const rank = (def) => {
      const kind = eventStatus(s, eventKey(def))?.kind;
      return kind === 'active' || kind === 'won' || kind === 'available' ? 0 : 1;
    };
    // Con oro en todos los de la región (v4.7.3) ya no salen solos: arriba, la compra de los eventos a demanda.
    const onDemandCard = (r) => {
      if (!regionAllGold(profile, r.id) || hasOnDemand(profile, r.id)) return [];
      const q = quoteOnDemand(profile, r.id);
      return [`<div class="event-card"><h3><span>🔁 ${t('Eventos a demanda')}</span></h3><p>${t('Tienes oro en todos los eventos de {region}: ya no salen solos. Compra esta opción y juega cualquiera otra vez cuando quieras, sin esperar.', { region: r.name })}</p><button class="btn buy" data-ondemand="${r.id}" ${q.ok ? '' : 'disabled'}>${t('Comprar · {n} ⭐', { n: ON_DEMAND_COST })}</button></div>`];
    };
    const groups = REGIONS.map((r) => ({ r, cards: [...onDemandCard(r), ...EVENTS.filter((def) => REGION_OF_ZONE[def.zone] === r.id).sort((a, b) => rank(a) - rank(b)).map(card).filter(Boolean)] })).filter((g) => g.cards.length);
    // Cada región se pliega (v3.67): su título dice cuántos se pueden jugar.
    const html = groups
      .map((g) => {
        if (groups.length < 2) return g.cards.join('');
        const folded = this.folded(g.r.id);
        // (v4.7.3) Los ganados que siguen abiertos ya no cuentan como «para jugar».
        const ready = this.playable(g.r.id);
        const sub = ready ? t('{n} para jugar', { n: ready }) : this.offerOnDemand(g.r.id) ? `🔁 ${t('Eventos a demanda')}` : t('nada por ahora');
        const head = `<button class="zones-region research-other" data-efold="${g.r.id}" aria-expanded="${!folded}"><span class="zones-fold">${folded ? '▸' : '▾'}</span> ${g.r.icon} ${g.r.name}<small>${sub}</small></button>`;
        return `<div class="zones-group events-group">${head}${folded ? '' : g.cards.join('')}</div>`;
      })
      .join('');
    this.body.innerHTML = `${html}<p class="event-soon">${t('Cada zona que abras trae su evento.')}</p>${medalsHtml(profile)}`;
    refreshMore(this.body);
  }

  update() {
    const statuses = EVENTS.map((def) => eventStatus(this.game.state, eventKey(def))).filter(Boolean);
    // El botón aparece cuando hay algún evento abierto, o cuando ya se tiene algo del Renombre (v3.8.1:
    // tras reiniciar seguían ahí el álbum, los logros y las horas aunque no hubiera evento); el número,
    // los que se pueden empezar.
    const p = this.game.state.profile ?? {};
    const progress = p.renown > 0 || p.history?.length > 0 || Object.keys(p.logros ?? {}).length > 0 || (this.game.state.legacy?.resets ?? 0) > 0;
    this.btn.hidden = !progress && !statuses.some((st) => st.kind !== 'locked');
    // (v4.7.3) Solo los que se pueden empezar: un evento ganado que sigue abierto (objetivo cumplido y las tres compras) ya
    // no cuenta.
    const ready = statuses.filter((st) => st.kind === 'available').length;
    this.badge.hidden = ready === 0;
    this.badge.textContent = ready;
  }
}

// Si en el tablero ya está todo al nivel máximo (v4.7.3): estaciones, arrieros y bodega.
function boardMaxed(board, zoneId) {
  const max = maxLevel(board);
  const ids = zoneBoostTargets(board, zoneId);
  return ids.length > 0 && ids.every((id) => upgradeTarget(board, id).holder.level >= max);
}

// Todas tus medallas (v3.12): la mejor de cada evento, por región, y el premio por tenerlas todas.
function medalsHtml(profile) {
  const regions = REGIONS.map((r) => {
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
