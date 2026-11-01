// A interface em português do Brasil (v3.69): a frase em espanhol → em português. As variáveis vão entre
// chaves: {n}.   ui/html.js: a página (index.html)   ui/code.js: o que o código monta (t('…'))
import html from './ui/html.js';
import code from './ui/code.js';

export default { ...html, ...code };
