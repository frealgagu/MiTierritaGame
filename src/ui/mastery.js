import { formatDuration, formatMult, formatNumber } from '../core/format.js';
import { legacyMult } from '../sim/modifiers.js';
import { ALL_STATIONS } from '../sim/legacy.js';

// Pantalla del segundo final: felicitación y reinicio con la producción al doble.
// onRestart: empieza la partida nueva (main.js guarda y recarga).
export function showMastery(state, onRestart) {
  const mult = legacyMult(state);
  const runs = (state.legacy?.history?.length ?? 0) + 1;
  document.getElementById('mastery-text').innerHTML =
    `Llevaste las <b>${ALL_STATIONS.length} estaciones</b> de las seis zonas al <b>nivel 100</b>. Desde la cereza hasta el contenedor, todo trabaja a toda marcha.`;
  document.getElementById('mastery-stats').textContent =
    `Partida ${runs}${mult > 1 ? ` (producción ${formatMult(mult)})` : ''} · Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)}`;
  document.getElementById('mastery-note').textContent =
    `Puedes volver a empezar desde la Finca (monedas, niveles, investigaciones y objetivos desde cero), pero con todo produciendo ${formatMult(mult * 2)}. Se conservan los ajustes y el registro de tus partidas.`;
  const modal = document.getElementById('mastery');
  const restart = document.getElementById('mastery-restart');
  restart.textContent = `🔁 Volver a empezar con producción ${formatMult(mult * 2)}`;
  restart.onclick = onRestart;
  document.getElementById('mastery-ok').onclick = () => (modal.hidden = true);
  modal.hidden = false;
}
