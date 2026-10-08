import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useBilling from '../hooks/useBilling.js';
import { PLANS, TRIAL_DAYS, canSubscribe } from '../billing.js';
import { GITHUB_AUTH_URL } from '../siteConfig.js';

const FEATURES = [
  "Morning brief from yesterday's commits",
  "A prioritized plan for today",
  'Commit analysis and code review',
  'AI included, or bring your own OpenAI key',
  'Cancel anytime from Settings',
];

const CTA_CLASS = 'btn-primary inline-flex h-11 w-full items-center justify-center text-sm font-medium cursor-pointer';

const PricingCard = ({ user = null }) => {
  const [interval, chooseInterval] = useState('month');
  const { checkout, pending, error } = useBilling();
  const plan = PLANS[interval];

  const cta = !user ? (
    <a href={GITHUB_AUTH_URL} className={CTA_CLASS}>
      Start {TRIAL_DAYS}-day free trial
    </a>
  ) : canSubscribe(user.access) ? (
    <button type='button' onClick={() => checkout(interval)} disabled={Boolean(pending)} className={CTA_CLASS}>
      {pending ? 'Opening checkout...' : `Subscribe for ${plan.price}/${plan.period}`}
    </button>
  ) : (
    <Link to='/dashboard' className={CTA_CLASS}>
      Open dashboard
    </Link>
  );

  return (
    <div className='panel p-6 sm:p-8'>
      <div className='flex items-center justify-between gap-4'>
        <p className='eyebrow'>DevSum Pro</p>
        <div role='group' aria-label='Billing period' className='flex rounded-full border border-line p-0.5 text-xs'>
          {Object.entries(PLANS).map(([key, { label }]) => (
            <button
              key={key}
              type='button'
              aria-pressed={interval === key}
              onClick={() => chooseInterval(key)}
              className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${interval === key ? 'bg-fg text-canvas' : 'text-fg/65 hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className='mt-6 flex items-baseline gap-1.5'>
        <span className='text-5xl font-semibold tracking-[-0.04em]'>{plan.price}</span>
        <span className='text-fg/60'>/{plan.period}</span>
        {plan.note && (
          <span className='ml-2 rounded-full border border-steam/40 px-2 py-0.5 font-geist-mono text-[11px] text-steam'>{plan.note}</span>
        )}
      </p>
      <p className='mt-2 text-sm text-fg/65'>
        {user ? `Billed today, then every ${plan.period} until you cancel.` : `${TRIAL_DAYS} days free. No card needed to start.`}
      </p>

      <ul className='mt-6 space-y-2.5 text-sm text-fg/80'>
        {FEATURES.map((feature) => (
          <li key={feature} className='flex items-start gap-2.5'>
            <svg className='mt-1 h-3.5 w-3.5 shrink-0 text-steam' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
              <path d='M3 8.5l3 3 7-7' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <div className='mt-8'>{cta}</div>
      {error && (
        <p role='alert' className='mt-3 text-sm text-node-red'>
          {error}
        </p>
      )}
      <p className='mt-4 text-xs leading-5 text-fg/55'>
        Prices include applicable tax. Payments are handled by Stripe and sold through Link.
      </p>
    </div>
  );
};

export default PricingCard;
