import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Building2,
  Gavel,
  Inbox,
  LineChart,
  Lock,
  ScrollText,
  Send,
  ShieldCheck,
  Tag,
  UserCheck,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionCta } from '@/components/landing/session-cta';

// Public marketing landing for Evertrust ERP. Fully static: the only runtime data
// is the optional session probe inside <SessionCta> (client-side), so this route
// renders at build with zero network access. The page forces its own dark theme
// (the `dark` class on the root + self-contained neutral/amber palette) so it is
// consistent regardless of the visitor's system preference.
//
// Aesthetic: an "operations control room" — deep charcoal, a single signal-amber
// accent, a faint blueprint grid, and monospace data accents that echo the
// product's audit-log, deterministic-pipeline character.
export default function LandingPage() {
  return (
    <div className="dark relative isolate min-h-svh overflow-hidden bg-neutral-950 font-sans text-neutral-200 selection:bg-amber-400/30 selection:text-amber-50">
      <BlueprintBackdrop />
      <SiteHeader />
      <main>
        <Hero />
        <Pipeline />
        <ValueProps />
        <Audience />
        <FeatureGrid />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Atmosphere                                                          */
/* ------------------------------------------------------------------ */

// Fixed, non-interactive depth layer: a fine blueprint grid that fades out toward
// the edges, plus two soft amber/emerald glows for warmth on the near-black base.
function BlueprintBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 100% 70% at 50% 0%, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 100% 70% at 50% 0%, black 30%, transparent 75%)',
        }}
      />
      <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px]" />
      <div className="absolute top-[36rem] -right-40 h-[34rem] w-[34rem] rounded-full bg-emerald-500/[0.07] blur-[150px]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/50">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-sm text-neutral-400 md:flex">
          <a className="transition-colors hover:text-neutral-100" href="#pipeline">
            How it works
          </a>
          <a className="transition-colors hover:text-neutral-100" href="#platform">
            Platform
          </a>
          <a className="transition-colors hover:text-neutral-100" href="#audience">
            Who it&apos;s for
          </a>
        </nav>
        <Button
          asChild
          size="sm"
          className="bg-amber-400 text-neutral-950 hover:bg-amber-300"
        >
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </header>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid size-7 place-items-center rounded-[7px] bg-amber-400 text-neutral-950 shadow-[0_0_24px_-4px] shadow-amber-400/50">
        <ShieldCheck className="size-4" strokeWidth={2.5} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-neutral-50">
        Evertrust
        <span className="ml-1 font-mono text-xs font-medium tracking-[0.18em] text-amber-400/90">
          ERP
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div className="max-w-3xl">
        <p
          className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs tracking-wide text-neutral-400 duration-700"
          style={{ animationDelay: '0ms' }}
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          Operations platform for public-tender businesses
        </p>

        <h1
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-7 font-display text-5xl leading-[1.02] tracking-tight text-balance text-neutral-50 duration-700 sm:text-6xl md:text-7xl"
          style={{ animationDelay: '90ms' }}
        >
          Win more tenders with{' '}
          <span className="text-amber-400">fewer moving parts</span>.
        </h1>

        <p
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-neutral-400 duration-700"
          style={{ animationDelay: '170ms' }}
        >
          Evertrust ERP runs public-procurement operations end to end —
          portal intake, parsing, pricing, approval and submission — as
          observable, auditable workflows. AI does the repetitive work; your
          team keeps the decisions.
        </p>

        <div
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-9 duration-700"
          style={{ animationDelay: '250ms' }}
        >
          <SessionCta />
          <p className="mt-4 font-mono text-xs text-neutral-500">
            In-house at Evertrust GmbH — and available for your own tender desk.
          </p>
        </div>
      </div>

      <HeroStats />
    </section>
  );
}

// A thin "status strip" of operating metrics, framed like a console readout.
function HeroStats() {
  const stats = [
    { value: '1 intake', label: 'portal to pipeline, no rekeying' },
    { value: '100%', label: 'actions written to the audit trail' },
    { value: '0', label: 'silent failures — everything escalates' },
  ];
  return (
    <dl
      className="animate-in fade-in fill-mode-both mt-16 grid grid-cols-1 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02] sm:grid-cols-3 sm:divide-x sm:divide-y-0 duration-1000"
      style={{ animationDelay: '380ms' }}
    >
      {stats.map((s) => (
        <div key={s.label} className="px-6 py-5">
          <dt className="font-display text-3xl tracking-tight text-neutral-50">
            {s.value}
          </dt>
          <dd className="mt-1 text-sm text-neutral-400">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline (how it works)                                             */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = [
  {
    icon: Inbox,
    step: '01',
    title: 'Intake',
    body: 'Portals are monitored and new tenders pulled in, OCR-parsed and structured — automatically.',
    tag: 'MUST_AUTOMATE',
  },
  {
    icon: Tag,
    step: '02',
    title: 'Pricing',
    body: 'Supplier matching and pricing recommendations are drafted with confidence scores attached.',
    tag: 'SHOULD_AUTOMATE',
  },
  {
    icon: UserCheck,
    step: '03',
    title: 'Approval',
    body: 'Bid/skip, pricing and risk land in a clean approval gate. A human signs off — always.',
    tag: 'HUMAN_GATE',
  },
  {
    icon: Send,
    step: '04',
    title: 'Submit',
    body: 'The approved submission goes out on deadline, with every step preserved and replayable.',
    tag: 'AUDITED',
  },
] as const;

function Pipeline() {
  return (
    <Section
      id="pipeline"
      eyebrow="The workflow is the product"
      title="One deterministic path, intake to submission"
      lead="Every tender follows the same observable pipeline. State is visible at each step, failures are caught and escalated, and nothing advances on its own past the approval gate."
    >
      <div className="relative mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] md:grid-cols-4 md:bg-white/5">
        {PIPELINE_STAGES.map((stage, i) => (
          <div
            key={stage.title}
            className="group relative bg-neutral-950/40 p-6 transition-colors hover:bg-white/[0.03]"
          >
            {/* connector arrow between stages on desktop */}
            {i < PIPELINE_STAGES.length - 1 ? (
              <ArrowRight className="absolute top-1/2 -right-2.5 z-10 hidden size-5 -translate-y-1/2 text-amber-400/70 md:block" />
            ) : null}
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-amber-400 transition-colors group-hover:border-amber-400/30">
                <stage.icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="font-mono text-xs text-neutral-600">{stage.step}</span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-neutral-50">
              {stage.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {stage.body}
            </p>
            <span className="mt-5 inline-flex rounded border border-white/10 bg-neutral-900 px-2 py-0.5 font-mono text-[10px] tracking-wider text-neutral-400">
              {stage.tag}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Value props                                                         */
/* ------------------------------------------------------------------ */

const VALUE_PROPS = [
  {
    icon: Workflow,
    title: 'Automation-first by default',
    body: 'If a person repeats it, it becomes a workflow. Intake, parsing, deadline monitoring, reminders and escalation routing run without manual triggering.',
  },
  {
    icon: ScrollText,
    title: 'Audit trail & full observability',
    body: 'Every execution logs its inputs, outputs, confidence, retries and escalation state. Workflow status is never a mystery — and never lives in a spreadsheet.',
  },
  {
    icon: Bot,
    title: 'AI assists, humans decide',
    body: 'Submissions, pricing finalisation and high-risk tenders always pass a human approval gate. Low confidence escalates instead of guessing.',
  },
  {
    icon: Gavel,
    title: 'Built for German procurement',
    body: 'GAEB-aware tender handling, §123 / §124 eligibility checks in the compliance review, and GDPR-compliant processing on EU-resident infrastructure.',
  },
] as const;

function ValueProps() {
  return (
    <Section
      id="platform"
      eyebrow="Why teams run on it"
      title="Reliable operations, not clever demos"
      lead="The platform is measured by workflow reliability, recovery speed and escalation clarity — the things that decide whether a bid goes out on time."
    >
      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {VALUE_PROPS.map((prop) => (
          <article
            key={prop.title}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-all duration-300 hover:border-amber-400/25 hover:bg-white/[0.035]"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-neutral-900 text-amber-400">
              <prop.icon className="size-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-neutral-50">
              {prop.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
              {prop.body}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Audience                                                            */
/* ------------------------------------------------------------------ */

const AUDIENCE = [
  {
    role: 'Tender desks & bid teams',
    body: 'Stop rekeying portal documents. Triage more opportunities and never miss a submission deadline.',
  },
  {
    role: 'Pricing & procurement',
    body: 'Get supplier matches and priced positions prepared, with the numbers and confidence laid out for review.',
  },
  {
    role: 'Management & compliance',
    body: 'A single approval surface with risk, eligibility and a defensible audit trail behind every decision.',
  },
] as const;

function Audience() {
  return (
    <Section
      id="audience"
      eyebrow="Who it's for"
      title="For the people who live in the tender pipeline"
      lead="Evertrust GmbH built it to run its own public-tender operation. It is offered to other companies that want to run their tender desk the same way."
    >
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {AUDIENCE.map((a, i) => (
          <article
            key={a.role}
            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7"
          >
            <span className="font-mono text-xs text-amber-400/80">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-neutral-50">{a.role}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{a.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Feature grid                                                        */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    body: 'PIC, Pricing, Management and Admin roles map to fine-grained permissions, enforced on every request.',
  },
  {
    icon: LineChart,
    title: 'Operational visibility',
    body: 'Owners, retries, blockers and deadlines at risk are surfaced — if operators cannot see it, it is not done.',
  },
  {
    icon: Lock,
    title: 'EU data residency',
    body: 'Operational state stays on EU-resident infrastructure, GDPR-compliant by construction.',
  },
  {
    icon: Building2,
    title: 'Multi-tenant ready',
    body: 'Every user and record is organization-scoped, so the same platform runs one desk or many.',
  },
] as const;

function FeatureGrid() {
  return (
    <Section
      eyebrow="Under the hood"
      title="The operational backbone"
      lead="Centralised, recoverable, replayable state — the database is operational memory, and the API is the only way in."
    >
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]"
          >
            <f.icon className="size-5 text-amber-400" strokeWidth={1.75} />
            <h3 className="mt-4 text-base font-semibold text-neutral-50">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{f.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing CTA                                                         */
/* ------------------------------------------------------------------ */

function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.08] via-neutral-950 to-neutral-950 px-8 py-16 text-center sm:px-16">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(255 255 255 / 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black, transparent 70%)',
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-4xl tracking-tight text-balance text-neutral-50 sm:text-5xl">
            Put your tender operation on rails.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-neutral-300">
            Sign in to the operations console, or talk to us about running your
            own tender desk on Evertrust ERP.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="group h-11 bg-amber-400 px-6 text-neutral-950 hover:bg-amber-300"
            >
              <Link href="/login">
                Sign in
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-white/15 bg-transparent px-6 text-neutral-200 hover:bg-white/5 hover:text-white"
            >
              <a href="mailto:info@evertrust-germany.de">Contact sales</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark />
        </div>
        <p className="max-w-md text-xs leading-relaxed text-neutral-500">
          AI-assisted tender operations for public-procurement businesses.
          Automation assists — humans decide. Built and operated by Evertrust GmbH.
        </p>
        <div className="flex items-center gap-6 text-sm text-neutral-400">
          <Link className="transition-colors hover:text-neutral-100" href="/login">
            Sign in
          </Link>
          <a
            className="transition-colors hover:text-neutral-100"
            href="mailto:info@evertrust-germany.de"
          >
            Contact
          </a>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
          <p className="font-mono text-[11px] tracking-wide text-neutral-600">
            © {new Date().getFullYear()} Evertrust GmbH · GDPR-compliant · EU data
            residency
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Shared section scaffold                                             */
/* ------------------------------------------------------------------ */

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20 sm:py-24"
    >
      <div className="max-w-2xl">
        <p className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-amber-400/80 uppercase">
          <span className="h-px w-8 bg-amber-400/40" />
          {eyebrow}
        </p>
        <h2 className="mt-5 font-display text-4xl tracking-tight text-balance text-neutral-50 sm:text-[2.75rem]">
          {title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-pretty text-neutral-400">
          {lead}
        </p>
      </div>
      {children}
    </section>
  );
}
