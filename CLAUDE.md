# Instructions for Claude

- **Publish every change.** A `git push` to `main` immediately publishes the web, the APK and the AAB (see `.github/workflows/pages.yml`). Every time a version is published, give the owner:
  - the AAB download link: https://frealgagu.github.io/MiTierritaGame/mitierrita.aab (once the workflow finishes and the site serves the new version);
  - the Play Console release notes in `<en-US>`, `<es-419>`, `<pt-BR>` and `<fr-FR>` (500 characters max each).
- Reply to the owner in Spanish.
- Everything in the repository is in English: code comments, documentation, test names, tools and commit messages (ending with the session's attribution lines). The only exceptions are player-facing texts in each language (below).
- Work directly on `main` (no `development` branch): run all the tests before each push. Before starting, pull `main` (AI Studio and the workflow bot also push commits).
- Game texts are written in Spanish in the source (they are the i18n keys) and translated in `src/i18n/{en,pt,fr}`.
- Release notes: one CHANGELOG per language, with the same versions in the same order: `CHANGELOG.md` (English), `CHANGELOG.es.md`, `CHANGELOG.pt.md` and `CHANGELOG.fr.md`. The app shows the ones in the player's language.
- Versions: when a commit arrives without bumping the version, the publish workflow bumps only the patch (and adds a "Tweaks" entry to every CHANGELOG) and makes a commit on `main`; so pull `main` after each push. A version with new features is bumped by hand in `package.json`, with its entry in every CHANGELOG. The Android versionCode is major·10,000 + minor·100 + patch (5 digits).
- Privacy policy: `public/privacidad.html` (Spanish, the URL registered in Play Console), `privacy.html` (English), `privacidade.html` (Portuguese) and `confidentialite.html` (French). Keep all four in step.
