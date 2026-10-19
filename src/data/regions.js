// Regiones (v3.0, GDD §10.3): cada una es una partida aparte con su economía (monedas, niveles,
// investigaciones, objetivos, segundo final y reinicio ×2), seis zonas y su música. Se comparten
// solo el Renombre, el álbum, la decoración, los logros y el calendario del país.
//   zones: en orden (la primera se abre con la región; cada una abre la siguiente)
//   unlock: lo que abre la región ({ region, zone }: completar esa zona de esa región)
import { ICON } from './icons.js';

export const REGIONS = [
  { id: 'cafetero', name: 'Eje Cafetero', icon: '☕', zones: ['finca', 'trapiche', 'lecheria', 'cacaotal', 'maizal', 'pueblo'], music: 'cafetero', unlock: null },
  {
    id: 'santander',
    name: 'Santander',
    icon: ICON.guava,
    zones: ['guayabera', 'tabacal'],
    // Las que llegan en las próximas versiones (se muestran en el selector de zonas).
    soon: ['🧵 La Fiquera', '🐂 El Hato', '🐜 Las Hormigas', '⛪ Barichara'],
    music: 'santander',
    unlock: { region: 'cafetero', zone: 'pueblo' },
  },
];

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_OF_ZONE = Object.fromEntries(REGIONS.flatMap((r) => r.zones.map((z) => [z, r.id])));
export const regionOf = (state) => REGIONS_BY_ID[state.region ?? 'cafetero'];
