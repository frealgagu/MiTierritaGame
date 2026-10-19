// Pantalla de carga (v2.3.1): al abrir el juego, mientras se prepara el mapa, y cada vez que hay que
// calcular lo que se produjo sin conexión (al abrir o al volver a la app), con su barra de avance. Así
// no parece que el juego se trabó.
import { formatDuration } from '../core/format.js';

const el = () => document.getElementById('splash');

// Sin barra: algo que no se sabe cuánto tarda (cargar las fuentes, preparar el mapa).
export function splashWait(text) {
  const s = el();
  s.hidden = false;
  s.classList.remove('done');
  s.classList.add('indeterminate');
  document.getElementById('splash-text').textContent = text;
  document.getElementById('splash-note').textContent = '';
}

// Con barra: el cálculo de lo que se produjo mientras no estabas.
// region: la región que se calcula (las que no son el Eje Cafetero lo dicen).
export function splashOffline(seconds, cap, region = null) {
  const where = region ? ` en ${region.icon} ${region.name}` : '';
  splashWait(`Pasaron ${formatDuration(seconds)} desde la última vez. Calculando lo que se produjo${where} mientras no estabas…`);
  el().classList.remove('indeterminate');
  setSplashProgress(0);
  document.getElementById('splash-note').textContent = seconds > cap ? `Sin conexión se produce hasta ${formatDuration(cap)}.` : 'Las noches y las temporadas también cuentan.';
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
