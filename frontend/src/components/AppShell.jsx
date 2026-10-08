import React from 'react';
import { useLocation } from 'react-router-dom';
import UserHeader from './UserHeader.jsx';
import BillingBanner from './BillingBanner.jsx';
import Paywall from './Paywall.jsx';

// Shared layout for signed-in pages so they match the landing page theme
const AppShell = ({ user, children }) => {
  const { pathname } = useLocation();
  // Settings stays reachable so users can manage billing
  const blocked = user?.access?.allowed === false && pathname !== '/settings';

  return (
    <div className='min-h-screen bg-canvas font-geist text-fg antialiased [color-scheme:dark] selection:bg-steam/40'>
      <UserHeader user={user} />
      <BillingBanner access={user?.access} />
      <main>{blocked ? <Paywall user={user} /> : children}</main>
    </div>
  );
};

export default AppShell;
