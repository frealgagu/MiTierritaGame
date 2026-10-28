// Ícono de Encantos de Mi Tierrita (v3.62): el mapa de Colombia con las regiones del juego de su color y, a su
// alrededor, el sombrero vueltiao, la palmera, la mata de café y la mazorca de cacao. Devuelve el SVG
// (512 × 512). Lo usa tools/icon/build_app_icon.mjs para sacar todos los tamaños (web, Android y Play Store).
import { DEPARTMENTS } from '../../src/data/colombiaMap.js';

const INK = '#3a2418';
const REGION_COLOR = { cafetero: '#8bc34a', santander: '#e5a15a', costa: '#f2c14e', boyaca: '#9fb4d8', llanos: '#c8d66a', pacifico: '#4fb3bf', amazonas: '#3f9a5a' };

// Caja de todos los departamentos (en las unidades del mapa).
const box = (() => {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const d of DEPARTMENTS) {
    const n = d.d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < n.length; i += 2) {
      b.x0 = Math.min(b.x0, n[i]);
      b.x1 = Math.max(b.x1, n[i]);
      b.y0 = Math.min(b.y0, n[i + 1]);
      b.y1 = Math.max(b.y1, n[i + 1]);
    }
  }
  return b;
})();
const fit = (bx, by, bw, bh) => {
  const s = Math.min(bw / (box.x1 - box.x0), bh / (box.y1 - box.y0));
  return `translate(${bx + (bw - (box.x1 - box.x0) * s) / 2 - box.x0 * s} ${by + (bh - (box.y1 - box.y0) * s) / 2 - box.y0 * s}) scale(${s})`;
};

const map = (t) => `<g transform="${t}">
  ${DEPARTMENTS.map((d) => `<path d="${d.d}" fill="${INK}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`).join('')}
  ${DEPARTMENTS.map((d) => `<path d="${d.d}" fill="${REGION_COLOR[d.region] ?? '#e8dcc3'}" stroke="#fffaf0" stroke-width="1.4" stroke-linejoin="round"/>`).join('')}
</g>`;

const cherry = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="${INK}"/><circle cx="${x}" cy="${y}" r="${r}" fill="#d7263d"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#ff8a8a"/>`;

// Sombrero vueltiao: el ala ancha y la copa, con las franjas negras y beige de la caña flecha.
const sombrero = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">
  <ellipse cx="0" cy="12" rx="62" ry="20" fill="${INK}"/>
  <ellipse cx="0" cy="10" rx="57" ry="16" fill="#efe0b4"/>
  <ellipse cx="0" cy="10" rx="45" ry="11.5" fill="none" stroke="#2b2018" stroke-width="4"/>
  <ellipse cx="0" cy="10" rx="33" ry="8" fill="none" stroke="#2b2018" stroke-width="3"/>
  <path d="M-26 8 Q-24 -30 0 -32 Q24 -30 26 8 Q0 16 -26 8 Z" fill="#efe0b4" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M-25 -2 Q0 6 25 -2" fill="none" stroke="#2b2018" stroke-width="4"/>
  <path d="M-22 -14 Q0 -8 22 -14" fill="none" stroke="#2b2018" stroke-width="3"/>
</g>`;

// Palmera de coco: el tronco curvo con sus anillos y las hojas abiertas, con dos cocos.
const palm = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">
  <path d="M6 0 Q-6 -50 10 -100" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
  <path d="M6 0 Q-6 -50 10 -100" fill="none" stroke="#a1887f" stroke-width="10" stroke-linecap="round"/>
  ${[-20, -45, -70].map((y) => `<path d="M-3 ${y} L9 ${y - 4}" stroke="#6d4c41" stroke-width="3"/>`).join('')}
  ${[[-60, -88], [-50, -120], [8, -140], [60, -122], [66, -88]].map(([fx, fy]) => `<path d="M10 -100 Q${(10 + fx) / 2} ${fy - 18} ${fx} ${fy}" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M10 -100 Q${(10 + fx) / 2} ${fy - 18} ${fx} ${fy}" fill="none" stroke="#43a047" stroke-width="9" stroke-linecap="round"/>`).join('')}
  <circle cx="2" cy="-96" r="9" fill="#6d4c41" stroke="${INK}" stroke-width="4"/><circle cx="18" cy="-94" r="9" fill="#7a5a2e" stroke="${INK}" stroke-width="4"/>
</g>`;

// Rama de café: el tallo, dos hojas y las cerezas rojas.
const coffee = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">
  <path d="M0 70 Q-4 20 8 -40" fill="none" stroke="#6b4a2e" stroke-width="9" stroke-linecap="round"/>
  <path d="M4 10 Q-46 -6 -56 -46 Q-8 -40 4 10 Z" fill="#43a047" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M6 -14 Q48 -40 60 -78 Q14 -70 6 -14 Z" fill="#66bb6a" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  ${cherry(-12, 40, 11)}${cherry(10, 50, 11)}${cherry(-2, 62, 10)}
</g>`;

// Mazorca de cacao: alargada, con sus surcos, de color naranja rojizo, con una hoja.
const cacao = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k}) rotate(-30)">
  <path d="M-10 -38 Q30 -62 52 -40 Q30 -28 -10 -38 Z" fill="#2e7d32" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="0" cy="0" rx="50" ry="30" fill="${INK}"/>
  <ellipse cx="0" cy="0" rx="45" ry="25" fill="#d9822b"/>
  <path d="M-44 0 Q0 -20 44 0" fill="none" stroke="#a85a17" stroke-width="4"/>
  <path d="M-44 0 Q0 20 44 0" fill="none" stroke="#a85a17" stroke-width="4"/>
  <path d="M-46 0 L46 0" stroke="#a85a17" stroke-width="4"/>
  <ellipse cx="-14" cy="-12" rx="14" ry="5" fill="#f2b05a" opacity=".8"/>
</g>`;

// El fondo: cielo claro que baja a un crema cálido.
const background = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6f2"/><stop offset="1" stop-color="#fdf3dc"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#bg)"/>`;

// La figura: el mapa en el centro y lo demás alrededor, más pequeño.
export const figure = () => `
  ${map(fit(150, 58, 212, 396))}
  ${sombrero(118, 132, 0.95)}
  ${palm(104, 410, 0.95)}
  ${coffee(404, 232, 0.95)}
  ${cacao(392, 392, 0.85)}`;

// Ícono completo; withBackground false: solo la figura (la capa de adelante del ícono adaptable de Android).
// scale: la figura más pequeña, centrada (Android recorta el ícono adaptable en círculo o gota).
export function appIconSvg({ withBackground = true, scale = 1 } = {}) {
  const off = (512 - 512 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
${withBackground ? background : ''}
<g transform="translate(${off} ${off}) scale(${scale})">${figure()}</g>
</svg>`;
}

export const backgroundSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${background}</svg>`;
