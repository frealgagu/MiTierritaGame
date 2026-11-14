// One CHANGELOG per game language (v5.6): English in CHANGELOG.md, the others in CHANGELOG.<lang>.md. Every file
// lists the same versions in the same order.
export const CHANGELOGS = { en: 'CHANGELOG.md', es: 'CHANGELOG.es.md', pt: 'CHANGELOG.pt.md', fr: 'CHANGELOG.fr.md' };

// Release notes for recent versions, extracted from a CHANGELOG (v3.6.1): used by vite.config.js to
// publish version.json, which the Android app fetches on startup to notify about new versions.
//   [{ version: '3.6.0', title: 'Santander events', items: ['Six new events…', …] }, …]
// Only top-level bullets per version (not nested ones), without bold or code formatting.
export function releaseNotes(changelog, max = 5) {
  const out = [];
  for (const block of changelog.split(/^## /m).slice(1)) {
    const [head, ...lines] = block.split('\n');
    const m = head.match(/^v(\d+\.\d+\.\d+)\s*[—-]\s*(.*)$/);
    if (!m) continue;
    const clean = (s) => s.replace(/\*\*|`/g, '').trim();
    const items = lines.filter((l) => l.startsWith('- ')).map((l) => clean(l.slice(2)));
    out.push({ version: m[1], title: clean(m[2]), items });
    if (out.length >= max) break;
  }
  return out;
}

// Is `a` newer than `b`? ('3.10.0' > '3.9.2')
export function isNewer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}
