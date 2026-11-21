// Numbers typed in the save editor (v5.17): plain numbers in the player's notation, the game's suffixes
// (20K, 1,5Dc, 999Oc) or scientific notation (1e30). Pure functions, tested in test/editor.test.js.
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
// Each suffix as a power of ten (K = 3, Dc = 33): read as an exponent, «1000Dc» is exactly 1e36.
const BY_LOWER = Object.fromEntries(SUFFIXES.filter(Boolean).map((s, i) => [s.toLowerCase(), 3 * (i + 1)]));

// The number in `text`, or NaN when it is not one.
//   decimal: the player's decimal separator (',' in Spanish, '.' in English); the other one groups thousands.
// With a suffix or an exponent, a lone separator is the decimal point whatever the language («1.5Dc» or «1.234e30»
// typed in Spanish); in a plain number, a lone separator followed by other than three digits too («2.5»).
export function parseAmount(text, decimal = ',') {
  let s = String(text ?? '').replace(/[\s_]/g, '');
  if (!s) return NaN;
  const sign = s.startsWith('-') ? -1 : 1;
  s = s.replace(/^[-+]/, '');
  let shift = 0; // the suffix, as a power of ten
  const suffix = s.match(/[a-z]+$/i)?.[0];
  if (suffix && !/^\d*[.,]?\d*e[-+]?\d+$/i.test(s)) {
    shift = BY_LOWER[suffix.toLowerCase()];
    if (!shift) return NaN;
    s = s.slice(0, -suffix.length);
  }
  let exp = 0;
  if (/e/i.test(s)) {
    const [m, e] = s.split(/e/i);
    if (!/^[-+]?\d+$/.test(e ?? '')) return NaN;
    exp = Number(e);
    s = m;
  }
  const thousands = decimal === ',' ? '.' : ',';
  const seps = s.match(/[.,]/g) ?? [];
  if (seps.length === 1 && (shift || exp || /e/i.test(text) || !/[.,]\d{3}$/.test(s))) s = s.replace(/[.,]/, '.');
  else {
    // Thousands come in groups of three digits («1.234.567»).
    const [whole, ...groups] = s.split(decimal)[0].split(thousands);
    if (!whole || groups.some((g) => !/^\d{3}$/.test(g))) return NaN;
    s = s.split(thousands).join('').replace(decimal, '.');
  }
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return NaN;
  // Number() reads «3.5e29» exactly; multiplying by a power of ten would not.
  return sign * Number(`${s}e${exp + shift}`);
}

// How a number is written back into its box, in the player's notation: whole numbers in full up to 10¹⁵ (decimals
// only below 1000), then scientific notation with six significant digits (3,41354e29), which the box also accepts.
export function plainAmount(n, decimal = ',') {
  if (!Number.isFinite(n)) return '';
  const dot = (x) => x.replace('.', decimal);
  if (Math.abs(n) < 1000) return dot(String(Math.round(n * 1000) / 1000));
  if (Math.abs(n) < 1e15) return String(Math.round(n));
  return dot(n.toPrecision(6).replace(/\.?0+e/, 'e').replace('e+', 'e'));
}

// Seconds as hours, minutes and seconds, and back.
export const splitTime = (seconds) => {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};
export const joinTime = ({ h = 0, m = 0, s = 0 }) => Math.max(0, h * 3600 + m * 60 + s);

// (v5.16.4) How a box shows its number while not being edited, in the game's notation:
//   shortAmount: products and coins, with the game's suffixes and no trailing zeros (123M, 1,5Dc, 1000Dc).
//   countAmount: small counters, whole with thousands separators (10, 10.000).
// The box keeps the exact number: it shows it in full while it has the focus.
export function shortAmount(n, decimal = ',') {
  if (!Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  let v = Math.abs(n);
  if (v < 1000) return sign + String(Math.round(v * 100) / 100).replace('.', decimal);
  const last = SUFFIXES.length - 1;
  let i = Math.min(last, Math.floor(Math.log10(v) / 3));
  const fixed = (x) => x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0);
  // 999.999K rounds to «1000K»: that is 1M.
  if (i < last && Number(fixed(v / 1000 ** i)) >= 1000) i++;
  let text = fixed(v / 1000 ** i);
  if (text.includes('.')) text = text.replace(/\.?0+$/, '');
  return sign + text.replace('.', decimal) + SUFFIXES[i];
}
export function countAmount(n, decimal = ',') {
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, decimal === ',' ? '.' : ',');
}
