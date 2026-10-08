import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { daysLeft } from '../billing.js';

const TRIAL_REMINDER_DAYS = 5;

const Banner = ({ children }) => (
  <p role='status' className='border-b border-steam/30 bg-steam/10 px-4 py-3 text-center text-sm text-fg/85'>
    {children}
  </p>
);

const BillingBanner = ({ access }) => {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  if (!access) return null;

  const checkout = searchParams.get('checkout');
  if (checkout === 'success' && access.allowed) {
    return <Banner>{access.reason === 'paid' ? "You're subscribed. Thanks for supporting DevSum." : 'Confirming your payment...'}</Banner>;
  }
  if (checkout === 'delayed') {
    return <Banner>Your payment is taking longer than usual to confirm. Refresh in a minute to check again.</Banner>;
  }

  const days = access.reason === 'trial' ? daysLeft(access.trialEndsAt) : Infinity;
  if (days > TRIAL_REMINDER_DAYS) return null;
  return (
    <Banner>
      {days} {days === 1 ? 'day' : 'days'} left in your free trial.{' '}
      {pathname !== '/settings' && (
        <Link to='/settings' className='font-medium text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg'>
          Choose a plan
        </Link>
      )}
    </Banner>
  );
};

export default BillingBanner;
