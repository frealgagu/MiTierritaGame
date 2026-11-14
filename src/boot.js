// Boot sequence (v3.68): load the language first (its strings are applied onto data before the game uses it),
// then start the game.
import { chooseLang, loadLang, translateDom } from './i18n/index.js';

(async () => {
  try {
    await loadLang(chooseLang());
    translateDom(document.body);
  } catch (err) {
    console.error(err); // if the language fails to load, the game falls back to Spanish
  }
  await import('./main.js');
})();
