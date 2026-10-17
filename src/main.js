import { Application } from 'pixi.js';
import { Game } from './core/Game.js';
import { clearSave, loadGame, saveGame } from './core/SaveSystem.js';
import { formatDuration, formatNumber } from './core/format.js';
import { Scene } from './render/Scene.js';
import { HUD } from './ui/HUD.js';
import { StationPanel } from './ui/StationPanel.js';
import { ChainView } from './ui/ChainView.js';
import { toast } from './ui/toast.js';

const AUTOSAVE_MS = 10_000;
const MIN_OFFLINE_S = 30;
let resetting = false;

async function start() {
  try {
    await document.fonts.load('600 16px Fredoka');
  } catch {
    // sin fuente web: se usa la del sistema
  }

  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  document.getElementById('app').appendChild(app.canvas);

  const saved = loadGame();
  const game = new Game(saved ?? undefined);
  if (saved) applyOffline(game, (Date.now() - saved.savedAt) / 1000);

  const scene = new Scene(app, game);
  const panel = new StationPanel(game, () => scene.select(null));
  // id puede ser 'farm', 'dispatch' o 'farm:transport' (abre la pestaña de arrieros).
  scene.onSelect = (id) => {
    const [stationId, part] = id.split(':');
    scene.select(stationId);
    panel.open(stationId, part === 'transport' ? 'transport' : 'station');
  };
  const hud = new HUD(game, scene.onSelect);
  const chain = new ChainView(game, scene.onSelect);
  window.addEventListener('resize', () => scene.resize(app.screen.width, app.screen.height));

  if (!saved) toast('Toca el 🌳 Cafetal y mejóralo cuando tengas monedas.', 6000);

  let uiTimer = 0;
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    game.update(dt);
    scene.update(dt);
    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.2;
      hud.update();
      panel.update();
      chain.update();
    }
  });

  // Guardado automático y recuperación al volver a la pestaña.
  const persist = () => {
    if (!resetting) saveGame(game.state);
  };
  setInterval(persist, AUTOSAVE_MS);
  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      persist();
    } else if (hiddenAt) {
      applyOffline(game, (Date.now() - hiddenAt) / 1000);
      hiddenAt = null;
    }
  });
  window.addEventListener('pagehide', persist);

  bindMenu(game);
  if (import.meta.env.DEV) window.__cafetal = { game, scene };
}

function applyOffline(game, seconds) {
  if (seconds < MIN_OFFLINE_S) return;
  const r = game.catchUp(seconds);
  if (r.coins > 0) toast(`Mientras no estabas (${formatDuration(r.seconds)}), tu finca ganó 💰 ${formatNumber(r.coins)}`, 6000);
}

function bindMenu(game) {
  const menu = document.getElementById('menu');
  document.getElementById('menu-btn').addEventListener('click', () => {
    const s = game.state;
    document.getElementById('menu-stats').textContent =
      `Tiempo jugado: ${formatDuration(s.playTime)} · Ganado en total: 💰 ${formatNumber(s.totalEarned)} · Cerezas vendidas: ${formatNumber(s.stats.sold.cherry ?? 0)}`;
    menu.hidden = false;
  });
  document.getElementById('close-menu').addEventListener('click', () => (menu.hidden = true));
  // Confirmación en dos toques (sin diálogos del navegador).
  const reset = document.getElementById('reset-btn');
  let armed = null;
  reset.addEventListener('click', () => {
    if (!armed) {
      reset.textContent = 'Toca otra vez para borrar';
      armed = setTimeout(() => {
        armed = null;
        reset.textContent = 'Borrar partida';
      }, 3000);
      return;
    }
    resetting = true;
    clearSave();
    location.reload();
  });
}

start();
