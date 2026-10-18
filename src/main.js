import { Application } from 'pixi.js';
import { Game } from './core/Game.js';
import { clearSave, exportSave, importSave, loadGame, saveGame } from './core/SaveSystem.js';
import { formatDuration, formatMult, formatNumber } from './core/format.js';
import { Scene } from './render/Scene.js';
import { HUD } from './ui/HUD.js';
import { StationPanel } from './ui/StationPanel.js';
import { ChainView } from './ui/ChainView.js';
import { GoalsView } from './ui/GoalsView.js';
import { ResearchView } from './ui/ResearchView.js';
import { showVictory, showWelcome } from './ui/dialogs.js';
import { showMastery } from './ui/mastery.js';
import { introOnStart, showIntro } from './ui/intro.js';
import { bindNative, isNativeApp } from './native.js';
import { checkMastery, restartState } from './sim/legacy.js';
import { ZonesView } from './ui/ZonesView.js';
import { ZONES_BY_ID } from './data/zones/index.js';
import { ROUTES_BY_ID } from './data/routes.js';
import { STATIONS_BY_ID } from './data/stations.js';
import { ICON, ICON_FONT } from './data/icons.js';
import { RESEARCH_BY_ID } from './data/research.js';
import { legacyMult, offlineCapSeconds } from './sim/modifiers.js';
import { toast } from './ui/toast.js';
import { bindDevOptions, savedSpeed } from './ui/DevOptions.js';
import { Sound } from './audio/Sound.js';
import { Music } from './audio/Music.js';

const AUTOSAVE_MS = 10_000;
const MIN_OFFLINE_S = 30;
let resetting = false;

async function start() {
  try {
    // La fuente de los íconos propios también: el mapa los dibuja en textos de Pixi.
    await Promise.all([document.fonts.load('600 16px Fredoka'), document.fonts.load(`16px "${ICON_FONT}"`, Object.values(ICON).join(''))]);
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
  // La velocidad de las opciones de desarrollador sigue puesta al volver, también para el tiempo fuera.
  game.timeScale = savedSpeed();
  const offline = saved ? applyOffline(game, (Date.now() - saved.savedAt) / 1000) : null;

  const sound = new Sound();
  sound.setEnabled(game.state.settings.sound);
  // Las partidas de antes no tienen el ajuste: la música suena salvo que se haya quitado.
  const music = new Music(game.state.settings.music !== false);
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
      const station = ROUTES_BY_ID[part].stations.find((sid) => scene.stations[sid] && game.state.stations[sid]);
      if (station) {
        scene.select(station);
        panel.open(station, id);
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
    // Primero el panel: al cerrarse quita la selección de la escena, que aún debe existir.
    if (panel.id) panel.close();
    if (scene) scene.destroy();
    view.zone = zoneId;
    game.state.settings.zone = zoneId;
    scene = new Scene(app, game, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    if (import.meta.env.DEV) window.__cafetal = { game, scene, panel, select };
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
  // Segundo final: todas las estaciones en el nivel 100. Se puede volver a empezar con producción ×2.
  const restart = () => {
    resetting = true;
    saveGame(restartState(game.state));
    location.reload();
  };
  const mastery = () => showMastery(game.state, restart);
  game.bus.on('mastered', () => {
    // Si llega al cobrar el primer final (ya estaba todo al 100), primero la pantalla del Pueblo y,
    // al cerrarla, la del segundo final.
    const victory = document.getElementById('victory');
    const show = () => {
      sound.milestone();
      mastery();
    };
    if (victory.hidden) return show();
    const watch = new MutationObserver(() => {
      if (!victory.hidden) return;
      watch.disconnect();
      show();
    });
    watch.observe(victory, { attributes: true, attributeFilter: ['hidden'] });
  });
  goals.onMastery = mastery;
  document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('menu').hidden = true;
    mastery();
  });
  checkMastery(game.state, game.bus); // una partida que ya lo tenía todo al 100 antes de la v1.6
  game.bus.on('research', ({ id }) => {
    sound.milestone();
    toast(`🔬 ${RESEARCH_BY_ID[id].name}: ${RESEARCH_BY_ID[id].desc}`, 4000);
  });
  window.addEventListener('resize', () => scene.resize(app.screen.width, app.screen.height));
  // Esc (o «atrás» en Android) cierra la ventana abierta o, si no hay ninguna, el panel de la estación.
  // Devuelve si cerró algo.
  const closeTop = () => {
    const open = [...document.querySelectorAll('.modal')].filter((m) => !m.hidden);
    if (open.length) open.forEach((m) => (m.hidden = true));
    else if (panel.id) panel.close();
    else return false;
    return true;
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTop();
  });

  const firstTip = () => !saved && toast('Toca el 🌳 Cafetal y mejóralo cuando tengas monedas.', 6000);
  if (offline) showWelcome(offline, () => sound.coin());
  // Cómo se juega, encima de todo (la bienvenida queda debajo, para después).
  if (introOnStart(game.state)) showIntro(game.state, firstTip);
  else firstTip();
  document.getElementById('intro-btn').addEventListener('click', () => {
    document.getElementById('menu').hidden = true;
    showIntro(game.state);
  });

  let uiTimer = 0;
  // Cada parte por separado: si una falla, las demás siguen (y el bucle no se detiene: un error en un
  // cuadro detiene el ticker de Pixi para siempre).
  const safely = (fn) => {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  };
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    safely(() => game.update(dt));
    safely(() => scene.update(dt));
    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.2;
      safely(() => hud.update());
      safely(() => scene.setGuide(panel.id ? null : hud.guide));
      for (const view of [panel, chain, goals, research, zones]) safely(() => view.update());
    }
  });

  // Guardado automático y recuperación al volver a la pestaña.
  const persist = () => {
    if (!resetting) saveGame(game.state);
  };
  setInterval(persist, AUTOSAVE_MS);
  let hiddenAt = null;
  const onHide = () => {
    hiddenAt ??= Date.now();
    persist();
  };
  // Al volver, lo producido mientras tanto (una sola vez, aunque avisen la página y la app).
  const onShow = () => {
    if (!hiddenAt) return;
    const r = applyOffline(game, (Date.now() - hiddenAt) / 1000);
    if (r) showWelcome(r, () => sound.coin());
    hiddenAt = null;
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
  window.addEventListener('pagehide', persist);

  bindMenu(game, sound, music);
  bindDevOptions(game);
  // En la app de Android el juego ya va dentro del paquete: sin service worker, con el botón «atrás».
  if (isNativeApp()) bindNative({ closeTop, onHide, onShow });
  // En la web publicada, el menú ofrece el APK (lo publica el mismo flujo de GitHub Actions).
  else if (import.meta.env.PROD) document.getElementById('apk-link').hidden = false;
  // Jugable sin internet e instalable en el móvil (solo en la versión web publicada).
  else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// Simula el tiempo que el juego estuvo cerrado; devuelve el resumen si hubo ganancias.
// Con el tiempo acelerado (opciones de desarrollador), el tiempo fuera y el tope cuentan a esa velocidad.
function applyOffline(game, seconds) {
  if (seconds < MIN_OFFLINE_S) return null;
  const scale = game.timeScale;
  const cap = offlineCapSeconds(game.state) * scale;
  const r = game.catchUp(seconds * scale, cap);
  return r.coins > 0 ? { ...r, cap, capped: seconds * scale > cap, scale } : null;
}

function bindMenu(game, sound, music) {
  const menu = document.getElementById('menu');
  const soundBtn = document.getElementById('sound-btn');
  const paintSound = () => (soundBtn.textContent = game.state.settings.sound ? '🔊 Sonido: sí' : '🔇 Sonido: no');
  paintSound();
  soundBtn.addEventListener('click', () => {
    game.state.settings.sound = !game.state.settings.sound;
    sound.setEnabled(game.state.settings.sound);
    paintSound();
  });
  const musicBtn = document.getElementById('music-btn');
  const musicOn = () => game.state.settings.music !== false;
  const paintMusic = () => (musicBtn.textContent = musicOn() ? '🎵 Música: sí' : '🎵 Música: no');
  paintMusic();
  musicBtn.addEventListener('click', () => {
    game.state.settings.music = !musicOn();
    music.setEnabled(game.state.settings.music);
    paintMusic();
  });
  document.getElementById('menu-btn').addEventListener('click', () => {
    const s = game.state;
    document.getElementById('menu-stats').textContent =
      `Tiempo jugado: ${formatDuration(s.playTime)} · Ganado en total: 💰 ${formatNumber(s.totalEarned)} · Cerezas vendidas: ${formatNumber(s.stats.sold.cherry ?? 0)}`;
    const restartBtn = document.getElementById('restart-btn');
    restartBtn.hidden = !s.mastered;
    restartBtn.textContent = `🔁 Volver a empezar ${formatMult(legacyMult(s) * 2)}`;
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
