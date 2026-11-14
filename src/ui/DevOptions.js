import { toast } from './toast.js';
import { setCredit } from '../sim/upgrades.js';
import { setFastEvents } from '../sim/events.js';
import { decimal, formatMult } from '../core/format.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { MAX_LEGACY_RESETS } from '../sim/modifiers.js';
import { t } from '../i18n/index.js';

// Developer options, hidden in the menu: revealed by tapping the version 7 times.
// Time scale, allow negative balance, and simulate second-ending resets (power-of-2 production
// multiplier). First two live in this browser; multiplier lives in the save. Closing while
// sped up keeps the speed on reopen and offline time counts at that speed (the ⏩ badge
// on top serves as reminder).
const KEY = 'mitierrita-dev';
const TAPS = 7;
const MAX_SPEED = 100;
const MIN_SPEED = 0.01; // v3.68.2: also slower than normal, in hundredths (×0.25, ×0.01)
// Same as the game: multiplier caps at ×2^MAX_LEGACY_RESETS.
const MAX_RESETS = MAX_LEGACY_RESETS;

function load() {
  try {
    return { visible: false, speed: 10, active: false, credit: false, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { visible: false, speed: 10, active: false, credit: false };
  }
}

// Speed when the game closed (1 if not accelerated).
export function savedSpeed() {
  const prefs = load();
  return prefs.visible && prefs.active ? clampSpeed(prefs.speed) : 1;
}

const clampSpeed = (v) => Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round((Number(v) || 1) * 100) / 100));

function store(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable: forgotten on close
  }
}

// getActive: Game of the currently viewed region (v3.12: simulated resets apply to that region).
export function bindDevOptions(game, getActive = () => game) {
  const prefs = load();
  const box = document.getElementById('dev-box');
  const input = document.getElementById('dev-speed');
  const toggle = document.getElementById('dev-toggle');
  const chip = document.getElementById('speed-chip');
  const credit = document.getElementById('dev-credit');
  input.max = MAX_SPEED;
  input.min = MIN_SPEED;
  input.value = prefs.speed;
  box.hidden = !prefs.visible;
  credit.checked = prefs.visible && prefs.credit;
  setCredit(credit.checked);
  credit.addEventListener('change', () => {
    prefs.credit = credit.checked;
    setCredit(prefs.credit);
    store(prefs);
    toast(prefs.credit ? t('💸 Saldo negativo permitido: compra lo que quieras') : t('💰 Solo se compra con lo que hay'));
  });

  // Consecutive events (v4.7.2): test all events without waiting 2 years per slot.
  const events = document.getElementById('dev-events');
  events.checked = prefs.visible && Boolean(prefs.events);
  setFastEvents(events.checked, game.state);
  events.addEventListener('change', () => {
    prefs.events = events.checked;
    setFastEvents(prefs.events, game.state);
    store(prefs);
    toast(prefs.events ? t('⏱️ Eventos seguidos: cada cupo se libera al segundo') : t('📅 Eventos con su espera normal de 2 años'));
  });

  const speed = () => clampSpeed(String(input.value).replace(',', '.'));
  const paint = () => {
    const on = game.timeScale !== 1;
    toggle.textContent = on ? t('⏹️ Volver a ×1') : t('⏩ Acelerar ×{n}', { n: decimal(speed()) });
    chip.hidden = !on;
    chip.textContent = `${game.timeScale < 1 ? '🐢' : '⏩'} ×${decimal(game.timeScale)}`;
  };
  const setScale = (s) => {
    game.timeScale = s;
    prefs.active = s !== 1;
    store(prefs);
    paint();
  };

  toggle.addEventListener('click', () => setScale(game.timeScale !== 1 ? 1 : speed()));
  // While typing, button immediately previews new speed (and applies if currently sped up).
  input.addEventListener('input', () => {
    if (!input.value) return;
    prefs.speed = speed();
    store(prefs);
    if (game.timeScale !== 1 && prefs.speed !== 1) setScale(prefs.speed);
    else paint();
  });
  input.addEventListener('change', () => (input.value = prefs.speed = speed()));

  // Production multiplier: as if already reset n times (×2ⁿ), up to game cap.
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
  // Same as time scale: applies while typing.
  legacy.addEventListener('input', () => {
    if (legacy.value === '') return;
    const s = region();
    s.legacy = { resets: resets() };
    showMult();
  });
  legacy.addEventListener('change', () => {
    legacy.value = String(resets());
    toast(t('🔁 {region}: producción {mult}', { region: REGIONS_BY_ID[region().region ?? 'cafetero'].name, mult: formatMult(2 ** resets()) }));
  });
  chip.addEventListener('click', () => setScale(1));

  // Secret gesture: 7 consecutive taps on the menu version.
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
    toast(t('🛠️ Opciones de desarrollador activadas'));
  });
  document.getElementById('dev-hide').addEventListener('click', () => {
    prefs.visible = false;
    box.hidden = true;
    credit.checked = prefs.credit = false;
    setCredit(false);
    events.checked = prefs.events = false;
    setFastEvents(false);
    store(prefs);
    setScale(1);
  });

  paint();
}
