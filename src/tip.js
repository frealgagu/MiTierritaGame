// «Invítame un tinto» (v3.63): una propina voluntaria, sin ningún premio en el juego. Va detrás de una
// barrera para adultos (una multiplicación), porque el juego también es para niños.
//   - Versión de Google Play: con los cobros de Google (productos de una sola compra, consumibles, así que
//     se pueden repetir). Los productos se crean en Play Console con estos mismos identificadores.
//   - Web: un enlace a Ko-fi, cuando exista (KOFI_URL).
//   - APK de prueba: sin botón (los cobros de Google solo funcionan con la app instalada desde la tienda).
import { toast } from './ui/toast.js';

export const TIPS = [
  { id: 'tinto', icon: '☕', name: 'Un tinto', thanks: 'el tinto' },
  { id: 'arepa', icon: '🫓', name: 'Una arepa', thanks: 'la arepa' },
  { id: 'almuerzo', icon: '🍲', name: 'Un almuerzo', thanks: 'el almuerzo' },
];
export const KOFI_URL = '';
const PRODUCTS_TIMEOUT_MS = 20000; // si Google Play no responde, se avisa en vez de quedarse en «Cargando…»

export const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// La barrera: un número de dos cifras por uno de una (13 × 7), que un niño pequeño no resuelve de un toque.
export function gateQuestion(random = Math.random) {
  const a = 12 + Math.floor(random() * 8);
  const b = 6 + Math.floor(random() * 4);
  return { text: `${a} × ${b}`, answer: a * b };
}

export const gatePasses = (question, input) => Number(String(input).trim()) === question.answer;

// mode: 'play' (cobros de Google), 'web' (Ko-fi) o null (sin botón).
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
  let billing = null; // el módulo del complemento de cobros, se carga solo en la versión de Play

  const ask = () => {
    q = gateQuestion();
    question.textContent = `¿Cuánto es ${q.text}?`;
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
      msg.textContent = 'Esa no es. Prueba con esta otra.';
      ask();
      return;
    }
    msg.textContent = '';
    gate.hidden = true;
    options.hidden = false;
    if (mode === 'web') showKofi(options);
    else await showProducts();
  });

  // Se guarda el módulo y no el complemento: una función async no puede devolver el complemento, porque
  // Capacitor responde a cualquier método, también a `then`, y la promesa se queda esperándolo para siempre
  // (v3.65.1: por eso «Cargando…» no terminaba).
  async function loadStore() {
    billing ??= await import('@capgo/native-purchases');
    return billing;
  }

  async function showProducts() {
    options.replaceChildren(note('Cargando…'));
    let prices = {};
    try {
      const s = (await loadStore()).NativePurchases;
      const query = s.getProducts({ productIdentifiers: TIPS.map((t) => t.id), productType: 'inapp' });
      const { products } = await withTimeout(query, PRODUCTS_TIMEOUT_MS);
      prices = Object.fromEntries(products.map((p) => [p.identifier, p.priceString]));
    } catch {
      // sin conexión o sin Google Play: se dice abajo
    }
    const available = TIPS.filter((t) => prices[t.id]);
    if (!available.length) {
      options.replaceChildren(note('Ahora no se puede invitar el tinto. Intenta más tarde (revisa que haya internet).'));
      return;
    }
    options.replaceChildren(
      note('Es una propina para quien hace el juego: no da nada dentro del juego. ¡Gracias!'),
      ...available.map((t) => {
        const b = document.createElement('button');
        b.className = 'btn buy';
        b.textContent = `${t.icon} ${t.name} · ${prices[t.id]}`;
        b.addEventListener('click', () => buy(t, b));
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
      toast(`${tip.icon} ¡Gracias por ${tip.thanks}! Con eso el juego sigue creciendo.`, 5000);
    } catch (err) {
      const text = String(err?.code ?? err?.message ?? '');
      if (/pending/i.test(text)) msg.textContent = 'El pago quedó pendiente. Cuando se confirme, ¡gracias!';
      else if (!/cancel/i.test(text)) msg.textContent = 'No se pudo completar el pago. Intenta más tarde.';
    }
    b.disabled = false;
  }

  // Un pago que quedó pendiente (por ejemplo, en efectivo) se confirma después, con el juego cerrado: si no
  // se consume, Google lo devuelve a los 3 días y no deja volver a comprar ese producto.
  if (mode === 'play') settlePending();
  async function settlePending() {
    try {
      const s = (await loadStore()).NativePurchases;
      const { purchases } = await s.getPurchases({ productType: 'inapp' });
      for (const p of purchases) if (p.purchaseState === '1' && p.purchaseToken) await s.consumePurchase({ purchaseToken: p.purchaseToken });
    } catch {
      // se intenta de nuevo la próxima vez que se abra el juego
    }
  }
}

function showKofi(options) {
  const a = document.createElement('a');
  a.className = 'btn buy';
  a.href = KOFI_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = '☕ Invitar en Ko-fi';
  options.replaceChildren(note('Es una propina para quien hace el juego: no da nada dentro del juego. ¡Gracias!'), a);
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'chain-help';
  p.textContent = text;
  return p;
}
