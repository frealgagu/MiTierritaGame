// Ventana del calendario (v1.9): toca el reloj. La hora, la temporada, el día y el año, el horario de
// trabajo y lo que rinde cada temporada.
import { SEASONS, SEASON_DAYS, clockOf, hourOf, isLunch, isWorkTime, seasonDay, seasonOf, workBlocks, workOf, yearOf } from '../sim/calendar.js';
import { clockLabel } from '../render/DayNight.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { formatClock } from './EventBar.js';

const pct = (m) => (m === 1 ? 'normal' : `${m > 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)} %`);

export function showCalendar(state) {
  const modal = document.getElementById('calendar');
  document.getElementById('calendar-close').onclick = () => (modal.hidden = true);
  modal.onclick = (e) => e.target === modal && (modal.hidden = true);
  modal.hidden = false;
  // En el tablero de un evento (v3.9.1), su propio reloj: no tiene jornada ni temporadas.
  const country = document.getElementById('calendar-country');
  country.hidden = Boolean(state.event);
  document.getElementById('calendar-event').hidden = !state.event;
  if (state.event) {
    const def = EVENTS_BY_ID[state.event.id];
    document.getElementById('calendar-title').textContent = '⏱ Reloj del evento';
    document.getElementById('calendar-now').textContent = `${def.icon} ${def.name} · ⏱ ${formatClock(state.playTime)}`;
    return;
  }
  document.getElementById('calendar-title').textContent = '📅 Calendario';
  const t = clockOf(state);
  const extra = workOf(state);
  const season = seasonOf(t);
  document.getElementById('calendar-now').textContent =
    `${clockLabel(hourOf(t))} · ${isWorkTime(t, extra) ? 'jornada de trabajo' : isLunch(t, extra) ? 'hora del almuerzo, todo descansa' : 'de noche, todo descansa'}\n${season.icon} ${season.name}, día ${seasonDay(t)} de ${SEASON_DAYS} · año ${yearOf(t)}`;
  document.getElementById('calendar-work').textContent = workText(workBlocks(extra));
  // La mitaca es del Eje Cafetero.
  document.querySelector('#calendar .calendar-fact').hidden = (state.region ?? 'cafetero') !== 'cafetero';
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
}

// La jornada (v3.8) en una línea: «6:00 a 12:00 y 14:00 a 22:00», con los bloques comprados juntos.
export function workText(blocks) {
  const hours = Array.from({ length: 24 }, (_, h) => blocks.some(([a, b]) => h >= a && h < b));
  if (hours.every(Boolean)) return 'las 24 horas';
  const start = hours.findIndex((on, h) => !on && hours[(h + 1) % 24]) + 1; // después de un descanso
  const spans = [];
  for (let k = 0; k < 24; k++) {
    const h = (start + k) % 24;
    if (!hours[h]) continue;
    const last = spans.at(-1);
    if (last && last[1] % 24 === h) last[1] = h + 1;
    else spans.push([h, h + 1]);
  }
  const fmt = ([a, b]) => `${a}:00 a ${b % 24}:00`;
  return spans.map(fmt).join(spans.length > 2 ? ', ' : ' y ').replace(/, ([^,]*)$/, ' y $1');
}
