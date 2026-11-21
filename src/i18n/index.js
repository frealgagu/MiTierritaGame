// Languages (v3.68: English; v3.69: Brazilian Portuguese; v3.70: French). The game is written in Spanish; other languages are separate dictionaries that are only
// downloaded if selected (Spanish players download nothing extra).
//   - UI: each phrase passes through the translate helper with variables. The dictionary uses the Spanish phrase
//     as key; if missing, it falls back to Spanish.
//   - Content (station and product names, fun facts, stickers...): each language provides its
//     texts by id, overlaid onto the data on startup (applyData) before the game uses them.
//   - HTML page (index.html): texts and attributes present in the dictionary are translated.
// Changing language saves the choice and reloads the game.
import { setDecimal } from '../core/format.js';

export const LANGS = [
  { id: 'es', name: 'Español', flag: '🇨🇴' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
];
const KEY = 'mitierrita-lang';
// Players whose device is set to Italian, Catalan, or Galician play in Spanish (closer to them than
// English). Portuguese got its own translation in v3.69 and French in v3.70.
const NEAR_SPANISH = ['it', 'ca', 'gl'];

let dict = null;
export let LANG = 'es';

// String in the selected language, with interpolated variables: t('Sell {n}', { n: 5 }).
export function t(text, vars) {
  let s = dict?.[text] ?? text;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  // Spanish contracts «a el» and «de el» (a name with its article dropped into «a {station}»): «al Adobadero»,
  // «del Adobadero». Only the lowercase article: «de El Hato llanero» keeps it, as a name.
  if (vars && LANG === 'es') s = s.replace(/\b([Aa]) el /g, '$1l ').replace(/\b([Dd])e el /g, '$1el ');
  return s;
}

// «A, B and C» in the selected language.
export function listJoin(items) {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${t('y')} ${items.at(-1)}`;
}

const stored = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

// Saved language; if none, device (or browser) language.
export function chooseLang(saved = stored(), langs = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]) {
  if (LANGS.some((l) => l.id === saved)) return saved;
  for (const tag of langs) {
    const base = String(tag ?? '').toLowerCase().split('-')[0];
    if (LANGS.some((l) => l.id === base)) return base;
    if (NEAR_SPANISH.includes(base)) return 'es';
  }
  return langs.length ? 'en' : 'es';
}

export function saveLang(lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // no storage: keep choice for this session only
  }
}

const LOADERS = { en: () => import('./en/index.js'), pt: () => import('./pt/index.js'), fr: () => import('./fr/index.js') };

// Load language (before game boots).
export async function loadLang(lang) {
  if (!LOADERS[lang]) return;
  const m = await LOADERS[lang]();
  dict = m.UI;
  m.applyData();
  LANG = lang;
  setDecimal(m.DECIMAL ?? '.');
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

// Mark a phrase for translation without translating yet (translated where displayed): lets
// tools/i18n-code.mjs find it.
export const tk = (text) => text;

// Set dictionary manually (for tests).
export function useDict(d, lang = 'xx') {
  dict = d;
  LANG = d ? lang : 'es';
}

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Translate the DOM page: each element whose content (including <b>, <br>...) is in the dictionary, or else
// each loose text node; also attributes.
export function translateDom(root) {
  if (!dict) return;
  const walk = (el) => {
    for (const a of ATTRS) {
      const v = el.getAttribute?.(a);
      if (v && dict[norm(v)]) el.setAttribute(a, dict[norm(v)]);
    }
    const html = norm(el.innerHTML ?? '');
    if (html && dict[html] && el.children.length) {
      el.innerHTML = dict[html];
      return;
    }
    for (const node of [...el.childNodes]) {
      if (node.nodeType === 3) {
        const text = norm(node.data);
        if (text && dict[text]) node.data = node.data.replace(node.data.trim(), dict[text]);
      } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') walk(node);
    }
  };
  walk(root);
}
