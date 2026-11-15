// Entry for the grand finale review page (tools/finale-artifact.mjs): plays the finale and lists every line.
import { playGrandFinale, finaleRegions } from '../src/ui/GrandFinale.js';
import { FINALE_LINES } from '../src/data/finale.js';
import { PEOPLE } from '../src/data/lore.js';
import { GRAN_FINAL } from '../src/audio/songs.js';

const list = document.getElementById('lines');
list.innerHTML = finaleRegions()
  .map(({ region, zones }) => `<section class="region"><h3><span class="ico">${region.icon}</span> ${region.name}</h3><ol>${zones.map((z) => `<li><span class="who">${PEOPLE[z].name} <small>${PEOPLE[z].role}</small></span><q>${FINALE_LINES[z]}</q></li>`).join('')}</ol></section>`)
  .join('');
document.getElementById('count').textContent = `${Object.keys(FINALE_LINES).length}`;
document.getElementById('song').textContent = `${GRAN_FINAL.name} · ${GRAN_FINAL.bpm} bpm · ${GRAN_FINAL.chords.length} compases`;
document.getElementById('instruments').textContent = GRAN_FINAL.instruments;
const play = document.getElementById('play');
play.addEventListener('click', async () => {
  play.disabled = true;
  await playGrandFinale({ volume: 0.9, onClose: () => (play.disabled = false) });
});
