import { toast } from './toast.js';

// Opciones de desarrollador, ocultas en el menú: se muestran tocando 7 veces la versión.
// Por ahora, solo acelerar el tiempo. El ajuste vive en este navegador, no en la partida, y la
// aceleración siempre arranca apagada al abrir el juego (para no olvidarla puesta).
const KEY = 'cafetal-dev';
const TAPS = 7;
const MAX_SPEED = 100;

function load() {
  try {
    return { visible: false, speed: 10, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { visible: false, speed: 10 };
  }
}

function store(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // sin almacenamiento: se olvida al cerrar
  }
}

export function bindDevOptions(game) {
  const prefs = load();
  const box = document.getElementById('dev-box');
  const input = document.getElementById('dev-speed');
  const toggle = document.getElementById('dev-toggle');
  const chip = document.getElementById('speed-chip');
  input.max = MAX_SPEED;
  input.value = prefs.speed;
  box.hidden = !prefs.visible;

  const speed = () => Math.min(MAX_SPEED, Math.max(1, Math.round(Number(input.value) || 1)));
  const paint = () => {
    const on = game.timeScale > 1;
    toggle.textContent = on ? '⏹️ Volver a ×1' : `⏩ Acelerar ×${speed()}`;
    chip.hidden = !on;
    chip.textContent = `⏩ ×${game.timeScale}`;
  };
  const setScale = (s) => {
    game.timeScale = s;
    paint();
  };

  toggle.addEventListener('click', () => setScale(game.timeScale > 1 ? 1 : speed()));
  input.addEventListener('change', () => {
    input.value = prefs.speed = speed();
    store(prefs);
    if (game.timeScale > 1) setScale(prefs.speed);
    else paint();
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
    store(prefs);
    setScale(1);
  });

  paint();
}
