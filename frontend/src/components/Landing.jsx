import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import logo from '../assets/devsum-logo.png';
import SiteFooter from './SiteFooter.jsx';
import Tag from './PriorityTag.jsx';
import PricingCard from './PricingCard.jsx';
import { GITHUB_AUTH_URL } from '../siteConfig.js';

const BRIEF_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}).format(new Date());

const CATEGORY_COLORS = {
  feature: 'bg-node-blue',
  bugfix: 'bg-node-red',
  refactor: 'bg-node-yellow',
  docs: 'bg-steam',
  other: 'bg-fg/25',
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
  ['AI included', 'Or bring your own OpenAI key'],
  ['5 categories', 'Every commit classified automatically'],
  ['4 review lenses', 'Security, performance, maintainability, quality'],
];

const REVIEW_ISSUES = [
  ['high', 'security', 'Token compared with == instead of timing-safe equal'],
  ['medium', 'performance', 'User lookup runs inside a loop over sessions'],
  ['low', 'maintainability', 'handleAuth() is 140 lines, extract validation'],
];

const TREND = [62, 58, 66, 71, 69, 77, 82];

// Every statement here is backed by the backend implementation; keep it that way.
const SECURITY_POINTS = [
  ['Read-only by design', 'DevSum reads commits and diffs. It never writes to your repositories.'],
  ['Encrypted at rest', 'GitHub tokens and OpenAI keys are encrypted with AES-256-GCM before they reach the database.'],
  ['OpenAI API only', 'Diffs go to the OpenAI API, which does not train on API data by default. Add your own key to keep usage on your account.'],
  ['Results, not source', 'We store generated analysis and repository names. We do not store your source code or diffs.'],
  ['Short-lived sessions', 'Sessions use HTTP-only cookies and expire after 24 hours.'],
  ['No trackers', 'No advertising or analytics scripts. One session cookie, used only to keep you signed in.'],
];

const ROADMAP = [
  ['Now', 'Personal briefs', 'A morning summary and prioritized plan for each developer, across their own repositories.'],
  ['Next', 'Team briefs', 'One shared summary of what shipped across a team, ready before standup.'],
  ['Later', 'Engineering insight', 'Quality and delivery trends across repositories, for the people who lead engineering.'],
];

const STEPS = [
  ['Connect GitHub', 'Sign in with OAuth and pick the repositories you want DevSum to follow.'],
  ['DevSum reads the diffs', 'Every commit is categorized and its diff reviewed by AI.'],
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

const HeroVisual = () => (
  <Frame className='bg-canvas text-left'>
    <div className='grid overflow-hidden md:grid-cols-[1fr_1.35fr]'>
      <div className='border-b border-line bg-inset p-6 font-geist-mono text-[13px] leading-7 text-fg/70 md:border-r md:border-b-0'>
        <p className='text-fg/55'>$ git log --since=yesterday --oneline</p>
        {RAW_COMMITS.map(([sha, msg]) => (
          <p key={sha}>
            <span className='text-node-yellow'>{sha}</span> {msg}
          </p>
        ))}
        <p className='mt-4 text-fg/55'>
          $ <span className='inline-block h-4 w-2 translate-y-0.5 bg-fg/70 motion-safe:animate-pulse' />
        </p>
      </div>

      <div className='p-6'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold'>Morning brief</p>
          <p className='font-geist-mono text-xs text-fg/60'>{BRIEF_DATE} · 9:00</p>
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

        <p className='mt-6 font-geist-mono text-[11px] uppercase tracking-[0.14em] text-fg/60'>
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

const AuthErrorBanner = () => {
  const [searchParams] = useSearchParams();
  if (searchParams.get('error') !== 'auth_failed') return null;

  return (
    <p role='alert' className='border-b border-node-red/30 bg-node-red/10 px-6 py-3 text-center text-sm text-node-red'>
      GitHub sign-in didn&apos;t complete. Please try again.
    </p>
  );
};

const Landing = ({ isAuthenticated = false, user = null }) => (
  <div className='min-h-screen bg-canvas font-geist text-fg antialiased [color-scheme:dark] selection:bg-steam/40'>
    <header className='sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur'>
      <nav
        className='mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:grid md:grid-cols-[1fr_auto_1fr]'
        aria-label='Main'
      >
        <Link to='/' className='flex w-fit items-center gap-2.5 font-semibold tracking-tight'>
          <img src={logo} alt='' className='h-7 w-7 object-contain' />
          DevSum
        </Link>
        <div className='hidden items-center gap-8 text-sm text-fg/65 md:flex'>
          <a href='#product' className='hover:text-fg'>Product</a>
          <a href='#how' className='hover:text-fg'>How it works</a>
          <a href='#pricing' className='hover:text-fg'>Pricing</a>
        </div>
        <div className='flex items-center text-sm md:justify-self-end'>
          {isAuthenticated ? (
            <Link to='/dashboard' className='inline-flex h-9 items-center rounded-full bg-fg px-4 font-medium text-canvas hover:bg-fg/85'>
              Open dashboard
            </Link>
          ) : (
            <a href={GITHUB_AUTH_URL} className='inline-flex h-9 items-center gap-2 rounded-full bg-fg px-4 font-medium text-canvas hover:bg-fg/85'>
              <GitHubIcon />
              Continue with GitHub
            </a>
          )}
        </div>
      </nav>
    </header>

    <AuthErrorBanner />

    <main>
      {/* Hero */}
      <section className='relative overflow-hidden border-b border-line'>
        <div
          className='pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]'
          aria-hidden='true'
        />
        <div className='relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center md:pt-32'>
          <h1 className='mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-balance md:text-7xl'>
            Yesterday&apos;s commits.
            <br />
            <span className='text-fg/50'>Today&apos;s plan.</span>
          </h1>
          <p className='mx-auto mt-6 max-w-xl text-lg leading-8 text-pretty text-fg/65'>
            DevSum reads what you pushed to GitHub, reviews every diff, and serves a short brief
            with a prioritized plan before your first coffee.
          </p>
          <div className='mx-auto mt-16 max-w-5xl'>
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
                      <span className='font-geist-mono text-xs text-fg/60'>{type} </span>
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
              eyebrow='Models'
              title='AI included, or your own key'
              body='Analysis is included in the plan. Prefer your own OpenAI account? Add your key in Settings and choose the model.'
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

      {/* Security */}
      <section id='security' className='scroll-mt-16 border-b border-line'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <Eyebrow>Security</Eyebrow>
          <h2 className='mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance'>
            Built to be trusted with your repositories.
          </h2>
          <p className='mt-4 max-w-2xl leading-7 text-fg/65'>
            DevSum asks for access to your code, so here is exactly what it does with it.
          </p>

          <dl className='mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3'>
            {SECURITY_POINTS.map(([term, detail]) => (
              <div key={term} className='bg-canvas p-8'>
                <dt className='font-semibold tracking-tight'>{term}</dt>
                <dd className='mt-2 text-sm leading-6 text-fg/65'>{detail}</dd>
              </div>
            ))}
          </dl>

          <Frame className='mt-8 bg-inset p-6'>
            <p className='text-sm font-semibold'>Why sign-in asks for repo access</p>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-fg/65'>
              GitHub does not offer OAuth apps a read-only scope for private repositories, so{' '}
              <code className='font-geist-mono text-[13px] text-fg'>repo</code> is the narrowest scope that
              includes them. DevSum only uses it to read. You can remove access at any time in{' '}
              <a
                href='https://github.com/settings/applications'
                target='_blank'
                rel='noopener noreferrer'
                className='text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg'
              >
                GitHub settings
              </a>
              .
            </p>
          </Frame>
        </div>
      </section>

      {/* Why DevSum */}
      <section className='border-b border-line'>
        <div className='mx-auto max-w-6xl px-6 py-24'>
          <Eyebrow>Why DevSum</Eyebrow>
          <h2 className='mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance'>
            The context is already in your commit history.
          </h2>
          <p className='mt-4 max-w-2xl leading-7 text-fg/65'>
            Standups and status updates exist to answer one question: what happened, and what matters next.
            The answer is already in your commits. DevSum reads it so nobody has to rebuild it from memory.
          </p>

          <ol className='mt-14 grid gap-px border border-line bg-line md:grid-cols-3'>
            {ROADMAP.map(([stage, title, body], i) => (
              <li key={title} className='bg-canvas p-8'>
                <p className={`font-geist-mono text-xs uppercase tracking-[0.14em] ${i === 0 ? 'text-steam' : 'text-fg/60'}`}>
                  {stage}
                </p>
                <h3 className='mt-4 text-lg font-semibold tracking-tight'>{title}</h3>
                <p className='mt-2 text-sm leading-6 text-fg/65'>{body}</p>
              </li>
            ))}
          </ol>

        </div>
      </section>

      {/* Pricing */}
      <section id='pricing' className='scroll-mt-16 border-b border-line'>
        <div className='mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center'>
          <div>
            <Eyebrow>Pricing</Eyebrow>
            <h2 className='mt-3 max-w-xl text-4xl font-semibold tracking-[-0.03em] text-balance'>One plan. Everything included.</h2>
            <p className='mt-4 max-w-xl leading-7 text-fg/65'>
              Try DevSum free for 14 days, no card needed. Then keep your morning brief for less than a coffee a month.
            </p>
            <p className='mt-6 text-sm text-fg/55'>
              Questions about billing? Read the{' '}
              <Link to='/refunds' className='text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg'>
                refund policy
              </Link>
              .
            </p>
          </div>
          <PricingCard user={isAuthenticated ? user : null} />
        </div>
      </section>

      {/* Closing */}
      <section className='bg-surface'>
        <div className='mx-auto max-w-6xl px-6 py-20'>
          <h2 className='text-4xl font-semibold tracking-[-0.03em]'>Start tomorrow with a plan.</h2>
          <p className='mt-3 text-fg/65'>Connect a repository tonight. Your first brief is ready in the morning.</p>
        </div>
      </section>
    </main>

    <SiteFooter onLanding />
  </div>
);

export default Landing;
