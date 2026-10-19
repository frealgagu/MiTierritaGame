import { formatDuration, formatNumber } from '../core/format.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';

// Ventana de bienvenida con lo ganado mientras el juego estuvo cerrado.
export function showWelcome({ seconds, coins, capped, cap, scale = 1 }, onCollect) {
  const modal = document.getElementById('welcome');
  const fast = scale > 1 ? ` (a ⏩ ×${scale})` : '';
  document.getElementById('welcome-text').textContent = capped
    ? `Estuviste fuera más de ${formatDuration(cap / scale)}. Tu finca trabajó ${formatDuration(seconds)}${fast}, el máximo, y ganó:`
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
  pueblo: { title: '¡El café de la vereda viaja por el mundo!', text: 'Completaste la <b>Zona 6 · El Pueblo</b> y el Eje Cafetero. Siete mil contenedores de canastas de regalo, con café, panela, arequipe y chocolate de todas tus zonas, salen hacia el puerto.', stat: (s) => `Contenedores exportados: ${formatNumber(s.stats.sold.container ?? 0)}` },
  cacaotal: { title: '¡Chocolate para la feria!', text: 'Completaste la <b>Zona 4 · El Cacaotal</b>. Cuatro mil chocolatinas hechas con tu cacao, la panela del Trapiche y la leche de la Lechería.', stat: (s) => `Chocolatinas vendidas: ${formatNumber(s.stats.sold.milk_chocolate ?? 0)}` },
  guayabera: { title: '¡Bocadillo veleño para todo el país!', text: 'Completaste <b>La Guayabera</b>, en Santander. Dos mil cajas de bocadillo envuelto en hoja de bijao.', stat: (s) => `Cajas de bocadillos vendidas: ${formatNumber(s.stats.sold.bocadillo_crate ?? 0)}` },
  tabacal: { title: '¡Tabaco torcido a mano!', text: 'Completaste <b>El Tabacal</b>, en Santander. Seis mil tabacos curados en el caney, fermentados en pilones y torcidos a mano.', stat: (s) => `Tabacos vendidos: ${formatNumber(s.stats.sold.cigar ?? 0)}` },
  fiquera: { title: '¡Tercios de tabaco listos para el viaje!', text: 'Completaste <b>La Fiquera</b>, en Santander. Seis mil tercios de tabaco del Tabacal, forrados en tela de fique.', stat: (s) => `Tercios vendidos: ${formatNumber(s.stats.sold.tobacco_bale ?? 0)}` },
  lecheria: { title: '¡Arequipe para todo el pueblo!', text: 'Completaste la <b>Zona 3 · La Lechería</b>. Seis mil arequipes hechos con tu leche y la panela del Trapiche.', stat: (s) => `Arequipe vendido: ${formatNumber(s.stats.sold.arequipe ?? 0)}` },
};

// «al Tabacal», «a La Lechería»: el artículo «el» se contrae con la preposición.
const toZone = (name) => (name.startsWith('El ') ? `al ${name.slice(3)}` : `a ${name}`);

// onGo(zona): ir a la zona que se acaba de abrir. opened: regiones que se abrieron al completarla
// (v3.0: el Pueblo abre Santander).
export function showVictory(state, zoneId, onGo, opened = []) {
  const v = VICTORY[zoneId];
  const region = opened[0] && REGIONS_BY_ID[opened[0]];
  const next = ZONES_BY_ID[zoneId].next ?? (region ? region.zones[0] : null);
  document.getElementById('victory-title').textContent = v.title;
  document.getElementById('victory-text').innerHTML = v.text;
  document.getElementById('victory-stats').textContent = `Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)} · ${v.stat(state)}`;
  const soon = document.getElementById('victory-next');
  const go = document.getElementById('victory-go');
  const stay = document.getElementById('victory-ok');
  const modal = document.getElementById('victory');
  if (region) {
    soon.innerHTML = `¡Se abrió una región nueva: <b>${region.icon} ${region.name}</b>! Empieza de cero, con su propia economía, y tu Eje Cafetero sigue produciendo.`;
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
  stay.onclick = () => (modal.hidden = true);
}

// Número de la zona dentro de su región.
const zoneIndex = (id) => REGIONS_BY_ID[REGION_OF_ZONE[id]].zones.indexOf(id) + 1;
