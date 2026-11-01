// Los textos de index.html que hay que traducir, como los busca translateDom (src/i18n/index.js): el
// contenido de los elementos con <b>, <br>… adentro, y si no, cada texto suelto; también los atributos.
//   node tools/i18n-html.mjs [idioma]   (con idioma, solo lo que ese idioma todavía no tiene)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright viene instalado aparte (no es dependencia del juego).
const { chromium } = createRequire(import.meta.url)('playwright');

const INLINE = ['B', 'I', 'BR', 'STRONG', 'EM', 'SMALL', 'A', 'SPAN', 'CODE'];
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
const texts = await page.evaluate((INLINE) => {
  const out = [];
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const hasLetters = (s) => /\p{L}{2,}/u.test(s);
  const walk = (el) => {
    for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
      const v = el.getAttribute?.(a);
      if (v && hasLetters(v)) out.push(norm(v));
    }
    const kids = [...el.children];
    const inline = kids.length && kids.every((k) => INLINE.includes(k.tagName) && !k.id && !k.children.length) && [...el.childNodes].some((n) => n.nodeType === 3 && norm(n.data));
    if (inline) {
      out.push(norm(el.innerHTML));
      return;
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const t = norm(node.data);
        if (t && hasLetters(t)) out.push(t);
      } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(node.tagName)) walk(node);
    }
  };
  walk(document.body);
  return [...new Set(out)];
}, INLINE);
await browser.close();
const lang = process.argv[2];
const have = lang ? (await import(`../src/i18n/${lang}/ui.js`)).default : {};
for (const t of texts.filter((x) => !(x in have))) console.log(JSON.stringify(t));
