import { Application } from 'pixi.js';
import { Game } from './core/Game.js';
import { clearSave, exportSave, importSave, loadGame, saveGame } from './core/SaveSystem.js';
import { formatDuration, formatMult, formatNumber } from './core/format.js';
import { clockOf } from './sim/calendar.js';
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
import { MoneyView } from './ui/MoneyView.js';
import { EVENT_COOLDOWN, allActionsBought, awaySeconds, checkMedalBonus, endEvent, finishEvent, restartEvent, startEvent } from './sim/events.js';
import { MEDALS } from './data/events.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from './data/regions.js';
import { openRegions, regionState } from './sim/regions.js';
import { bindNative, isNativeApp } from './native.js';
import { APP_VERSION, checkForUpdate } from './update.js';
import { SONGS } from './audio/songs.js';
import { sumValues } from './sim/state.js';
import { bindTip, tipMode } from './tip.js';
import { checkMastery, restartState, startZone } from './sim/legacy.js';
import { ZonesView } from './ui/ZonesView.js';
import { ZONES_BY_ID } from './data/zones/index.js';
import { ROUTES_BY_ID } from './data/routes.js';
import { STATIONS_BY_ID } from './data/stations.js';
import { ICON, ICON_FONT } from './data/icons.js';
import { RESEARCH_BY_ID } from './data/research.js';
import { nextLegacyMult, offlineCapSeconds } from './sim/modifiers.js';
import { toast } from './ui/toast.js';
import { bindDevOptions, savedSpeed } from './ui/DevOptions.js';
import { bindIconTips } from './ui/iconTips.js';
import { bindMore } from './ui/more.js';
import { LANG, LANGS, saveLang, t } from './i18n/index.js';
import { Sound } from './audio/Sound.js';
import { Music } from './audio/Music.js';

const AUTOSAVE_MS = 10_000;
const MIN_OFFLINE_S = 30;
const DEFAULT_MUSIC_VOLUME = 40; // % (v3.66: al 100 % tapaba los sonidos)
let resetting = false;

async function start() {
  splashWait(t('Preparando la finca…'));
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

  // Volumen de 0 a 100 (v3.66). Las partidas de antes solo tenían sí o no: la música, si sonaba, queda
  // al 40 % (sonaba muy fuerte frente a los sonidos) y los sonidos al 100 %.
  const settings = game.state.settings;
  settings.soundVolume ??= settings.sound === false ? 0 : 100;
  settings.musicVolume ??= settings.music === false ? 0 : DEFAULT_MUSIC_VOLUME;
  const sound = new Sound();
  sound.setVolume(settings.soundVolume / 100);
  const music = new Music(settings.musicVolume > 0);
  music.setVolume(settings.musicVolume / 100);
  // Un clic suave en cada botón de la interfaz.
  document.addEventListener('click', (e) => {
    if (e.target.closest('button')) sound.click();
  });

  // Zona que se está viendo (las demás siguen produciendo). Se recuerda con la partida.
  const view = { zone: startZone(root, root.settings.zone) };
  // La partida de la región que se está viendo (la del Eje Cafetero o la de otra región).
  let active = gameOf(view.zone);
  // Tablero de un evento en juego (v2.0): { zone, game } con su propio Game, o null.
  let board = null;
  const getZone = () => board?.zone ?? view.zone;
  let scene = null;
  const panel = new StationPanel(active, () => scene?.select(null));
  // Lo que muestra la interfaz: la región que se está viendo o el tablero de un evento.
  let hud, chain, chatter, goals, research, zones, money;
  const useGame = (g) => {
    for (const v of [hud, panel, chain, chatter, goals, research, money]) if (v) v.game = g;
    if (hud) hud.recDirty = true;
  };
  // id puede ser 'farm', 'farm:transport' (pestaña de arrieros), 'dispatch:<zona>', 'route:<ruta>'
  // (pestaña 🚌 de la estación que abastece, o un panel suelto si se ve otra zona) o 'research:<id>'.
  // Lo que pide una pestaña ('farm:transport', 'route:…': la mejora recomendada, la cadena, un objetivo o una
  // investigación) abre esa pestaña; tocar la estación en el mapa abre la de la estación.
  const select = (id) => {
    const [stationId, part] = id.split(':');
    if (stationId === 'research' && board) return; // en el tablero no hay investigaciones
    // Una compra del evento (v3.8.2): se señala su botón en la barra del evento.
    if (stationId === 'action') {
      if (board) eventBar.highlight(part);
      return;
    }
    if (stationId === 'research') {
      research.open();
      return;
    }
    // 'dispatch:<zona>:stock' (v3.66): la pestaña 📦 de la bodega, con lo que hay de cada producto.
    if (stationId === 'dispatch') {
      const [, zone, tab] = id.split(':');
      scene.select('dispatch');
      panel.open(zone ? `dispatch:${zone}` : id, tab === 'stock' ? 'stock' : 'station');
      sound.station('dispatch');
      return;
    }
    if (stationId === 'route') {
      // La estación que la recibe, en lo que se ve: en un evento, la del tablero (antes se buscaba en la partida y,
      // si allá no estaba construida, se abría un panel suelto de la ruta, en nivel 1).
      const here = (board ? board.game : active).state;
      const station = ROUTES_BY_ID[part].stations.find((sid) => scene.stations[sid] && here.stations[sid]);
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
    // Siempre en la pestaña de la estación (v3.67); si lo que toca mejorar son sus arrieros, esa pestaña
    // se señala (parpadea) en vez de abrirse sola.
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
    // Cada región con su decoración (v3.10).
    setLook(root.profile, REGION_OF_ZONE[zoneId]);
    scene = new Scene(app, active, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    scene.onBackground = () => panel.id && panel.close();
    scene.onTalk = (z) => chatter?.talk(z);
    if (import.meta.env.DEV) window.__mitierrita = { game: active, root: game, games, scene, panel, select, music };
  };
  showZone(view.zone);
  hud = new HUD(active, select, () => scene.dayNight.hour, getZone);
  chain = new ChainView(active, select, getZone, () => game.state);
  money = new MoneyView(active, getZone);
  chatter = new Chatter(active, getZone, () => game.state);
  goals = new GoalsView(active, getZone);
  research = new ResearchView(active, getZone, (id) => select(id));
  zones = new ZonesView(game, games, getZone, (z) => {
    showZone(z);
    toast(`${ZONES_BY_ID[z].icon} ${ZONES_BY_ID[z].name}`, 2000);
  });

  // Eventos: entrar y salir del tablero. La partida sigue corriendo; el reloj del tablero solo cuando se
  // está en él. Mientras tanto, el HUD, el panel y la cadena muestran el tablero.
  // Pausar vuelve al mapa; reiniciar y terminar piden confirmación, salvo terminar uno ya ganado (v3.30).
  const confirmEvent = (icon, title, text, yes, onYes) => {
    const modal = document.getElementById('event-confirm');
    document.getElementById('event-confirm-icon').textContent = icon;
    document.getElementById('event-confirm-title').textContent = title;
    document.getElementById('event-confirm-text').textContent = text;
    const ok = document.getElementById('event-confirm-yes');
    ok.textContent = yes;
    ok.onclick = () => {
      modal.hidden = true;
      onYes();
    };
    document.getElementById('event-confirm-no').onclick = () => (modal.hidden = true);
    modal.hidden = false;
  };
  const restartBoard = () => {
    if (!board || board.game.state.event.done) return;
    confirmEvent('🔄', t('¿Reiniciar el evento?'), t('Vuelve a empezar este mismo reto desde cero: monedas, niveles, compras y reloj. Si ya tenías la medalla asegurada, también se borra.'), t('🔄 Reiniciar'), () => {
      const zone = board.zone;
      restartEvent(game.state, zone);
      leaveBoard();
      enterEvent(zone);
      toast(t('🔄 El evento empezó de nuevo.'), 2500);
    });
  };
  const endBoard = () => {
    if (!board) return;
    const zone = board.zone;
    const close = () => {
      endEvent(game.state, zone);
      exitEvent();
    };
    if (board.game.state.event.done) return close();
    confirmEvent('🏁', t('¿Terminar el evento?'), t('Se cierra sin medalla ni Renombre. Su cupo queda libre en 2 años del juego (unas {time}) y la próxima vez sale el mismo reto.', { time: formatDuration(EVENT_COOLDOWN) }), t('🏁 Terminar sin ganar'), () => {
      close();
      toast(t('🏁 Evento terminado sin medalla.'), 3000);
    });
  };
  // ⏸️ Pausar o 🚪 Salir (v3.67.4): lo elige el jugador en el menú, para todos los eventos.
  const exitMode = () => (game.state.settings.eventExit === 'leave' ? 'leave' : 'pause');
  const eventBar = new EventBar(() => exitEvent(), restartBoard, endBoard, exitMode);
  const exitSelect = document.getElementById('event-exit-mode');
  const exitHint = () => {
    document.getElementById('event-exit-hint').textContent =
      exitMode() === 'leave' ? t('El evento sigue corriendo por detrás, también con el juego cerrado.') : t('El reloj del evento se detiene hasta que vuelvas.');
  };
  exitSelect.value = exitMode();
  exitHint();
  exitSelect.addEventListener('change', () => {
    game.state.settings.eventExit = exitSelect.value;
    eventBar.paintExit();
    exitHint();
  });
  // Viajes entre zonas (v4.1.3): con el viaje en el mapa (lo de siempre) o directo, sin animación.
  const travelSelect = document.getElementById('travel-mode');
  const travelHint = () => {
    document.getElementById('travel-hint').textContent =
      travelSelect.value === 'direct' ? t('Se pasa a la otra zona enseguida, sin el viaje en el mapa.') : t('El Willys y la avioneta muestran el viaje en el mapa.');
  };
  travelSelect.value = game.state.settings.travel === 'direct' ? 'direct' : 'trip';
  travelHint();
  travelSelect.addEventListener('change', () => {
    game.state.settings.travel = travelSelect.value;
    travelHint();
  });
  // El evento de una zona se guarda en la partida de su región (v3.6: Santander también tiene eventos);
  // los cupos, en la principal (v3.30).
  const enterEvent = (zoneId) => {
    const state = startEvent(game.state, zoneId);
    if (!state) return;
    if (panel.id) panel.close();
    scene.destroy();
    const eg = new Game(state);
    eg.timeScale = game.timeScale;
    for (const type of ['levelUp', 'unlocked', 'research']) eg.bus.on(type, () => (hud.recDirty = true));
    board = { zone: zoneId, game: eg };
    setLook(root.profile, REGION_OF_ZONE[zoneId]);
    scene = new Scene(app, eg, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    scene.onBackground = () => panel.id && panel.close();
    scene.onTalk = (z) => chatter?.talk(z);
    useGame(eg);
    document.body.classList.add('event-mode');
    catchUpBoard(eg);
    eventBar.show(eg);
    if (import.meta.env.DEV) window.__mitierrita = { ...window.__mitierrita, scene, board };
  };
  // Si se salió con 🚪, lo que el tablero hizo mientras tanto (v3.67.4), con el reloj del país: también
  // cuenta el tiempo con el juego cerrado (hasta el tope de horas sin conexión, como la partida).
  const catchUpBoard = (eg) => {
    const state = eg.state;
    const away = awaySeconds(state, game.state);
    delete state.event.away;
    if (away < 1) return;
    const r = eg.catchUpBoard(away);
    // Con las tres mejoras ya compradas, el evento se gana en el siguiente cuadro (y sale su ventana).
    if (r.secured && !allActionsBought(state)) {
      const m = MEDALS[state.event.medal];
      toast(t('🚪 El evento siguió {time} sin ti: ¡{icon} medalla de {medal} asegurada! Para terminarlo, compra las mejoras que faltan.', { time: formatDuration(r.seconds), icon: m.icon, medal: m.name }), 6000);
      sound.milestone();
    } else toast(t('🚪 El evento siguió {time} sin ti.', { time: formatDuration(r.seconds) }), 4000);
  };
  const leaveBoard = () => {
    // 🚪 Salir (con el botón o yendo a una zona): el tablero sigue corriendo desde ahora, con el reloj del
    // país; ⏸️ Pausar: se queda quieto (v3.67.4).
    if (exitMode() === 'leave') board.game.state.event.away = clockOf(game.state);
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
  const events = new EventsView(game, enterEvent);
  // Al cambiar la decoración se vuelve a dibujar el mapa (el de la zona o el del tablero).
  const renown = new RenownView(game, (profile) => {
    if (!board) return showZone(view.zone);
    setLook(profile, REGION_OF_ZONE[board.zone]);
    if (panel.id) panel.close();
    scene.destroy();
    scene = new Scene(app, board.game, sound, ZONES_BY_ID[board.zone]);
    scene.onSelect = select;
    scene.onBackground = () => panel.id && panel.close();
    scene.onTalk = (z) => chatter?.talk(z);
  });
  for (const [id, tab] of [['album-btn', 'album'], ['decor-btn', 'decor'], ['logros-btn', 'logros'], ['offline-btn', 'offline']]) {
    document.getElementById(id).addEventListener('click', () => {
      events.close();
      // Con la región que se está jugando (v3.10: cada una tiene su álbum, decoración, logros y jornada).
      renown.open(tab, REGION_OF_ZONE[board ? board.zone : view.zone]);
    });
  }
  // Volver a la ventana de eventos desde el Renombre (v3.67), sin cerrar y volver a abrir.
  document.getElementById('renown-back').addEventListener('click', () => {
    document.getElementById('renown').hidden = true;
    events.open();
  });
  const showEventResult = (r) => {
    const m = MEDALS[r.medal];
    document.getElementById('event-result-medal').textContent = m.icon;
    document.getElementById('event-result-title').textContent = t('¡Medalla de {medal}!', { medal: m.name });
    document.getElementById('event-result-text').textContent =
      t('{event}: cumpliste el objetivo en {time} y compraste las tres mejoras.\n+{renown} ⭐ de Renombre (tienes {total}).\nEste cupo de eventos queda libre en 2 años del juego (unas {cooldown}).', { event: `${r.def.icon} ${r.def.name}`, time: formatClock(r.time), renown: m.renown, total: game.state.profile.renown, cooldown: formatDuration(EVENT_COOLDOWN) });
    const modal = document.getElementById('event-result');
    // Terminar, o quedarse mirando el tablero (v3.30): se puede pausar, pero se cierra con «Terminar».
    document.getElementById('event-result-ok').onclick = () => {
      modal.hidden = true;
      endBoard();
    };
    document.getElementById('event-result-watch').onclick = () => (modal.hidden = true);
    modal.hidden = false;
    sound.milestone();
  };

  // Segundo final: todas las estaciones de la región en el nivel 100. Se puede volver a empezar la
  // región con producción ×2 (las demás siguen como están).
  const restart = (g) => {
    resetting = true;
    if (g === game) saveGame(restartState(root));
    else {
      root.regions[g.state.region] = restartState(g.state, Date.now(), root.profile);
      // Que abra en la región que se reinició (v3.72), en su primera zona.
      root.settings.zone = root.regions[g.state.region].settings.zone;
      saveGame(root);
    }
    location.reload();
  };
  const mastery = (g = active) => showMastery(g.state, () => restart(g));
  // Lo que avisa cada región: objetivos, finales e investigaciones.
  const wire = (g) => {
    g.bus.on('goalClaimed', ({ goal, zone, bulk }) => {
      if (bulk) return; // «Cobrar todos»: un solo aviso al final (goalsClaimed)
      if (!goal.final) {
        sound.coin();
        toast(t('🎯 ¡Objetivo cumplido! +{coins} 💰', { coins: formatNumber(goal.reward) }), 3000);
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
      // La región que sigue, si ya estaba abierta (al completar de nuevo la última zona tras reiniciar).
      const after = !ZONES_BY_ID[zone].next && REGIONS.find((r) => r.unlock?.zone === zone && regionState(root, r.id));
      // Ir a la zona que sigue (v3.67): con el viaje en el mapa.
      showVictory(g.state, zone, (next) => zones.travel(next), opened, after?.id);
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
    g.bus.on('goalsClaimed', ({ count, reward }) => {
      sound.coin();
      toast(count === 1 ? t('🎯 ¡{n} objetivo cobrado! +{coins} 💰', { n: count, coins: formatNumber(reward) }) : t('🎯 ¡{n} objetivos cobrados! +{coins} 💰', { n: count, coins: formatNumber(reward) }), 3000);
    });
    g.bus.on('researchAll', ({ ids }) => {
      sound.milestone();
      toast(ids.length === 1 ? `🔬 ${RESEARCH_BY_ID[ids[0]].name}: ${RESEARCH_BY_ID[ids[0]].desc}` : t('🔬 ¡{n} investigaciones compradas! {names}', { n: ids.length, names: ids.map((id) => RESEARCH_BY_ID[id].name).join(', ') }), 4000);
    });
    g.bus.on('research', ({ id, bulk }) => {
      if (bulk) return; // «Comprar todas»: un solo aviso al final (researchAll)
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
  // Tocar fuera de una ventana la cierra (v3.67), como su ✕. No las que piden decidir algo (cobrar lo
  // ganado sin conexión, la victoria, el segundo final, el resultado o la confirmación de un evento, la
  // actualización). El panel de la estación tampoco: ese se cierra solo con su ✕.
  const STICKY = new Set(['welcome', 'victory', 'mastery', 'event-result', 'event-confirm', 'update']);
  document.addEventListener('click', (e) => {
    const m = e.target;
    if (!m.classList?.contains('modal') || m.hidden || STICKY.has(m.id)) return;
    const x = m.querySelector('.close-btn');
    if (x) x.click();
    else m.hidden = true;
  });

  hideSplash();
  if (offline) showWelcome(offline, () => sound.coin());
  for (const [id, r] of regionOffline) toast(t('{region} también siguió trabajando: +💰 {coins}', { region: `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}`, coins: formatNumber(r.coins) }), 5000);
  // Cómo se juega, encima de todo (la bienvenida queda debajo, para después).
  if (introOnStart(game.state)) showIntro(game.state);
  // En un evento, el reloj de su tablero (v3.9.1).
  // La región que se ve (v3.10: cada una con su jornada) o, en un evento, el reloj de su tablero (v3.9.1).
  document.getElementById('clock').addEventListener('click', () => showCalendar(board ? board.game.state : active.state));
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
      const r = finishEvent(game.state, board.zone);
      // v3.7: cumplir el objetivo asegura la medalla; el evento termina al tener las tres mejoras.
      if (r?.secured) {
        const m = MEDALS[r.medal];
        toast(t('{icon} ¡Medalla de {medal} asegurada! Para terminar el evento, compra las mejoras que faltan.', { icon: m.icon, medal: m.name }), 6000);
        sound.milestone();
      }
      if (r?.done) {
        eventBar.paint();
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
        // Los de cada región (v3.10), con el Renombre del jugador.
        const won = Object.values(games).flatMap((g) => checkLogros(g.state, root.profile));
        // Premio por las medallas de toda una región (v3.12).
        for (const b of checkMedalBonus(root.profile)) {
          toast(t('🏅 ¡Todos los eventos de {region} con {medal} o mejor! +{renown} ⭐ de Renombre', { region: REGIONS_BY_ID[b.region].name, medal: `${MEDALS[b.medal].icon} ${MEDALS[b.medal].name}`, renown: b.renown }), 5000);
          sound.milestone();
        }
        if (!won.length) return;
        const stars = won.reduce((n, w) => n + w.reward, 0);
        const [w] = won;
        // Varios a la vez (una partida de antes de la v2.3), en un solo aviso.
        toast(won.length > 1 ? t('🏆 {n} logros: +{stars} ⭐ de Renombre', { n: won.length, stars }) : t('🏆 {logro} (nivel {tier}): +{stars} ⭐ de Renombre', { logro: `${w.logro.icon} ${w.logro.name}`, tier: w.tier, stars }), 4000);
        sound.milestone();
      });
      // En el tablero de un evento, la persona de la zona no avisa lo de la partida.
      for (const view of [panel, chain, money, goals, research, zones, events, eventBar, ...(board ? [] : [chatter])]) safely(() => view.update());
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
    // Con 🚪 Salir, el tablero abierto también sigue con el juego cerrado (v3.67.4).
    if (board && exitMode() === 'leave') board.game.state.event.away ??= clockOf(game.state);
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
        if (rr) toast(t('{region} también siguió trabajando: +💰 {coins}', { region: `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}`, coins: formatNumber(rr.coins) }), 5000);
      }
      if (r) showWelcome(r, () => sound.coin());
      if (board) catchUpBoard(board.game);
    } finally {
      catching = false;
      hideSplash();
    }
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
  window.addEventListener('pagehide', persist);

  bindMenu(game, sound, music, () => active);
  bindDevOptions(game, () => active);
  bindIconTips();
  bindMore(); // «Ver más» en los textos largos (v3.67.5)
  bindTip(tipMode({ native: isNativeApp(), playStore: typeof __PLAY_STORE__ !== 'undefined' && __PLAY_STORE__ }));
  // En la app de Android el juego ya va dentro del paquete: sin service worker, con el botón «atrás».
  if (isNativeApp()) {
    // ¿Hay un APK más nuevo? Al abrir, al volver a la app (cada pocas horas) y desde el menú (v3.6.1). La de
    // Google Play (v3.62) no: se actualiza solo desde la tienda, como lo piden sus reglas.
    const selfUpdate = typeof __PLAY_STORE__ === 'undefined' || !__PLAY_STORE__;
    bindNative({ closeTop, onHide, onShow: () => (onShow(), selfUpdate && checkForUpdate()) });
    if (selfUpdate) {
      checkForUpdate();
      const updateBtn = document.getElementById('update-btn');
      updateBtn.hidden = false;
      updateBtn.addEventListener('click', () => checkForUpdate({ manual: true, toast }));
    }
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
  splashWait(t('¡Listo! Preparando el mapa…'));
  return r.coins > 0 ? { ...r, cap, capped: seconds > cap } : null;
}

// getActive: la partida de la región que se está viendo (su segundo final y su reinicio).
function bindMenu(game, sound, music, getActive) {
  const menu = document.getElementById('menu');
  // Volumen de los sonidos y de la música (v3.66), de 0 (apagado) a 100.
  const slider = (key, flag, icons, apply) => {
    const input = document.getElementById(`${key}-vol`);
    const label = document.getElementById(`${key}-vol-val`);
    const icon = document.getElementById(`${key}-vol-icon`);
    const paint = () => {
      const v = game.state.settings[`${key}Volume`];
      input.value = v;
      label.textContent = v ? `${v} %` : t('No');
      icon.textContent = v ? icons[0] : icons[1];
    };
    paint();
    input.addEventListener('input', () => {
      const v = Number(input.value);
      game.state.settings[`${key}Volume`] = v;
      game.state.settings[flag] = v > 0;
      apply(v / 100);
      paint();
    });
  };
  slider('sound', 'sound', ['🔊', '🔇'], (v) => (sound.setVolume(v), sound.click()));
  slider('music', 'music', ['🎵', '🔕'], (v) => music.setVolume(v));
  document.getElementById('menu-version').textContent = `v${APP_VERSION}`;
  // Idioma (v3.68): se guarda y el juego vuelve a cargar (la partida se guarda antes).
  const langSelect = document.getElementById('lang-select');
  langSelect.innerHTML = LANGS.map((l) => `<option value="${l.id}">${l.flag} ${l.name}</option>`).join('');
  langSelect.value = LANG;
  langSelect.addEventListener('change', () => {
    saveLang(langSelect.value);
    saveGame(game.state);
    location.reload();
  });
  // La música que suena ahora (la de la región que se está viendo), para los créditos (v3.67).
  const musicCredit = () => {
    const song = SONGS[music.region] ?? SONGS.cafetero;
    return t('🎵 Música: «{song}», compuesta para el juego y tocada por él ({instruments}, sintetizados).', { song: song.name, instruments: song.instruments });
  };
  document.getElementById('menu-btn').addEventListener('click', () => {
    const s = game.state;
    // De todas las regiones (v3.67: antes solo las cerezas del Eje Cafetero).
    const all = [s, ...Object.values(s.regions ?? {})];
    const sold = all.reduce((n, st) => n + sumValues(st.stats.sold), 0);
    const earned = all.reduce((n, st) => n + (st.totalEarned ?? 0), 0);
    document.getElementById('menu-stats').innerHTML = [
      t('⏱️ Tiempo jugado: <b>{time}</b>', { time: formatDuration(s.playTime) }),
      t('💰 Ganado en total: <b>{coins}</b>', { coins: formatNumber(earned) }),
      t('📦 Productos vendidos: <b>{n}</b>', { n: formatNumber(sold) }),
    ].map((li) => `<li>${li}</li>`).join('');
    const restartBtn = document.getElementById('restart-btn');
    const here = getActive().state;
    restartBtn.hidden = !here.mastered;
    restartBtn.textContent = here.region === 'cafetero' ? t('🔁 Volver a empezar {mult}', { mult: formatMult(nextLegacyMult(here)) }) : t('🔁 Volver a empezar {region} {mult}', { region: REGIONS_BY_ID[here.region].name, mult: formatMult(nextLegacyMult(here)) });
    menu.hidden = false;
  });
  document.getElementById('close-menu').addEventListener('click', () => (menu.hidden = true));
  const about = document.getElementById('about');
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-version').textContent = t('Versión {v}', { v: APP_VERSION });
    document.getElementById('about-music').textContent = musicCredit();
    menu.hidden = true;
    about.hidden = false;
  });
  document.getElementById('about-close').addEventListener('click', () => (about.hidden = true));

  // Copia de seguridad en texto.
  const text = document.getElementById('save-text');
  const msg = document.getElementById('save-msg');
  document.getElementById('export-btn').addEventListener('click', async () => {
    text.value = exportSave(game.state);
    text.select();
    try {
      await navigator.clipboard.writeText(text.value);
      msg.textContent = t('✅ Copiado. Pégalo en otro dispositivo para seguir allí.');
    } catch {
      msg.textContent = t('Selecciona el texto y cópialo.');
    }
  });
  document.getElementById('import-btn').addEventListener('click', () => {
    const state = importSave(text.value);
    if (!state) {
      msg.textContent = t('⛔ Ese texto no es una partida válida de Encantos de Mi Tierrita.');
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
      reset.textContent = t('Toca otra vez para borrar');
      armed = setTimeout(() => {
        armed = null;
        reset.textContent = t('Borrar partida');
      }, 3000);
      return;
    }
    resetting = true;
    clearSave();
    location.reload();
  });
}

start();
