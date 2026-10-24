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
    zones: ['guayabera', 'tabacal', 'fiquera', 'hato', 'hormigas', 'barichara'],
    music: 'santander',
    unlock: { region: 'cafetero', zone: 'pueblo' },
  },
  // La Costa (v3.15): se abre al completar Barichara. Mientras lleguen sus seis zonas (wip), las que
  // faltan se anuncian (soon) y la región todavía no tiene final.
  {
    id: 'costa',
    name: 'La Costa',
    icon: '🌴',
    zones: ['arrozal', 'cocal'],
    soon: ['La Ciénaga', 'La Quesera', 'El Sombrero', 'Cartagena'],
    wip: true,
    music: 'costa',
    unlock: { region: 'santander', zone: 'barichara' },
  },
];

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_OF_ZONE = Object.fromEntries(REGIONS.flatMap((r) => r.zones.map((z) => [z, r.id])));
export const regionOf = (state) => REGIONS_BY_ID[state.region ?? 'cafetero'];
