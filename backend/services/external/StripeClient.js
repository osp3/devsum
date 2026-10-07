import Stripe from 'stripe';

let client;

// Lazily created so the server starts without Stripe keys; tests replace `get`
export const stripeClient = {
  get: () => (client ||= new Stripe(process.env.STRIPE_SECRET_KEY)),
};

export const constructWebhookEvent = (payload, signature, secret) =>
  Stripe.webhooks.constructEvent(payload, signature, secret);
