const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];

// 950 → "950", 12345 → "12,3K", 2.5e6 → "2,50M"
export function formatNumber(n) {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) return sign + Math.floor(n).toString();
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) {
    n /= 1000;
    i++;
  }
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  return sign + n.toFixed(digits).replace('.', ',') + SUFFIXES[i];
}

// Tasas por segundo: muestra decimales cuando son pequeñas.
export function formatRate(n) {
  if (n < 10) return n.toFixed(n < 1 ? 2 : 1).replace('.', ',');
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

// Cantidades que pueden tener decimales (carga de las mulas): 0,8 · 3,5 · 12 · 1,2K
export function formatAmount(n) {
  if (n < 10 && Math.abs(n - Math.round(n)) > 0.05) return n.toFixed(1).replace('.', ',');
  return formatNumber(Math.round(n));
}
