// Investigaciones de la Zona 1 (GDD §5.4): compras únicas que mejoran toda la finca.
//   requires: estación que tiene que estar construida para que aparezca
//   effect:   { type, target?, mult }
//     stationSpeed (target = estación) · productValue (target = producto)
//     muleSpeed · dispatchCapacity · offlineHours (mult = horas)
export const RESEARCH = [
  { id: 'abono', name: 'Abono orgánico', icon: '🌱', desc: 'El Cafetal produce el doble.', cost: 300, requires: 'wetmill', effect: { type: 'stationSpeed', target: 'farm', mult: 2 } },
  { id: 'herraduras', name: 'Herraduras', icon: '🐴', desc: 'Las mulas caminan un 50 % más rápido.', cost: 900, requires: 'dryer', effect: { type: 'muleSpeed', mult: 1.5 } },
  { id: 'remolque', name: 'Remolque para el Willys', icon: '🚙', desc: 'El Willys lleva el doble por viaje.', cost: 2500, requires: 'huller', effect: { type: 'dispatchCapacity', mult: 2 } },
  { id: 'secador', name: 'Secador mecánico', icon: '♨️', desc: 'La Marquesina seca el doble de rápido.', cost: 6000, requires: 'huller', effect: { type: 'stationSpeed', target: 'dryer', mult: 2 } },
  { id: 'capataz', name: 'Capataz', icon: '🧑‍🌾', desc: 'La finca trabaja hasta 6 h mientras no juegas (antes 2 h).', cost: 10000, requires: 'roaster', effect: { type: 'offlineHours', mult: 6 } },
  { id: 'tueste', name: 'Tueste de origen', icon: '🔥', desc: 'El café tostado vale un 50 % más.', cost: 20000, requires: 'roaster', effect: { type: 'productValue', target: 'roasted', mult: 1.5 } },
  { id: 'castillo', name: 'Variedad Castillo', icon: '🌳', desc: 'El Cafetal vuelve a duplicar su producción.', cost: 50000, requires: 'grinder', effect: { type: 'stationSpeed', target: 'farm', mult: 2 } },
  { id: 'cable', name: 'Cable aéreo', icon: '🚡', desc: 'Las mulas caminan el doble de rápido.', cost: 120000, requires: 'packer', effect: { type: 'muleSpeed', mult: 2 } },
  { id: 'sello', name: 'Sello de calidad', icon: '🏅', desc: 'Las bolsas de café valen un 50 % más.', cost: 300000, requires: 'packer', effect: { type: 'productValue', target: 'coffee_bag', mult: 1.5 } },
];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
