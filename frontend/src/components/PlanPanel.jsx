import React from 'react';
import PricingCard from './PricingCard.jsx';
import useBilling from '../hooks/useBilling.js';
import { PLANS, canSubscribe, daysLeft, formatDate } from '../billing.js';

const planSummary = (access) => {
  switch (access.reason) {
    case 'admin':
      return ['Admin', 'Full access. No subscription needed.'];
    case 'paid': {
      const name = `DevSum Pro${access.plan ? `, ${PLANS[access.plan].label.toLowerCase()}` : ''}`;
      if (access.status === 'past_due') return [name, 'Your last payment failed. Update your card to keep access.'];
      return [name, access.currentPeriodEnd ? `Current period ends ${formatDate(access.currentPeriodEnd)}.` : 'Active.'];
    }
    case 'trial': {
      const days = daysLeft(access.trialEndsAt);
      return ['Free trial', `${days} ${days === 1 ? 'day' : 'days'} left, ends ${formatDate(access.trialEndsAt)}.`];
    }
    default:
      return [access.status === 'none' ? 'Free trial ended' : 'Subscription ended', 'Choose a plan to keep using DevSum.'];
  }
};

const PlanPanel = ({ user }) => {
  const { portal, pending, error } = useBilling();
  const access = user?.access;
  // Billing is switched off on the server
  if (!access || access.reason === 'open') return null;

  const [title, detail] = planSummary(access);
  return (
    <section className='panel mb-6 p-6' aria-labelledby='plan-heading'>
      <p className='eyebrow'>Plan</p>
      <div className='mt-2 flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 id='plan-heading' className='text-xl font-semibold tracking-[-0.02em]'>{title}</h2>
          <p className='mt-1 text-sm text-fg/65'>{detail}</p>
        </div>
        {access.canManageBilling && access.reason !== 'admin' && (
          <button type='button' onClick={portal} disabled={Boolean(pending)} className='btn-secondary h-9 cursor-pointer border px-4 text-sm'>
            {pending ? 'Opening...' : 'Manage billing'}
          </button>
        )}
      </div>
      {error && (
        <p role='alert' className='mt-3 text-sm text-node-red'>
          {error}
        </p>
      )}
      {canSubscribe(access) && (
        <div className='mt-6'>
          <PricingCard user={user} />
        </div>
      )}
    </section>
  );
};

export default PlanPanel;
