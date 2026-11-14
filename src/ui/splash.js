// Loading screen (v2.3.1): on startup while map builds, and whenever offline earnings
// must be simulated (on launch or returning to app), with progress bar. Prevents
// appearing frozen.
import { formatDuration } from '../core/format.js';
import { t } from '../i18n/index.js';

const el = () => document.getElementById('splash');

// Without bar: indeterminate work (loading fonts, preparing map).
export function splashWait(text) {
  const s = el();
  s.hidden = false;
  s.classList.remove('done');
  s.classList.add('indeterminate');
  document.getElementById('splash-text').textContent = text;
  document.getElementById('splash-note').textContent = '';
}

// With bar: offline progress simulation.
// region: region being computed (non-Eje Cafetero regions display their name).
export function splashOffline(seconds, cap, region = null) {
  splashWait(region
    ? t('Pasaron {time} desde la última vez. Calculando lo que se produjo en {region} mientras no estabas…', { time: formatDuration(seconds), region: `${region.icon} ${region.name}` })
    : t('Pasaron {time} desde la última vez. Calculando lo que se produjo mientras no estabas…', { time: formatDuration(seconds) }));
  el().classList.remove('indeterminate');
  setSplashProgress(0);
  document.getElementById('splash-note').textContent = seconds > cap ? t('Sin conexión se produce hasta {time}.', { time: formatDuration(cap) }) : t('Las noches y las temporadas también cuentan.');
}

export function setSplashProgress(f) {
  document.getElementById('splash-fill').style.width = `${Math.round(Math.min(1, Math.max(0, f)) * 100)}%`;
}

export function hideSplash() {
  const s = el();
  s.classList.add('done');
  setTimeout(() => {
    if (s.classList.contains('done')) s.hidden = true;
  }, 400);
}
