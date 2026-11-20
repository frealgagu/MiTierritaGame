// The grand finale's window (v5.16), opened by its side button: in the style of a region's second ending, it says
// how many achievements are left and holds the button that plays the finale, disabled until they are all complete.
//   const info = new FinaleInfo(() => profile, onFinale);  info.open();  info.update() while the game runs
import { t } from '../i18n/index.js';
import { finaleProgress } from '../sim/finale.js';

export class FinaleInfo {
  constructor(getProfile, onFinale) {
    this.getProfile = getProfile;
    this.modal = document.getElementById('finale-info');
    this.text = document.getElementById('finale-info-text');
    this.bar = document.getElementById('finale-info-bar');
    this.go = document.getElementById('finale-info-go');
    this.go.textContent = t('🎉 Ver el gran final');
    const ok = document.getElementById('finale-info-ok');
    ok.textContent = t('Cerrar');
    ok.addEventListener('click', () => (this.modal.hidden = true));
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.modal.hidden = true;
    });
    this.go.addEventListener('click', () => {
      this.modal.hidden = true;
      onFinale();
    });
  }

  open() {
    this.render();
    this.modal.hidden = false;
  }

  // While open it follows the game: the last achievement changes the message and enables the button.
  update() {
    if (!this.modal.hidden) this.render();
  }

  render() {
    const { have, total, ready } = finaleProgress(this.getProfile());
    const text = ready
      ? t('🎉 ¡Tienes todos los logros! El gran final te espera.')
      : t('🎉 Aún falta el gran final: se abre cuando tengas todos los logros de todas las regiones ({have} de {total}).', { have, total });
    if (this.text.textContent !== text) this.text.textContent = text;
    this.bar.style.width = `${total ? (100 * have) / total : 0}%`;
    this.go.disabled = !ready;
  }
}
