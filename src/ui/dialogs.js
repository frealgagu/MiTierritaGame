import { formatDuration, formatNumber } from '../core/format.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { toast } from './toast.js';

// Ventana de bienvenida con lo ganado mientras el juego estuvo cerrado.
export function showWelcome({ seconds, coins, capped, cap, scale = 1 }, onCollect) {
  const modal = document.getElementById('welcome');
  const fast = scale > 1 ? ` (a ⏩ ×${scale})` : '';
  document.getElementById('welcome-text').textContent = capped
    ? `Estuviste fuera más de ${formatDuration(cap / scale)}. Tu finca trabajó ${formatDuration(seconds)}${fast}, el máximo, y ganó (con Renombre ⭐ puedes subir ese máximo, en 🏅 Eventos › ⏰ Sin conexión):`
    : `Mientras no estabas, tu finca siguió trabajando ${formatDuration(seconds)}${fast} y ganó:`;
  document.getElementById('welcome-coins').textContent = `💰 ${formatNumber(coins)}`;
  modal.hidden = false;
  const ok = document.getElementById('welcome-ok');
  ok.onclick = () => {
    modal.hidden = true;
    onCollect?.();
  };
}

// Textos de la pantalla final de cada zona.
const VICTORY = {
  finca: { title: '¡Primer gran pedido entregado!', text: 'Completaste la <b>Zona 1 · La Finca</b>. Dos mil bolsas de tu café ya van camino al pueblo.', stat: (s) => `Bolsas vendidas: ${formatNumber(s.stats.sold.coffee_bag ?? 0)}` },
  trapiche: { title: '¡Primer cargamento de panela!', text: 'Completaste la <b>Zona 2 · El Trapiche</b>. Seis mil panelas pulverizadas endulzan el pueblo.', stat: (s) => `Panela pulverizada vendida: ${formatNumber(s.stats.sold.panela_powder ?? 0)}` },
  maizal: { title: '¡Arepas para toda la plaza!', text: 'Completaste la <b>Zona 5 · El Maizal</b>. Seis mil bandejas de arepas de queso, con el queso y la mantequilla de la Lechería.', stat: (s) => `Arepas de queso vendidas: ${formatNumber(s.stats.sold.cheese_arepa ?? 0)}` },
  pueblo: { title: '¡El café de la vereda viaja por el mundo!', text: 'Completaste la <b>Zona 6 · Salento</b> y el Eje Cafetero. Siete mil contenedores de canastas de regalo, con café, panela, arequipe y chocolate de todas tus zonas, salen hacia el puerto.', stat: (s) => `Contenedores exportados: ${formatNumber(s.stats.sold.container ?? 0)}` },
  cacaotal: { title: '¡Chocolate para la feria!', text: 'Completaste la <b>Zona 4 · El Cacaotal</b>. Cuatro mil chocolatinas hechas con tu cacao, la panela del Trapiche y la leche de la Lechería.', stat: (s) => `Chocolatinas vendidas: ${formatNumber(s.stats.sold.milk_chocolate ?? 0)}` },
  guayabera: { title: '¡Bocadillo veleño para todo el país!', text: 'Completaste <b>La Guayabera</b>, en Santander. Dos mil cajas de bocadillo envuelto en hoja de bijao.', stat: (s) => `Cajas de bocadillos vendidas: ${formatNumber(s.stats.sold.bocadillo_crate ?? 0)}` },
  tabacal: { title: '¡Tabaco torcido a mano!', text: 'Completaste <b>El Tabacal</b>, en Santander. Seis mil tabacos curados en el caney, fermentados en pilones y torcidos a mano.', stat: (s) => `Tabacos vendidos: ${formatNumber(s.stats.sold.cigar ?? 0)}` },
  fiquera: { title: '¡Tercios de tabaco listos para el viaje!', text: 'Completaste <b>La Fiquera</b>, en Santander. Seis mil tercios de tabaco del Tabacal, forrados en tela de fique.', stat: (s) => `Tercios vendidos: ${formatNumber(s.stats.sold.tobacco_bale ?? 0)}` },
  hato: { title: '¡Fiambre para todos los caminos!', text: 'Completaste <b>El Hato</b>, en Santander. Cuatro mil fiambres de carne oreada, con el bocadillo de la Guayabera y amarrados con la cabuya de la Fiquera.', stat: (s) => `Fiambres vendidos: ${formatNumber(s.stats.sold.fiambre ?? 0)}` },
  hormigas: { title: '¡Hormigas culonas para todo el país!', text: 'Completaste <b>Las Hormigas</b>, en Santander. Seis mil recuerdos con hormigas tostadas, en costal de fique y con alpargatas de la Fiquera.', stat: (s) => `Recuerdos vendidos: ${formatNumber(s.stats.sold.recuerdo ?? 0)}` },
  barichara: { title: '¡Santander, de punta a punta!', text: 'Completaste <b>Barichara</b> y Santander. Siete mil excursiones por el Camino Real a Guane, con dulces, tabaco, recuerdos, tercios, almuerzos y fiambres de todas tus zonas santandereanas.', stat: (s) => `Excursiones: ${formatNumber(s.stats.sold.excursion ?? 0)}` },
  arrozal: { title: '¡Arroz para toda la Costa!', text: 'Completaste <b>El Arrozal</b>, en la Costa. Dos mil bultos de arroz excelso de las vegas del Sinú.', stat: (s) => `Bultos de arroz vendidos: ${formatNumber(s.stats.sold.rice_sack ?? 0)}` },
  cocal: { title: '¡Cocadas para toda la Costa!', text: 'Completaste <b>El Cocal</b>, en la Costa. Seis mil cocadas hechas con la leche de tus cocos, cocinadas en paila.', stat: (s) => `Cocadas vendidas: ${formatNumber(s.stats.sold.cocada ?? 0)}` },
  cienaga: { title: '¡Pescado en coco para toda la Costa!', text: 'Completaste <b>La Ciénaga</b>, en la Costa. Seis mil cazuelas de pescado en la leche de coco que llegó del Cocal.', stat: (s) => `Pescado en coco vendido: ${formatNumber(s.stats.sold.fish_in_coconut ?? 0)}` },
  quesera: { title: '¡Bandeja costeña para todos!', text: 'Completaste <b>La Quesera</b>, en la Costa. Cuatro mil bandejas con mote de queso, el arroz del Arrozal y el pescado de la Ciénaga.', stat: (s) => `Bandejas vendidas: ${formatNumber(s.stats.sold.bandeja_costena ?? 0)}` },
  sombrero: { title: '¡Sombreros vueltiaos para todo el país!', text: 'Completaste <b>El Sombrero</b>, en la Costa. Seis mil recuerdos de la Costa: sombrero vueltiao, pescado salado para el viaje y pescado frito para el camino.', stat: (s) => `Recuerdos vendidos: ${formatNumber(s.stats.sold.recuerdo_costa ?? 0)}` },
  cartagena: { title: '¡La Costa, de punta a punta!', text: 'Completaste <b>Cartagena</b> y la Costa. Siete mil paseos a las Islas del Rosario, con el arroz, las cocadas, el pescado, el queso y los sombreros de todas tus zonas costeñas.', stat: (s) => `Paseos a las islas: ${formatNumber(s.stats.sold.paseo_islas ?? 0)}` },
  papal: { title: '¡Papitas para todo el altiplano!', text: 'Completaste <b>El Papal</b>, en Boyacá. Dos mil cajas de papitas criollas, de la tierra fría a la bolsa.', stat: (s) => `Cajas de papitas vendidas: ${formatNumber(s.stats.sold.criollas_box ?? 0)}` },
  cerveceria: { title: '¡Cerveza para todo Boyacá!', text: 'Completaste <b>La Cervecería</b>, en Boyacá. Seis mil canastas de cerveza hecha con la cebada y la malta del altiplano.', stat: (s) => `Canastas de cerveza vendidas: ${formatNumber(s.stats.sold.beer_crate ?? 0)}` },
  raquira: { title: '¡Jarras de barro para todo Boyacá!', text: 'Completaste <b>Ráquira</b>, en Boyacá. Seis mil jarras de barro llenas con la cerveza que llegó de la Cervecería.', stat: (s) => `Jarras vendidas: ${formatNumber(s.stats.sold.jarra_cerveza ?? 0)}` },
  paipa: { title: '¡Amasijos para todo Boyacá!', text: 'Completaste <b>Paipa</b>, en Boyacá. Cuatro mil canastas de amasijos del horno de barro, con el queso Paipa y las papitas del Papal.', stat: (s) => `Canastas vendidas: ${formatNumber(s.stats.sold.canasta_amasijos ?? 0)}` },
  ruanas: { title: '¡Ruanas para todo el frío!', text: 'Completaste <b>Las Ruanas</b>, en Boyacá. Seis mil recuerdos de Boyacá: ruanas de Nobsa con ollas y materas de Ráquira.', stat: (s) => `Recuerdos vendidos: ${formatNumber(s.stats.sold.recuerdo_boyaca ?? 0)}` },
  villa_leyva: { title: '¡Boyacá, de punta a punta!', text: 'Completaste <b>Villa de Leyva</b> y Boyacá. Siete mil excursiones al Fósil, con las papitas, la cerveza, el barro, los quesos y las ruanas de todas tus zonas boyacenses.', stat: (s) => `Excursiones al Fósil: ${formatNumber(s.stats.sold.excursion_fosil ?? 0)}` },
  palma: { title: '¡Aceite para todo el Llano!', text: 'Completaste <b>La Palma</b>, en los Llanos. Dos mil cajas de aceite de palma, del racimo a la botella.', stat: (s) => `Cajas de aceite vendidas: ${formatNumber(s.stats.sold.oil_box ?? 0)}` },
  frutal: { title: '¡Jugos para todo el Llano!', text: 'Completaste <b>El Frutal</b>, en los Llanos. Seis mil cajas de jugo de maracuyá, de la enramada a la cajita.', stat: (s) => `Cajas de jugos vendidas: ${formatNumber(s.stats.sold.juice_box ?? 0)}` },
  cachamera: { title: '¡Cachama para todo el Llano!', text: 'Completaste <b>La Cachamera</b>, en los Llanos. Seis mil cachamas al maracuyá, con el jugo que llegó del Frutal.', stat: (s) => `Platos vendidos: ${formatNumber(s.stats.sold.cachama_maracuya ?? 0)}` },
  hato_llanero: { title: '¡Carne a la llanera para todos!', text: 'Completaste <b>El Hato llanero</b>, en los Llanos. Cuatro mil asados de parranda, con el aceite de la Palma y la cachama de la Cachamera.', stat: (s) => `Asados vendidos: ${formatNumber(s.stats.sold.parranda_llanera ?? 0)}` },
  talabarteria: { title: '¡Sillas para todo el Llano!', text: 'Completaste <b>La Talabartería</b>, en los Llanos. Seis mil recuerdos del Llano: sillas de montar con pisillo y cachama ahumada para el camino.', stat: (s) => `Recuerdos vendidos: ${formatNumber(s.stats.sold.recuerdo_llano ?? 0)}` },
  villavicencio: { title: '¡Los Llanos, de punta a punta!', text: 'Completaste <b>Villavicencio</b> y los Llanos. Siete mil excursiones a Caño Cristales, con el aceite, los jugos, la cachama, la carne y las sillas de todas tus zonas llaneras.', stat: (s) => `Excursiones a Caño Cristales: ${formatNumber(s.stats.sold.excursion_cano ?? 0)}` },
  platanal: { title: '¡Patacones para todo el Pacífico!', text: 'Completaste <b>El Platanal</b>, en la Costa Pacífica. Dos mil cajas de patacones, del racimo a la bolsa.', stat: (s) => `Cajas de patacones vendidas: ${formatNumber(s.stats.sold.patacon_box ?? 0)}` },
  azotea: { title: '¡Aliño para todas las ollas!', text: 'Completaste <b>La Azotea</b>, en la Costa Pacífica. Seis mil cajas de aliño, de la azotea al frasco.', stat: (s) => `Cajas de aliño vendidas: ${formatNumber(s.stats.sold.alino_box ?? 0)}` },
  bahia: { title: '¡Tapao para toda la costa!', text: 'Completaste <b>La Bahía</b>, en la Costa Pacífica. Seis mil tapaos de pescado, con el aliño que llegó de la Azotea.', stat: (s) => `Platos vendidos: ${formatNumber(s.stats.sold.tapao ?? 0)}` },
  manglar: { title: '¡Cazuela para toda la costa!', text: 'Completaste <b>El Manglar</b>, en la Costa Pacífica. Cuatro mil cazuelas de mariscos, con los patacones del Platanal y el pargo de la Bahía.', stat: (s) => `Cazuelas vendidas: ${formatNumber(s.stats.sold.cazuela_mariscos ?? 0)}` },
  werregue: { title: '¡Werregue para todo el país!', text: 'Completaste <b>El Werregue</b>, en la Costa Pacífica. Seis mil recuerdos del Pacífico: jarrones de werregue con pescado seco y pargo ahumado para el camino.', stat: (s) => `Recuerdos vendidos: ${formatNumber(s.stats.sold.recuerdo_pacifico ?? 0)}` },
  buenaventura: { title: '¡La Costa Pacífica, de punta a punta!', text: 'Completaste <b>Buenaventura</b> y la Costa Pacífica. Siete mil salidas a ver las ballenas, con los patacones, el aliño, el pescado, la piangua y el werregue de todas tus zonas.', stat: (s) => `Salidas a ver las ballenas: ${formatNumber(s.stats.sold.excursion_ballenas ?? 0)}` },
  asaizal: { title: '¡Asaí para toda la selva!', text: 'Completaste <b>El Asaizal</b>, en el Amazonas. Dos mil cajas de asaí, del racimo a la bolsa.', stat: (s) => `Cajas de asaí vendidas: ${formatNumber(s.stats.sold.asai_box ?? 0)}` },
  ajizal: { title: '¡Ají negro para toda la selva!', text: 'Completaste <b>El Ajizal</b>, en el Amazonas. Seis mil cajas de ají negro, de la chagra al frasco.', stat: (s) => `Cajas de ají negro vendidas: ${formatNumber(s.stats.sold.aji_box ?? 0)}` },
  lecheria: { title: '¡Arequipe para todo el pueblo!', text: 'Completaste la <b>Zona 3 · La Lechería</b>. Seis mil arequipes hechos con tu leche y la panela del Trapiche.', stat: (s) => `Arequipe vendido: ${formatNumber(s.stats.sold.arequipe ?? 0)}` },
};

// «al Tabacal», «a La Lechería»: el artículo «el» se contrae con la preposición.
const toZone = (name) => (name.startsWith('El ') ? `al ${name.slice(3)}` : `a ${name}`);

// onGo(zona): ir a la zona que se acaba de abrir. opened: regiones que se abrieron al completarla
// (v3.0: el Pueblo abre Santander). open: la región que sigue, si ya estaba abierta (v3.8.1: al
// completar de nuevo el Pueblo tras reiniciar, también se ofrece ir a Santander).
export function showVictory(state, zoneId, onGo, opened = [], open = null) {
  const v = VICTORY[zoneId];
  const fresh = Boolean(opened[0]);
  const region = REGIONS_BY_ID[opened[0] ?? open];
  const next = ZONES_BY_ID[zoneId].next ?? (region ? region.zones[0] : null);
  document.getElementById('victory-title').textContent = v.title;
  document.getElementById('victory-text').innerHTML = v.text;
  document.getElementById('victory-stats').textContent = `Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)} · ${v.stat(state)}`;
  const soon = document.getElementById('victory-next');
  const go = document.getElementById('victory-go');
  const stay = document.getElementById('victory-ok');
  const modal = document.getElementById('victory');
  if (region) {
    soon.innerHTML = fresh
      ? `¡Se abrió una región nueva: <b>${region.icon} ${region.name}</b>! Empieza de cero, con su propia economía, y tu ${REGIONS_BY_ID[REGION_OF_ZONE[zoneId]].name} sigue produciendo.`
      : `Tu región <b>${region.icon} ${region.name}</b> sigue abierta y produciendo.`;
    go.hidden = false;
    go.textContent = `Ir a ${region.name} ${region.icon}`;
    go.onclick = () => {
      modal.hidden = true;
      onGo(next);
    };
  } else if (next) {
    soon.innerHTML = `Se abrió la <b>Zona ${zoneIndex(next)} · ${ZONES_BY_ID[next].name}</b> ${ZONES_BY_ID[next].icon}`;
    go.hidden = false;
    go.textContent = `Ir ${toZone(ZONES_BY_ID[next].name)} ${ZONES_BY_ID[next].icon}`;
    go.onclick = () => {
      modal.hidden = true;
      onGo(next);
    };
  } else {
    soon.innerHTML = '¡Completaste todas las zonas que hay por ahora! Las que siguen llegan en las próximas versiones.';
    go.hidden = true;
  }
  stay.textContent = next ? 'Quedarme aquí' : 'Seguir jugando';
  modal.hidden = false;
  stay.onclick = () => {
    modal.hidden = true;
    // Para que no se pierda el camino: se va a otra región (o zona) con el botón 🗺️.
    if (region) toast(`🗺️ Puedes ir a ${region.name} ${region.icon} cuando quieras con el botón de zonas.`, 5000);
  };
}

// Número de la zona dentro de su región.
const zoneIndex = (id) => REGIONS_BY_ID[REGION_OF_ZONE[id]].zones.indexOf(id) + 1;
