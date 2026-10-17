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

  emit(type, payload) {
    if (this.muted) return;
    for (const fn of this.handlers.get(type) ?? []) fn(payload);
  }
}
