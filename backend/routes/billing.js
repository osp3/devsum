import express from 'express';
import User from '../models/User.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { billingRateLimit } from '../middleware/rateLimit.js';
import { frontendUrl, getAccess, isBillingEnabled, priceIdFor } from '../config/billing.js';
import { stripeClient } from '../services/external/StripeClient.js';

const router = express.Router();

const fail = (res, status, error) => res.status(status).json({ success: false, error });

router.use((req, res, next) => (isBillingEnabled() ? next() : fail(res, 404, 'Billing is not enabled')));
router.use(ensureAuthenticated, billingRateLimit);

// Reuse the user's Stripe customer; the idempotency key stops concurrent requests creating two
const ensureCustomer = async (stripe, user) => {
  if (user.billing?.customerId) return user.billing.customerId;

  const userId = String(user._id);
  const customer = await stripe.customers.create(
    { name: user.username, ...(user.email && { email: user.email }), metadata: { userId } },
    { idempotencyKey: `customer-${userId}` }
  );
  await User.updateOne(
    { _id: user._id, 'billing.customerId': { $in: [null, customer.id] } },
    { $set: { 'billing.customerId': customer.id } }
  );
  return customer.id;
};

// POST /api/billing/checkout { interval: 'month' | 'year' } -> { url }
router.post('/checkout', async (req, res, next) => {
  try {
    const price = priceIdFor(req.body?.interval);
    if (!price) return fail(res, 400, 'Interval must be month or year');

    const user = await User.findById(req.user._id);
    const { reason } = getAccess(user);
    if (reason === 'admin') return fail(res, 409, 'Admins have full access without a subscription');
    if (reason === 'paid') return fail(res, 409, 'You already have a subscription. Use Manage billing to change it.');

    const stripe = stripeClient.get();
    const customer = await ensureCustomer(stripe, user);
    const userId = String(user._id);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: userId,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { userId } },
      managed_payments: { enabled: true },
      success_url: `${frontendUrl()}/dashboard?checkout=success`,
      cancel_url: `${frontendUrl()}/settings`,
    });

    return res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    return next(error);
  }
});

// POST /api/billing/portal -> { url }
router.post('/portal', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const customer = user?.billing?.customerId;
    if (!customer) return fail(res, 400, 'No billing account yet');

    const session = await stripeClient.get().billingPortal.sessions.create({
      customer,
      return_url: `${frontendUrl()}/settings`,
    });
    return res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    return next(error);
  }
});

export default router;
