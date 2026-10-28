// Convierte dist/index.html en una página publicable como Artifact de claude.ai:
// sin <html>/<head>/<body> (el visor pone su propio esqueleto) y con el CSS en línea.
// Uso: npm run build && node tools/artifact-page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const cssHref = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/)[1];
const css = readFileSync(`dist/${cssHref}`, 'utf8');
const script = html.match(/<script type="module"[^>]*><\/script>/)[0];
const fonts = html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim();

const page = `<title>Encantos de Mi Tierrita</title>
${fonts}
<style>${css}</style>
${body}
${script}
`;
writeFileSync('dist/artifact.html', page);
console.log('dist/artifact.html listo');
