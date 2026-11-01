// O artigo em português (v3.69): «o Despolpador», «a Queijaria», «os Cochos de fermentação», «as Tecelãs».
// Pelo fim da primeira palavra; as poucas que fogem da regra vão na lista.
const FEM = new Set(['árvores', 'provisões', 'ponte', 'pontes']);

export function ptArticle(name) {
  if (/^(o|a|os|as) /i.test(name)) return name.replace(/^(O|A|Os|As) /, (a) => a.toLowerCase());
  const w = name.split(' ')[0].toLowerCase();
  const plural = /s$/.test(w) && !/(ís|ês|is)$/.test(w);
  const fem = FEM.has(w) || /(a|ã|ção|são|dade|agem)s?$/.test(w);
  return `${fem ? 'a' : 'o'}${plural ? 's' : ''} ${name}`;
}
