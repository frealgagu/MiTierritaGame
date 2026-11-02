// facts en français (voir src/i18n/apply.js) : les anecdotes de chaque station. En trois parties.
import part1 from './parts/facts1.js';
import part2 from './parts/facts2.js';
import part3 from './parts/facts3.js';
import part4 from './parts/facts4.js';

export default { ...part1, ...part2, ...part3, ...part4 };
