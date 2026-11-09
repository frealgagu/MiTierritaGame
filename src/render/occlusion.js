// Orden de pintado de lo que se mueve (v4.5.1): chivas, tractomulas, Willys, mulas, gente, animales y lo de los
// eventos. Lo de más abajo en el mapa (más cerca de quien mira) se pinta de último, pero contra cada estación y la
// bodega no basta un punto: se mira su huella entera. Si lo que se mueve ya pasó el borde de adelante de la huella en
// cualquiera de los dos ejes (gx ≥ x + w o gy ≥ y + h), va delante de ella; si no, detrás. Así una chiva que pasa
// por detrás de la bodega no se pinta sobre la teja, y una estación de adelante no la «atraviesa».
// (Hasta la v4.5.0 las chivas y las tractomulas iban siempre encima de todo.)
import { depth } from './iso.js';

let blockers = null; // () => las vistas con huella (`foot`) de la escena que se ve
export const setBlockers = (fn) => (blockers = fn);

// Solo cuentan las huellas que se cruzan en pantalla con lo que se mueve: de lado (gx − gy, con media casilla y algo
// de ancho para una tractomula) y de alto (gx + gy: un edificio alto tapa hasta unas seis casillas detrás de él).
const HALF_WIDTH = 0.8;
const TALL = 6;
export function overlaps(f, gx, gy) {
  const sx = gx - gy;
  if (sx + HALF_WIDTH < f.x - (f.y + f.h) || sx - HALF_WIDTH > f.x + f.w - f.y) return false;
  const d = gx + gy;
  return d >= f.x + f.y - TALL && d <= f.x + f.w + f.y + f.h + 1;
}

// Profundidad para algo en (gx, gy); `bias` lo adelanta un poco entre cosas del mismo punto.
export function moverDepth(gx, gy, bias = 0) {
  const base = depth(gx, gy) + bias;
  const views = blockers?.();
  if (!views) return base;
  let lo = -Infinity;
  let hi = Infinity;
  for (const v of views) {
    const f = v?.foot;
    if (!f || v.visible === false) continue;
    const x1 = f.x + f.w;
    const y1 = f.y + f.h;
    if (!overlaps(f, gx, gy)) continue;
    if (gx >= x1 || gy >= y1) lo = Math.max(lo, v.zIndex + 0.05);
    else hi = Math.min(hi, v.zIndex - 0.05);
  }
  // Si dos huellas piden cosas contrarias (rarísimo), gana quedar tapado: es lo que se nota menos.
  return Math.min(Math.max(base, lo), hi);
}

// El orden entre las estaciones (v4.5.1): cada una empieza en la profundidad de su esquina de adelante, pero una huella
// grande (el Tostadero, de 6×6) podía quedar después de una más chica que está delante de ella. Si una está toda detrás
// de otra (a la izquierda o arriba en la cuadrícula) y se cruzan en pantalla, se baja hasta quedar antes.
const GAP = 0.2;
const apart = (a, b) => a.x + a.w <= b.x || a.y + a.h <= b.y;
// En diagonal (una arriba a la derecha de la otra) cada una queda «detrás» por un eje: ahí no hay orden que cuidar.
const behind = (a, b) => apart(a, b) && !apart(b, a);
const crossOnScreen = (a, b) => {
  const ax = [a.x - (a.y + a.h), a.x + a.w - a.y];
  const bx = [b.x - (b.y + b.h), b.x + b.w - b.y];
  // (Con el ancho de lo que se mueve: si algo puede quedar entre las dos, también cuentan.)
  return ax[0] < bx[1] + 2 * HALF_WIDTH && bx[0] < ax[1] + 2 * HALF_WIDTH && b.x + b.y - TALL <= a.x + a.w + a.y + a.h;
};
export function orderFootprints(views) {
  const list = views.filter((v) => v?.foot);
  for (const v of list) v.zIndex = depth(v.foot.x + v.foot.w, v.foot.y + v.foot.h) - 0.5;
  for (let pass = 0; pass < list.length; pass++) {
    let changed = false;
    for (const a of list) {
      for (const b of list) {
        if (a === b || !behind(a.foot, b.foot) || !crossOnScreen(a.foot, b.foot)) continue;
        if (a.zIndex > b.zIndex - GAP) {
          a.zIndex = b.zIndex - GAP;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}
