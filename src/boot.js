// Arranque (v3.68): primero el idioma (sus textos se ponen sobre los datos antes de que el juego los use),
// luego el juego.
import { chooseLang, loadLang, translateDom } from './i18n/index.js';

(async () => {
  try {
    await loadLang(chooseLang());
    translateDom(document.body);
    document.title = document.querySelector('title')?.textContent ?? document.title;
  } catch (err) {
    console.error(err); // si el idioma no carga, el juego sale en español
  }
  await import('./main.js');
})();
