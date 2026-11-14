// "Buy me a coffee / Invitame un tinto" (v3.63): voluntary tip with no in-game reward. Placed behind
// an adult gate (a multiplication problem) because the game is also for children.
//   - Google Play build: uses Google Play Billing (one-time consumable products so they can be bought
//     again). Products are configured in Play Console with these exact IDs.
//   - Web: link to Ko-fi, when configured (KOFI_URL).
//   - Debug APK: hidden (Google Play Billing only works when installed from the Play Store).
import { toast } from './ui/toast.js';
import { t, tk } from './i18n/index.js';

export const TIPS = [
  { id: 'tinto', icon: '☕', name: tk('Un tinto'), thanks: tk('el tinto') },
  { id: 'arepa', icon: '🫓', name: tk('Una arepa'), thanks: tk('la arepa') },
  { id: 'almuerzo', icon: '🍲', name: tk('Un almuerzo'), thanks: tk('el almuerzo') },
];
export const KOFI_URL = '';
const PRODUCTS_TIMEOUT_MS = 20000; // if Google Play fails to respond, show an error instead of staying stuck on Loading

export const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// Adult gate: a two-digit number times a one-digit number (13 x 7), not trivially solved in one tap by a young child.
export function gateQuestion(random = Math.random) {
  const a = 12 + Math.floor(random() * 8);
  const b = 6 + Math.floor(random() * 4);
  return { text: `${a} × ${b}`, answer: a * b };
}

export const gatePasses = (question, input) => Number(String(input).trim()) === question.answer;

// mode: 'play' (Google Play Billing), 'web' (Ko-fi), or null (hidden).
export function tipMode({ native, playStore, kofi = KOFI_URL }) {
  if (native) return playStore ? 'play' : null;
  return kofi ? 'web' : null;
}

export function bindTip(mode) {
  if (!mode) return;
  const btn = document.getElementById('tip-btn');
  const modal = document.getElementById('tip');
  const gate = document.getElementById('tip-gate');
  const question = document.getElementById('tip-question');
  const input = document.getElementById('tip-answer');
  const options = document.getElementById('tip-options');
  const msg = document.getElementById('tip-msg');
  let q = null;
  let billing = null; // billing plugin module, loaded only in the Play Store build

  const ask = () => {
    q = gateQuestion();
    question.textContent = t('¿Cuánto es {q}?', { q: q.text });
    input.value = '';
  };
  btn.hidden = false;
  btn.addEventListener('click', () => {
    document.getElementById('menu').hidden = true;
    ask();
    gate.hidden = false;
    options.hidden = true;
    msg.textContent = '';
    modal.hidden = false;
    input.focus();
  });
  document.getElementById('tip-close').addEventListener('click', () => (modal.hidden = true));
  document.getElementById('tip-gate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!gatePasses(q, input.value)) {
      msg.textContent = t('Esa no es. Prueba con esta otra.');
      ask();
      return;
    }
    msg.textContent = '';
    gate.hidden = true;
    options.hidden = false;
    if (mode === 'web') showKofi(options);
    else await showProducts();
  });

  // Return the module rather than the plugin object: an async function cannot return a Capacitor plugin
  // because Capacitor proxies respond to `then`, causing the promise to hang forever
  // (v3.65.1: this was why Loading never finished).
  async function loadStore() {
    billing ??= await import('@capgo/native-purchases');
    return billing;
  }

  async function showProducts() {
    options.replaceChildren(note(t('Cargando…')));
    let prices = {};
    try {
      const s = (await loadStore()).NativePurchases;
      const query = s.getProducts({ productIdentifiers: TIPS.map((tip) => tip.id), productType: 'inapp' });
      const { products } = await withTimeout(query, PRODUCTS_TIMEOUT_MS);
      prices = Object.fromEntries(products.map((p) => [p.identifier, p.priceString]));
    } catch {
      // offline or without Google Play: message shown below
    }
    const available = TIPS.filter((tip) => prices[tip.id]);
    if (!available.length) {
      options.replaceChildren(note(t('Ahora no se puede invitar el tinto. Intenta más tarde (revisa que haya internet).')));
      return;
    }
    options.replaceChildren(
      note(t('Es una propina para quien hace el juego: no da nada dentro del juego. ¡Gracias!')),
      ...available.map((tip) => {
        const b = document.createElement('button');
        b.className = 'btn buy';
        b.textContent = `${tip.icon} ${t(tip.name)} · ${prices[tip.id]}`;
        b.addEventListener('click', () => buy(tip, b));
        return b;
      }),
    );
  }

  async function buy(tip, b) {
    b.disabled = true;
    try {
      const s = (await loadStore()).NativePurchases;
      await s.purchaseProduct({ productIdentifier: tip.id, productType: 'inapp', isConsumable: true });
      modal.hidden = true;
      toast(t('{icon} ¡Gracias por {what}! Con eso el juego sigue creciendo.', { icon: tip.icon, what: t(tip.thanks) }), 5000);
    } catch (err) {
      const text = String(err?.code ?? err?.message ?? '');
      if (/pending/i.test(text)) msg.textContent = t('El pago quedó pendiente. Cuando se confirme, ¡gracias!');
      else if (!/cancel/i.test(text)) msg.textContent = t('No se pudo completar el pago. Intenta más tarde.');
    }
    b.disabled = false;
  }

  // A pending payment (e.g. cash) settles later while closed: if not consumed, Google refunds it
  // after 3 days and blocks repurchasing that product.
  if (mode === 'play') settlePending();
  async function settlePending() {
    try {
      const s = (await loadStore()).NativePurchases;
      const { purchases } = await s.getPurchases({ productType: 'inapp' });
      for (const p of purchases) if (p.purchaseState === '1' && p.purchaseToken) await s.consumePurchase({ purchaseToken: p.purchaseToken });
    } catch {
      // retry consuming on the next app launch
    }
  }
}

function showKofi(options) {
  const a = document.createElement('a');
  a.className = 'btn buy';
  a.href = KOFI_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = t('☕ Invitar en Ko-fi');
  options.replaceChildren(note(t('Es una propina para quien hace el juego: no da nada dentro del juego. ¡Gracias!')), a);
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'chain-help';
  p.textContent = text;
  return p;
}
