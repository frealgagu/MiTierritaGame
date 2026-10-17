// Utilidades para caminos definidos como lista de puntos [gx, gy].

export function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return len;
}

// Punto a una fracción t (0..1) del recorrido. Devuelve también la dirección del tramo.
export function pointAt(points, t) {
  const total = pathLength(points);
  let target = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (target <= seg || i === points.length - 1) {
      const f = seg === 0 ? 0 : Math.min(target / seg, 1);
      return { gx: ax + (bx - ax) * f, gy: ay + (by - ay) * f, dx: bx - ax, dy: by - ay };
    }
    target -= seg;
  }
  const [x, y] = points[points.length - 1];
  return { gx: x, gy: y, dx: 0, dy: 0 };
}

// Punto a una distancia `s` (en casillas) desde el inicio del recorrido.
export function pointAtDistance(points, s) {
  const total = pathLength(points);
  return pointAt(points, total === 0 ? 0 : s / total);
}

// Distancia desde el inicio del recorrido hasta el punto del camino más cercano a (x, y).
export function projectOnPath(points, x, y) {
  let best = Infinity;
  let bestS = 0;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const dx = bx - ax;
    const dy = by - ay;
    const seg = Math.hypot(dx, dy);
    const f = seg === 0 ? 0 : Math.min(Math.max(((x - ax) * dx + (y - ay) * dy) / (seg * seg), 0), 1);
    const d = Math.hypot(ax + dx * f - x, ay + dy * f - y);
    if (d < best) {
      best = d;
      bestS = acc + seg * f;
    }
    acc += seg;
  }
  return bestS;
}
