export class EventBus {
  constructor() {
    this.handlers = new Map();
    this.muted = false;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type).delete(fn);
  }

  // Si un oyente falla (un efecto del mapa, por ejemplo), los demás se avisan igual y quien emitió
  // sigue: una compra ya cobrada no puede quedar a medias por un efecto visual.
  emit(type, payload) {
    if (this.muted) return;
    for (const fn of this.handlers.get(type) ?? []) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`Error en el evento «${type}»:`, err);
      }
    }
  }
}
