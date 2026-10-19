// Ventana de eventos (v2.0): el evento de cada zona este año, cómo va, la mejor medalla y el Renombre.
// «Jugar» o «Seguir» lleva al tablero del evento (main.js).
import { EVENTS, MEDALS } from '../data/events.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { eventObjective, eventStatus } from '../sim/events.js';
import { formatClock, objectiveText } from './EventBar.js';

export const medalLine = (obj) => `🥇 hasta ${formatClock(obj.medals[0])} · 🥈 hasta ${formatClock(obj.medals[1])} · 🥉 después`;

export class EventsView {
  // onPlay(zona): entrar al tablero.
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
    const cards = EVENTS.map((def) => {
      const st = eventStatus(s, def.zone);
      if (!st) return '';
      const zone = ZONES_BY_ID[def.zone];
      const best = profile.medals[def.id]?.best;
      const obj = eventObjective(def, st.year);
      let foot;
      if (st.kind === 'locked') foot = `<p>🔒 Se abre cuando construyas todas las estaciones de ${zone.name}.</p>`;
      else if (st.kind === 'done') foot = `<p>✅ Ya lo jugaste este año. Vuelve el año ${st.year + 1}, con otro objetivo.</p>`;
      else if (st.kind === 'active') foot = `<button class="btn buy" data-play="${def.zone}">Seguir · ⏱ ${formatClock(st.board.playTime)}</button>`;
      else foot = `<button class="btn buy" data-play="${def.zone}">Jugar</button>`;
      return `<div class="event-card${st.kind === 'locked' ? ' locked' : ''}">
        <h3><span>${def.icon} ${def.name} · ${zone.icon} ${zone.name}</span><span>${best ? MEDALS[best].icon : ''}</span></h3>
        <p>${def.intro}</p>
        ${st.kind === 'locked' ? '' : `<p class="event-year">Año ${st.year}: ${objectiveText(obj)}.<br>${medalLine(obj)}</p>`}
        ${foot}
      </div>`;
    });
    // Las zonas que todavía no se abren en la partida no se muestran.
    this.body.innerHTML = `${cards.join('')}<p class="event-soon">Cada zona que abras trae su evento.</p>`;
  }

  update() {
    const s = this.game.state;
    const statuses = EVENTS.map((def) => eventStatus(s, def.zone)).filter(Boolean);
    // El botón aparece cuando hay algún evento abierto; el número, los que se pueden empezar.
    this.btn.hidden = !statuses.some((st) => st.kind !== 'locked');
    const ready = statuses.filter((st) => st.kind === 'available').length;
    this.badge.hidden = ready === 0;
    this.badge.textContent = ready;
  }
}
