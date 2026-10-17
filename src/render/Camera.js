// Cámara: arrastrar para mover, rueda o pellizco para zoom.
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.2;
const DRAG_THRESHOLD = 6; // px antes de considerar que es arrastre y no toque

export class Camera {
  constructor(world, canvas, bounds) {
    this.world = world;
    this.canvas = canvas;
    this.bounds = bounds; // { minX, maxX, minY, maxY } del mundo en px
    this.zoom = 1;
    this.x = 0; // centro de la vista en coordenadas del mundo
    this.y = 0;
    this.viewW = canvas.clientWidth;
    this.viewH = canvas.clientHeight;
    this.pointers = new Map();
    this.dragged = false;
    this.bind();
  }

  get offsetX() {
    return -this.x * this.zoom;
  }

  get offsetY() {
    return -this.y * this.zoom;
  }

  resize(w, h) {
    this.viewW = w;
    this.viewH = h;
    this.apply();
  }

  // Encuadra un rectángulo del mundo dejando espacio arriba para la barra superior.
  fit(rect = this.bounds, topPad = 90) {
    const zx = this.viewW / (rect.maxX - rect.minX);
    const zy = (this.viewH - topPad) / (rect.maxY - rect.minY);
    this.zoom = clamp(Math.min(zx, zy), MIN_ZOOM, 1.3);
    this.x = (rect.minX + rect.maxX) / 2;
    this.y = (rect.minY + rect.maxY) / 2 - topPad / 2 / this.zoom;
    this.apply();
  }

  centerOn(x, y) {
    this.x = x;
    this.y = y;
    this.apply();
  }

  apply() {
    const b = this.bounds;
    this.x = clamp(this.x, b.minX, b.maxX);
    this.y = clamp(this.y, b.minY, b.maxY);
    this.world.scale.set(this.zoom);
    this.world.position.set(this.viewW / 2 - this.x * this.zoom, this.viewH / 2 - this.y * this.zoom);
  }

  zoomAt(factor, sx, sy) {
    const before = this.toWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.apply();
    const after = this.toWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.apply();
  }

  toWorld(sx, sy) {
    return { x: (sx - this.world.position.x) / this.zoom, y: (sy - this.world.position.y) / this.zoom };
  }

  // Suelta los eventos del canvas (al cambiar de zona se crea otra cámara).
  destroy() {
    for (const [type, fn, opts] of this.listeners) this.canvas.removeEventListener(type, fn, opts);
    this.listeners = [];
  }

  bind() {
    const c = this.canvas;
    this.listeners = [];
    const listen = (type, fn, opts) => {
      c.addEventListener(type, fn, opts);
      this.listeners.push([type, fn, opts]);
    };
    listen('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (this.pointers.size === 1) this.dragged = false;
    });
    listen('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX;
        p.y = e.clientY;
        const after = Math.hypot(a.x - b.x, a.y - b.y);
        if (before > 0) this.zoomAt(after / before, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.dragged = true;
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > DRAG_THRESHOLD) this.dragged = true;
      if (!this.dragged) return;
      this.x -= dx / this.zoom;
      this.y -= dy / this.zoom;
      this.apply();
    });
    const up = (e) => this.pointers.delete(e.pointerId);
    listen('pointerup', up);
    listen('pointercancel', up);
    listen(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        this.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
      },
      { passive: false },
    );
  }
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
