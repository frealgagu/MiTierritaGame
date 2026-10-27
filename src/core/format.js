const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

// 950 → "950", 12345 → "12,3K", 2.5e6 → "2,50M". Más allá de los sufijos (con muchos reinicios del
// segundo final los números no tienen techo), notación científica: 4.2e40 → "4,20e40".
export function formatNumber(n) {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) return sign + Math.floor(n).toString();
  if (n >= 1000 ** SUFFIXES.length) {
    const [mantissa, exp] = n.toExponential(2).split('e+');
    return `${sign}${mantissa.replace('.', ',')}e${exp}`;
  }
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) {
    n /= 1000;
    i++;
  }
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  return sign + n.toFixed(digits).replace('.', ',') + SUFFIXES[i];
}

// Multiplicador de producción, con el mismo formato que las monedas (v3.57): ×512, ×2,05K, ×4,29B.
export function formatMult(m) {
  return `×${m < 1000 ? Math.round(m) : formatNumber(m)}`;
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
