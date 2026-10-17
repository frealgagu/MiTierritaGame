import { formatDuration, formatNumber } from '../core/format.js';

// Ventana de bienvenida con lo ganado mientras el juego estuvo cerrado.
export function showWelcome({ seconds, coins, capped, cap }, onCollect) {
  const modal = document.getElementById('welcome');
  document.getElementById('welcome-text').textContent = capped
    ? `Estuviste fuera más de ${formatDuration(cap)}. Tu finca trabajó ${formatDuration(seconds)} (el máximo) y ganó:`
    : `Mientras no estabas (${formatDuration(seconds)}), tu finca siguió trabajando y ganó:`;
  document.getElementById('welcome-coins').textContent = `💰 ${formatNumber(coins)}`;
  modal.hidden = false;
  const ok = document.getElementById('welcome-ok');
  ok.onclick = () => {
    modal.hidden = true;
    onCollect?.();
  };
}

export function showVictory(state) {
  document.getElementById('victory-stats').textContent =
    `Tiempo jugado: ${formatDuration(state.playTime)} · Ganado en total: 💰 ${formatNumber(state.totalEarned)} · Bolsas vendidas: ${formatNumber(state.stats.sold.coffee_bag ?? 0)}`;
  const modal = document.getElementById('victory');
  modal.hidden = false;
  document.getElementById('victory-ok').onclick = () => (modal.hidden = true);
}
