// La página de coordenadas (v4.4.10): el mapa de Colombia con cada zona y cada aeropuerto, en su lugar real y donde los
// dibuja el juego (ui/mapLayout.js), con una cuadrícula de latitud y longitud y las tablas.
//   node tools/map-coords.mjs [salida]   (por defecto docs/coordenadas.html; la plantilla es tools/map-coords.html)
import fs from 'fs';
import { DEPARTMENTS, MAP_SCALE } from '../src/data/colombiaMap.js';
import { AIRPORT_GEO, AIRPORT_NAME, ZONE_GEO } from '../src/data/zoneGeo.js';
import { REGIONS } from '../src/data/regions.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { AIRSTRIP, ZONE_POS, proj, unproj } from '../src/ui/mapLayout.js';
import pkg from '../package.json' with { type: 'json' };

// Encabezado para abrir la página como archivo suelto (al publicarla como artefacto se quita la primera línea).
const HEAD = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n';
const OUT = process.argv[2] ?? new URL('../docs/coordenadas.html', import.meta.url).pathname;
const COLORS = { cafetero: '#8bc34a', santander: '#e5a15a', costa: '#f2c14e', boyaca: '#9fb4d8', llanos: '#c8d66a', pacifico: '#4fb3bf', amazonas: '#3f9a5a', tolima: '#e39b6a', cundinamarca: '#d98fb5', bogota: '#b39ddb' };
const PLACE = {
  finca: 'Chinchiná', trapiche: 'Supía', lecheria: 'San Pedro de los Milagros', cacaotal: 'Maceo', maizal: 'Jericó', pueblo: 'Salento',
  guayabera: 'Vélez', tabacal: 'Ocaña', fiquera: 'Mogotes', hato: 'Málaga', hormigas: 'San Gil', barichara: 'Barichara',
  arrozal: 'Montería', cocal: 'Palomino', cienaga: 'Ciénaga Grande', quesera: 'Valledupar', sombrero: 'Tuchín', cartagena: 'Cartagena',
  papal: 'Ventaquemada', cerveceria: 'Tibasosa', raquira: 'Ráquira', paipa: 'Paipa', ruanas: 'Nobsa', villa_leyva: 'Villa de Leyva',
  palma: 'Acacías', frutal: 'Granada', cachamera: 'Restrepo', hato_llanero: 'Paz de Ariporo', talabarteria: 'Yopal', villavicencio: 'Villavicencio',
  platanal: 'Quibdó', azotea: 'Guapi', bahia: 'Bahía Solano', manglar: 'Tumaco', werregue: 'Bajo San Juan', buenaventura: 'Buenaventura',
  asaizal: 'Puerto Leguízamo', ajizal: 'La Chorrera', lago: 'Lagos de Tarapoto', casaberia: 'Mitú', yanchama: 'Macedonia', leticia: 'Leticia',
  achirales: 'Natagaima', cafe_huila: 'Pitalito', betania: 'Represa de Betania', lechoneria: 'Ibagué', chamba: 'La Chamba (El Guamo)', neiva: 'Neiva',
  flores: 'Madrid', fresas: 'Sibaté', truchas: 'Guatavita', salinas: 'Nemocón', cocina: 'Chía', zipaquira: 'Zipaquirá',
  bogota: 'La Candelaria',
};
const km = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 111 * Math.cos((a[0] * Math.PI) / 180));
const f2 = (n) => n.toFixed(2);

const union = (pts) => pts.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });

// --- SVG ---
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function grid(view, step, labelEvery) {
  const out = [];
  const [latTop, lonLeft] = unproj([view.x, view.y]);
  const [latBot, lonRight] = unproj([view.x + view.w, view.y + view.h]);
  const fs_ = Math.max(view.w, view.h) / 48;
  const eps = 1e-6;
  for (let lon = Math.ceil(lonLeft / step) * step; lon <= lonRight + eps; lon += step) {
    const x = proj([0, lon])[0];
    const major = Math.abs(lon / labelEvery - Math.round(lon / labelEvery)) < eps;
    out.push(`<line x1="${x}" y1="${view.y}" x2="${x}" y2="${view.y + view.h}" class="${major ? 'gmaj' : 'gmin'}" />`);
    if (major) out.push(`<text x="${x + fs_ * 0.3}" y="${view.y + fs_ * 1.2}" class="glab" font-size="${fs_}">${Math.abs(lon).toFixed(labelEvery < 1 ? 1 : 0)}°O</text>`);
  }
  for (let lat = Math.ceil(latBot / step) * step; lat <= latTop + eps; lat += step) {
    const y = proj([lat, 0])[1];
    const major = Math.abs(lat / labelEvery - Math.round(lat / labelEvery)) < eps;
    out.push(`<line x1="${view.x}" y1="${y}" x2="${view.x + view.w}" y2="${y}" class="${major ? 'gmaj' : 'gmin'}" />`);
    if (major) out.push(`<text x="${view.x + fs_ * 0.3}" y="${y - fs_ * 0.3}" class="glab" font-size="${fs_}">${Math.abs(lat).toFixed(labelEvery < 1 ? 1 : 0)}°${lat < 0 ? 'S' : 'N'}</text>`);
  }
  return out.join('');
}
function depts(view, focus) {
  return DEPARTMENTS.map((d) => {
    const c = d.region ? COLORS[d.region] : null;
    const cls = d.region && (!focus || d.region === focus) ? 'dept on' : 'dept';
    return `<path d="${d.d}" class="${cls}" style="${c ? `--c:${c}` : ''}"><title>${esc(d.name)}</title></path>`;
  }).join('');
}
function plane(x, y, s, cls) {
  // Avioncito visto desde arriba.
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${s / 10})"><path d="M0,-9 L1.4,-3 L9,1.5 L9,3.2 L1.4,1.2 L1,6 L3.5,8 L3.5,9.4 L0,8.4 L-3.5,9.4 L-3.5,8 L-1,6 L-1.4,1.2 L-9,3.2 L-9,1.5 L-1.4,-3 Z" /></g>`;
}
function svgCountry() {
  const all = DEPARTMENTS.flatMap((d) => d.d.match(/-?\d+(\.\d+)?/g).map(Number));
  const xs = all.filter((_, i) => i % 2 === 0);
  const ys = all.filter((_, i) => i % 2 === 1);
  const view = { x: Math.min(...xs) - 12, y: Math.min(...ys) - 12, w: Math.max(...xs) - Math.min(...xs) + 24, h: Math.max(...ys) - Math.min(...ys) + 24 };
  const r = view.w / 160;
  const marks = [];
  for (const reg of REGIONS) {
    for (const z of reg.zones) {
      const [x, y] = proj(ZONE_GEO[z]);
      marks.push(`<circle cx="${x}" cy="${y}" r="${r}" class="zone" style="--c:${COLORS[reg.id]}"><title>${esc(ZONES_BY_ID[z].name)} · ${esc(PLACE[z])}</title></circle>`);
    }
    const [ax, ay] = AIRSTRIP[reg.id];
    marks.push(plane(ax, ay, r * 2.6, 'strip'));
  }
  return `<svg viewBox="${view.x} ${view.y} ${view.w} ${view.h}" role="img" aria-label="Mapa de Colombia con las zonas del juego">${depts(view)}${grid(view, 0.5, 1)}${marks.join('')}</svg>`;
}
function svgRegion(reg) {
  const real = AIRPORT_GEO[reg.id];
  const pts = [...reg.zones.flatMap((z) => [proj(ZONE_GEO[z]), ZONE_POS[z]]), AIRSTRIP[reg.id], proj(real)];
  const b = union(pts);
  const size = Math.max(b.x1 - b.x0, b.y1 - b.y0, 40);
  const pad = size * 0.18;
  const view = { x: b.x0 - pad, y: b.y0 - pad, w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2 };
  // Lugar a la derecha para los nombres.
  view.w += size * 0.35;
  // Que no quede muy angosta.
  if (view.w < view.h * 0.8) { const d = view.h * 0.8 - view.w; view.x -= d / 2; view.w += d; }
  if (view.h < view.w * 0.6) { const d = view.w * 0.6 - view.h; view.y -= d / 2; view.h += d; }
  const spanDeg = Math.max(view.w, view.h) / MAP_SCALE;
  const step = spanDeg <= 3 ? 0.1 : spanDeg <= 6 ? 0.25 : 0.5;
  const labelEvery = step === 0.1 ? 0.5 : step === 0.25 ? 1 : 1;
  const r = view.w / 110;
  const fs_ = view.w / 45;
  const marks = [];
  for (const z of reg.zones) {
    const g = proj(ZONE_GEO[z]);
    const p = ZONE_POS[z];
    const moved = Math.hypot(g[0] - p[0], g[1] - p[1]) > 0.3;
    if (moved) marks.push(`<line x1="${g[0]}" y1="${g[1]}" x2="${p[0]}" y2="${p[1]}" class="shift" />`);
    marks.push(`<circle cx="${g[0]}" cy="${g[1]}" r="${r * 0.8}" class="real"><title>Guardada: ${f2(ZONE_GEO[z][0])}, ${f2(ZONE_GEO[z][1])}</title></circle>`);
    marks.push(`<circle cx="${p[0]}" cy="${p[1]}" r="${r}" class="zone" style="--c:${COLORS[reg.id]}" />`);
    marks.push(`<text x="${p[0] + r * 1.6}" y="${p[1] + fs_ * 0.35}" class="zlab" font-size="${fs_}">${esc(ZONES_BY_ID[z].name)}</text>`);
  }
  const [ax, ay] = AIRSTRIP[reg.id];
  marks.push(plane(ax, ay, r * 2.4, 'strip'));
  marks.push(`<text x="${ax + r * 2.2}" y="${ay + fs_ * 1.2}" class="alab" font-size="${fs_ * 0.85}">pista (se dibuja aquí)</text>`);
  const [rx, ry] = proj(real);
  const [gx, gy] = AIRSTRIP[reg.id];
  if (Math.hypot(rx - gx, ry - gy) > 0.3) marks.push(`<line x1="${rx}" y1="${ry}" x2="${gx}" y2="${gy}" class="shift air" />`);
  marks.push(plane(rx, ry, r * 2.4, 'realstrip'));
  marks.push(`<text x="${rx + r * 2.2}" y="${ry + fs_ * 1.2}" class="alab real" font-size="${fs_ * 0.85}">${esc(AIRPORT_NAME[reg.id])}</text>`);
  return `<svg viewBox="${view.x} ${view.y} ${view.w} ${view.h}" role="img" aria-label="${esc(reg.name)}">${depts(view, reg.id)}${grid(view, step, labelEvery)}${marks.join('')}</svg>`;
}

// --- Tablas ---
const zoneRows = [];
for (const reg of REGIONS) {
  for (const z of reg.zones) {
    const g = ZONE_GEO[z];
    const shown = unproj(ZONE_POS[z]);
    const d = km(g, shown);
    zoneRows.push(`<tr><td><span class="sw" style="--c:${COLORS[reg.id]}"></span>${esc(reg.name)}</td><td>${esc(ZONES_BY_ID[z].name)}<div class="id">${z}</div></td><td>${esc(PLACE[z])}</td><td class="num">${f2(g[0])}, ${f2(g[1])}</td><td class="num">${d < 1 ? '<span class="same">igual</span>' : `${f2(shown[0])}, ${f2(shown[1])}`}</td><td class="num">${d < 1 ? '–' : `${Math.round(d)} km`}</td></tr>`);
  }
}
const airRows = REGIONS.map((reg) => {
  const a = unproj(AIRSTRIP[reg.id]);
  const real = AIRPORT_GEO[reg.id];
  const d = km(a, real);
  return `<tr><td><span class="sw" style="--c:${COLORS[reg.id]}"></span>${esc(reg.name)}</td><td>${esc(AIRPORT_NAME[reg.id])}</td><td class="num">${f2(real[0])}, ${f2(real[1])}</td><td class="num">${d < 1 ? '<span class="same">igual</span>' : `${f2(a[0])}, ${f2(a[1])}`}</td><td class="num">${d < 1 ? '–' : `${Math.round(d)} km`}</td></tr>`;
}).join('');

const sections = REGIONS.map((reg) => `<section class="region" id="r-${reg.id}"><h3><span class="sw" style="--c:${COLORS[reg.id]}"></span>${esc(reg.name)}</h3><div class="mapbox">${svgRegion(reg)}</div></section>`).join('');
const nav = REGIONS.map((reg) => `<a href="#r-${reg.id}"><span class="sw" style="--c:${COLORS[reg.id]}"></span>${esc(reg.name)}</a>`).join('');

const tpl = fs.readFileSync(new URL('./map-coords.html', import.meta.url), 'utf8');
fs.writeFileSync(OUT, HEAD + tpl.replace('%COUNTRY%', svgCountry()).replace('%NAV%', nav).replace('%REGIONS%', sections).replace('%ZONES%', zoneRows.join('')).replace('%AIR%', airRows).replace('%VERSION%', pkg.version));
console.log('ok', OUT);
