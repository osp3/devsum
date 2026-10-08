import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/devsum-logo.png';
import { CONTACT_EMAIL } from '../siteConfig.js';

const FooterColumn = ({ title, children }) => (
  <div>
    <p className='font-geist-mono text-xs uppercase tracking-[0.14em] text-fg/60'>{title}</p>
    <ul className='mt-4 space-y-3 text-sm text-fg/70'>{children}</ul>
  </div>
);

const SiteFooter = ({ onLanding = false }) => (
  <footer className='border-t border-line bg-canvas'>
    <div className='mx-auto max-w-6xl px-6 py-14'>
      <div className='grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]'>
        <div>
          <Link to='/' className='flex w-fit items-center gap-2.5 font-semibold tracking-tight'>
            <img src={logo} alt='' className='h-6 w-6 object-contain' />
            DevSum
          </Link>
          <p className='mt-4 max-w-xs text-sm leading-6 text-fg/60'>
            Daily engineering briefs, written from your GitHub history.
          </p>
        </div>

        <FooterColumn title='Product'>
          {onLanding ? (
            <>
              <li><a href='#product' className='hover:text-fg'>Overview</a></li>
              <li><a href='#how' className='hover:text-fg'>How it works</a></li>
              <li><a href='#pricing' className='hover:text-fg'>Pricing</a></li>
              <li><a href='#security' className='hover:text-fg'>Security</a></li>
            </>
          ) : (
            <li><Link to='/' className='hover:text-fg'>Home</Link></li>
          )}
        </FooterColumn>

        <FooterColumn title='Legal'>
          <li><Link to='/privacy' className='hover:text-fg'>Privacy</Link></li>
          <li><Link to='/terms' className='hover:text-fg'>Terms</Link></li>
          <li><Link to='/refunds' className='hover:text-fg'>Refunds</Link></li>
        </FooterColumn>

        {CONTACT_EMAIL && (
          <FooterColumn title='Contact'>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className='hover:text-fg'>{CONTACT_EMAIL}</a></li>
          </FooterColumn>
        )}
      </div>

      <div className='mt-14 flex flex-col gap-2 border-t border-line pt-6 text-xs text-fg/60 sm:flex-row sm:items-center sm:justify-between'>
        <span>© {new Date().getFullYear()} DevSum</span>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
