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
import { showCalendar } from './ui/calendar.js';
import { Chatter } from './ui/Chatter.js';
import { EventsView } from './ui/EventsView.js';
import { RenownView } from './ui/RenownView.js';
import { setLook } from './render/look.js';
import { checkLogros } from './sim/logros.js';
import { hideSplash, setSplashProgress, splashOffline, splashWait } from './ui/splash.js';
import { EventBar, formatClock } from './ui/EventBar.js';
import { finishEvent, startEvent } from './sim/events.js';
import { MEDALS } from './data/events.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from './data/regions.js';
import { openRegions, regionState } from './sim/regions.js';
import { bindNative, isNativeApp } from './native.js';
import { checkForUpdate } from './update.js';
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
  splashWait('Preparando la finca…');
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
  // Regiones (v3.0): la partida principal (el Eje Cafetero) guarda las demás, cada una con su Game, y
  // todas producen a la vez.
  const root = game.state;
  openRegions(root); // una partida que ya tenía el Pueblo completo antes de la v3.0
  const games = { cafetero: game };
  for (const id of Object.keys(root.regions ?? {})) games[id] = new Game(root.regions[id]);
  const gameOf = (zoneId) => games[REGION_OF_ZONE[zoneId]];
  // La decoración elegida, antes de dibujar nada.
  setLook(root.profile);
  // La velocidad de las opciones de desarrollador sigue puesta al volver, también para el tiempo fuera.
  game.timeScale = savedSpeed();
  const away = saved ? (Date.now() - saved.savedAt) / 1000 : 0;
  const offline = saved ? await applyOffline(game, away) : null;
  // Las otras regiones también (cada una con sus monedas: se avisa aparte).
  const regionOffline = [];
  for (const [id, g] of Object.entries(games)) {
    if (id === 'cafetero' || !saved) continue;
    const r = await applyOffline(g, away, REGIONS_BY_ID[id], game.state.profile);
    if (r) regionOffline.push([id, r]);
  }

  const sound = new Sound();
  sound.setEnabled(game.state.settings.sound);
  // Las partidas de antes no tienen el ajuste: la música suena salvo que se haya quitado.
  const music = new Music(game.state.settings.music !== false);
  // Un clic suave en cada botón de la interfaz.
  document.addEventListener('click', (e) => {
    if (e.target.closest('button')) sound.click();
  });

  // Zona que se está viendo (las demás siguen produciendo). Se recuerda con la partida.
  const saw = root.settings.zone;
  const view = { zone: gameOf(saw)?.state.zones[saw]?.unlocked ? saw : 'finca' };
  // La partida de la región que se está viendo (la del Eje Cafetero o la de otra región).
  let active = gameOf(view.zone);
  // Tablero de un evento en juego (v2.0): { zone, game } con su propio Game, o null.
  let board = null;
  const getZone = () => board?.zone ?? view.zone;
  let scene = null;
  const panel = new StationPanel(active, () => scene?.select(null));
  // Lo que muestra la interfaz: la región que se está viendo o el tablero de un evento.
  let hud, chain, chatter, goals, research, zones;
  const useGame = (g) => {
    for (const v of [hud, panel, chain, chatter, goals, research]) if (v) v.game = g;
    if (hud) hud.recDirty = true;
  };
  // id puede ser 'farm', 'farm:transport' (pestaña de arrieros), 'dispatch:<zona>', 'route:<ruta>'
  // (pestaña 🚌 de la estación que abastece, o un panel suelto si se ve otra zona) o 'research:<id>'.
  const select = (id) => {
    const [stationId, part] = id.split(':');
    if (stationId === 'research' && board) return; // en el tablero no hay investigaciones
    if (stationId === 'research') {
      research.open();
      return;
    }
    if (stationId === 'dispatch') {
      scene.select('dispatch');
      panel.open(id);
      sound.station('dispatch');
      return;
    }
    if (stationId === 'route') {
      const station = ROUTES_BY_ID[part].stations.find((sid) => scene.stations[sid] && active.state.stations[sid]);
      if (station) {
        scene.select(station);
        panel.open(station, id);
        sound.station(station);
      } else {
        scene.select(null);
        panel.open(id);
      }
      return;
    }
    // Una estación de otra zona (la recomendación puede señalar la que abastece una ruta): ir allá.
    // Se compara con la zona que se está viendo: en un evento, la del tablero (antes se comparaba con
    // la del mapa de la partida y, si el evento era de otra zona, se salía del tablero).
    if (STATIONS_BY_ID[stationId] && STATIONS_BY_ID[stationId].zone !== getZone()) {
      if (board) return; // en el tablero solo están sus estaciones
      showZone(STATIONS_BY_ID[stationId].zone);
      toast(`${ZONES_BY_ID[view.zone].icon} ${ZONES_BY_ID[view.zone].name}`, 2000);
    }
    scene.select(stationId);
    panel.open(stationId, part === 'transport' ? 'transport' : 'station');
    // Al entrar a una estación suena su oficio (v3.3.2).
    sound.station(stationId);
  };
  const showZone = (zoneId) => {
    // Primero el panel: al cerrarse quita la selección de la escena, que aún debe existir.
    if (panel.id) panel.close();
    // Ir a una zona de la partida sale del tablero del evento (que queda guardado tal cual).
    if (board) leaveBoard();
    if (scene) scene.destroy();
    view.zone = zoneId;
    root.settings.zone = zoneId;
    active = gameOf(zoneId);
    useGame(active);
    music.setRegion(REGIONS_BY_ID[active.state.region ?? 'cafetero'].music);
    scene = new Scene(app, active, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    if (import.meta.env.DEV) window.__cafetal = { game: active, root: game, games, scene, panel, select, music };
  };
  showZone(view.zone);
  hud = new HUD(active, select, () => scene.dayNight.hour, getZone);
  chain = new ChainView(active, select, getZone);
  chatter = new Chatter(active, getZone);
  goals = new GoalsView(active, getZone);
  research = new ResearchView(active, getZone);
  zones = new ZonesView(game, games, getZone, (z) => {
    showZone(z);
    toast(`${ZONES_BY_ID[z].icon} ${ZONES_BY_ID[z].name}`, 2000);
  });

  // Eventos: entrar y salir del tablero. La partida sigue corriendo; el reloj del tablero solo cuando se
  // está en él. Mientras tanto, el HUD, el panel y la cadena muestran el tablero.
  const eventBar = new EventBar(() => exitEvent());
  // El evento de una zona se guarda en la partida de su región (v3.6: Santander también tiene eventos).
  const ownerOf = (zoneId) => gameOf(zoneId).state;
  const enterEvent = (zoneId) => {
    const state = startEvent(ownerOf(zoneId), zoneId);
    if (!state) return;
    if (panel.id) panel.close();
    scene.destroy();
    const eg = new Game(state);
    eg.timeScale = game.timeScale;
    for (const type of ['levelUp', 'unlocked', 'research']) eg.bus.on(type, () => (hud.recDirty = true));
    board = { zone: zoneId, game: eg };
    scene = new Scene(app, eg, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    useGame(eg);
    document.body.classList.add('event-mode');
    eventBar.show(eg);
    if (import.meta.env.DEV) window.__cafetal = { ...window.__cafetal, scene, board };
  };
  const leaveBoard = () => {
    board = null;
    useGame(active);
    document.body.classList.remove('event-mode');
    eventBar.show(null);
  };
  const exitEvent = () => {
    if (!board) return;
    if (panel.id) panel.close();
    leaveBoard();
    showZone(view.zone);
  };
  const events = new EventsView(game, enterEvent, (zoneId) => regionState(game.state, REGION_OF_ZONE[zoneId]));
  // Al cambiar la decoración se vuelve a dibujar el mapa (el de la zona o el del tablero).
  const renown = new RenownView(game, (profile) => {
    setLook(profile);
    if (!board) return showZone(view.zone);
    if (panel.id) panel.close();
    scene.destroy();
    scene = new Scene(app, board.game, sound, ZONES_BY_ID[board.zone]);
    scene.onSelect = select;
  });
  for (const [id, tab] of [['album-btn', 'album'], ['decor-btn', 'decor'], ['logros-btn', 'logros'], ['offline-btn', 'offline']]) {
    document.getElementById(id).addEventListener('click', () => {
      events.close();
      renown.open(tab);
    });
  }
  const showEventResult = (r) => {
    const m = MEDALS[r.medal];
    document.getElementById('event-result-medal').textContent = m.icon;
    document.getElementById('event-result-title').textContent = `¡Medalla de ${m.name}!`;
    document.getElementById('event-result-text').textContent =
      `${r.def.icon} ${r.def.name} ${r.round}: cumpliste el objetivo en ${formatClock(r.time)} y compraste las tres mejoras.\n+${m.renown} ⭐ de Renombre (tienes ${game.state.profile.renown}).\nEste cupo de eventos de la región queda libre en 3 años del juego (unas 6 h 24 min).`;
    const modal = document.getElementById('event-result');
    document.getElementById('event-result-ok').onclick = () => (modal.hidden = true);
    modal.hidden = false;
    sound.milestone();
  };

  // Segundo final: todas las estaciones de la región en el nivel 100. Se puede volver a empezar la
  // región con producción ×2 (las demás siguen como están).
  const restart = (g) => {
    resetting = true;
    if (g === game) saveGame(restartState(root));
    else {
      root.regions[g.state.region] = restartState(g.state);
      saveGame(root);
    }
    location.reload();
  };
  const mastery = (g = active) => showMastery(g.state, () => restart(g));
  // Lo que avisa cada región: objetivos, finales e investigaciones.
  const wire = (g) => {
    g.bus.on('goalClaimed', ({ goal, zone }) => {
      if (!goal.final) {
        sound.coin();
        toast(`🎯 ¡Objetivo cumplido! +${formatNumber(goal.reward)} 💰`, 3000);
        return;
      }
      sound.milestone();
      // El Pueblo abre Santander (v3.0): su partida empieza a producir de una vez.
      const opened = openRegions(root);
      for (const id of opened) {
        games[id] = new Game(root.regions[id]);
        games[id].timeScale = game.timeScale;
        wire(games[id]);
      }
      showVictory(g.state, zone, (next) => showZone(next), opened);
    });
    g.bus.on('mastered', () => {
      // Si llega al cobrar el primer final (ya estaba todo al 100), primero la pantalla del final de
      // la zona y, al cerrarla, la del segundo final.
      const victory = document.getElementById('victory');
      const show = () => {
        sound.milestone();
        mastery(g);
      };
      if (victory.hidden) return show();
      const watch = new MutationObserver(() => {
        if (!victory.hidden) return;
        watch.disconnect();
        show();
      });
      watch.observe(victory, { attributes: true, attributeFilter: ['hidden'] });
    });
    g.bus.on('research', ({ id }) => {
      sound.milestone();
      toast(`🔬 ${RESEARCH_BY_ID[id].name}: ${RESEARCH_BY_ID[id].desc}`, 4000);
    });
    checkMastery(g.state, g.bus); // una partida que ya lo tenía todo al 100 antes de la v1.6
  };
  for (const g of Object.values(games)) wire(g);
  goals.onMastery = () => mastery(active);
  document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('menu').hidden = true;
    mastery(active);
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

  hideSplash();
  if (offline) showWelcome(offline, () => sound.coin());
  for (const [id, r] of regionOffline) toast(`${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name} también siguió trabajando: +💰 ${formatNumber(r.coins)}`, 5000);
  // Cómo se juega, encima de todo (la bienvenida queda debajo, para después).
  if (introOnStart(game.state)) showIntro(game.state);
  document.getElementById('clock').addEventListener('click', () => showCalendar(game.state));
  document.getElementById('intro-btn').addEventListener('click', () => {
    document.getElementById('menu').hidden = true;
    showIntro(game.state);
  });

  let uiTimer = 0;
  let catching = false; // calculando lo de sin conexión al volver a la app
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
    if (catching) return;
    const dt = ticker.deltaMS / 1000;
    // Todas las regiones producen a la vez (a la velocidad de las opciones de desarrollador).
    for (const g of Object.values(games)) {
      g.timeScale = game.timeScale;
      safely(() => g.update(dt));
    }
    safely(() => {
      if (!board) return;
      board.game.timeScale = game.timeScale;
      board.game.update(dt);
      const r = finishEvent(ownerOf(board.zone), board.zone, game.state);
      // v3.7: cumplir el objetivo asegura la medalla; el evento termina al tener las tres mejoras.
      if (r?.secured) {
        const m = MEDALS[r.medal];
        toast(`${m.icon} ¡Medalla de ${m.name} asegurada! Para terminar el evento, compra las mejoras que faltan.`, 6000);
        sound.milestone();
      }
      if (r?.done) {
        exitEvent();
        showEventResult(r);
      }
    });
    safely(() => scene.update(dt));
    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.2;
      safely(() => hud.update());
      safely(() => scene.setGuide(panel.id ? null : hud.guide));
      // Logros (v2.3): se pagan al llegar a cada nivel.
      safely(() => {
        const won = checkLogros(game.state);
        if (!won.length) return;
        const stars = won.reduce((n, w) => n + w.reward, 0);
        const [w] = won;
        // Varios a la vez (una partida de antes de la v2.3), en un solo aviso.
        toast(won.length > 1 ? `🏆 ${won.length} logros: +${stars} ⭐ de Renombre` : `🏆 ${w.logro.icon} ${w.logro.name} (nivel ${w.tier}): +${stars} ⭐ de Renombre`, 4000);
        sound.milestone();
      });
      // En el tablero de un evento, la persona de la zona no avisa lo de la partida.
      for (const view of [panel, chain, goals, research, zones, events, eventBar, ...(board ? [] : [chatter])]) safely(() => view.update());
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
  // Al volver, lo producido mientras tanto (una sola vez, aunque avisen la página y la app). Mientras
  // se calcula, el juego no avanza (catching) y se ve la pantalla de carga.
  const onShow = async () => {
    if (!hiddenAt || catching) return;
    const away = (Date.now() - hiddenAt) / 1000;
    hiddenAt = null;
    catching = true;
    try {
      const r = await applyOffline(game, away);
      for (const [id, g] of Object.entries(games)) {
        if (id === 'cafetero') continue;
        const rr = await applyOffline(g, away, REGIONS_BY_ID[id], game.state.profile);
        if (rr) toast(`${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name} también siguió trabajando: +💰 ${formatNumber(rr.coins)}`, 5000);
      }
      if (r) showWelcome(r, () => sound.coin());
    } finally {
      catching = false;
      hideSplash();
    }
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
  window.addEventListener('pagehide', persist);

  bindMenu(game, sound, music, () => active);
  bindDevOptions(game);
  // En la app de Android el juego ya va dentro del paquete: sin service worker, con el botón «atrás».
  if (isNativeApp()) {
    bindNative({ closeTop, onHide, onShow: () => (onShow(), checkForUpdate()) });
    // ¿Hay un APK más nuevo? Al abrir, al volver a la app (cada pocas horas) y desde el menú (v3.6.1).
    checkForUpdate();
    const updateBtn = document.getElementById('update-btn');
    updateBtn.hidden = false;
    updateBtn.addEventListener('click', () => checkForUpdate({ manual: true, toast }));
  }
  else if (import.meta.env.PROD) {
    // En la web publicada, el menú ofrece el APK (lo publica el mismo flujo de GitHub Actions).
    document.getElementById('apk-link').hidden = false;
    // Jugable sin internet e instalable en el móvil. (Hasta la v3.6.1 nunca se registraba: estaba en un
    // «else if» detrás del del APK, que siempre se cumplía antes.)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// Simula el tiempo que el juego estuvo cerrado; devuelve el resumen si hubo ganancias.
// Siempre a velocidad normal: el tiempo acelerado de las opciones de desarrollador solo cuenta con el
// juego abierto (multiplicar el tiempo fuera hacía que volver tardara mucho en calcularse).
// Por partes, con la pantalla de carga y su barra (en un teléfono, 24 h pueden tardar varios segundos).
// profile: el del jugador (v3.7: sus horas sin conexión valen para todas las regiones).
async function applyOffline(game, seconds, region = null, profile = game.state.profile) {
  if (seconds < MIN_OFFLINE_S) return null;
  const cap = offlineCapSeconds(game.state, profile);
  splashOffline(seconds, cap, region);
  const r = await game.catchUpAsync(seconds, cap, setSplashProgress);
  splashWait('¡Listo! Preparando el mapa…');
  return r.coins > 0 ? { ...r, cap, capped: seconds > cap } : null;
}

// getActive: la partida de la región que se está viendo (su segundo final y su reinicio).
function bindMenu(game, sound, music, getActive) {
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
    const here = getActive().state;
    restartBtn.hidden = !here.mastered;
    restartBtn.textContent = `🔁 Volver a empezar ${here.region === 'cafetero' ? '' : `${REGIONS_BY_ID[here.region].name} `}${formatMult(legacyMult(here) * 2)}`;
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
