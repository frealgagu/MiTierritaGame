// La página de descargas de la música y los sonidos (v3.71): web/musica/index.html, en los cuatro idiomas del
// juego (toma el que se eligió en el juego, si no el del navegador). Lista lo que dejaron
// tools/music-export.mjs y tools/sfx-export.mjs, con su duración.
//   node tools/music-page.mjs
// El .zip con todo lo arma el flujo de publicación (.github/workflows/pages.yml).
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { SONGS } from '../src/audio/songs.js';
import { REGIONS } from '../src/data/regions.js';
import { EFFECTS } from './audio-list.mjs';
import { PUBLIC, fileOf } from './music-export.mjs';

const DIR = new URL('../web/musica/', import.meta.url).pathname;
const LANGS = ['es', 'en', 'pt', 'fr'];
const content = async (lang, part) => (lang === 'es' ? null : (await import(`../src/i18n/${lang}/content/${part}.js`)).default);
const seconds = (path) => Math.round(Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], { encoding: 'utf8' })) * 10) / 10;

const songs = [];
for (const region of PUBLIC) {
  const file = fileOf(region);
  const names = {};
  const instruments = {};
  const regionName = {};
  for (const lang of LANGS) {
    const s = await content(lang, 'songs');
    const r = await content(lang, 'regions');
    names[lang] = s?.[region]?.[0] ?? SONGS[region].name;
    instruments[lang] = s?.[region]?.[1] ?? SONGS[region].instruments;
    regionName[lang] = r?.[region] ?? REGIONS.find((x) => x.id === region).name;
  }
  // Los íconos propios del juego (de su fuente, en la zona privada de Unicode) no se ven aquí: un emoji.
  const icon = REGIONS.find((x) => x.id === region).icon;
  songs.push({ file, names, instruments, region: regionName, icon: /[\uE000-\uF8FF]/.test(icon) ? '🐜' : icon, seconds: seconds(`${DIR}${file}.mp3`) });
}
const effects = EFFECTS.map(([file, , midi, names]) => {
  if (midi && !existsSync(`${DIR}efectos/${file}.mid`)) throw new Error(`falta efectos/${file}.mid`);
  return { file, midi, names, seconds: seconds(`${DIR}efectos/${file}.mp3`) };
});

const T = {
  es: {
    title: 'Música y sonidos', lead: 'La música y los efectos de sonido de <b>Encantos de Mi Tierrita</b>, compuestos para el juego y tocados por él con instrumentos sintetizados. En <b>MP3</b> para escuchar y en <b>MIDI</b> para tocarlos o hacer arreglos.',
    midiNote: 'El MIDI trae cada instrumento en su pista, con el tempo y el compás de la pieza; suena con los instrumentos del programa que lo abra, así que no es igual al del juego.',
    music: '🎶 Música', effects: '🔔 Efectos de sonido', all: '⬇️ Descargar todo (.zip)', back: '← Volver al juego', play: 'Escuchar', stop: 'Parar',
    credit: 'Música y sonidos hechos con código por frealgagu para el juego.', effectsNote: 'Los que son notas (monedas, campanas…) también van en MIDI; los demás son ruido (fuego, viento, el Willys) y solo están en MP3.',
  },
  en: {
    title: 'Music and sounds', lead: 'The music and sound effects of <b>Encantos de Mi Tierrita</b>, composed for the game and played by it with synthesized instruments. In <b>MP3</b> to listen to and in <b>MIDI</b> to play them or make arrangements.',
    midiNote: 'Each MIDI file has every instrument on its own track, with the tempo and time signature of the piece; it plays with the instruments of the program you open it with, so it does not sound exactly like the game.',
    music: '🎶 Music', effects: '🔔 Sound effects', all: '⬇️ Download everything (.zip)', back: '← Back to the game', play: 'Play', stop: 'Stop',
    credit: 'Music and sounds made with code by frealgagu for the game.', effectsNote: 'The ones made of notes (coins, bells…) also come in MIDI; the rest are noise (fire, wind, the Willys) and are only in MP3.',
  },
  pt: {
    title: 'Música e sons', lead: 'A música e os efeitos sonoros de <b>Encantos de Mi Tierrita</b>, compostos para o jogo e tocados por ele com instrumentos sintetizados. Em <b>MP3</b> para ouvir e em <b>MIDI</b> para tocar ou fazer arranjos.',
    midiNote: 'O MIDI traz cada instrumento na sua faixa, com o andamento e o compasso da peça; ele soa com os instrumentos do programa que o abrir, então não é igual ao do jogo.',
    music: '🎶 Música', effects: '🔔 Efeitos sonoros', all: '⬇️ Baixar tudo (.zip)', back: '← Voltar ao jogo', play: 'Ouvir', stop: 'Parar',
    credit: 'Música e sons feitos com código por frealgagu para o jogo.', effectsNote: 'Os que são notas (moedas, sinos…) também vêm em MIDI; os outros são ruído (fogo, vento, o Willys) e estão só em MP3.',
  },
  fr: {
    title: 'Musique et sons', lead: 'La musique et les effets sonores d’<b>Encantos de Mi Tierrita</b>, composés pour le jeu et joués par lui avec des instruments synthétisés. En <b>MP3</b> pour les écouter et en <b>MIDI</b> pour les jouer ou les arranger.',
    midiNote: 'Le MIDI contient chaque instrument sur sa piste, avec le tempo et la mesure du morceau ; il sonne avec les instruments du programme qui l’ouvre, donc pas exactement comme dans le jeu.',
    music: '🎶 Musique', effects: '🔔 Effets sonores', all: '⬇️ Tout télécharger (.zip)', back: '← Revenir au jeu', play: 'Écouter', stop: 'Arrêter',
    credit: 'Musique et sons faits avec du code par frealgagu pour le jeu.', effectsNote: 'Ceux qui sont des notes (pièces, cloches…) existent aussi en MIDI ; les autres sont du bruit (feu, vent, la Willys) et n’existent qu’en MP3.',
  },
};

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Música y sonidos · Encantos de Mi Tierrita</title>
    <meta name="description" content="La música y los efectos de sonido de Encantos de Mi Tierrita, en MP3 y MIDI." />
    <link rel="icon" href="../icons/icon-192.png" />
    <!-- Generada con node tools/music-page.mjs: no editar a mano. -->
    <style>
      :root { --ink: #3a2418; --paper: #fff8ec; --muted: #8a7462; --line: #e3d3b8; --bg: #e7eee6; --chip: #f3e6cf; --accent: #2e8b57; }
      @media (prefers-color-scheme: dark) {
        :root { --ink: #f3e6cf; --paper: #2b3a42; --muted: #b9c4c9; --line: #44555e; --bg: #22313a; --chip: #364953; --accent: #6fcf97; }
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
      main { max-width: 760px; margin: 24px auto; padding: 24px 20px 32px; background: var(--paper); border-radius: 20px; }
      @media (max-width: 800px) { main { margin: 0; border-radius: 0; padding: 20px 16px 28px; } }
      header { display: flex; align-items: center; gap: 14px; }
      header img { width: 64px; height: 64px; border-radius: 16px; flex: none; }
      h1 { font-size: 1.5rem; line-height: 1.2; margin: 0; }
      h2 { font-size: 1.2rem; margin: 30px 0 8px; }
      .langs { margin: 10px 0 0; display: flex; gap: 6px; flex-wrap: wrap; }
      .langs button { font: inherit; font-size: 0.9rem; border: 2px solid var(--line); background: none; color: inherit; border-radius: 999px; padding: 2px 10px; cursor: pointer; }
      .langs button[aria-pressed='true'] { background: var(--chip); border-color: var(--ink); }
      .note { color: var(--muted); font-size: 0.95rem; }
      .btn { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-weight: 600; text-decoration: none; color: inherit; border: 2px solid var(--ink); border-radius: 12px; padding: 6px 12px; background: var(--chip); cursor: pointer; }
      .btn.main { background: var(--accent); border-color: var(--accent); color: #fff; }
      .song { border: 2px solid var(--line); border-radius: 16px; padding: 12px 14px; margin: 10px 0; }
      .song h3 { margin: 0; font-size: 1.05rem; }
      .song p { margin: 2px 0 8px; color: var(--muted); font-size: 0.92rem; }
      .song audio { width: 100%; margin: 4px 0 8px; }
      .row { display: flex; gap: 8px; flex-wrap: wrap; }
      .fx { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 8px; margin-top: 10px; }
      .fx > div { border: 2px solid var(--line); border-radius: 14px; padding: 8px 10px; display: flex; align-items: center; gap: 8px; }
      .fx b { flex: 1; min-width: 0; font-size: 0.98rem; line-height: 1.25; }
      .fx b .note { display: block; font-weight: 400; font-size: 0.85rem; }
      .fx .btn { padding: 3px 8px; font-size: 0.85rem; border-radius: 10px; }
      footer { margin-top: 28px; border-top: 2px dashed var(--line); padding-top: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <img src="../icons/icon-192.png" alt="" width="64" height="64" />
        <div><h1 data-t="title"></h1><div class="note">Encantos de Mi Tierrita</div></div>
      </header>
      <div class="langs" id="langs"></div>
      <p data-t="lead"></p>
      <p><a class="btn main" href="./encantos-de-mi-tierrita-musica.zip" download data-t="all"></a></p>
      <h2 data-t="music"></h2>
      <p class="note" data-t="midiNote"></p>
      <div id="songs"></div>
      <h2 data-t="effects"></h2>
      <p class="note" data-t="effectsNote"></p>
      <div class="fx" id="fx"></div>
      <footer><a href="../" data-t="back"></a><span class="note" data-t="credit"></span></footer>
    </main>
    <script>
      const T = ${JSON.stringify(T)};
      const SONGS = ${JSON.stringify(songs)};
      const FX = ${JSON.stringify(effects)};
      const NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };
      const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
      const short = (s) => (s < 60 ? s.toFixed(1).replace(/\\.0$/, '').replace('.', lang === 'en' ? '.' : ',') + ' s' : mmss(s));
      const saved = () => { try { return localStorage.getItem('mitierrita-lang'); } catch { return null; } };
      let lang = [saved(), ...(navigator.languages || [navigator.language])].map((l) => String(l || '').slice(0, 2).toLowerCase()).find((l) => T[l]) || 'es';
      let playing = null;
      function render() {
        const t = T[lang];
        document.documentElement.lang = lang;
        document.title = t.title + ' · Encantos de Mi Tierrita';
        for (const el of document.querySelectorAll('[data-t]')) el.innerHTML = t[el.dataset.t];
        document.getElementById('langs').innerHTML = Object.keys(T).map((l) => '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === lang) + '">' + NAMES[l] + '</button>').join('');
        document.getElementById('songs').innerHTML = SONGS.map((s) =>
          '<div class="song"><h3>' + s.icon + ' ' + s.names[lang] + '</h3><p>' + s.region[lang] + ' · ' + s.instruments[lang] + ' · ' + mmss(s.seconds) + '</p>' +
          '<audio controls preload="none" src="./' + s.file + '.mp3"></audio>' +
          '<div class="row"><a class="btn" href="./' + s.file + '.mp3" download>⬇️ MP3</a><a class="btn" href="./' + s.file + '.mid" download>🎹 MIDI</a></div></div>').join('');
        document.getElementById('fx').innerHTML = FX.map((f) =>
          '<div><button class="btn" type="button" data-play="' + f.file + '" aria-label="' + t.play + '">▶</button><b>' + f.names[lang] + ' <span class="note">' + short(f.seconds) + '</span></b>' +
          '<a class="btn" href="./efectos/' + f.file + '.mp3" download>MP3</a>' + (f.midi ? '<a class="btn" href="./efectos/' + f.file + '.mid" download>MIDI</a>' : '') + '</div>').join('');
      }
      document.addEventListener('click', (e) => {
        const l = e.target.closest('[data-lang]');
        if (l) { lang = l.dataset.lang; try { localStorage.setItem('mitierrita-lang', lang); } catch {} render(); return; }
        const p = e.target.closest('[data-play]');
        if (!p) return;
        if (playing) playing.pause();
        playing = new Audio('./efectos/' + p.dataset.play + '.mp3');
        playing.play();
      });
      // Una sola pieza a la vez.
      document.addEventListener('play', (e) => { for (const a of document.querySelectorAll('audio')) if (a !== e.target) a.pause(); if (playing) playing.pause(); }, true);
      render();
    </script>
  </body>
</html>
`;
writeFileSync(`${DIR}index.html`, html);
console.log(`web/musica/index.html: ${songs.length} piezas y ${effects.length} efectos`);
