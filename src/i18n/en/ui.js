// La interfaz en inglés (v3.68): la frase en español → en inglés. Las variables van entre llaves: {n}.
//   ui/html.js: la página (index.html)   ui/code.js: lo que arma el código (t('…'))
import html from './ui/html.js';
import code from './ui/code.js';

export default { ...html, ...code };
