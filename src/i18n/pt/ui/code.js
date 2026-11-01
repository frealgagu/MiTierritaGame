// O que o código monta em português (t('…')), em três partes. O que falta se lista com:
//   node tools/i18n-code.mjs pt
import part1 from './code1.js';
import part2 from './code2.js';
import part3 from './code3.js';

export default { ...part1, ...part2, ...part3 };
