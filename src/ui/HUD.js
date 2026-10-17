import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { analyzeChain } from '../sim/analysis.js';
import { nextToUnlock } from '../sim/chain.js';
import { toast } from './toast.js';

export class HUD {
  constructor(game, onOpen) {
    this.game = game;
    this.coins = document.getElementById('coins');
    this.income = document.getElementById('income');
    this.chip = document.getElementById('bottleneck');
    // Tocar el aviso abre la estación que frena la cadena.
    this.chip.addEventListener('click', () => this.bottleneck && onOpen(this.bottleneck));
  }

  update() {
    const s = this.game.state;
    this.coins.textContent = formatNumber(s.coins);
    this.income.textContent = `+${formatRate(this.game.incomePerSecond())}/s`;
    this.bottleneck = analyzeChain(s).bottleneck;
    const [id, part] = this.bottleneck.split(':');
    const name = id === 'dispatch' ? DISPATCH.name : part === 'transport' ? `Arrieros de ${STATIONS_BY_ID[id].name}` : STATIONS_BY_ID[id].name;
    this.chip.hidden = false;
    this.chip.textContent = `🔴 Cuello de botella: ${name}`;
    this.hintUnlock(s);
  }

  // Avisa una sola vez cuando alcanza para construir la siguiente estación.
  hintUnlock(s) {
    const id = nextToUnlock(s);
    if (!id || s.hints.includes(id)) return;
    const q = this.game.quoteUnlock(id);
    if (!q.ok) return;
    s.hints.push(id);
    toast(`🏗️ ¡Ya puedes construir ${STATIONS_BY_ID[id].name}! Toca su parcela en el mapa.`, 6000);
  }
}
