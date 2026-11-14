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

  // If one listener throws (e.g. a map visual effect), still notify the rest and let the emitter continue:
  // an already-charged purchase must never be left half-applied by a UI glitch.
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
