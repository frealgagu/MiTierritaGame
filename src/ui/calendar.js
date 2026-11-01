// Ventana del calendario (v1.9): toca el reloj. La hora, la temporada, el día y el año, el horario de
// trabajo y lo que rinde cada temporada.
import { SEASONS, SEASON_DAYS, clockOf, hourOf, isLunch, isWorkTime, seasonDay, seasonOf, workBlocks, workOf, yearOf } from '../sim/calendar.js';
import { clockLabel } from '../render/DayNight.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { eventClock } from '../sim/events.js';
import { formatClock } from './EventBar.js';
import { decimal } from '../core/format.js';
import { listJoin, t } from '../i18n/index.js';

const pct = (m) => (m === 1 ? t('normal') : `${m > 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)} %`);

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
    document.getElementById('calendar-title').textContent = t('⏱ Reloj del evento');
    document.getElementById('calendar-now').textContent = `${def.icon} ${def.name} · ⏱ ${formatClock(eventClock(state))}`;
    return;
  }
  document.getElementById('calendar-title').textContent = t('📅 Calendario');
  const clock = clockOf(state);
  const extra = workOf(state);
  const season = seasonOf(clock);
  document.getElementById('calendar-now').textContent =
    `${clockLabel(hourOf(clock))} · ${isWorkTime(clock, extra) ? t('jornada de trabajo') : isLunch(clock, extra) ? t('hora del almuerzo, todo descansa') : t('de noche, todo descansa')}\n${season.icon} ${t('{season}, día {day} de {days} · año {year}', { season: season.name, day: seasonDay(clock), days: SEASON_DAYS, year: yearOf(clock) })}`;
  document.getElementById('calendar-work').textContent = workSentence(workBlocks(extra), true);
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
      mult.textContent = `×${decimal(s.mult)} · ${pct(s.mult)}`;
      li.append(name, mult);
      return li;
    }),
  );
}

// La jornada (v3.8) en una línea: «6:00 a 12:00 y 14:00 a 22:00», con los bloques comprados juntos.
// «Se trabaja de 6:00 a 12:00 y de 14:00 a 20:00» o «Se trabajan las 24 horas» (v3.67: antes «se trabaja de
// las 24 horas»). capital: con mayúscula al principio.
export function workSentence(blocks, capital = false) {
  const all = blocks.some(([a, b]) => b - a >= 24) || Array.from({ length: 24 }, (_, h) => blocks.some(([a, b]) => h >= a && h < b)).every(Boolean);
  const s = all ? t('se trabajan las 24 horas') : t('se trabaja de {hours}', { hours: workText(blocks) });
  return capital ? s[0].toUpperCase() + s.slice(1) : s;
}

export function workText(blocks) {
  const hours = Array.from({ length: 24 }, (_, h) => blocks.some(([a, b]) => h >= a && h < b));
  if (hours.every(Boolean)) return t('las 24 horas');
  const start = hours.findIndex((on, h) => !on && hours[(h + 1) % 24]) + 1; // después de un descanso
  const spans = [];
  for (let k = 0; k < 24; k++) {
    const h = (start + k) % 24;
    if (!hours[h]) continue;
    const last = spans.at(-1);
    if (last && last[1] % 24 === h) last[1] = h + 1;
    else spans.push([h, h + 1]);
  }
  const fmt = ([a, b]) => t('{a}:00 a {b}:00', { a, b: b % 24 });
  return listJoin(spans.map(fmt));
}
