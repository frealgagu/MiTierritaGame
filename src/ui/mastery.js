import { formatDuration, formatMult, formatNumber } from '../core/format.js';
import { legacyMult } from '../sim/modifiers.js';
import { stationsOf } from '../sim/legacy.js';
import { regionOf } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Pantalla del segundo final: felicitación y reinicio con la producción al doble.
// onRestart: empieza la partida nueva (main.js guarda y recarga).
export function showMastery(state, onRestart) {
  const mult = legacyMult(state);
  const runs = (state.legacy?.history?.length ?? 0) + 1;
  document.getElementById('mastery-text').innerHTML =
    `Llevaste las <b>${stationsOf(state).length} estaciones</b> de ${regionOf(state).name} al <b>nivel 100</b>. Todo trabaja a toda marcha.`;
  document.getElementById('mastery-stats').textContent =
    `Partida ${runs}${mult > 1 ? ` (producción ${formatMult(mult)})` : ''} · Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)}`;
  document.getElementById('mastery-note').textContent =
    `Puedes volver a empezar ${regionOf(state).name} desde ${ZONES_BY_ID[regionOf(state).zones[0]].name} (monedas, niveles, investigaciones y objetivos desde cero), pero con todo produciendo ${formatMult(mult * 2)}. Las otras regiones siguen como están. Se conservan los ajustes y el registro de tus partidas.`;
  const modal = document.getElementById('mastery');
  const restart = document.getElementById('mastery-restart');
  restart.textContent = `🔁 Volver a empezar con producción ${formatMult(mult * 2)}`;
  restart.onclick = onRestart;
  document.getElementById('mastery-ok').onclick = () => (modal.hidden = true);
  modal.hidden = false;
}
