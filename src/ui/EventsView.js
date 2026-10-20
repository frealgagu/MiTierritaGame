// Ventana de eventos (v2.0): el evento de cada zona este año, cómo va, la mejor medalla y el Renombre.
// «Jugar» o «Seguir» lleva al tablero del evento (main.js).
import { EVENTS, MEDALS } from '../data/events.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS, REGION_OF_ZONE } from '../data/regions.js';
import { eventObjective, eventStatus } from '../sim/events.js';
import { clockOf } from '../sim/calendar.js';
import { formatDuration } from '../core/format.js';
import { formatClock, objectiveText } from './EventBar.js';

export const medalLine = (obj) => `🥇 hasta ${formatClock(obj.medals[0])} · 🥈 hasta ${formatClock(obj.medals[1])} · 🥉 después`;

export class EventsView {
  // onPlay(zona): entrar al tablero. stateOf(zona): la partida de la región de esa zona (v3.6), o null si la
  // región no se ha abierto. El perfil (medallas y Renombre) es el de la partida principal (game).
  constructor(game, onPlay, stateOf = () => game.state) {
    this.game = game;
    this.onPlay = onPlay;
    this.stateOf = stateOf;
    this.modal = document.getElementById('events');
    this.body = document.getElementById('events-body');
    this.btn = document.getElementById('events-btn');
    this.badge = document.getElementById('events-badge');
    this.btn.addEventListener('click', () => this.open());
    document.getElementById('events-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) return this.close();
      const play = e.target.closest('[data-play]');
      if (!play) return;
      this.close();
      this.onPlay(play.dataset.play);
    });
  }

  open() {
    this.render();
    this.modal.hidden = false;
  }

  close() {
    this.modal.hidden = true;
  }

  render() {
    const s = this.game.state;
    const profile = s.profile ?? { renown: 0, medals: {} };
    document.getElementById('events-renown').textContent = `⭐ Renombre: ${profile.renown}`;
    const card = (def) => {
      const owner = this.stateOf(def.zone);
      const st = owner && eventStatus(owner, def.zone);
      if (!st) return '';
      const zone = ZONES_BY_ID[def.zone];
      const best = profile.medals[def.id]?.best;
      const obj = eventObjective(def, st.round);
      const title = `<h3><span>${def.icon} ${def.name} · ${zone.icon} ${zone.name}</span><span>${best ? MEDALS[best].icon : ''}</span></h3>`;
      // Los que esperan (sin cupo o sin todas sus estaciones), en una línea (v3.7).
      if (st.kind === 'locked') return `<div class="event-card locked">${title}<p>🔒 Sale cuando construyas todas las estaciones de ${zone.name}.</p></div>`;
      if (st.kind === 'waiting') {
        const when = st.nextAt === null ? 'cuando termines uno de los dos eventos de la región y pasen 3 años' : `en ${formatDuration(st.nextAt - clockOf(owner))} se libera un cupo de la región`;
        return `<div class="event-card locked">${title}<p>⏳ Espera turno: ${when}.</p></div>`;
      }
      let foot;
      if (st.kind === 'active') {
        const secured = st.board.event.medal;
        foot = secured
          ? `<p>✅ ${MEDALS[secured].icon} Medalla asegurada. Para terminar, compra las mejoras que faltan.</p><button class="btn buy" data-play="${def.zone}">Seguir</button>`
          : `<button class="btn buy" data-play="${def.zone}">Seguir · ⏱ ${formatClock(st.board.playTime)}</button>`;
      } else foot = `<button class="btn buy" data-play="${def.zone}">Jugar</button>`;
      return `<div class="event-card">
        ${title}
        <p>${def.intro}</p>
        <p class="event-year">Reto ${st.round}: ${objectiveText(obj)}.<br>${medalLine(obj)}</p>
        ${foot}
      </div>`;
    };
    // Por región (con su título, si ya hay más de una); las zonas que todavía no se abren no se muestran.
    // Primero los que se pueden jugar; luego los que esperan.
    const rank = (def) => {
      const owner = this.stateOf(def.zone);
      const kind = owner && eventStatus(owner, def.zone)?.kind;
      return kind === 'active' || kind === 'available' ? 0 : 1;
    };
    const groups = REGIONS.map((r) => ({ r, cards: EVENTS.filter((def) => REGION_OF_ZONE[def.zone] === r.id).sort((a, b) => rank(a) - rank(b)).map(card).filter(Boolean) })).filter((g) => g.cards.length);
    const html = groups.map((g) => (groups.length > 1 ? `<h3 class="research-other">${g.r.icon} ${g.r.name}</h3>` : '') + g.cards.join('')).join('');
    this.body.innerHTML = `${html}<p class="event-soon">Cada zona que abras trae su evento.</p>`;
  }

  update() {
    const statuses = EVENTS.map((def) => {
      const owner = this.stateOf(def.zone);
      return owner && eventStatus(owner, def.zone);
    }).filter(Boolean);
    // El botón aparece cuando hay algún evento abierto, o cuando ya se tiene algo del Renombre (v3.8.1:
    // tras reiniciar seguían ahí el álbum, los logros y las horas aunque no hubiera evento); el número,
    // los que se pueden empezar.
    const p = this.game.state.profile ?? {};
    const progress = p.renown > 0 || p.history?.length > 0 || Object.keys(p.logros ?? {}).length > 0 || (this.game.state.legacy?.resets ?? 0) > 0;
    this.btn.hidden = !progress && !statuses.some((st) => st.kind !== 'locked');
    const ready = statuses.filter((st) => st.kind === 'available').length;
    this.badge.hidden = ready === 0;
    this.badge.textContent = ready;
  }
}
