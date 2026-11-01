import { formatDuration, formatNumber } from '../core/format.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { toast } from './toast.js';
import { VICTORY } from '../data/victory.js';
import { LANG, t } from '../i18n/index.js';

// Ventana de bienvenida con lo ganado mientras el juego estuvo cerrado.
export function showWelcome({ seconds, coins, capped, cap, scale = 1 }, onCollect) {
  const modal = document.getElementById('welcome');
  const fast = scale > 1 ? ` (${t('a')} ⏩ ×${scale})` : '';
  document.getElementById('welcome-text').textContent = capped
    ? t('Estuviste fuera más de {cap}. Tu finca trabajó {time}, el máximo, y ganó (con Renombre ⭐ puedes subir ese máximo, en 🏅 Eventos › ⏰ Sin conexión):', { cap: formatDuration(cap / scale), time: formatDuration(seconds) + fast })
    : t('Mientras no estabas, tu finca siguió trabajando {time} y ganó:', { time: formatDuration(seconds) + fast });
  document.getElementById('welcome-coins').textContent = `💰 ${formatNumber(coins)}`;
  modal.hidden = false;
  const ok = document.getElementById('welcome-ok');
  ok.onclick = () => {
    modal.hidden = true;
    onCollect?.();
  };
}


// «al Tabacal», «a La Lechería»: el artículo «el» se contrae con la preposición.
const toZone = (name) => (name.startsWith('El ') ? `al ${name.slice(3)}` : `a ${name}`);

// onGo(zona): ir a la zona que se acaba de abrir. opened: regiones que se abrieron al completarla
// (v3.0: el Pueblo abre Santander). open: la región que sigue, si ya estaba abierta (v3.8.1: al
// completar de nuevo el Pueblo tras reiniciar, también se ofrece ir a Santander).
export function showVictory(state, zoneId, onGo, opened = [], open = null) {
  const v = VICTORY[zoneId];
  const fresh = Boolean(opened[0]);
  const region = REGIONS_BY_ID[opened[0] ?? open];
  const next = ZONES_BY_ID[zoneId].next ?? (region ? region.zones[0] : null);
  document.getElementById('victory-title').textContent = v.title;
  document.getElementById('victory-text').innerHTML = v.text;
  document.getElementById('victory-stats').textContent = t('Tiempo jugado: {time} · Ganado en total: 💰 {coins} · {stat}: {n}', { time: formatDuration(state.playTime), coins: formatNumber(state.totalEarned), stat: v.stat[0], n: formatNumber(state.stats.sold[v.stat[1]] ?? 0) });
  const soon = document.getElementById('victory-next');
  const go = document.getElementById('victory-go');
  const stay = document.getElementById('victory-ok');
  const modal = document.getElementById('victory');
  if (region) {
    soon.innerHTML = fresh
      ? t('¡Se abrió una región nueva: <b>{region}</b>! Empieza de cero, con su propia economía, y tu {old} sigue produciendo.', { region: `${region.icon} ${region.name}`, old: REGIONS_BY_ID[REGION_OF_ZONE[zoneId]].name })
      : t('Tu región <b>{region}</b> sigue abierta y produciendo.', { region: `${region.icon} ${region.name}` });
    go.hidden = false;
    go.textContent = t('Ir a {zone}', { zone: `${region.name} ${region.icon}` });
    go.onclick = () => {
      modal.hidden = true;
      onGo(next);
    };
  } else if (next) {
    soon.innerHTML = t('Se abrió la <b>Zona {n} · {zone}</b> {icon}', { n: zoneIndex(next), zone: ZONES_BY_ID[next].name, icon: ZONES_BY_ID[next].icon });
    go.hidden = false;
    go.textContent = LANG === 'es' ? `Ir ${toZone(ZONES_BY_ID[next].name)} ${ZONES_BY_ID[next].icon}` : t('Ir a {zone}', { zone: `${ZONES_BY_ID[next].name} ${ZONES_BY_ID[next].icon}` });
    go.onclick = () => {
      modal.hidden = true;
      onGo(next);
    };
  } else {
    soon.innerHTML = t('¡Completaste todas las zonas que hay por ahora! Las que siguen llegan en las próximas versiones.');
    go.hidden = true;
  }
  stay.textContent = next ? t('Quedarme aquí') : t('Seguir jugando');
  modal.hidden = false;
  stay.onclick = () => {
    modal.hidden = true;
    // Para que no se pierda el camino: se va a otra región (o zona) con el botón 🗺️.
    if (region) toast(t('🗺️ Puedes ir a {region} cuando quieras con el botón de zonas.', { region: `${region.name} ${region.icon}` }), 5000);
  };
}

// Número de la zona dentro de su región.
const zoneIndex = (id) => REGIONS_BY_ID[REGION_OF_ZONE[id]].zones.indexOf(id) + 1;
