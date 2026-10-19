// Ventana del calendario (v1.9): toca el reloj. La hora, la temporada, el día y el año, el horario de
// trabajo y lo que rinde cada temporada.
import { SEASONS, SEASON_DAYS, hourOf, isWorkTime, seasonDay, seasonOf, yearOf } from '../sim/calendar.js';
import { clockLabel } from '../render/DayNight.js';

const pct = (m) => (m === 1 ? 'normal' : `${m > 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)} %`);

export function showCalendar(state) {
  const t = state.playTime;
  const season = seasonOf(t);
  document.getElementById('calendar-now').textContent =
    `${clockLabel(hourOf(t))} · ${isWorkTime(t) ? 'jornada de trabajo' : 'de noche, todo descansa'}\n${season.icon} ${season.name}, día ${seasonDay(t)} de ${SEASON_DAYS} · año ${yearOf(t)}`;
  const list = document.getElementById('calendar-seasons');
  list.replaceChildren(
    ...SEASONS.map((s) => {
      const li = document.createElement('li');
      li.classList.toggle('now', s === season);
      const name = document.createElement('span');
      name.textContent = `${s.icon} ${s.name}`;
      const mult = document.createElement('span');
      mult.className = s.mult > 1 ? 'up' : s.mult < 1 ? 'down' : '';
      mult.textContent = `×${String(s.mult).replace('.', ',')} · ${pct(s.mult)}`;
      li.append(name, mult);
      return li;
    }),
  );
  const modal = document.getElementById('calendar');
  document.getElementById('calendar-close').onclick = () => (modal.hidden = true);
  modal.onclick = (e) => e.target === modal && (modal.hidden = true);
  modal.hidden = false;
}
