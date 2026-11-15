const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

// 950 -> "950", 12345 -> "12,3K", 2.5e6 -> "2,50M". Beyond defined suffixes (with many
let DECIMAL = ',';
export const setDecimal = (d) => (DECIMAL = d);
export const decimal = (s) => String(s).replace('.', DECIMAL);

// restarts numbers have no ceiling), fall back to scientific notation: 4.2e40 -> "4,20e40".
// Production multiplier using the same suffix formatting as coins (v3.57): x512, x2.05K, x4.29B.
export function formatNumber(n) {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) return sign + Math.floor(n).toString();
  if (n >= 1000 ** SUFFIXES.length) {
    const [mantissa, exp] = n.toExponential(2).split('e+');
    return `${sign}${decimal(mantissa)}e${exp}`;
  }
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) {
    n /= 1000;
    i++;
  }
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  return sign + decimal(n.toFixed(digits)) + SUFFIXES[i];
}

// Counts (v5.9): whole numbers with thousands separators up to a million (9999 -> "9.999" in Spanish,
// "9,999" in English), then like formatNumber.
export function formatCount(n) {
  if (Math.abs(n) >= 1e6) return formatNumber(n);
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, DECIMAL === ',' ? '.' : ',');
}

// Rates per second: show decimals when small.
export function formatMult(m) {
  return `×${m < 1000 ? Math.round(m) : formatNumber(m)}`;
}

// Quantities that can be fractional (mule loads): 0.8, 3.5, 12, 1.2K
export function formatRate(n) {
  if (n < 10) return decimal(n.toFixed(n < 1 ? 2 : 1));
  return formatNumber(n);
}

export function formatDuration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

// Path utilities for routes defined as arrays of [gx, gy] grid points.
export function formatAmount(n) {
  if (n < 10 && Math.abs(n - Math.round(n)) > 0.05) return decimal(n.toFixed(1));
  return formatNumber(Math.round(n));
}
