// Pantalla de inicio: la idea del juego, cómo se juega y el objetivo. Sale cada vez que se abre el
// juego, salvo que se marque «No mostrar de nuevo» (se guarda con la partida); el menú ⚙️ la vuelve a abrir.
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
  // La casilla vale aunque se cierre con Esc o con «atrás».
  hide.onchange = () => (state.settings.hideIntro = hide.checked);
  modal.hidden = false;
}

export const introOnStart = (state) => !state.settings.hideIntro;
