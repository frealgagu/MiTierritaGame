import { Application } from 'pixi.js';
import { Game } from './core/Game.js';
import { clearSave, exportSave, importSave, loadGame, saveGame } from './core/SaveSystem.js';
import { formatDuration, formatNumber } from './core/format.js';
import { Scene } from './render/Scene.js';
import { HUD } from './ui/HUD.js';
import { StationPanel } from './ui/StationPanel.js';
import { ChainView } from './ui/ChainView.js';
import { GoalsView } from './ui/GoalsView.js';
import { ResearchView } from './ui/ResearchView.js';
import { showVictory, showWelcome } from './ui/dialogs.js';
import { ZonesView } from './ui/ZonesView.js';
import { ZONES_BY_ID } from './data/zones/index.js';
import { ROUTES_BY_ID } from './data/routes.js';
import { STATIONS_BY_ID } from './data/stations.js';
import { RESEARCH_BY_ID } from './data/research.js';
import { offlineCapSeconds } from './sim/modifiers.js';
import { toast } from './ui/toast.js';
import { bindDevOptions } from './ui/DevOptions.js';
import { Sound } from './audio/Sound.js';

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
  const offline = saved ? applyOffline(game, (Date.now() - saved.savedAt) / 1000) : null;

  const sound = new Sound();
  sound.setEnabled(game.state.settings.sound);
  // Un clic suave en cada botón de la interfaz.
  document.addEventListener('click', (e) => {
    if (e.target.closest('button')) sound.click();
  });

  // Zona que se está viendo (las demás siguen produciendo). Se recuerda con la partida.
  const view = { zone: game.state.zones[game.state.settings.zone]?.unlocked ? game.state.settings.zone : 'finca' };
  const getZone = () => view.zone;
  let scene = null;
  const panel = new StationPanel(game, () => scene?.select(null));
  // id puede ser 'farm', 'farm:transport' (pestaña de arrieros), 'dispatch:<zona>', 'route:<ruta>'
  // (pestaña 🚌 de la estación que abastece, o un panel suelto si se ve otra zona) o 'research:<id>'.
  const select = (id) => {
    const [stationId, part] = id.split(':');
    if (stationId === 'research') {
      research.open();
      return;
    }
    if (stationId === 'dispatch') {
      scene.select('dispatch');
      panel.open(id);
      return;
    }
    if (stationId === 'route') {
      const station = ROUTES_BY_ID[part].station;
      if (scene.stations[station] && game.state.stations[station]) {
        scene.select(station);
        panel.open(station, 'route');
      } else {
        scene.select(null);
        panel.open(id);
      }
      return;
    }
    // Una estación de otra zona (la recomendación puede señalar la que abastece una ruta): ir allá.
    if (STATIONS_BY_ID[stationId] && STATIONS_BY_ID[stationId].zone !== view.zone) {
      showZone(STATIONS_BY_ID[stationId].zone);
      toast(`${ZONES_BY_ID[view.zone].icon} ${ZONES_BY_ID[view.zone].name}`, 2000);
    }
    scene.select(stationId);
    panel.open(stationId, part === 'transport' ? 'transport' : 'station');
  };
  const showZone = (zoneId) => {
    if (scene) scene.destroy();
    if (panel.id) panel.close();
    view.zone = zoneId;
    game.state.settings.zone = zoneId;
    scene = new Scene(app, game, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    if (import.meta.env.DEV) window.__cafetal = { game, scene };
  };
  showZone(view.zone);
  const hud = new HUD(game, select, () => scene.dayNight.hour, getZone);
  const chain = new ChainView(game, select, getZone);
  const goals = new GoalsView(game, getZone);
  const research = new ResearchView(game, getZone);
  const zones = new ZonesView(game, getZone, (z) => {
    showZone(z);
    toast(`${ZONES_BY_ID[z].icon} ${ZONES_BY_ID[z].name}`, 2000);
  });

  game.bus.on('goalClaimed', ({ goal, zone }) => {
    if (goal.final) {
      sound.milestone();
      showVictory(game.state, zone, (next) => showZone(next));
    } else {
      sound.coin();
      toast(`🎯 ¡Objetivo cumplido! +${formatNumber(goal.reward)} 💰`, 3000);
    }
  });
  game.bus.on('research', ({ id }) => {
    sound.milestone();
    toast(`🔬 ${RESEARCH_BY_ID[id].name}: ${RESEARCH_BY_ID[id].desc}`, 4000);
  });
  window.addEventListener('resize', () => scene.resize(app.screen.width, app.screen.height));
  // Esc cierra la ventana abierta o, si no hay ninguna, el panel de la estación.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.modal')].filter((m) => !m.hidden);
    if (open.length) open.forEach((m) => (m.hidden = true));
    else if (panel.id) panel.close();
  });

  if (!saved) toast('Toca el 🌳 Cafetal y mejóralo cuando tengas monedas.', 6000);
  if (offline) showWelcome(offline, () => sound.coin());

  let uiTimer = 0;
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    game.update(dt);
    scene.update(dt);
    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.2;
      hud.update();
      scene.setGuide(panel.id ? null : hud.guide);
      panel.update();
      chain.update();
      goals.update();
      research.update();
      zones.update();
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
      const r = applyOffline(game, (Date.now() - hiddenAt) / 1000);
      if (r) showWelcome(r, () => sound.coin());
      hiddenAt = null;
    }
  });
  window.addEventListener('pagehide', persist);

  bindMenu(game, sound);
  bindDevOptions(game);
  // Jugable sin internet e instalable en el móvil (solo en la versión publicada).
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// Simula el tiempo que el juego estuvo cerrado; devuelve el resumen si hubo ganancias.
function applyOffline(game, seconds) {
  if (seconds < MIN_OFFLINE_S) return null;
  const cap = offlineCapSeconds(game.state);
  const r = game.catchUp(seconds);
  return r.coins > 0 ? { ...r, cap, capped: seconds > cap } : null;
}

function bindMenu(game, sound) {
  const menu = document.getElementById('menu');
  const soundBtn = document.getElementById('sound-btn');
  const paintSound = () => (soundBtn.textContent = game.state.settings.sound ? '🔊 Sonido: sí' : '🔇 Sonido: no');
  paintSound();
  soundBtn.addEventListener('click', () => {
    game.state.settings.sound = !game.state.settings.sound;
    sound.setEnabled(game.state.settings.sound);
    paintSound();
  });
  document.getElementById('menu-btn').addEventListener('click', () => {
    const s = game.state;
    document.getElementById('menu-stats').textContent =
      `Tiempo jugado: ${formatDuration(s.playTime)} · Ganado en total: 💰 ${formatNumber(s.totalEarned)} · Cerezas vendidas: ${formatNumber(s.stats.sold.cherry ?? 0)}`;
    menu.hidden = false;
  });
  document.getElementById('close-menu').addEventListener('click', () => (menu.hidden = true));

  // Copia de seguridad en texto.
  const text = document.getElementById('save-text');
  const msg = document.getElementById('save-msg');
  document.getElementById('export-btn').addEventListener('click', async () => {
    text.value = exportSave(game.state);
    text.select();
    try {
      await navigator.clipboard.writeText(text.value);
      msg.textContent = '✅ Copiado. Pégalo en otro dispositivo para seguir allí.';
    } catch {
      msg.textContent = 'Selecciona el texto y cópialo.';
    }
  });
  document.getElementById('import-btn').addEventListener('click', () => {
    const state = importSave(text.value);
    if (!state) {
      msg.textContent = '⛔ Ese texto no es una partida válida de Cafetal.';
      return;
    }
    resetting = true;
    saveGame(state);
    location.reload();
  });
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
