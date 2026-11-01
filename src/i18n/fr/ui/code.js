// Ce que monte le code en français (t('…')), en trois parties. Lo que falta se lista con:
//   node tools/i18n-code.mjs fr
import part1 from './code1.js';
import part2 from './code2.js';
import part3 from './code3.js';

export default { ...part1, ...part2, ...part3 };
