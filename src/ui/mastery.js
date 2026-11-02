import { formatDuration, formatMult, formatNumber } from '../core/format.js';
import { RESTART_RENOWN } from '../sim/renown.js';
import { legacyMult, nextLegacyMult } from '../sim/modifiers.js';
import { regionOf } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { t } from '../i18n/index.js';

// Pantalla del segundo final: felicitación y reinicio con la producción al doble.
// onRestart: empieza la partida nueva (main.js guarda y recarga).
export function showMastery(state, onRestart) {
  const mult = legacyMult(state);
  const next = nextLegacyMult(state);
  // Con el tope (×2⁶⁰), reiniciar ya no duplica: se dice.
  const capped = next === mult;
  const runs = (state.legacy?.resets ?? 0) + 1;
  document.getElementById('mastery-text').innerHTML =
    t('Llevaste todas las estaciones de {region}, sus <b>arrieros</b> y sus <b>rutas</b> al <b>nivel 100</b>, con todos los objetivos y todas las investigaciones. Todo trabaja a toda marcha.', { region: regionOf(state).name });
  document.getElementById('mastery-stats').textContent =
    `${t('Partida {n}', { n: runs })}${mult > 1 ? ` ${t('(producción {mult})', { mult: formatMult(mult) })}` : ''} · ${t('Tiempo jugado: {time} · Ganado en total: 💰 {coins}', { time: formatDuration(state.playTime), coins: formatNumber(state.totalEarned) })}`;
  document.getElementById('mastery-note').textContent =
    (capped
      ? t('Puedes volver a empezar {region} desde {zone} (monedas, niveles, investigaciones y objetivos desde cero), con la producción en {mult}, el máximo (ya no se duplica más). Las otras regiones siguen como están. Se conservan los ajustes. Volver a empezar te da {renown} ⭐ de Renombre.', { region: regionOf(state).name, zone: ZONES_BY_ID[regionOf(state).zones[0]].name, mult: formatMult(next), renown: RESTART_RENOWN })
      : t('Puedes volver a empezar {region} desde {zone} (monedas, niveles, investigaciones y objetivos desde cero), pero con todo produciendo {mult}. Las otras regiones siguen como están. Se conservan los ajustes. Volver a empezar te da {renown} ⭐ de Renombre.', { region: regionOf(state).name, zone: ZONES_BY_ID[regionOf(state).zones[0]].name, mult: formatMult(next), renown: RESTART_RENOWN }));
  const modal = document.getElementById('mastery');
  const restart = document.getElementById('mastery-restart');
  restart.textContent = `${t('🔁 Volver a empezar con producción {mult}', { mult: formatMult(next) })}${capped ? ` ${t('(máx.)')}` : ''} · +${RESTART_RENOWN} ⭐`;
  restart.onclick = onRestart;
  document.getElementById('mastery-ok').onclick = () => (modal.hidden = true);
  modal.hidden = false;
}
