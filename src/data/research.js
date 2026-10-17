// Investigaciones de la Zona 1 (GDD §5.4): compras únicas que mejoran toda la finca.
//   requires: estación que tiene que estar construida para que aparezca
//   effect:   { type, target?, mult }
//     stationSpeed (target = estación) · productValue (target = producto)
//     muleSpeed · dispatchCapacity (target = zona) · offlineHours (mult = horas)
//   zone: zona en la que aparece
export const RESEARCH = [
  { zone: 'finca', id: 'abono', name: 'Abono orgánico', icon: '🌱', desc: 'El Cafetal produce el doble.', cost: 300, requires: 'wetmill', effect: { type: 'stationSpeed', target: 'farm', mult: 2 } },
  { zone: 'finca', id: 'herraduras', name: 'Herraduras', icon: '🐴', desc: 'Las mulas caminan un 50 % más rápido.', cost: 900, requires: 'dryer', effect: { type: 'muleSpeed', mult: 1.5 } },
  { zone: 'finca', id: 'remolque', name: 'Remolque para el Willys', icon: '🚙', desc: 'El Willys lleva el doble por viaje.', cost: 2500, requires: 'huller', effect: { type: 'dispatchCapacity', target: 'finca', mult: 2 } },
  { zone: 'finca', id: 'secador', name: 'Secador mecánico', icon: '♨️', desc: 'La Marquesina seca el doble de rápido.', cost: 6000, requires: 'huller', effect: { type: 'stationSpeed', target: 'dryer', mult: 2 } },
  { zone: 'finca', id: 'capataz', name: 'Capataz', icon: '🧑‍🌾', desc: 'La finca trabaja hasta 6 h mientras no juegas (antes 2 h).', cost: 10000, requires: 'roaster', effect: { type: 'offlineHours', mult: 6 } },
  { zone: 'finca', id: 'tueste', name: 'Tueste de origen', icon: '🔥', desc: 'El café tostado vale un 50 % más.', cost: 20000, requires: 'roaster', effect: { type: 'productValue', target: 'roasted', mult: 1.5 } },
  { zone: 'finca', id: 'castillo', name: 'Variedad Castillo', icon: '🌳', desc: 'El Cafetal vuelve a duplicar su producción.', cost: 50000, requires: 'grinder', effect: { type: 'stationSpeed', target: 'farm', mult: 2 } },
  { zone: 'finca', id: 'cable', name: 'Cable aéreo', icon: '🚡', desc: 'Las mulas caminan el doble de rápido.', cost: 120000, requires: 'packer', effect: { type: 'muleSpeed', mult: 2 } },
  { zone: 'finca', id: 'sello', name: 'Sello de calidad', icon: '🏅', desc: 'Las bolsas de café valen un 50 % más.', cost: 300000, requires: 'packer', effect: { type: 'productValue', target: 'coffee_bag', mult: 1.5 } },

  // Zona 2 · El Trapiche
  { zone: 'trapiche', id: 'motor', name: 'Trapiche con motor', icon: '⚙️', desc: 'La Molienda muele el doble.', cost: 20000, requires: 'cane_mill', effect: { type: 'stationSpeed', target: 'cane_mill', mult: 2 } },
  { zone: 'trapiche', id: 'abono_cana', name: 'Abono para la caña', icon: '🌱', desc: 'El Cañaduzal produce el doble.', cost: 50000, requires: 'furnace', effect: { type: 'stationSpeed', target: 'canefield', mult: 2 } },
  { zone: 'trapiche', id: 'chiva', name: 'Chiva para el Trapiche', icon: '🚌', desc: 'El despacho del Trapiche lleva el doble por viaje.', cost: 80000, requires: 'furnace', effect: { type: 'dispatchCapacity', target: 'trapiche', mult: 2 } },
  { zone: 'trapiche', id: 'gaveras_acero', name: 'Gaveras de acero', icon: '🧱', desc: 'Las Gaveras moldean el doble de rápido.', cost: 300000, requires: 'molds', effect: { type: 'stationSpeed', target: 'molds', mult: 2 } },
  { zone: 'trapiche', id: 'panela_organica', name: 'Panela orgánica', icon: '🏅', desc: 'La panela pulverizada vale un 50 % más.', cost: 1500000, requires: 'pulverizer', effect: { type: 'productValue', target: 'panela_powder', mult: 1.5 } },
];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
