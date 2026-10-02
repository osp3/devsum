import React from 'react';
import UserHeader from './UserHeader.jsx';

// Shared layout for signed-in pages so they match the landing page theme
const AppShell = ({ user, children }) => (
  <div className='min-h-screen bg-canvas font-geist text-fg antialiased [color-scheme:dark] selection:bg-steam/40'>
    <UserHeader user={user} />
    <main>{children}</main>
  </div>
);

export default AppShell;
