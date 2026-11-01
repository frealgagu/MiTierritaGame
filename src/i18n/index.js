// Idiomas (v3.68; portugués de Brasil, v3.69). El juego está escrito en español; los demás idiomas son diccionarios aparte que solo
// se descargan si se eligen (quien juega en español no baja nada de más).
//   - La interfaz: cada frase pasa por t('frase en español', { variables }). El diccionario tiene la frase
//     en español como clave; si falta, se ve en español.
//   - El contenido (nombres de estaciones y productos, datos curiosos, láminas…): cada idioma trae sus
//     textos por id y se ponen sobre los datos al arrancar (applyData), antes de que el juego los use.
//   - La página (index.html): se traducen los textos y los atributos que estén en el diccionario.
// Cambiar de idioma guarda la elección y vuelve a cargar el juego.
import { setDecimal } from '../core/format.js';

export const LANGS = [
  { id: 'es', name: 'Español', flag: '🇨🇴' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
];
const KEY = 'mitierrita-lang';
// Mientras no estén sus traducciones, quien tiene el teléfono en francés, italiano, catalán o gallego
// juega en español (se le parece más que el inglés). El portugués tiene el suyo desde la v3.69.
const NEAR_SPANISH = ['fr', 'it', 'ca', 'gl'];

let dict = null;
export let LANG = 'es';

// La frase en el idioma elegido, con sus variables: t('Vende {n}', { n: 5 }).
export function t(text, vars) {
  let s = dict?.[text] ?? text;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

// «A, B y C» en el idioma elegido («A, B and C»).
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

// El idioma guardado; si no hay, el del teléfono (o el navegador).
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
    // sin almacenamiento: se queda el de esta vez
  }
}

const LOADERS = { en: () => import('./en/index.js'), pt: () => import('./pt/index.js') };

// Carga el idioma (antes de que arranque el juego).
export async function loadLang(lang) {
  if (!LOADERS[lang]) return;
  const m = await LOADERS[lang]();
  dict = m.UI;
  m.applyData();
  LANG = lang;
  setDecimal(m.DECIMAL ?? '.');
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

// Marca una frase para traducir sin traducirla todavía (se traduce donde se muestra, con t(texto)): así
// tools/i18n-code.mjs la encuentra.
export const tk = (text) => text;

// Pone el diccionario a mano (para las pruebas).
export function useDict(d, lang = 'xx') {
  dict = d;
  LANG = d ? lang : 'es';
}

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Traduce la página: cada elemento cuyo contenido (con sus <b>, <br>…) esté en el diccionario, y si no,
// cada texto suelto; también los atributos.
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
