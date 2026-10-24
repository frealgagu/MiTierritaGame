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
