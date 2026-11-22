// Lo que arma el código en inglés (t('…')), en tres partes. Lo que falta se lista con:
//   node tools/i18n-code.mjs en
import part1 from './code1.js';
import part2 from './code2.js';
import part3 from './code3.js';
import editor from './editor.js';
import fiestas from './fiestas.js';

export default { ...part1, ...part2, ...part3, ...editor, ...fiestas };
