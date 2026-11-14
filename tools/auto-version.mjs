// Automatic version bump for the publish workflow (.github/workflows/pages.yml).
//   node tools/auto-version.mjs <published version>
// When package.json still has the version that is already published (a commit that did not bump it, e.g. one made
// from AI Studio), bumps the patch number in package.json and package-lock.json and adds a CHANGELOG entry, so the
// web, the APK update check and Google Play all see a new version. A version that was already bumped by hand (with its
// own CHANGELOG notes) is left as is. Prints the new version, or nothing when there was nothing to do.
import { readFileSync, writeFileSync } from 'node:fs';
import { isNewer } from './release-notes.js';

const root = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const write = (f, s) => writeFileSync(new URL(f, root), s);

const published = (process.argv[2] ?? '').trim();
const pkg = JSON.parse(read('package.json'));
const current = pkg.version;

// Nothing published yet (or the site could not be read), or this commit already carries a newer version.
if (!/^\d+\.\d+\.\d+$/.test(published) || isNewer(current, published)) process.exit(0);

// The versionCode has five digits, major·10,000 + minor·100 + patch (android/app/build.gradle), so the patch stops at
// 99: after x.y.99 comes x.(y+1).0.
const [major, minor, patch] = published.split('.').map(Number);
const next = patch < 99 ? `${major}.${minor}.${patch + 1}` : `${major}.${minor + 1}.0`;

write('package.json', read('package.json').replace(/"version": "[^"]+"/, `"version": "${next}"`));
const lock = JSON.parse(read('package-lock.json'));
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

// The release notes shown in the app come from the first CHANGELOG entry (tools/release-notes.js): a title and at
// least one item. The text is in Spanish, like the rest of the CHANGELOG.
const changelog = read('CHANGELOG.md');
const entry = `## v${next} — Ajustes\n- Ajustes y mejoras.\n\n`;
const at = changelog.indexOf('## v');
write('CHANGELOG.md', at < 0 ? `${changelog}\n${entry}` : changelog.slice(0, at) + entry + changelog.slice(at));

console.log(next);
