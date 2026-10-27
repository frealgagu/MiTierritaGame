import { toast } from './toast.js';
import { setCredit } from '../sim/upgrades.js';
import { formatMult } from '../core/format.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { MAX_LEGACY_RESETS } from '../sim/modifiers.js';

// Opciones de desarrollador, ocultas en el menú: se muestran tocando 7 veces la versión.
// Acelerar el tiempo, permitir saldo negativo y simular reinicios del segundo final (multiplicador de
// producción en potencias de 2). Los dos primeros viven en este navegador; el multiplicador, en la partida. Si se cierra
// el juego acelerado, al volver sigue acelerado y el tiempo fuera cuenta a esa velocidad (el ⏩ de
// arriba lo recuerda).
const KEY = 'cafetal-dev';
const TAPS = 7;
const MAX_SPEED = 100;
// Como en el juego (v3.56): el multiplicador llega hasta ×2³².
const MAX_RESETS = MAX_LEGACY_RESETS;

function load() {
  try {
    return { visible: false, speed: 10, active: false, credit: false, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { visible: false, speed: 10, active: false, credit: false };
  }
}

// Velocidad con la que se cerró el juego (1 si no estaba acelerado).
export function savedSpeed() {
  const prefs = load();
  return prefs.visible && prefs.active ? Math.min(MAX_SPEED, Math.max(1, prefs.speed)) : 1;
}

function store(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // sin almacenamiento: se olvida al cerrar
  }
}

// getActive: el Game de la región que se ve (v3.12: los reinicios simulados son de esa región).
export function bindDevOptions(game, getActive = () => game) {
  const prefs = load();
  const box = document.getElementById('dev-box');
  const input = document.getElementById('dev-speed');
  const toggle = document.getElementById('dev-toggle');
  const chip = document.getElementById('speed-chip');
  const credit = document.getElementById('dev-credit');
  input.max = MAX_SPEED;
  input.value = prefs.speed;
  box.hidden = !prefs.visible;
  credit.checked = prefs.visible && prefs.credit;
  setCredit(credit.checked);
  credit.addEventListener('change', () => {
    prefs.credit = credit.checked;
    setCredit(prefs.credit);
    store(prefs);
    toast(prefs.credit ? '💸 Saldo negativo permitido: compra lo que quieras' : '💰 Solo se compra con lo que hay');
  });

  const speed = () => Math.min(MAX_SPEED, Math.max(1, Math.round(Number(input.value) || 1)));
  const paint = () => {
    const on = game.timeScale > 1;
    toggle.textContent = on ? '⏹️ Volver a ×1' : `⏩ Acelerar ×${speed()}`;
    chip.hidden = !on;
    chip.textContent = `⏩ ×${game.timeScale}`;
  };
  const setScale = (s) => {
    game.timeScale = s;
    prefs.active = s > 1;
    store(prefs);
    paint();
  };

  toggle.addEventListener('click', () => setScale(game.timeScale > 1 ? 1 : speed()));
  // Mientras se escribe, el botón ya dice la velocidad nueva (y, si está acelerado, se aplica).
  input.addEventListener('input', () => {
    if (!input.value) return;
    prefs.speed = speed();
    store(prefs);
    if (game.timeScale > 1 && prefs.speed > 1) setScale(prefs.speed);
    else paint();
  });
  input.addEventListener('change', () => (input.value = prefs.speed = speed()));

  // Multiplicador de producción: como si ya se hubiera reiniciado n veces (×2ⁿ), hasta ×2³².
  const legacy = document.getElementById('dev-legacy');
  const legacyMultText = document.getElementById('dev-legacy-mult');
  legacy.max = MAX_RESETS;
  const resets = () => Math.min(MAX_RESETS, Math.max(0, Math.round(Number(legacy.value) || 0)));
  const showMult = () => (legacyMultText.textContent = `= ${formatMult(2 ** resets())}`);
  const region = () => getActive().state;
  const syncLegacy = () => {
    legacy.value = String(region().legacy?.resets ?? 0);
    showMult();
  };
  syncLegacy();
  document.getElementById('menu-btn').addEventListener('click', syncLegacy);
  // Como la velocidad: se aplica mientras se escribe.
  legacy.addEventListener('input', () => {
    if (legacy.value === '') return;
    const s = region();
    s.legacy = { history: [], ...s.legacy, resets: resets() };
    showMult();
  });
  legacy.addEventListener('change', () => {
    legacy.value = String(resets());
    toast(`🔁 ${REGIONS_BY_ID[region().region ?? 'cafetero'].name}: producción ${formatMult(2 ** resets())}`);
  });
  chip.addEventListener('click', () => setScale(1));

  // Gesto secreto: 7 toques seguidos a la versión del menú.
  let taps = 0;
  let timer = null;
  document.getElementById('menu-version').addEventListener('click', () => {
    clearTimeout(timer);
    timer = setTimeout(() => (taps = 0), 1500);
    if (++taps < TAPS || prefs.visible) return;
    taps = 0;
    box.hidden = false;
    box.open = true;
    prefs.visible = true;
    store(prefs);
    toast('🛠️ Opciones de desarrollador activadas');
  });
  document.getElementById('dev-hide').addEventListener('click', () => {
    prefs.visible = false;
    box.hidden = true;
    credit.checked = prefs.credit = false;
    setCredit(false);
    store(prefs);
    setScale(1);
  });

  paint();
}
