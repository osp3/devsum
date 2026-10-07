import express from 'express';
import { constructWebhookEvent } from '../services/external/StripeClient.js';
import { handleStripeEvent } from '../services/billing/StripeEvents.js';

const router = express.Router();

// Signature verification needs the exact raw body, so mount before express.json()
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook not configured' });

  let event;
  try {
    event = constructWebhookEvent(req.body, req.get('stripe-signature'), secret);
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await handleStripeEvent(event);
    console.log(`💳 Stripe event ${event.type} ${event.id}`);
    return res.json({ received: true });
  } catch (error) {
    // A 5xx makes Stripe retry the delivery
    console.error(`❌ Stripe event ${event.type} ${event.id} failed:`, error.message);
    return res.status(500).json({ error: 'Event processing failed' });
  }
});

export default router;
