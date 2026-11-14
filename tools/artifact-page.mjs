// Converts dist/index.html into a page publishable as a claude.ai Artifact:
// without <html>/<head>/<body> (the viewer provides its own skeleton) and with inline CSS.
// Usage: npm run build && node tools/artifact-page.mjs
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
console.log('dist/artifact.html ready');
