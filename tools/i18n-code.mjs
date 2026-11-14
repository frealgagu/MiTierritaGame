// Phrases passed through t('…') in code (src/**/*.js) that a language is still missing.
//   node tools/i18n-code.mjs <lang>        lists missing ones (one per line, as JSON)
//   node tools/i18n-code.mjs <lang> --all  all
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) return f === 'i18n' ? [] : files(p);
  return p.endsWith('.js') ? [p] : [];
});

// t('…'), t("…") or t(`…`) without ${} (or tk('…'), which only marks it): the key is the exact text.
export function keysIn(src) {
  const out = [];
  const re = /\btk?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const m of src.matchAll(re)) {
    if (m[1] === '`' && m[2].includes('${')) continue;
    out.push(m[2].replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n'));
  }
  return out;
}

export function allKeys(root = new URL('../src', import.meta.url).pathname) {
  return [...new Set(files(root).flatMap((f) => keysIn(readFileSync(f, 'utf8'))))];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [lang, flag] = process.argv.slice(2);
  const dict = (await import(`../src/i18n/${lang}/ui.js`)).default;
  for (const k of allKeys()) if (flag === '--all' || !(k in dict)) console.log(JSON.stringify(k));
}
