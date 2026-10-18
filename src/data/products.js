// Catálogo completo de productos del juego (las 6 zonas, ver docs/GDD.md §4b).
// Las zonas posteriores valen más (×5 en el Trapiche) porque arrancan con la economía de las anteriores.
// `value` es el precio de venta base en monedas; 0 = no se vende (subproducto o final).
// `color` se usa para los costales de las mulas y los iconos.
// `icon`: un emoji o un ícono propio (ICON, de la fuente del juego) cuando no hay emoji parecido.
import { ICON } from './icons.js';

export const ZONES = [
  { id: 'finca', name: 'La Finca', release: '0.1' },
  { id: 'trapiche', name: 'El Trapiche', release: '1.1' },
  { id: 'lecheria', name: 'La Lechería', release: '1.2' },
  { id: 'cacaotal', name: 'El Cacaotal', release: '1.3' },
  { id: 'maizal', name: 'El Maizal', release: '1.4' },
  { id: 'pueblo', name: 'El Pueblo', release: '1.5' },
];

export const PRODUCTS = {
  // Zona 1 · La Finca
  cherry: { name: 'Cereza de café', zone: 'finca', value: 1, icon: ICON.cherry, color: 0xd7263d },
  washed: { name: 'Café lavado', zone: 'finca', value: 3, icon: '💧', color: 0xe9d8a6 },
  pulp: { name: 'Pulpa', zone: 'finca', value: 0, icon: '🟥', color: 0x9b2335 },
  parchment: { name: 'Café pergamino', zone: 'finca', value: 6, icon: '🟫', color: 0xcfae7a },
  green: { name: 'Café verde', zone: 'finca', value: 10, icon: '🟢', color: 0x8fae5d },
  roasted: { name: 'Café tostado', zone: 'finca', value: 30, icon: '🟤', color: 0x6b3e26 },
  ground: { name: 'Café molido', zone: 'finca', value: 45, icon: '☕', color: 0x4a2a1a },
  coffee_bag: { name: 'Bolsa de café', zone: 'finca', value: 250, icon: '🛍️', color: 0xc8643b },
  compost: { name: 'Compost', zone: 'finca', value: 0, icon: '🟤', color: 0x5b4636 },

  // Zona 2 · El Trapiche
  cane: { name: 'Caña', zone: 'trapiche', value: 10, icon: '🎋', color: 0x9cc65b },
  guarapo: { name: 'Guarapo', zone: 'trapiche', value: 25, icon: ICON.guarapo, color: 0xd8e2a0 },
  bagasse: { name: 'Bagazo', zone: 'trapiche', value: 0, icon: '🌾', color: 0xd9c38c },
  melado: { name: 'Melado', zone: 'trapiche', value: 60, icon: '🍯', color: 0xc98a2b },
  panela: { name: 'Panela', zone: 'trapiche', value: 150, icon: ICON.panela, color: 0xb5651d },
  panela_powder: { name: 'Panela pulverizada', zone: 'trapiche', value: 250, icon: ICON.panelaPowder, color: 0xe8b23a },

  // Zona 3 · La Lechería (×25 respecto al primer borrador, igual que el Trapiche ×5)
  raw_milk: { name: 'Leche cruda', zone: 'lecheria', value: 125, icon: '🥛', color: 0xf4f1e8 },
  milk: { name: 'Leche pasteurizada', zone: 'lecheria', value: 300, icon: ICON.milk, color: 0xffffff },
  cream: { name: 'Crema de leche', zone: 'lecheria', value: 800, icon: ICON.cream, color: 0xfff3d6 },
  butter: { name: 'Mantequilla', zone: 'lecheria', value: 2000, icon: '🧈', color: 0xf6d860 },
  cheese: { name: 'Queso campesino', zone: 'lecheria', value: 2400, icon: ICON.cheese, color: 0xf7f2e2 },
  arequipe: { name: 'Arequipe', zone: 'lecheria', value: 4000, icon: '🍮', color: 0xa0522d },

  // Zona 4 · El Cacaotal (×125 respecto al primer borrador)
  cacao_pod: { name: 'Mazorca de cacao', zone: 'cacaotal', value: 1000, icon: '🥭', color: 0xd98e04 },
  cacao_fermented: { name: 'Cacao fermentado', zone: 'cacaotal', value: 2500, icon: '🫘', color: 0xa86b3c },
  cacao_dry: { name: 'Cacao seco', zone: 'cacaotal', value: 4400, icon: '🫘', color: 0x8a5a33 },
  cacao_roasted: { name: 'Cacao tostado', zone: 'cacaotal', value: 8800, icon: '🫘', color: 0x5e3a1f },
  cacao_paste: { name: 'Pasta de cacao', zone: 'cacaotal', value: 22000, icon: '🟫', color: 0x4b2e1a },
  table_chocolate: { name: 'Chocolate de mesa', zone: 'cacaotal', value: 100000, icon: '🍫', color: 0x5a3220 },
  milk_chocolate: { name: 'Chocolatina con leche', zone: 'cacaotal', value: 220000, icon: '🍬', color: 0x8b5a3c },

  // Zona 5 · El Maizal (×1.000 respecto al primer borrador)
  corn_cob: { name: 'Mazorca de maíz', zone: 'maizal', value: 6000, icon: '🌽', color: 0xf2c94c },
  corn_kernels: { name: 'Maíz desgranado', zone: 'maizal', value: 12000, icon: '🌾', color: 0xf5d76e },
  corn_hulled: { name: 'Maíz pilado', zone: 'maizal', value: 30000, icon: '⚪', color: 0xf7ecc8 },
  corn_dough: { name: 'Masa de maíz', zone: 'maizal', value: 70000, icon: '🥣', color: 0xf0e0a8 },
  arepa: { name: 'Arepa', zone: 'maizal', value: 120000, icon: '🫓', color: 0xe8c77a },
  cheese_arepa: { name: 'Arepas de queso', zone: 'maizal', value: 1200000, icon: '🥪', color: 0xf0d58c },

  // Zona 6 · El Pueblo
  cafe_origen: { name: 'Café de origen', zone: 'pueblo', value: 150000, icon: '🫘', color: 0x6b3e26 },
  tinto: { name: 'Tinto', zone: 'pueblo', value: 400000, icon: '☕', color: 0x3b2314 },
  breakfast: { name: 'Desayuno campesino', zone: 'pueblo', value: 3200000, icon: '🍳', color: 0xf2c94c },
  basket: { name: 'Canasta de fique', zone: 'pueblo', value: 600000, icon: '🧺', color: 0xc9a66b },
  gift_basket: { name: 'Canasta de regalo', zone: 'pueblo', value: 2000000, icon: '🎁', color: 0xd7263d },
  container: { name: 'Contenedor de exportación', zone: 'pueblo', value: 24000000, icon: '🚢', color: 0x2e6fd1 },
};
