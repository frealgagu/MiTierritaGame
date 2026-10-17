// Catálogo completo de productos del juego (las 6 zonas, ver docs/GDD.md §4b).
// Las zonas posteriores valen más (×5 en el Trapiche) porque arrancan con la economía de las anteriores.
// `value` es el precio de venta base en monedas; 0 = no se vende (subproducto o final).
// `color` se usa para los costales de las mulas y los iconos.

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
  cherry: { name: 'Cereza de café', zone: 'finca', value: 1, icon: '🍒', color: 0xd7263d },
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
  guarapo: { name: 'Guarapo', zone: 'trapiche', value: 25, icon: '🥤', color: 0xd8e2a0 },
  bagasse: { name: 'Bagazo', zone: 'trapiche', value: 0, icon: '🌾', color: 0xd9c38c },
  melado: { name: 'Melado', zone: 'trapiche', value: 60, icon: '🍯', color: 0xc98a2b },
  panela: { name: 'Panela', zone: 'trapiche', value: 150, icon: '🟧', color: 0xb5651d },
  panela_powder: { name: 'Panela pulverizada', zone: 'trapiche', value: 250, icon: '🧂', color: 0xd9a066 },

  // Zona 3 · La Lechería (×25 respecto al primer borrador, igual que el Trapiche ×5)
  raw_milk: { name: 'Leche cruda', zone: 'lecheria', value: 125, icon: '🥛', color: 0xf4f1e8 },
  milk: { name: 'Leche pasteurizada', zone: 'lecheria', value: 300, icon: '🍼', color: 0xffffff },
  cream: { name: 'Crema de leche', zone: 'lecheria', value: 800, icon: '🍦', color: 0xfff3d6 },
  butter: { name: 'Mantequilla', zone: 'lecheria', value: 2000, icon: '🧈', color: 0xf6d860 },
  cheese: { name: 'Queso campesino', zone: 'lecheria', value: 2400, icon: '🧀', color: 0xf3e3b0 },
  arequipe: { name: 'Arequipe', zone: 'lecheria', value: 4000, icon: '🍮', color: 0xa0522d },

  // Zona 4 · El Cacaotal
  cacao_pod: { name: 'Mazorca de cacao', zone: 'cacaotal', value: 8, icon: '🥭', color: 0xd98e04 },
  cacao_fermented: { name: 'Cacao fermentado', zone: 'cacaotal', value: 20, icon: '🫘', color: 0xa86b3c },
  cacao_dry: { name: 'Cacao seco', zone: 'cacaotal', value: 35, icon: '🫘', color: 0x8a5a33 },
  cacao_roasted: { name: 'Cacao tostado', zone: 'cacaotal', value: 70, icon: '🫘', color: 0x5e3a1f },
  cacao_paste: { name: 'Pasta de cacao', zone: 'cacaotal', value: 150, icon: '🟫', color: 0x4b2e1a },
  table_chocolate: { name: 'Chocolate de mesa', zone: 'cacaotal', value: 400, icon: '🍫', color: 0x5a3220 },
  milk_chocolate: { name: 'Chocolatina con leche', zone: 'cacaotal', value: 900, icon: '🍫', color: 0x8b5a3c },

  // Zona 5 · El Maizal
  corn_cob: { name: 'Mazorca de maíz', zone: 'maizal', value: 6, icon: '🌽', color: 0xf2c94c },
  corn_kernels: { name: 'Maíz desgranado', zone: 'maizal', value: 12, icon: '🌽', color: 0xf5d76e },
  corn_hulled: { name: 'Maíz pilado', zone: 'maizal', value: 25, icon: '⚪', color: 0xf7ecc8 },
  corn_dough: { name: 'Masa de maíz', zone: 'maizal', value: 50, icon: '🥣', color: 0xf0e0a8 },
  arepa: { name: 'Arepa', zone: 'maizal', value: 100, icon: '🫓', color: 0xe8c77a },
  cheese_arepa: { name: 'Arepa de queso', zone: 'maizal', value: 600, icon: '🫓', color: 0xf0d58c },

  // Zona 6 · El Pueblo
  tinto: { name: 'Tinto', zone: 'pueblo', value: 300, icon: '☕', color: 0x3b2314 },
  cafe_con_leche: { name: 'Café con leche', zone: 'pueblo', value: 500, icon: '☕', color: 0xa67b5b },
  cappuccino: { name: 'Capuchino', zone: 'pueblo', value: 1200, icon: '☕', color: 0xc8a27c },
  hot_chocolate: { name: 'Chocolate caliente', zone: 'pueblo', value: 1500, icon: '🍫', color: 0x6b3e26 },
  breakfast: { name: 'Desayuno campesino', zone: 'pueblo', value: 5000, icon: '🍳', color: 0xf2c94c },
  gift_basket: { name: 'Canasta de regalo', zone: 'pueblo', value: 20000, icon: '🧺', color: 0xc8643b },
  container: { name: 'Contenedor de exportación', zone: 'pueblo', value: 0, icon: '🚢', color: 0x2e6fd1 },
};
