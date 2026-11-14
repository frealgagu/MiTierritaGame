// Android app (Capacitor, see capacitor.config.json): runs the same game inside a WebView.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { t } from './i18n/index.js';

export const isNativeApp = () => Capacitor.isNativePlatform();

//   closeTop: closes the topmost open modal or panel and returns whether one was open
//   onHide / onShow: app moves to background (save) or returns to foreground (catch up offline progress)
export function bindNative({ closeTop, onHide, onShow }) {
  document.getElementById('save-where').textContent = t('Tu partida se guarda sola en este teléfono.');
  // Back button closes whatever is open; if nothing is open, sends the app to the background (like a game,
  // without closing it or losing active production).
  App.addListener('backButton', () => {
    if (!closeTop()) App.minimizeApp();
  });
  // Save when leaving the app (Android can kill backgrounded apps without warning).
  App.addListener('pause', onHide);
  App.addListener('resume', onShow);
}
