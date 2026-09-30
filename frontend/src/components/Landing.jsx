import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/devsum-logo.png';

const GITHUB_AUTH_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/github`;

const CATEGORY_COLORS = {
  feature: 'bg-node-blue',
  bugfix: 'bg-node-red',
  refactor: 'bg-node-yellow',
  docs: 'bg-steam',
  other: 'bg-fg/25',
};

const PRIORITY_STYLES = {
  high: 'text-node-red border-node-red/30',
  medium: 'text-node-yellow border-node-yellow/40',
  low: 'text-steam border-steam/30',
};

const RAW_COMMITS = [
  ['a3f9c21', 'wip'],
  ['7be01d4', 'fix stuff'],
  ['c19e8a0', 'update auth'],
  ['4d2f7b3', 'asdf'],
  ['e81c0f9', 'more changes to dashboard'],
];

const BREAKDOWN = [
  ['feature', 2],
  ['bugfix', 1],
  ['refactor', 1],
  ['other', 1],
];

const PRIORITIES = [
  ['high', 'Add expiry tests for token refresh'],
  ['medium', 'Finish splitting Dashboard into widgets'],
  ['low', 'Document the /auth/refresh endpoint'],
];

const FACTS = [
  ['GitHub OAuth', 'Public and private repositories'],
  ['Your OpenAI key', 'GPT-6 Astra, Sol and Luna'],
  ['5 categories', 'Every commit classified automatically'],
  ['4 review lenses', 'Security, performance, maintainability, quality'],
];

const REVIEW_ISSUES = [
  ['high', 'security', 'Token compared with == instead of timing-safe equal'],
  ['medium', 'performance', 'User lookup runs inside a loop over sessions'],
  ['low', 'maintainability', 'handleAuth() is 140 lines, extract validation'],
];

const TREND = [62, 58, 66, 71, 69, 77, 82];

const STEPS = [
  ['Connect GitHub', 'Sign in with OAuth and pick the repositories you want DevSum to follow.'],
  ['DevSum reads the diffs', 'Commits are categorized and reviewed with the OpenAI model you choose.'],
  ['Open your brief', "Yesterday's summary and today's priorities are waiting on your dashboard."],
];

const GitHubIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
  </svg>
);

const Cross = ({ className }) => (
  <svg className={`absolute h-3 w-3 text-fg/40 ${className}`} viewBox='0 0 12 12' aria-hidden='true'>
    <path d='M6 0v12M0 6h12' stroke='currentColor' strokeWidth='1' />
  </svg>
);

const Frame = ({ children, className = '' }) => (
  <div className={`relative border border-line ${className}`}>
    <Cross className='-top-1.5 -left-1.5' />
    <Cross className='-top-1.5 -right-1.5' />
    <Cross className='-bottom-1.5 -left-1.5' />
    <Cross className='-bottom-1.5 -right-1.5' />
    {children}
  </div>
);

const Eyebrow = ({ children }) => (
  <p className='font-geist-mono text-xs uppercase tracking-[0.14em] text-steam'>{children}</p>
);

const PrimaryCta = ({ children }) => (
  <a
    href={GITHUB_AUTH_URL}
    className='inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-canvas transition-colors hover:bg-fg/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steam'
  >
    <GitHubIcon />
    {children}
  </a>
);

const Tag = ({ level }) => (
  <span className={`shrink-0 rounded border px-1.5 py-px font-geist-mono text-[10px] uppercase ${PRIORITY_STYLES[level]}`}>
    {level}
  </span>
);

const HeroVisual = () => (
  <Frame className='bg-canvas text-left'>
    <div className='grid overflow-hidden md:grid-cols-[1fr_1.35fr]'>
      <div className='border-b border-line bg-inset p-6 font-geist-mono text-[13px] leading-7 text-fg/70 md:border-r md:border-b-0'>
        <p className='text-fg/40'>$ git log --since=yesterday --oneline</p>
        {RAW_COMMITS.map(([sha, msg]) => (
          <p key={sha}>
            <span className='text-node-yellow'>{sha}</span> {msg}
          </p>
        ))}
        <p className='mt-4 text-fg/40'>
          $ <span className='inline-block h-4 w-2 translate-y-0.5 bg-fg/70 motion-safe:animate-pulse' />
        </p>
      </div>

      <div className='p-6'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold'>Morning brief</p>
          <p className='font-geist-mono text-xs text-fg/50'>Wed, Sep 30 · 9:00</p>
        </div>

        <p className='mt-4 text-sm leading-6 text-fg/75'>
          5 commits across <span className='font-medium text-fg'>api</span> and{' '}
          <span className='font-medium text-fg'>web</span>. You shipped JWT refresh handling,
          fixed a race in session cleanup, and left a Dashboard refactor half done.
        </p>

        <div className='mt-5 flex h-1.5 overflow-hidden rounded-full' aria-hidden='true'>
          {BREAKDOWN.map(([cat, n]) => (
            <span key={cat} className={CATEGORY_COLORS[cat]} style={{ flexGrow: n }} />
          ))}
        </div>
        <ul className='mt-2 flex flex-wrap gap-x-4 gap-y-1 font-geist-mono text-[11px] text-fg/60'>
          {BREAKDOWN.map(([cat, n]) => (
            <li key={cat} className='flex items-center gap-1.5'>
              <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[cat]}`} />
              {cat} {n}
            </li>
          ))}
        </ul>

        <p className='mt-6 font-geist-mono text-[11px] uppercase tracking-[0.14em] text-fg/50'>
          Today
        </p>
        <ul className='mt-2 divide-y divide-line border-y border-line'>
          {PRIORITIES.map(([level, task]) => (
            <li key={task} className='flex items-center gap-3 py-2.5 text-sm'>
              <Tag level={level} />
              {task}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </Frame>
);

const Feature = ({ eyebrow, title, body, className = '', children }) => (
  <article className={`flex min-w-0 flex-col bg-canvas p-8 ${className}`}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h3 className='mt-3 text-lg font-semibold tracking-tight'>{title}</h3>
    <p className='mt-2 max-w-md text-sm leading-6 text-fg/65'>{body}</p>
    {children && <div className='mt-8 flex-1'>{children}</div>}
  </article>
);

const Landing = ({ isAuthenticated = false }) => (
  <div className='min-h-screen bg-canvas font-geist text-fg antialiased [color-scheme:dark] selection:bg-steam/40'>
    <header className='sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur'>
      <nav className='mx-auto flex h-16 max-w-6xl items-center justify-between px-6' aria-label='Main'>
        <Link to='/' className='flex items-center gap-2.5 font-semibold tracking-tight'>
          <img src={logo} alt='' className='h-7 w-7 object-contain' />
          DevSum
        </Link>
        <div className='hidden items-center gap-8 text-sm text-fg/65 md:flex'>
          <a href='#product' className='hover:text-fg'>Product</a>
          <a href='#how' className='hover:text-fg'>How it works</a>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          {isAuthenticated ? (
            <Link to='/dashboard' className='inline-flex h-9 items-center rounded-full bg-fg px-4 font-medium text-canvas hover:bg-fg/85'>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to='/login' className='hidden h-9 items-center rounded-full px-4 text-fg/70 hover:text-fg sm:inline-flex'>
                Sign in
              </Link>
              <a href={GITHUB_AUTH_URL} className='inline-flex h-9 items-center rounded-full bg-fg px-4 font-medium text-canvas hover:bg-fg/85'>
                Get started
              </a>
            </>
          )}
        </div>
      </nav>
    </header>

    <main>
      {/* Hero */}
      <section className='relative overflow-hidden border-b border-line'>
        <div
          className='pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]'
          aria-hidden='true'
        />
        <div className='relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center md:pt-32'>
          <p className='mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 font-geist-mono text-xs text-fg/70'>
            <span className='h-1.5 w-1.5 rounded-full bg-steam' />
            Your daily dev bites
          </p>
          <h1 className='mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-balance md:text-7xl'>
            Yesterday&apos;s commits.
            <br />
            <span className='text-fg/35'>Today&apos;s plan.</span>
          </h1>
          <p className='mx-auto mt-6 max-w-xl text-lg leading-8 text-pretty text-fg/65'>
            DevSum reads what you pushed to GitHub, reviews every diff, and serves a short brief
            with a prioritized plan before your first coffee.
          </p>
          <div className='mt-10 flex flex-wrap items-center justify-center gap-3'>
            <PrimaryCta>Continue with GitHub</PrimaryCta>
            <a
              href='#how'
              className='inline-flex h-11 items-center rounded-full border border-line bg-canvas px-5 text-sm font-medium hover:border-fg/30'
            >
              See how it works
            </a>
          </div>

          <div className='mx-auto mt-20 max-w-5xl'>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className='border-b border-line' aria-label='Highlights'>
        <dl className='mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4'>
          {FACTS.map(([term, detail], i) => (
            <div
              key={term}
              className={`border-line px-6 py-8 ${i % 2 ? '' : 'border-r'} ${i < 2 ? 'border-b lg:border-b-0' : ''} ${i === 1 ? 'lg:border-r' : ''}`}
            >
              <dt className='font-semibold tracking-tight'>{term}</dt>
              <dd className='mt-1 text-sm text-fg/60'>{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Product */}
      <section id='product' className='scroll-mt-16 border-b border-line'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <Eyebrow>Product</Eyebrow>
          <h2 className='mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance'>
            A standup you never have to prepare for.
          </h2>

          <div className='mt-14 grid gap-px border border-line bg-line lg:grid-cols-3'>
            <Feature
              className='lg:col-span-2'
              eyebrow='Commit analysis'
              title='Rewrites the messages you were too busy to write'
              body='DevSum reads the actual diff and suggests a conventional commit message with a clear description of what changed.'
            >
              <div className='overflow-hidden rounded-lg border border-line font-geist-mono text-[13px] leading-7'>
                <p className='bg-node-red/8 px-4 text-fg/70'>
                  <span className='mr-3 text-node-red'>-</span>fix stuff
                </p>
                <p className='bg-steam/8 px-4'>
                  <span className='mr-3 text-steam'>+</span>fix(session): prevent double cleanup on concurrent logout
                </p>
              </div>
            </Feature>

            <Feature
              eyebrow='Planning'
              title="Today's priorities"
              body='Three or four concrete tasks drawn from what you shipped, ranked high, medium and low.'
            >
              <ul className='space-y-2 text-sm'>
                {PRIORITIES.map(([level, task]) => (
                  <li key={task} className='flex items-center gap-2.5'>
                    <Tag level={level} />
                    <span className='truncate'>{task}</span>
                  </li>
                ))}
              </ul>
            </Feature>

            <Feature
              eyebrow='Code review'
              title='A second reviewer on every diff'
              body='Issues are flagged by type and severity, each with a suggested fix.'
            >
              <ul className='space-y-3 text-sm'>
                {REVIEW_ISSUES.map(([level, type, text]) => (
                  <li key={text} className='flex items-start gap-2.5'>
                    <Tag level={level} />
                    <span className='text-fg/75'>
                      <span className='font-geist-mono text-xs text-fg/45'>{type} </span>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </Feature>

            <Feature
              eyebrow='Trends'
              title='Quality over time'
              body='A weekly quality score per repository, so you can see if things are getting better.'
            >
              <div className='flex h-24 items-end gap-2' role='img' aria-label='Quality score rising from 62 to 82 over seven days'>
                {TREND.map((v, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${i === TREND.length - 1 ? 'bg-steam' : 'bg-steam/20'}`}
                    style={{ height: `${v}%` }}
                  />
                ))}
              </div>
              <p className='mt-3 font-geist-mono text-xs text-fg/55'>
                quality <span className='text-steam'>0.82</span> · +0.20 this week
              </p>
            </Feature>

            <Feature
              eyebrow='Privacy'
              title='Your key, your model'
              body='Bring your own OpenAI API key and choose the model. Nothing runs on a shared account you do not control.'
            >
              <div className='flex flex-wrap gap-2 font-geist-mono text-xs'>
                {['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra'].map((m, i) => (
                  <span key={m} className={`rounded-full border px-2.5 py-1 ${i ? 'border-line text-fg/55' : 'border-fg bg-fg text-canvas'}`}>
                    {m}
                  </span>
                ))}
              </div>
            </Feature>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id='how' className='scroll-mt-16 border-b border-line'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <Eyebrow>How it works</Eyebrow>
          <h2 className='mt-3 text-4xl font-semibold tracking-[-0.03em]'>Ready in about a minute.</h2>
          <ol className='mt-14 grid gap-10 md:grid-cols-3 md:gap-0'>
            {STEPS.map(([title, body], i) => (
              <li key={title} className='border-line md:border-l md:px-8 md:first:border-l-0 md:first:pl-0'>
                <p className='font-geist-mono text-sm text-steam'>0{i + 1}</p>
                <h3 className='mt-4 text-lg font-semibold tracking-tight'>{title}</h3>
                <p className='mt-2 text-sm leading-6 text-fg/65'>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className='bg-surface'>
        <div className='mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center'>
          <div>
            <h2 className='text-4xl font-semibold tracking-[-0.03em]'>Start tomorrow with a plan.</h2>
            <p className='mt-3 text-fg/60'>Connect a repository tonight. Your first brief is ready in the morning.</p>
          </div>
          <a
            href={GITHUB_AUTH_URL}
            className='inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-canvas transition-colors hover:bg-dough focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg'
          >
            <GitHubIcon />
            Continue with GitHub
          </a>
        </div>
      </section>
    </main>

    <footer className='bg-canvas'>
      <div className='mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-fg/55 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2.5'>
          <img src={logo} alt='' className='h-5 w-5 object-contain' />
          <span>© {new Date().getFullYear()} DevSum. Smart. Steamy. Structured.</span>
        </div>
        <div className='flex gap-6'>
          <a href='#product' className='hover:text-fg'>Product</a>
          <a href='#how' className='hover:text-fg'>How it works</a>
          <Link to='/login' className='hover:text-fg'>Sign in</Link>
        </div>
      </div>
    </footer>
  </div>
);

export default Landing;
