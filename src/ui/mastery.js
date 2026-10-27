import { formatDuration, formatMult, formatNumber } from '../core/format.js';
import { RESTART_RENOWN } from '../sim/renown.js';
import { legacyMult, nextLegacyMult } from '../sim/modifiers.js';
import { regionOf } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Pantalla del segundo final: felicitación y reinicio con la producción al doble.
// onRestart: empieza la partida nueva (main.js guarda y recarga).
export function showMastery(state, onRestart) {
  const mult = legacyMult(state);
  const next = nextLegacyMult(state);
  // Con el tope (×2³²), reiniciar ya no duplica: se dice.
  const capped = next === mult;
  const runs = (state.legacy?.history?.length ?? 0) + 1;
  document.getElementById('mastery-text').innerHTML =
    `Llevaste todas las estaciones de ${regionOf(state).name}, sus <b>arrieros</b> y sus <b>rutas</b> al <b>nivel 100</b>, con todos los objetivos y todas las investigaciones. Todo trabaja a toda marcha.`;
  document.getElementById('mastery-stats').textContent =
    `Partida ${runs}${mult > 1 ? ` (producción ${formatMult(mult)})` : ''} · Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)}`;
  document.getElementById('mastery-note').textContent =
    `Puedes volver a empezar ${regionOf(state).name} desde ${ZONES_BY_ID[regionOf(state).zones[0]].name} (monedas, niveles, investigaciones y objetivos desde cero), ${capped ? `con la producción en ${formatMult(next)}, el máximo (ya no se duplica más)` : `pero con todo produciendo ${formatMult(next)}`}. Las otras regiones siguen como están. Se conservan los ajustes y el registro de tus partidas. Volver a empezar te da ${RESTART_RENOWN} ⭐ de Renombre.`;
  const modal = document.getElementById('mastery');
  const restart = document.getElementById('mastery-restart');
  restart.textContent = `🔁 Volver a empezar con producción ${formatMult(next)}${capped ? ' (máx.)' : ''} · +${RESTART_RENOWN} ⭐`;
  restart.onclick = onRestart;
  document.getElementById('mastery-ok').onclick = () => (modal.hidden = true);
  modal.hidden = false;
}
