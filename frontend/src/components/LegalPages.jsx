import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/devsum-logo.png';
import SiteFooter from './SiteFooter.jsx';
import { CONTACT_EMAIL } from '../siteConfig.js';

const LAST_UPDATED = 'October 2, 2026';

const LegalLayout = ({ title, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    const previousTitle = document.title;
    document.title = `${title} · DevSum`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className='min-h-screen bg-canvas font-geist text-fg antialiased [color-scheme:dark] selection:bg-steam/40'>
      <header className='border-b border-line'>
        <nav className='mx-auto flex h-16 max-w-6xl items-center justify-between px-6' aria-label='Main'>
          <Link to='/' className='flex items-center gap-2.5 font-semibold tracking-tight'>
            <img src={logo} alt='' className='h-7 w-7 object-contain' />
            DevSum
          </Link>
          <Link to='/' className='text-sm text-fg/65 hover:text-fg'>
            Back to home
          </Link>
        </nav>
      </header>

      <main className='mx-auto max-w-3xl px-6 py-20'>
        <p className='font-geist-mono text-xs uppercase tracking-[0.14em] text-steam'>Legal</p>
        <h1 className='mt-3 text-4xl font-semibold tracking-[-0.03em]'>{title}</h1>
        <p className='mt-3 font-geist-mono text-xs text-fg/60'>Last updated {LAST_UPDATED}</p>
        <div className='mt-12 space-y-12'>{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
};

const Section = ({ title, children }) => (
  <section>
    <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
    <div className='mt-3 space-y-3 text-sm leading-7 text-fg/70'>{children}</div>
  </section>
);

const Bullets = ({ items }) => (
  <ul className='list-disc space-y-2 pl-5 marker:text-fg/40'>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const ContactLine = ({ children }) =>
  CONTACT_EMAIL ? (
    <Section title='Contact'>
      <p>
        {children}{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className='text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg'>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </Section>
  ) : null;

export const PrivacyPage = () => (
  <LegalLayout title='Privacy Policy'>
    <Section title='The short version'>
      <Bullets
        items={[
          'DevSum reads your GitHub commits and diffs, and never writes to your repositories.',
          'Diffs are sent to OpenAI using your own API key. We do not store your source code or diffs.',
          'Your GitHub token and OpenAI key are encrypted before they are stored.',
          'We do not sell your data and we do not run advertising or analytics trackers.',
        ]}
      />
    </Section>

    <Section title='What we collect'>
      <Bullets
        items={[
          'GitHub profile details: your GitHub ID, username, avatar, and your email address if GitHub provides it.',
          'A GitHub access token, granted when you sign in. It is stored encrypted.',
          'Repository metadata: the name, visibility, default branch and last-updated time of the repositories you can access.',
          'Your OpenAI API key and preferred model, if you add them in Settings. The key is stored encrypted.',
          'Your time zone and the time you last used DevSum, so your morning brief can be prepared in time.',
          'Results generated for you: commit categories, suggested commit messages, daily summaries, task suggestions and code review findings.',
        ]}
      />
    </Section>

    <Section title='Where your data goes'>
      <p>
        <span className='text-fg'>GitHub.</span> DevSum requests the <code className='font-geist-mono text-[13px] text-fg'>repo</code> and{' '}
        <code className='font-geist-mono text-[13px] text-fg'>user:email</code> scopes. GitHub does not offer OAuth apps a read-only scope for
        private repositories, so <code className='font-geist-mono text-[13px] text-fg'>repo</code> is the narrowest scope that includes them.
        DevSum only uses it to read commits and diffs.
      </p>
      <p>
        <span className='text-fg'>OpenAI.</span> To analyse a commit, DevSum sends its diff to OpenAI using the API key you provide. How OpenAI
        handles that data is governed by the terms of your own OpenAI account. DevSum does not use a shared OpenAI account.
      </p>
      <p>
        <span className='text-fg'>Infrastructure.</span> Your data is stored with the hosting and database providers we use to run the service.
        The site also loads fonts from Google Fonts, so your browser makes requests to Google when you visit.
      </p>
    </Section>

    <Section title='How long we keep it'>
      <Bullets
        items={[
          'Sign-in sessions expire after 24 hours.',
          'Short-lived caches of commit analysis expire after 30 minutes.',
          'Generated results and the other data above are kept until you ask us to delete them.',
        ]}
      />
    </Section>

    <Section title='Security'>
      <p>
        GitHub tokens and OpenAI keys are encrypted with AES-256-GCM before they are written to the database. Session cookies are HTTP-only and
        are sent over HTTPS in production. No system is perfectly secure, but we limit what we store and keep access read-only.
      </p>
    </Section>

    <Section title='Cookies and tracking'>
      <p>
        DevSum sets one cookie, <code className='font-geist-mono text-[13px] text-fg'>devsum.session</code>, to keep you signed in. We do not use
        advertising cookies or third-party analytics.
      </p>
    </Section>

    <Section title='Your choices'>
      <Bullets
        items={[
          'Remove DevSum’s access to your GitHub account at any time in GitHub’s application settings.',
          'Replace your OpenAI key or change your model from the Settings page.',
          'Sign out at any time to end your session.',
        ]}
      />
    </Section>

    <Section title='Changes'>
      <p>If this policy changes in a meaningful way, we will update the date above.</p>
    </Section>

    <ContactLine>For questions, or to ask us to delete your data, email</ContactLine>
  </LegalLayout>
);

export const TermsPage = () => (
  <LegalLayout title='Terms of Service'>
    <Section title='Using DevSum'>
      <p>
        By signing in to DevSum you agree to these terms. DevSum is an open beta. Features can change, and the service can be unavailable or
        stop at any time.
      </p>
    </Section>

    <Section title='Your account and your code'>
      <Bullets
        items={[
          'You sign in with GitHub and are responsible for activity on your account.',
          'Only connect repositories you are allowed to analyse. You are responsible for sending their contents to OpenAI under your own OpenAI account.',
          'You provide your own OpenAI API key and are responsible for the costs and the terms of that account.',
        ]}
      />
    </Section>

    <Section title='AI-generated output'>
      <p>
        Summaries, suggested commit messages, task suggestions and code review findings are generated by AI and can be incomplete or wrong.
        Review them before acting on them. You are responsible for decisions you make based on them.
      </p>
    </Section>

    <Section title='Acceptable use'>
      <Bullets
        items={[
          'Do not attempt to disrupt, overload or probe the service for weaknesses.',
          'Do not use DevSum to access repositories or data you are not authorised to access.',
          'Do not use DevSum in a way that breaks the law or the terms of GitHub or OpenAI.',
        ]}
      />
    </Section>

    <Section title='No warranty'>
      <p>
        DevSum is provided “as is” and “as available”, without warranties of any kind. To the fullest extent permitted by law, DevSum is not
        liable for indirect or consequential losses, or for loss of data or profits, arising from your use of the service.
      </p>
    </Section>

    <Section title='Ending your use'>
      <p>
        You can stop using DevSum at any time by removing its access in your GitHub settings. We may suspend or end access if these terms are
        broken or to protect the service.
      </p>
    </Section>

    <Section title='Changes'>
      <p>We may update these terms. Continuing to use DevSum after an update means you accept the new terms.</p>
    </Section>

    <ContactLine>Questions about these terms? Email</ContactLine>
  </LegalLayout>
);
