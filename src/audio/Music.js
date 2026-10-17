// Música de fondo: «Apple Cider», de Zane Little (CC0, dominio público, OpenGameArt). Suena en bucle y
// bajito; como el navegador no deja sonar nada antes de un toque, arranca con el primer toque.
const SRC = 'music/finca.mp3';
const VOLUME = 0.3;
const FADE_S = 2.5;

export class Music {
  constructor(enabled) {
    this.enabled = enabled;
    this.audio = null;
    this.fade = null;
    const start = () => {
      window.removeEventListener('pointerdown', start);
      this.started = true;
      if (this.enabled) this.play();
    };
    window.addEventListener('pointerdown', start);
    // En segundo plano (otra pestaña, el móvil bloqueado) se pausa.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.audio?.pause();
      else if (this.enabled && this.started) this.play();
    });
  }

  play() {
    if (!this.audio) {
      this.audio = new Audio(SRC);
      this.audio.loop = true;
      this.audio.volume = 0;
    }
    this.audio.play().catch(() => {});
    this.fadeTo(VOLUME);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.started) return;
    if (on) this.play();
    else this.fadeTo(0, () => this.audio?.pause());
  }

  // Sube o baja el volumen poco a poco. Va por el tiempo transcurrido, no por pasos: el navegador
  // puede espaciar los temporizadores y la transición dura lo mismo.
  fadeTo(target, done) {
    clearInterval(this.fade);
    const audio = this.audio;
    if (!audio) return;
    const from = audio.volume;
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / (FADE_S * 1000));
      audio.volume = from + (target - from) * k;
      if (k < 1) return;
      clearInterval(this.fade);
      done?.();
    };
    this.fade = setInterval(tick, 50);
    tick();
  }
}
