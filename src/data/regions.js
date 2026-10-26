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
  // La Costa (v3.15): se abre al completar Barichara. Llegó zona por zona (v3.15 a v3.20) y mientras estuvo
  // en obra (`wip`) no tenía final; desde la v3.21 tiene sus eventos, su álbum y sus logros. Una región en
  // obra anuncia las zonas que le faltan (`soon`).
  {
    id: 'costa',
    name: 'La Costa',
    icon: '🌴',
    zones: ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena'],
    music: 'costa',
    unlock: { region: 'santander', zone: 'barichara' },
  },
  // Boyacá (v3.22): se abre al completar Cartagena. Llegó zona por zona, como la Costa (v3.22 a v3.27), y
  // desde la v3.28 tiene sus eventos, su álbum y sus logros.
  {
    id: 'boyaca',
    name: 'Boyacá',
    icon: '⛰️',
    zones: ['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva'],
    music: 'boyaca',
    unlock: { region: 'costa', zone: 'cartagena' },
  },
  // Los Llanos (v3.31): se abren al completar Villa de Leyva. Llegaron zona por zona, como la Costa y Boyacá
  // (v3.31 a v3.36), y desde la v3.37 tienen sus eventos, su álbum y sus logros.
  {
    id: 'llanos',
    name: 'Los Llanos',
    icon: '🐎',
    zones: ['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria', 'villavicencio'],
    music: 'llanos',
    unlock: { region: 'boyaca', zone: 'villa_leyva' },
  },
  // La Costa Pacífica (v3.38): se abre al completar Villavicencio. Llegó zona por zona, como los Llanos (v3.38 a
  // v3.43), y desde la v3.44 tiene sus eventos, su álbum y sus logros. Salió como «el Chocó» (id 'choco') y
  // desde la v3.46 su id es 'pacifico'.
  {
    id: 'pacifico',
    name: 'Costa Pacífica',
    icon: '🐋',
    zones: ['platanal', 'azotea', 'bahia', 'manglar', 'werregue', 'buenaventura'],
    music: 'pacifico',
    unlock: { region: 'llanos', zone: 'villavicencio' },
  },
];

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_OF_ZONE = Object.fromEntries(REGIONS.flatMap((r) => r.zones.map((z) => [z, r.id])));
export const regionOf = (state) => REGIONS_BY_ID[state.region ?? 'cafetero'];
