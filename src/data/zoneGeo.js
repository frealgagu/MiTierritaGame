// Where each zone sits on Colombia map (v3.60): [latitude, longitude] of inspiring town or
// landmark. Region map nudges overlapping points slightly apart (see ui/ZoneMap.js).
export const ZONE_GEO = {
  // Eje Cafetero: Chinchiná, Supía, San Pedro de los Milagros, Maceo, Jericó, and Salento.
  finca: [4.98, -75.6], trapiche: [5.45, -75.65], lecheria: [6.46, -75.56], cacaotal: [6.55, -74.79], maizal: [5.79, -75.78], pueblo: [4.64, -75.57],
  // Santander: Vélez, Ocaña, Mogotes, Málaga, San Gil, and Barichara.
  guayabera: [6.01, -73.67], tabacal: [8.24, -73.35], fiquera: [6.47, -72.97], hato: [6.7, -72.73], hormigas: [6.55, -73.13], barichara: [6.64, -73.22],
  // Coast: Montería, Palomino, Ciénaga Grande, Valledupar, Tuchín, and Cartagena.
  arrozal: [8.75, -75.88], cocal: [11.25, -73.56], cienaga: [10.9, -74.5], quesera: [10.46, -73.25], sombrero: [9.19, -75.55], cartagena: [10.39, -75.51],
  // Boyacá: Ventaquemada, Tibasosa, Ráquira, Paipa, Nobsa, and Villa de Leyva.
  papal: [5.37, -73.52], cerveceria: [5.75, -73.0], raquira: [5.54, -73.63], paipa: [5.78, -73.12], ruanas: [5.77, -72.94], villa_leyva: [5.63, -73.52],
  // Llanos: Acacías, Granada, Restrepo, Paz de Ariporo, Yopal, and Villavicencio.
  palma: [3.99, -73.76], frutal: [3.55, -73.7], cachamera: [4.26, -73.56], hato_llanero: [5.88, -71.89], talabarteria: [5.34, -72.39], villavicencio: [4.14, -73.63],
  // Pacific Coast: Quibdó, Guapi, Bahía Solano, Tumaco, Lower San Juan, and Buenaventura.
  platanal: [5.69, -76.66], azotea: [2.57, -77.89], bahia: [6.22, -77.4], manglar: [1.8, -78.76], werregue: [4.25, -77.36], buenaventura: [3.88, -77.03],
  // Amazon: Puerto Leguízamo, La Chorrera, Tarapoto Lakes, Mitú, Macedonia, and Leticia.
  asaizal: [-0.19, -74.78], ajizal: [-1.45, -72.8], lago: [-3.2, -71.4], casaberia: [1.25, -70.23], yanchama: [-3.85, -70.25], leticia: [-4.21, -69.94],
  // Tolima Grande: Natagaima, Pitalito, Betania Dam, Ibagué, La Chamba (El Guamo), and Neiva.
  achirales: [3.62, -75.09], cafe_huila: [1.85, -76.05], betania: [2.68, -75.43], lechoneria: [4.44, -75.23], chamba: [4.03, -74.97], neiva: [2.93, -75.28],
  // Cundinamarca: Madrid (Sabana de las Flores).
  flores: [4.73, -74.26],
  // Sibaté (strawberries).
  fresas: [4.49, -74.26],
  // Guatavita (trout).
  truchas: [4.93, -73.83],
  // Nemocón (salt).
  salinas: [5.07, -73.88],
  // Chía (Cocina de la Sabana).
  cocina: [4.86, -74.05],
  // Zipaquirá (Salt Cathedral).
  zipaquira: [5.02, -74.0],
  // Bogotá (v4.5): La Candelaria.
  bogota: [4.6, -74.07],
  // Special zone (v5.4): the town of San Andrés, on its island in the Caribbean.
  sanandres: [12.58, -81.7],
};

// Off-map regions (v5.4, `offMap` in data/regions.js): the country map leaves out the islands, so their zones and
// airport are drawn in an inset in the Caribbean, near the top-left corner of the map.
export const MAP_GEO = {
  sanandres: [11.75, -78.4],
};
export const MAP_AIRPORT_GEO = {
  sanandres: [11.95, -78.15],
};
// Where a zone or a region's airport sits on the map: its real place, or its spot in the inset.
export const mapGeo = (zoneId) => MAP_GEO[zoneId] ?? ZONE_GEO[zoneId];
export const mapAirportGeo = (regionId) => MAP_AIRPORT_GEO[regionId] ?? AIRPORT_GEO[regionId];

// Each region's airport (v4.4.10): [latitude, longitude] of real airport nearest its final zone.
// Plane lands here and Willys drives out. If outside region (El Dorado for Cundinamarca) or
// overlapping a zone, map shifts until clear (see ui/mapLayout.js).
export const AIRPORT_GEO = {
  cafetero: [4.453, -75.766], // El Edén, Armenia
  santander: [7.127, -73.185], // Palonegro, Bucaramanga
  costa: [10.442, -75.513], // Rafael Núñez, Cartagena
  boyaca: [5.677, -72.97], // Alberto Lleras Camargo, Sogamoso
  llanos: [4.168, -73.614], // La Vanguardia, Villavicencio
  pacifico: [3.82, -76.99], // Gerardo Tobar López, Buenaventura
  amazonas: [-4.193, -69.943], // Alfredo Vásquez Cobo, Leticia
  tolima: [2.95, -75.294], // Benito Salas, Neiva
  cundinamarca: [4.702, -74.147], // El Dorado (sits in Bogotá: shifts into Sabana)
  bogota: [4.702, -74.147], // El Dorado, Bogotá
  sanandres: [12.584, -81.711], // Gustavo Rojas Pinilla, San Andrés
};
export const AIRPORT_NAME = {
  cafetero: 'El Edén, Armenia',
  santander: 'Palonegro, Bucaramanga',
  costa: 'Rafael Núñez, Cartagena',
  boyaca: 'Alberto Lleras Camargo, Sogamoso',
  llanos: 'La Vanguardia, Villavicencio',
  pacifico: 'Gerardo Tobar López, Buenaventura',
  amazonas: 'Alfredo Vásquez Cobo, Leticia',
  tolima: 'Benito Salas, Neiva',
  cundinamarca: 'El Dorado, Bogotá',
  bogota: 'El Dorado, Bogotá',
  sanandres: 'Gustavo Rojas Pinilla, San Andrés',
};
