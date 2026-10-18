import { formatDuration, formatNumber } from '../core/format.js';
import { ZONES_BY_ID, ZONE_LIST } from '../data/zones/index.js';
import { ZONES as ALL_ZONES } from '../data/products.js';

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
  finca: { title: '¡Primer gran pedido entregado!', text: 'Completaste la <b>Zona 1 · La Finca</b>. Mil bolsas de tu café ya van camino al pueblo.', stat: (s) => `Bolsas vendidas: ${formatNumber(s.stats.sold.coffee_bag ?? 0)}` },
  trapiche: { title: '¡Primer cargamento de panela!', text: 'Completaste la <b>Zona 2 · El Trapiche</b>. Cinco mil panelas pulverizadas endulzan el pueblo.', stat: (s) => `Panela pulverizada vendida: ${formatNumber(s.stats.sold.panela_powder ?? 0)}` },
  maizal: { title: '¡Arepas para toda la plaza!', text: 'Completaste la <b>Zona 5 · El Maizal</b>. Tres mil bandejas de arepas de queso, con el queso y la mantequilla de la Lechería.', stat: (s) => `Arepas de queso vendidas: ${formatNumber(s.stats.sold.cheese_arepa ?? 0)}` },
  pueblo: { title: '¡El café de la vereda viaja por el mundo!', text: 'Completaste la <b>Zona 6 · El Pueblo</b> y el juego. Mil contenedores de canastas de regalo, con café, panela, arequipe y chocolate de todas tus zonas, salen hacia el puerto. ¡Gracias por jugar!', stat: (s) => `Contenedores exportados: ${formatNumber(s.stats.sold.container ?? 0)}` },
  cacaotal: { title: '¡Chocolate para la feria!', text: 'Completaste la <b>Zona 4 · El Cacaotal</b>. Tres mil chocolatinas hechas con tu cacao, la panela del Trapiche y la leche de la Lechería.', stat: (s) => `Chocolatinas vendidas: ${formatNumber(s.stats.sold.milk_chocolate ?? 0)}` },
  lecheria: { title: '¡Arequipe para todo el pueblo!', text: 'Completaste la <b>Zona 3 · La Lechería</b>. Tres mil arequipes hechos con tu leche y la panela del Trapiche.', stat: (s) => `Arequipe vendido: ${formatNumber(s.stats.sold.arequipe ?? 0)}` },
};

// onGo(zona): ir a la zona que se acaba de abrir.
export function showVictory(state, zoneId, onGo) {
  const v = VICTORY[zoneId];
  const next = ZONES_BY_ID[zoneId].next;
  document.getElementById('victory-title').textContent = v.title;
  document.getElementById('victory-text').innerHTML = v.text;
  document.getElementById('victory-stats').textContent = `Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)} · ${v.stat(state)}`;
  const soon = document.getElementById('victory-next');
  const go = document.getElementById('victory-go');
  const stay = document.getElementById('victory-ok');
  const modal = document.getElementById('victory');
  if (next) {
    soon.innerHTML = `Se abrió la <b>Zona ${zoneIndex(next)} · ${ZONES_BY_ID[next].name}</b> ${ZONES_BY_ID[next].icon}`;
    go.hidden = false;
    go.textContent = `Ir a ${ZONES_BY_ID[next].name} ${ZONES_BY_ID[next].icon}`;
    go.onclick = () => {
      modal.hidden = true;
      onGo(next);
    };
  } else {
    const i = ALL_ZONES.findIndex((z) => z.id === zoneId) + 1;
    soon.innerHTML = ALL_ZONES[i] ? `Próximamente: <b>Zona ${i + 1} · ${ALL_ZONES[i].name}</b> (v${ALL_ZONES[i].release})` : '¡Completaste todas las zonas!';
    go.hidden = true;
  }
  stay.textContent = next ? 'Quedarme aquí' : 'Seguir jugando';
  modal.hidden = false;
  stay.onclick = () => (modal.hidden = true);
}

const zoneIndex = (id) => ZONE_LIST.findIndex((z) => z.id === id) + 1;
