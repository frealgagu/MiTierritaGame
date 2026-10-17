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
