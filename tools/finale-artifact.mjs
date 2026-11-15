// Builds a single-file review page for the grand finale (animation, music and every keeper's line), to publish
// as an artifact: node tools/finale-artifact.mjs <out.html>
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'finale.html';
const bundle = await build({ entryPoints: ['tools/finale-entry.js'], bundle: true, format: 'iife', minify: true, write: false, platform: 'browser', target: 'es2020', define: { 'import.meta.env.DEV': 'false' }, logLevel: 'error' });
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const font = (file) => readFileSync(`src/assets/${file}`).toString('base64');

const html = `<title>Gran final de Mi Tierrita</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
@font-face { font-family: 'Fredoka'; src: url(data:font/woff2;base64,${font('fredoka-latin.woff2')}) format('woff2'); font-weight: 300 700; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212; }
@font-face { font-family: 'Fredoka'; src: url(data:font/woff2;base64,${font('fredoka-latin-ext.woff2')}) format('woff2'); font-weight: 300 700; unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+20A0-20AB, U+20AD-20C0; }
@font-face { font-family: 'MiTierrita Icons'; src: url(data:font/woff2;base64,${font('mitierrita-icons.woff2')}) format('woff2'); unicode-range: U+E000-E3FF, U+00A9, U+00AE, U+200D, U+203C, U+2049, U+2122, U+2139, U+231A-23FF, U+24C2, U+25AA-25FE, U+2600-27BF, U+2B06, U+2B1B-2B55, U+3030, U+303D, U+3297, U+3299, U+FE0F, U+1F000-1FAFF; }
/* Layout: one reading column, the play card on top and the script of lines below, grouped by region. */
:root {
  --paper: #fffaf0; --paper-2: #f3e6cc; --ink: #3a2418; --muted: #7a5a44; --green: #2e9b5f; --sun: #f2b705; --line: #3a241833;
  --display: 'MiTierrita Icons', Fredoka, 'Baloo 2', system-ui, sans-serif;
  --body: 'MiTierrita Icons', Fredoka, system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #231811; --paper-2: #33241a; --ink: #f6e7cf; --muted: #c9ab8c; --green: #3fbf7a; --sun: #f2c94c; --line: #f6e7cf33; color-scheme: dark; } }
:root[data-theme="dark"] { --paper: #231811; --paper-2: #33241a; --ink: #f6e7cf; --muted: #c9ab8c; --green: #3fbf7a; --sun: #f2c94c; --line: #f6e7cf33; color-scheme: dark; }
body { background: var(--paper); color: var(--ink); font-family: var(--body); font-size: 16px; line-height: 1.45; padding-block: 24px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
main { max-width: 680px; margin: 0 auto; display: grid; gap: 22px; }
h1 { font-family: var(--display); font-size: clamp(1.8rem, 6vw, 2.6rem); margin: 0; text-wrap: balance; }
h1 + p { margin: 4px 0 0; color: var(--muted); }
.card { border: 3px solid var(--ink); border-radius: 18px; background: var(--paper-2); padding: 16px; display: grid; gap: 10px; box-shadow: 0 3px 0 var(--ink); }
.card p { margin: 0; }
.song { font-weight: 700; }
.small { font-size: 0.88rem; color: var(--muted); }
button#play { min-height: 50px; border: 3px solid var(--ink); border-radius: 14px; background: var(--green); color: #fff; font: inherit; font-size: 1.15rem; font-weight: 700; cursor: pointer; box-shadow: 0 3px 0 var(--ink); }
button#play:disabled { opacity: 0.6; }
button#play:focus-visible { outline: 3px solid var(--sun); outline-offset: 2px; }
h2 { font-family: var(--display); font-size: 1.3rem; margin: 0; }
.region h3 { margin: 0 0 6px; font-size: 1.1rem; border-bottom: 2px solid var(--line); padding-bottom: 4px; }
.region ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.region li { display: grid; gap: 1px; }
.who { font-weight: 700; }
.who small { font-weight: 500; color: var(--muted); }
q { quotes: '«' '»'; }
#lines { display: grid; gap: 18px; }
</style>
<main>
  <header><h1>🎉 Gran final</h1><p>Se dispara al tener todos los logros de todas las regiones. Las <b id="count"></b> personas de cada zona felicitan, región por región, cada una con su acento.</p></header>
  <section class="card">
    <p class="song">🎵 <span id="song"></span></p>
    <p class="small" id="instruments"></p>
    <p class="small">Toca la pantalla para pasar al siguiente, ⏭ salta a la próxima región y ✕ cierra. La música tarda un par de segundos en prepararse.</p>
    <button id="play" type="button">▶ Ver el gran final</button>
  </section>
  <section><h2>Lo que dice cada uno</h2><p class="small">Dime qué cambiar: el texto, el acento, el orden o la duración.</p><div id="lines"></div></section>
</main>
<script>${js}</script>
`;
writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0), 'KB');
