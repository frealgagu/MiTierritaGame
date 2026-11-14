// Moving sprite draw sorting (v4.5.1): chivas, tractomulas, Willys, mules, people, animals,
// and event props. Lower-screen sprites sort later, though buildings and warehouse require
// full footprint bounds rather than a single point. If sprite passed a footprint's front
// edge on either axis (gx ≥ x + w or gy ≥ y + h) it draws in front; else behind. Keeps
// passing chivas behind warehouse roofs and foreground stations from clipping vehicles.
// (Until v4.5.0 chivas and tractomulas always drew on top of everything.)
import { depth } from './iso.js';

let blockers = null; // () => active scene views with footprint (`foot`)
export const setBlockers = (fn) => (blockers = fn);

// Only footprints overlapping sprite on screen matter: horizontally (gx − gy, with half-tile
// plus width margin for tractomulas) and vertically (gx + gy: tall roof covers ~6 tiles behind).
const HALF_WIDTH = 0.8;
const TALL = 6;
export function overlaps(f, gx, gy) {
  const sx = gx - gy;
  if (sx + HALF_WIDTH < f.x - (f.y + f.h) || sx - HALF_WIDTH > f.x + f.w - f.y) return false;
  const d = gx + gy;
  return d >= f.x + f.y - TALL && d <= f.x + f.w + f.y + f.h + 1;
}

// Depth key for sprite at (gx, gy); `bias` orders layers sharing the same spot.
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
  // On rare contradictory footprint constraints, prefer tucked behind (least noticeable).
  return Math.min(Math.max(base, lo), hi);
}

// Inter-station sorting (v4.5.1): each starts at front-corner depth, though large footprints
// (6×6 Tostadero) could sort after smaller foreground stations. Whenever station A lies
// wholly behind B (left or above on grid) and screen-overlaps, drop A before B.
const GAP = 0.2;
const apart = (a, b) => a.x + a.w <= b.x || a.y + a.h <= b.y;
// Diagonally offset stations (one upper-right of other) each sit behind on one axis: unconstrained.
const behind = (a, b) => apart(a, b) && !apart(b, a);
const crossOnScreen = (a, b) => {
  const ax = [a.x - (a.y + a.h), a.x + a.w - a.y];
  const bx = [b.x - (b.y + b.h), b.x + b.w - b.y];
  // (Including sprite width: if something passes between both, sort order matters too.)
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
