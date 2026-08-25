/**
 * Gateway checkout, loaded on demand.
 *
 * Which gateway runs is a BMS setting, so neither script is bundled: the page
 * fetches only the one the server actually names, and a visitor who never
 * buys downloads neither.
 */

import { currentHost } from './host.js';

/** Load a third-party script once, resolving when it is ready. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Checkout failed to load.')));
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.addEventListener('load', () => { el.dataset.loaded = '1'; resolve(); });
    el.addEventListener('error', () => reject(new Error('Checkout failed to load.')));
    document.head.appendChild(el);
  });
}

/**
 * Razorpay's own overlay.
 *
 * Resolving here means the widget reported success, NOT that the Yandle is
 * paid for. Only the webhook flips the record — a client that says "paid"
 * is a client anyone can fake.
 */
export function openRazorpay(checkout) {
  return loadScript('https://checkout.razorpay.com/v1/checkout.js').then(() => new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: checkout.key_id,
      order_id: checkout.order_id,
      amount: checkout.amount_cents,
      currency: checkout.currency,
      name: 'Yandle.world',
      description: `${currentHost()}/${checkout.handle}`,
      theme: { color: '#B23F16' },
      handler: () => resolve({ submitted: true }),
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    });
    rz.on('payment.failed', (e) => reject(new Error(e?.error?.description || 'Payment failed.')));
    rz.open();
  }));
}

/** Paddle's overlay, opened against a transaction the server created. */
export function openPaddle(checkout) {
  return loadScript('https://cdn.paddle.com/paddle/v2/paddle.js').then(() => new Promise((resolve, reject) => {
    const Paddle = window.Paddle;
    if (!Paddle) return reject(new Error('Checkout failed to load.'));
    if (checkout.environment === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({
      token: checkout.client_token,
      eventCallback: (e) => {
        if (e.name === 'checkout.completed') resolve({ submitted: true });
        if (e.name === 'checkout.closed') reject(new Error('Payment cancelled.'));
      },
    });
    Paddle.Checkout.open({ transactionId: checkout.transaction_id });
  }));
}
