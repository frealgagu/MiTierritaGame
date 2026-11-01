// L’article en français (v3.70) : «le Dépulpeur», «la Fromagerie», «l’Écrémeuse», «les Tisserandes».
// Par la fin du premier mot ; les quelques exceptions vont dans les listes.
const MASC = new Set(['budare', 'kiosque', 'grill', 'café', 'quai', 'ranch']);
const FEM = new Set(['maison', 'saison', 'mangrove']);
const SINGULAR_S = new Set(['enclos', 'relais', 'bras', 'pays']);
const H_ASPIRE = new Set(['halle', 'hangar']);

export function frArticle(name) {
  if (/^(le|la|les) /i.test(name) || /^l[’']/i.test(name)) return name.replace(/^(Le|La|Les|L)(?=[ ’'])/, (a) => a.toLowerCase());
  const w = name.split(' ')[0].toLowerCase();
  const head = w.split('-')[0];
  if (/[sx]$/.test(w) && !SINGULAR_S.has(w)) return `les ${name}`;
  const fem = !MASC.has(head) && (FEM.has(head) || (/e$/.test(head) && !/age$/.test(head)) || /a$/.test(head));
  if (/^[aeiouyàâäéèêëîïôöûùü]/.test(head) || (head.startsWith('h') && !H_ASPIRE.has(head))) return `l’${name}`;
  return `${fem ? 'la' : 'le'} ${name}`;
}
