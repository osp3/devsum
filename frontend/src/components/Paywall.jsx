import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PricingCard from './PricingCard.jsx';

const Paywall = ({ user }) => {
  const [searchParams] = useSearchParams();

  if (searchParams.get('checkout') === 'success') {
    return (
      <div role='status' className='flex flex-col items-center justify-center px-4 py-24 text-center'>
        <div className='mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-steam' />
        <p className='font-medium'>Confirming your payment</p>
        <p className='mt-1 text-sm text-fg/65'>This usually takes a few seconds.</p>
      </div>
    );
  }

  const trialEnded = user.access.status === 'none';
  return (
    <div className='mx-auto max-w-md px-4 py-16'>
      <p className='eyebrow'>{trialEnded ? 'Free trial ended' : 'Subscription ended'}</p>
      <h1 className='mt-2 text-3xl font-semibold tracking-[-0.03em]'>Keep your morning brief</h1>
      <p className='mt-3 text-fg/65'>Choose a plan to pick up where you left off. Your repositories and history are still here.</p>
      <div className='mt-8'>
        <PricingCard user={user} />
      </div>
    </div>
  );
};

export default Paywall;
