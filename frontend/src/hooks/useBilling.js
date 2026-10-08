import { useState } from 'react';

// Redirects to Stripe-hosted Checkout or the customer portal
export default function useBilling() {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  const redirect = async (path, body, key) => {
    setPending(key);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      const url = result.data?.url;
      if (!response.ok || !url) throw new Error(result.error || 'Billing is unavailable right now. Please try again.');
      // Leave pending set while the browser navigates away
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
      setPending(null);
    }
  };

  return {
    pending,
    error,
    checkout: (interval) => redirect('checkout', { interval }, interval),
    portal: () => redirect('portal', {}, 'portal'),
  };
}
