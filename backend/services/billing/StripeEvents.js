import mongoose from 'mongoose';
import User from '../../models/User.js';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

const userFilter = (customerId, userId) => ({
  $or: [
    { 'billing.customerId': customerId },
    ...(mongoose.isValidObjectId(userId) ? [{ _id: userId }] : []),
  ],
});

const linkCustomer = (session) => {
  if (session.mode !== 'subscription' || !session.customer) return null;
  if (!mongoose.isValidObjectId(session.client_reference_id)) return null;
  return User.updateOne(
    { _id: session.client_reference_id, 'billing.customerId': { $in: [null, session.customer] } },
    { $set: { 'billing.customerId': session.customer } }
  );
};

/**
 * Overwrite billing state from a subscription object. Older events and events for a
 * replaced subscription are ignored, so retries and out-of-order delivery are safe.
 */
const syncSubscription = (subscription, eventAt, deleted) => {
  const status = deleted ? 'canceled' : subscription.status;
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  return User.updateOne(
    {
      $and: [
        userFilter(subscription.customer, subscription.metadata?.userId),
        { $or: [{ 'billing.updatedAt': { $exists: false } }, { 'billing.updatedAt': { $lte: eventAt } }] },
        {
          $or: [
            { 'billing.subscriptionId': { $in: [null, subscription.id] } },
            { 'billing.status': { $nin: ACTIVE_STATUSES } },
          ],
        },
      ],
    },
    {
      $set: {
        'billing.customerId': subscription.customer,
        'billing.subscriptionId': subscription.id,
        'billing.status': status,
        'billing.updatedAt': eventAt,
        ...(item?.price?.id && { 'billing.priceId': item.price.id }),
        ...(periodEnd && { 'billing.currentPeriodEnd': new Date(periodEnd * 1000) }),
      },
    }
  );
};

/**
 * Apply a verified Stripe event to the user it belongs to
 * @param {Object} event - Event returned by constructWebhookEvent
 */
export const handleStripeEvent = async (event) => {
  const object = event.data.object;
  const eventAt = new Date(event.created * 1000);

  switch (event.type) {
    case 'checkout.session.completed':
      return linkCustomer(object);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return syncSubscription(object, eventAt, false);
    case 'customer.subscription.deleted':
      return syncSubscription(object, eventAt, true);
    default:
      return null;
  }
};
