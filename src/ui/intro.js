// Intro screen: game premise, how to play, and goal. Shows on every
// launch unless «Don't show again» is checked (saved with progress); ⚙️ menu reopens it.
export function showIntro(state, onClose) {
  const modal = document.getElementById('intro');
  const hide = document.getElementById('intro-hide');
  hide.checked = Boolean(state.settings.hideIntro);
  document.querySelector('#intro .intro-body').scrollTop = 0;
  const close = () => {
    state.settings.hideIntro = hide.checked;
    modal.hidden = true;
    onClose?.();
  };
  document.getElementById('intro-ok').onclick = close;
  document.getElementById('intro-close').onclick = close;
  // Checkbox persists even when closed with Esc or «back».
  hide.onchange = () => (state.settings.hideIntro = hide.checked);
  modal.hidden = false;
}

export const introOnStart = (state) => !state.settings.hideIntro;
