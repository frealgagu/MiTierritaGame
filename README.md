# Encantos de Mi Tierrita

An educational supply-chain idle game set in Colombia: produce, transport, and discover the charms of every region — from Eje Cafetero coffee to Amazonian asaí, Tolima lechona, Sabana roses, and Bogotá's city-wide network. In each zone, an unlimited but slow source feeds a chain of upgradeable stations, and zones supply one another along routes. Written in JavaScript (Vite + PixiJS) and packaged as an Android app with Capacitor.

The full design document is in [`docs/GDD.md`](docs/GDD.md).

## Play Online

Live build: **https://frealgagu.github.io/MiTierritaGame/** (automatically deployed on every push via `.github/workflows/pages.yml`).

## Run Locally

```bash
npm install
npm run dev           # starts Vite dev server on http://localhost:3000
npm test              # runs the Node.js simulation & UI test suite
npm run balance       # simulates a full playthrough (e.g. npm run balance -- 6 casual)
npm run build         # builds production bundle into dist/
npm run build:artifact
```

## Current State: v4.7.4 — 10 Regions, 55 Zones

The game covers **10 Colombian regions**, **55 playable zones**, **360 stations**, **373 products**, **129 routes** (including **27 unlimited tractomulas**), **633 research upgrades**, **61 events**, **60 album pages (360 custom stickers)**, and **151 achievements**. All unlocked regions produce simultaneously, even offline (`npm run balance` simulates full runs). Full release history is in [`CHANGELOG.md`](CHANGELOG.md).

### Regions & Progression
1. **Eje Cafetero** (Zones 1–6): **La Finca** (coffee + optional compost branch), **El Trapiche** (*panela* + bagasse fuel), **La Lechería** (milk branching into cheese, butter, and *arequipe* with *panela* from El Trapiche), **El Cacaotal** (table chocolate and milk chocolate), **El Maizal** (corn and *arepas de queso*), and **Salento** (receives final products from the other five zones up to *Export Containers*).
2. **Santander** (Zones 7–12, unlocks after Salento): **La Guayabera** (*bocadillo veleño* around Vélez's plaza), **El Tabacal** (cured and hand-rolled tobacco), **La Fiquera** (fique sacks, *alpargatas*, and tobacco bundles), **El Hato** (*carne oreada*, lunches, and *fiambres*), **Las Hormigas** (*hormiga culona*, harvested only during the rainy onset with a large pantry), and **Barichara** (Camino Real excursions to Guane).
3. **La Costa** (Zones 13–18, unlocks after Barichara): **El Arrozal**, **El Cocal** (coconut milk & *cocadas*), **La Ciénaga** (salted fish, fried fish with *patacón*, and fish in coconut), **La Quesera** (*queso costeño*, *mote de queso*, and *bandeja costeña*), **El Sombrero** (*sombrero vueltiao*), and **Cartagena** (walled city by the Caribbean Sea with boat tours to the Rosario Islands).
4. **Boyacá** (Zones 19–24, unlocks after Cartagena): **El Papal** (*papitas criollas*), **La Cervecería** (barley to bottled beer, plus spent grain for Paipa), **Ráquira** (clay pots, painted planters, and clay beer mugs), **Paipa** (Paipa cheese and *almojábanas*), **Las Ruanas** (sheep wool and Nobsa *ruanas*), and **Villa de Leyva** (El Fósil excursions).
5. **Los Llanos** (Zones 25–30, unlocks after Villa de Leyva): **La Palma** (palm oil and palm kernel), **El Frutal** (passion fruit juice), **La Cachamera** (*pisillo*, smoked *cachama*, and *cachama* in passion fruit sauce), **El Hato llanero** (*mamona* / *carne a la llanera*), **La Talabartería** (tooled leather saddles), and **Villavicencio** (Caño Cristales excursions).
6. **Costa Pacífica** (Zones 31–36, unlocks after Villavicencio): **El Platanal** (*patacones*), **La Azotea** (*hierbas de azotea* seasoning), **La Bahía** (red snapper: dried, smoked, and *tapao*), **El Manglar** (*piangua* rice and seafood casserole), **El Werregue** (Wounaan woven jars), and **Buenaventura** (humpback whale-watching boats).
7. **Amazonas** (Zones 37–42, unlocks after Buenaventura): **El Asaizal** (*asaí*), **El Ajizal** (*ají negro* cooked in *tucupí*), **El Lago** (*pirarucú*: salted, smoked in *moquén*, and with *ají negro*), **La Casabería** (bitter cassava *casabe*), **La Yanchama** (bark cloth and Ticuna masks), and **Leticia** (pink dolphin river tours).
8. **Tolima Grande** (Zones 43–48, unlocks after Leticia): **Los Achirales** (*bizcochos de achira*), **El Café del Huila** (specialty coffee + cascara tea byproduct), **La Represa de Betania** (tilapia), **La Lechonería** (pork butcher splitting meat & skin, rejoined into *lechona*, plus *tamal* breakfast), **La Chamba** (hand-burnished black pottery), and **Neiva** (Tatacoa Desert stargazing tours). Introduces **dual-output stations** (sending a second product through a chute) and **joining stations** (combining two local products within the same zone).
9. **Cundinamarca** (Zones 49–54, unlocks after Neiva): **Las Flores de la Sabana**, **Los Freseros de Sibaté** (strawberries & cream + jam from second-grade berries), **Las Truchas de Guatavita** (rainbow trout), **Las Salinas de Nemocón** (salt pans, carved salt figures, and gift baskets), **La Cocina de la Sabana** (*ajiaco santafereño*), and **Zipaquirá** (Salt Cathedral entrance).
10. **Bogotá** (Zone 55, unlocks after Zipaquirá): A single large 52×52 tile **supply network** (`network: true`) with **24 stations**, **27 unlimited tractomulas** bringing iconic food and crafts from the other nine regions, three chute byproducts (*café molido*, *chicharrón*, *caldo de costilla*), decorative **TransMilenio** articulated buses running along Caracas, NQS, and Calle 80, six neighborhood events plus a seventh city-wide **La Gran Feria** event.
11. **San Andrés (Upcoming Special Zone)**: Shown at the bottom of the region list (`⭐ Special zone`) tracking how many regions have reached the second ending or restarted.

### Core Systems & Recent Features
- **Interactive Colombia Map & Travel (`src/ui/ZoneMap.js`)**: Zoomable vector map with regional focus, real airport locations, animated Willys & bush-plane travel between regions, or instant **⚡ Direct** switching (configurable in ⚙️ Settings).
- **Upgrades, Milestones & Endgame**:
  - Station levels 1–100 with milestone speed multipliers (Lv. 10 ×2, 25 ×2, 50 ×4, 75 ×4, 100 ×8) so maxed stations output clean powers of 2 per second; **Mastery** (all Lv. 75: ×4) and **Supremacy** (all Lv. 100: ×8).
  - **Carriers** per station (mules that upgrade visually to **color-coded electric conveyor belts** at Lv. 50), **Willys** dispatch (with **Second Willys** unlockable per region), **Chivas** between zones (upgradeable to 30 s and 15 s intervals with Renown after completing the album and restarting once), and automatic overflow detour to the warehouse (reserving 30% space for final goods).
  - **Second Ending & Prestige Resets**: Completing all stations, carriers, routes (Lv. 100), goals, and research in a region unlocks restarting that region with doubled production, stacking up to **×2⁶⁰ (×1.15Qi, 60 restarts)**; coin cap is **999Dc** (`999e33`) to avoid scientific notation.
- **Chain Diagram & Guidance (`src/ui/ChainView.js`, `src/ui/MoneyView.js`)**:
  - Color-coded product pipes, bottleneck highlighting, **🏗️ Build** bulk station construction, **⬆️ All to level X** milestone bulk upgrade (unlocked with 10 ⭐ after first restart), smart **Recommended Upgrade**, and **💰 Where the money comes from** breakdown modal.
- **Events & Renown (`src/sim/events.js`, `src/sim/renown.js`)**:
  - Separate event boards (Lv. 50 cap, independent clock up to `999:59` / `∞`, foldable header on mobile) with **2 global slots** (never two from the same region, 2-year cooldown).
  - Configurable leave behavior (**⏸️ Pause** or **🚪 Leave** so events continue ticking in the background up to your offline cap); winning grants Bronze/Silver/Gold medals, **Renown ⭐**, and **Prestige** (lifetime Renown earned).
  - **🔁 Events on demand (v4.7.3)**: Once every event in a region has Gold, automatic random spawns stop there; spending **20 ⭐** per region unlocks replaying any event on demand at any time (max 2 open boards at once).
  - **Album, Decor & Pets**: 60-page regional sticker album (360 stickers), customizable Willys/chiva/mule/bunting colors, plus regional **cats** (5 ⭐) and **parrots** (8 ⭐).
- **Workday & Seasons (`src/sim/calendar.js`)**: Work runs 06:00–12:00 and 14:00–20:00 (expandable to 24 h in 2-hour blocks with Renown); 16-day years cycle through *Verano* (×1.2), *Entrada de aguas* (×1.0), *Invierno* (×0.8), and *Veranillo* (×1.0).
- **Custom Artwork & Icons (`src/data/icons.js`)**: Procedural isometric buildings that evolve per milestone, day/night cycles, rain/fireflies, zone keepers, and **602 custom COLR icons** (`mitierrita-icons.woff2`) plus custom illustrations for all 360 stickers — zero reliance on OS emoji rendering, with tap/hover tooltips (`src/ui/iconTips.js`).
- **Four Languages (`src/i18n/`)**: Full UI, station, product, lore, album, and event translations in **Spanish, English, Brazilian Portuguese, and French**, with language-aware grammar/articles and decimal formatting.
- **Saves, File Backup & PWA (`src/backup.js`, `public/sw.js`)**: Auto-save, offline progress (2 h base, expandable to 24 h with Renown across all regions), two-step slide-to-delete confirmation, **Save to file / Open file** backup (with native OS Share sheet on mobile via `@capacitor/filesystem` and `@capacitor/share`), and offline-capable PWA support.

## Original Music & Synthesized Audio

Every region has its own original piece composed in code (`src/audio/songs.js`, synthesized via Karplus-Strong plucked strings and Web Audio in `src/audio/compose.js`, no audio assets bundled inside the app):
1. Eje Cafetero — *Bambuco de la finca*
2. Santander — *Guabina del Chicamocha*
3. La Costa — *Cumbia del arrozal*
4. Boyacá — *Torbellino del altiplano*
5. Los Llanos — *Joropo de la sabana*
6. Costa Pacífica — *Chirimía de San Pacho*
7. Amazonas — *Cumbia del Amazonas*
8. Tolima Grande — *Sanjuanero del San Pedro*
9. Cundinamarca — *Pasillo de la Sabana*
10. Bogotá — *Danza de La Candelaria*

Stations trigger 17 craft-specific procedural sound effects (`src/audio/Sound.js`), with separate Music and SFX volume sliders in Settings. All 10 regional pieces (MP3 + multi-track MIDI) and 31 sound effects (31 MP3 + 7 MIDI) are published for download in `web/musica/` (at `/musica/` on GitHub Pages, outside the Android package).

## Android App & Google Play

The game is bundled for Android with [Capacitor 8](https://capacitorjs.com) (`android/`): it runs completely offline, handles the hardware Back button to close modals or background the app, supports native file sharing for backups, and checks `version.json` for in-app APK updates (`src/update.js`) when distributed outside Play Store.

Building locally requires Java 21 and Android SDK (platform 36):

```bash
npm run android:apk   # builds web bundle, syncs to android/, compiles app-debug.apk
```

- **CI Publishing (`.github/workflows/pages.yml`)**: Every push to `main` runs `npm test`, builds the web app + `mitierrita.apk`, publishes the downloadable `/musica/` assets + `.zip` bundle to GitHub Pages, and (when `PLAY_UPLOAD_KEYSTORE_*` secrets are configured) builds a Play-ready `mitierrita.aab` (`PLAY_STORE=1 npm run android:sync && cd android && ./gradlew bundleRelease`) with the self-updater disabled.
- **Test APK signing**: Uses `ANDROID_KEYSTORE_*` repository secrets when set, falling back to `android/app/mitierrita-pruebas.keystore` so test builds upgrade cleanly without losing save data.
- **Voluntary Tips (`src/tip.js`)**: Play Store builds include voluntary consumable Google Play Billing tips (`tinto`, `arepa`, `almuerzo`) via `@capgo/native-purchases` behind an age/math gate; web builds support `KOFI_URL` when configured.
- Store listings, screenshots, and privacy policy live in `store/` (`listing-*.md`, `screenshots-*/`) and `public/privacidad.html` (and `privacy.html`, `privacidade.html`, `confidentialite.html`).

### Install on Mobile (PWA)
Open **https://frealgagu.github.io/MiTierritaGame/** and use *Add to Home Screen* (Safari Share menu, or Chrome ⋮ → *Install app*).

## Origin & Originality

Inspired broadly by visible supply-chain incremental games with isometric toy-like worlds and cargo carriers. All Colombian regional themes, 55 zones, recipes, economy math, code, procedural artwork, custom icon font, album illustrations, writing, and music are original to this project.

## License

Code, graphics, and music are licensed under [MIT](LICENSE).

## Project Structure

```
src/
├─ main.js, boot.js       app startup, locale loading, HUD & scene wiring
├─ backup.js              file-based save export/import (web & Capacitor Filesystem/Share)
├─ native.js              Capacitor lifecycle, back button & pause/resume saves
├─ tip.js, update.js      Play Store / Ko-fi tips & APK version update check
├─ core/                  Game loop, EventBus, SaveSystem, number formatting, paths, RNG
├─ sim/                   pure headless simulation (tested in Node without DOM/Pixi)
├─ data/                  10 regions, 55 zones (zones/zone1..zone55), stations, products,
│                         routes, research, goals, events, album, logros, icons, Colombia geo map
├─ render/                procedural isometric rendering with PixiJS v8 (buildings, belts,
│                         carriers, keepers, pets, weather, day/night, event art, occlusion)
├─ ui/                    HUD, station panel, chain diagram, Colombia map, money breakdown,
│                         events, renown/album/logros, icon tooltips, calendar, settings
├─ audio/                 Web Audio synthesizer (compose.js, Music.js, Sound.js, 10 SONGS)
├─ i18n/                  Spanish base + English, Portuguese (BR), and French localizations
└─ assets/                bundled Fredoka font & MiTierrita custom COLR icon font
tools/
├─ balance-sim.js         automated full-run economy & pacing simulator
├─ event-bots.js          automated event-board player bots
├─ event-sim.js           calibrates Gold/Silver/Bronze medal targets across all events
├─ event-idle.js          verifies idle/unassisted event completion times
├─ i18n-*.mjs             extracts missing code, HTML, and content strings per locale
├─ music-export.mjs       renders all 10 regional songs to MP3 & multi-track MIDI
├─ sfx-export.mjs         records Web Audio SFX to MP3 & MIDI
├─ music-page.mjs         generates the multilingual /musica/ download page
├─ release-notes.js       extracts version notes from CHANGELOG.md into version.json
├─ map-coords.mjs         generates docs/coordenadas.html map & airport coordinate verifier
├─ production-page.mjs    generates docs/produccion.html level 1–100 production tables
├─ play-screenshots.mjs      Playwright screenshot generator for Play Store listings
├─ artifact-page.mjs      self-contained single-file HTML build helper
├─ geo/build_map.py       builds src/data/colombiaMap.js from geographic borders
└─ icons/build_icons.py   compiles custom SVGs into mitierrita-icons.woff2 & src/data/icons.js
web/musica/               downloadable MP3 & MIDI music and SFX published to GitHub Pages
public/                   manifest.webmanifest, sw.js, PWA icons, privacy policy, font license
store/                    Google Play Store metadata & screenshots (es, en, pt, fr)
```

For products without a fitting Unicode emoji (or to guarantee uniform visuals across devices), icons live in a custom COLR color font (`src/assets/mitierrita-icons.woff2`) mapped to Private Use Area codepoints. To add or rebuild icons:

```bash
pip install fonttools brotli && python3 tools/icons/build_icons.py
```
