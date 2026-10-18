// App de Android (Capacitor, ver capacitor.config.json): el mismo juego dentro de un WebView.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const isNativeApp = () => Capacitor.isNativePlatform();

//   closeTop: cierra la ventana o el panel abierto y dice si había alguno
//   onHide / onShow: la app pasa a segundo plano (se guarda) o vuelve (se suma lo producido fuera)
export function bindNative({ closeTop, onHide, onShow }) {
  document.getElementById('save-where').textContent = 'Tu partida se guarda sola en este teléfono.';
  // «Atrás» cierra lo que esté abierto; si no hay nada, la app pasa a segundo plano (como en un juego,
  // sin cerrarse ni perder lo que esté produciendo).
  App.addListener('backButton', () => {
    if (!closeTop()) App.minimizeApp();
  });
  // Al salir de la app se guarda (Android puede cerrarla sin avisar estando en segundo plano).
  App.addListener('pause', onHide);
  App.addListener('resume', onShow);
}
