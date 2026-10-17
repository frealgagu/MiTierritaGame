// Sonidos sintetizados con Web Audio (sin archivos). El navegador solo deja sonar tras un toque.
const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392 };

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastPlayed = {};
    // El contexto de audio se crea con el primer toque del jugador.
    const unlock = () => {
      this.ensure();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setEnabled(on) {
    this.enabled = on;
  }

  // Una nota con ataque y caída cortos.
  tone(freq, start, duration, { type = 'sine', gain = 0.5, slide = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + duration);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // No repite el mismo sonido más seguido que `gap` segundos.
  ready(name, gap) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < gap) return false;
    this.lastPlayed[name] = now;
    return true;
  }

  click() {
    if (!this.ready('click', 0.05)) return;
    this.tone(880, 0, 0.06, { type: 'triangle', gain: 0.25, slide: 0.6 });
  }

  coin() {
    if (!this.ready('coin', 0.25)) return;
    this.tone(NOTES.E6, 0, 0.08, { type: 'square', gain: 0.12 });
    this.tone(NOTES.G5 * 2, 0.07, 0.18, { type: 'square', gain: 0.12 });
  }

  levelUp() {
    if (!this.ready('level', 0.1)) return;
    [NOTES.C5, NOTES.E5, NOTES.G5].forEach((f, i) => this.tone(f, i * 0.06, 0.16, { type: 'triangle', gain: 0.35 }));
  }

  milestone() {
    if (!this.ready('milestone', 0.5)) return;
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6].forEach((f, i) => this.tone(f, i * 0.08, 0.3, { type: 'triangle', gain: 0.4 }));
  }

  build() {
    if (!this.ready('build', 0.5)) return;
    // Tres golpes de martillo y un acorde.
    for (let i = 0; i < 3; i++) this.tone(180, i * 0.12, 0.08, { type: 'square', gain: 0.2, slide: 0.5 });
    [NOTES.G4, NOTES.C5, NOTES.E5, NOTES.G5].forEach((f) => this.tone(f, 0.4, 0.6, { type: 'triangle', gain: 0.22 }));
  }

  // Trino de pájaro (ambiente de día).
  chirp() {
    if (!this.ready('chirp', 3)) return;
    const base = 2200 + Math.random() * 1200;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone(base, i * 0.09, 0.07, { gain: 0.05, slide: 1.4 });
  }

  // Grillo (ambiente de noche).
  cricket() {
    if (!this.ready('cricket', 1.5)) return;
    for (let i = 0; i < 4; i++) this.tone(4200, i * 0.05, 0.03, { type: 'square', gain: 0.015 });
  }
}
