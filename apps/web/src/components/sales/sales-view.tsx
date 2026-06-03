'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock data (UI-first). Real data later comes from the Read AI meeting agent +
// a Claude "Hormozi-lens" coaching pass. Shape mirrors docs/superpowers/specs.
// ---------------------------------------------------------------------------
type Dim = { name: string; score: number; note?: string };
type Worked = { n: number; title: string; method: string; quote: string; why: string };
type Improve = { n: number; title: string; method: string; what?: string; tryThis: string };
type Meeting = {
  id: string;
  title: string;
  listTitle: string;
  listMeta: string;
  metaLine: string;
  chip: number;
  metadata: Record<string, string>;
  signals: { talk: string; sentiment: string; sentTone: 'good' | 'mid' | 'low'; engagement: string; questions: string };
  exec: string;
  tender: { linked: true; name: string; meta: string } | { linked: false; bestName: string; bestMatch: string; bestMeta: string };
  headline: string;
  aeOverall: number;
  clientOverall: number;
  aeDims: Dim[];
  clientDims: Dim[];
  worked: Worked[];
  improve: Improve[];
  confidence: string;
};

const MEETINGS: Meeting[] = [
  {
    id: 'kodeca',
    title: 'Kodeca — German tender matching pitch',
    listTitle: 'Kodeca — tender matching pitch',
    listMeta: 'Jun 3 · ~15 min · Hanna → Vic',
    metaLine: '2026-06-03 · ~15 min · 2,243 words · AE Hanna Gia Nguyen → Vic Kurs',
    chip: 3.0,
    metadata: {
      AE: 'Hanna Gia Nguyen',
      'Client contact': 'Vic Kurs',
      'Product pitched': 'German public tender matching & bid-application (EverTrust)',
      Duration: '~15 min · 2,243 words',
      Flags: 'none',
    },
    signals: { talk: '62% / 38%', sentiment: 'Positive-leaning', sentTone: 'good', engagement: '74', questions: '6 / 4' },
    exec:
      "Hanna opened with a clear value proposition — matching Polish IT vendors to German public tenders — and described fees and process. Vic showed interest but Hanna didn't get the quantified cost-of-inaction, gave no concrete admin-fee number or risk-reversal, and pushed for a quick decision without fully building quantified value.",
    tender: { linked: false, bestName: 'LED Retrofit Berlin 2026', bestMatch: '87%', bestMeta: 'NOT_STARTED · buyer Land Berlin · deadline Jul 15 · €2.4M' },
    headline: 'Interested but non-committal buyer; solid opener, but missing budget discovery, risk-reversal, and quantified value before the ask.',
    aeOverall: 3.0,
    clientOverall: 3.0,
    aeDims: [
      { name: 'Communication', score: 3, note: "Conveyed dream outcome + social proof; didn't hit all Value-Equation levers or neutralize the admin-fee objection." },
      { name: 'Understanding client needs', score: 3, note: 'Asked about experience & role; got no quantified status-quo cost or budget.' },
      { name: 'Technical explanations', score: 3, note: 'Gave commission %, said admin fee is upfront, but no amount and no risk-reversal.' },
    ],
    clientDims: [
      { name: 'Buying intent', score: 3 },
      { name: 'Pain acknowledgment', score: 3 },
      { name: 'Decision authority', score: 3 },
      { name: 'Objection profile', score: 3 },
      { name: 'Misunderstandings', score: 3 },
    ],
    worked: [
      { n: 1, title: 'Discover before pitching', method: 'Discover Before Pitching', quote: 'Early discovery of past tender experience', why: 'surfaced relevant context for fit.' },
      { n: 2, title: 'Articulated the dream outcome', method: 'Value Equation', quote: 'Market expansion & stability', why: 'painted the life-after vision.' },
      { n: 3, title: 'Anchored on price', method: 'Anchor High', quote: 'Commission 3.5–4%', why: 'a clear pricing anchor.' },
      { n: 4, title: 'Social proof', method: 'Value Equation', quote: 'Awarded project (€687,000)', why: 'raised perceived likelihood of success.' },
      { n: 5, title: 'Created urgency', method: 'CLOSER', quote: 'Urgency around shortlisting', why: 'shortens the time-delay lever when used right.' },
    ],
    improve: [
      { n: 1, title: 'Quantify cost of status quo', method: 'Cost of Status Quo', what: 'never asked the cost of NOT pursuing German tenders.', tryThis: '"What\'s the cost to Kodeca of not entering this year?" — before quoting fees.' },
      { n: 2, title: 'Discover budget before quoting', method: 'Discover Budget', tryThis: '"What budget have you set aside for entry costs?" before terms.' },
      { n: 3, title: 'Add a risk reversal', method: 'Risk Reversal', tryThis: 'commission only from funded invoices + money-back on admin fee if not shortlisted.' },
      { n: 4, title: 'Name the objection proactively', method: 'Name the Objection', what: 'deferred the admin-fee question.', tryThis: '"You\'re probably wondering how high the admin fee is — here\'s why, and how we mitigate it."' },
      { n: 5, title: 'Build value before urgency', method: 'CLOSER', tryThis: "tie contract sizes to Kodeca's numbers, then introduce the deadline." },
    ],
    confidence: '0.84',
  },
  {
    id: 'stadtwerke',
    title: 'Stadtwerke München — LED retrofit qualification',
    listTitle: 'Stadtwerke München — LED retrofit',
    listMeta: 'Jun 2 · 28 min',
    metaLine: '2026-06-02 · 28 min · 3,810 words · AE Hanna Gia Nguyen → Markus Brandt + 1',
    chip: 4.1,
    metadata: {
      AE: 'Hanna Gia Nguyen',
      'Client contact': 'Markus Brandt — Procurement Lead',
      'Product pitched': 'City-wide LED streetlight retrofit · modular, KRITIS-grade',
      Duration: '28 min · 3,810 words',
      Flags: 'none',
    },
    signals: { talk: '48% / 52%', sentiment: 'Positive', sentTone: 'good', engagement: '86', questions: '9 / 7' },
    exec:
      'A tight, discovery-first qualification call. Hanna quantified the reliability pain (recurring outages), anchored on a premium modular-delivery SLA, held pricing until value was established, and secured a concrete next step plus a same-day spec sheet.',
    tender: { linked: true, name: 'Straßenbeleuchtung München 2026', meta: 'OPEN · buyer Stadtwerke München · deadline Jul 22 · €3.1M' },
    headline: 'Strong qualification call — clear pain, anchored value, concrete next step. Tighten the budget ask.',
    aeOverall: 4.0,
    clientOverall: 4.2,
    aeDims: [
      { name: 'Communication', score: 4, note: 'Balanced talk-time, led with discovery, tied modular delivery to KRITIS reliability.' },
      { name: 'Understanding client needs', score: 4, note: 'Quantified outage cost and the July window; mapped the decision process.' },
      { name: 'Technical explanations', score: 4, note: 'Explained the SLA + certification path concretely and offered a reference project.' },
    ],
    clientDims: [
      { name: 'Buying intent', score: 4 },
      { name: 'Pain acknowledgment', score: 4 },
      { name: 'Decision authority', score: 4 },
      { name: 'Objection profile', score: 4 },
      { name: 'Misunderstandings', score: 5 },
    ],
    worked: [
      { n: 1, title: 'Discovery before pitching', method: 'Discover Before Pitching', quote: 'Asked about outage history & SLA expectations first', why: 'grounded the pitch in real pain.' },
      { n: 2, title: 'Reliability as the dream outcome', method: 'Value Equation', quote: 'Zero-outage public lighting', why: 'high-value outcome for a KRITIS buyer.' },
      { n: 3, title: 'Anchored on the premium tier', method: 'Anchor High', quote: 'Led with the 6-week SLA tier', why: 'set a strong reference point.' },
      { n: 4, title: 'Offered an uptime guarantee', method: 'Risk Reversal', quote: '99.5% uptime or service credits', why: 'reduced perceived delivery risk.' },
      { n: 5, title: 'Locked a concrete next step', method: 'CLOSER', quote: 'Commercial deep-dive booked + owner named', why: 'clear forward motion.' },
    ],
    improve: [
      { n: 1, title: 'Get the allocated budget', method: 'Discover Budget', what: 'value was strong but no budget figure was confirmed.', tryThis: '"What budget band is earmarked for this retrofit?" before the commercial call.' },
      { n: 2, title: 'Send the leave-behind same day', method: 'Reduce Effort/Delay', tryThis: 'email the spec sheet within the hour while interest is hot.' },
    ],
    confidence: '0.90',
  },
  {
    id: 'bima',
    title: 'BImA Berlin — modular units discovery',
    listTitle: 'BImA Berlin — modular units',
    listMeta: 'May 30 · 41 min',
    metaLine: '2026-05-30 · 41 min · 5,640 words · AE Hanna Gia Nguyen → Dr. Lena Vogt + 3',
    chip: 4.5,
    metadata: {
      AE: 'Hanna Gia Nguyen',
      'Client contact': 'Dr. Lena Vogt — Project Lead (BImA)',
      'Product pitched': 'Rapidly-deployable modular buildings · offices, healthcare, temporary schools',
      Duration: '41 min · 5,640 words',
      Flags: 'none',
    },
    signals: { talk: '41% / 59%', sentiment: 'Positive', sentTone: 'good', engagement: '92', questions: '12 / 15' },
    exec:
      'An exemplary discovery call. Hanna listened most of the time, mapped the deployment timeline and KRITIS constraints, quantified the cost of delays, named budget early, offered a staged risk-reversal, and ended with strong mutual next steps and an internal champion.',
    tender: { linked: true, name: 'Modulare Verwaltungsgebäude — Bund 2026', meta: 'NOT_STARTED · buyer BImA · deadline Aug 14 · €8.6M' },
    headline: 'Textbook discovery — listened more than pitched, quantified value, identified a champion. Could trial-close a touch earlier.',
    aeOverall: 4.7,
    clientOverall: 4.4,
    aeDims: [
      { name: 'Communication', score: 5, note: "Listened 59% of the time; reflected back BImA's priorities precisely." },
      { name: 'Understanding client needs', score: 5, note: 'Quantified deployment-delay cost; mapped the multi-stakeholder process.' },
      { name: 'Technical explanations', score: 4, note: 'Clear on modular options; deferred one certification detail to follow-up.' },
    ],
    clientDims: [
      { name: 'Buying intent', score: 5 },
      { name: 'Pain acknowledgment', score: 5 },
      { name: 'Decision authority', score: 4 },
      { name: 'Objection profile', score: 4 },
      { name: 'Misunderstandings', score: 5 },
    ],
    worked: [
      { n: 1, title: 'Discovery dominated the call', method: 'Discover Before Pitching', quote: '~25 min of questions before any pitch', why: 'earned trust and surfaced the real constraints.' },
      { n: 2, title: 'Quantified deployment-speed value', method: 'Value Equation', quote: 'Weeks-not-months to occupancy', why: "tied speed to BImA's cost of delay." },
      { n: 3, title: 'Named budget early', method: 'Discover Budget', quote: 'Asked the allocated envelope upfront', why: 'avoided quoting blind.' },
      { n: 4, title: 'Staged risk-reversal', method: 'Risk Reversal', quote: 'Pilot module before full rollout', why: 'de-risked a large commitment.' },
      { n: 5, title: 'Mutual action plan + champion', method: 'CLOSER', quote: 'Co-built next steps; Dr. Vogt to sponsor', why: 'strong forward commitment.' },
    ],
    improve: [
      { n: 1, title: 'Trial-close a little earlier', method: 'CLOSER', what: 'discovery ran long before testing commitment.', tryThis: 'mid-call: "If we hit your timeline, is this something you\'d champion?"' },
      { n: 2, title: 'Confirm the procurement regime', method: 'Qualify the Process', tryThis: 'verify above/below EU threshold to tailor the bid format.' },
    ],
    confidence: '0.92',
  },
  {
    id: 'rheinmain',
    title: 'Rhein-Main Logistik — follow-up',
    listTitle: 'Rhein-Main Logistik — follow-up',
    listMeta: 'May 28 · 12 min',
    metaLine: '2026-05-28 · 12 min · 1,410 words · AE Hanna Gia Nguyen → Stefan Adler',
    chip: 2.4,
    metadata: {
      AE: 'Hanna Gia Nguyen',
      'Client contact': 'Stefan Adler',
      'Product pitched': 'Container buffer / inland depot modular systems',
      Duration: '12 min · 1,410 words',
      Flags: '⚠ low engagement · no next step set',
    },
    signals: { talk: '78% / 22%', sentiment: 'Neutral → negative', sentTone: 'low', engagement: '51', questions: '3 / 1' },
    exec:
      'A rushed follow-up. Hanna dominated the conversation, re-pitched features without re-establishing the pain, never confirmed budget or decision authority, and ended without a concrete next step. The buyer disengaged toward the end.',
    tender: { linked: false, bestName: 'Container Buffer — Hamburg Port', bestMatch: '64%', bestMeta: 'NOT_STARTED · deadline Jul 30' },
    headline: 'Weak follow-up — AE dominated airtime, no pain re-established, no authority/budget, no next step. Recoverable with a reset call.',
    aeOverall: 2.3,
    clientOverall: 2.4,
    aeDims: [
      { name: 'Communication', score: 2, note: 'Talked 78% of the time; monologued features. Buyer went quiet in the last third.' },
      { name: 'Understanding client needs', score: 2, note: 'No discovery — assumed the prior pain still held.' },
      { name: 'Technical explanations', score: 3, note: 'Specs accurate but delivered without the context the buyer asked for.' },
    ],
    clientDims: [
      { name: 'Buying intent', score: 2 },
      { name: 'Pain acknowledgment', score: 2 },
      { name: 'Decision authority', score: 2 },
      { name: 'Objection profile', score: 3 },
      { name: 'Misunderstandings', score: 3 },
    ],
    worked: [
      { n: 1, title: 'Maintained rapport', method: 'Build Rapport', quote: 'Friendly, referenced the prior call', why: 'kept the relationship warm despite a weak call.' },
      { n: 2, title: 'Accurate technical recall', method: 'Credibility', quote: 'Recalled prior requirements correctly', why: 'showed preparation.' },
    ],
    improve: [
      { n: 1, title: 'Talk far less, listen more', method: 'Discover Before Pitching', what: '78% AE talk-time — buyer barely spoke.', tryThis: 'open with a question; aim for a 40/60 talk ratio.' },
      { n: 2, title: 'Re-establish the pain', method: 'Cost of Status Quo', what: 're-pitched features without re-confirming the problem.', tryThis: '"Since we last spoke, what\'s changed about the depot bottleneck?"' },
      { n: 3, title: 'Confirm decision authority', method: 'Qualify', what: 'never checked who signs off.', tryThis: '"Who else needs to be in the room to move this forward?"' },
      { n: 4, title: 'Secure a concrete next step', method: 'CLOSER', what: 'call ended with no date or action.', tryThis: 'always leave with a scheduled next step + owner.' },
      { n: 5, title: 'Quantify value vs. status quo', method: 'Value Equation', tryThis: "link the container-buffer ROI to Rhein-Main's throughput numbers." },
    ],
    confidence: '0.81',
  },
];

// ---- helpers --------------------------------------------------------------
function tone(score: number): 'good' | 'mid' | 'low' {
  return score >= 4 ? 'good' : score >= 3 ? 'mid' : 'low';
}
const TEXT: Record<'good' | 'mid' | 'low', string> = {
  good: 'text-emerald-500',
  mid: 'text-amber-500',
  low: 'text-red-500',
};
const BARBG: Record<'good' | 'mid' | 'low', string> = {
  good: 'bg-emerald-500',
  mid: 'bg-amber-500',
  low: 'bg-red-500',
};
const CHIPBG: Record<'good' | 'mid' | 'low', string> = {
  good: 'bg-emerald-500/15 text-emerald-500',
  mid: 'bg-amber-500/15 text-amber-500',
  low: 'bg-red-500/15 text-red-500',
};

function Ring({ value, label }: { value: number; label: string }) {
  const t = tone(value);
  const pct = Math.round((value / 5) * 100);
  const ringColor = t === 'good' ? '#10b981' : t === 'mid' ? '#f59e0b' : '#ef4444';
  return (
    <div className="text-center">
      <div
        className="grid size-[74px] place-items-center rounded-full"
        style={{ background: `conic-gradient(${ringColor} ${pct}%, var(--muted) 0)` }}
      >
        <div className="grid size-[56px] place-items-center rounded-full bg-card">
          <span className="text-lg font-bold leading-none">{value.toFixed(1)}</span>
        </div>
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function DimBar({ d, withNote }: { d: Dim; withNote?: boolean }) {
  const t = tone(d.score);
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{d.name}</span>
        <span className={cn('font-bold', TEXT[t])}>{d.score}/5</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', BARBG[t])} style={{ width: `${(d.score / 5) * 100}%` }} />
      </div>
      {withNote && d.note ? <p className="mt-1.5 text-xs text-muted-foreground">{d.note}</p> : null}
    </div>
  );
}

function Collapsible({ open, summary, children }: { open?: boolean; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <details open={open} className="mb-2 overflow-hidden rounded-xl border bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div className="px-3.5 pb-3 pl-8 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground first:mt-0">{children}</p>
);

export function SalesView() {
  const [curId, setCurId] = useState('kodeca');
  const m = MEETINGS.find((x) => x.id === curId) ?? MEETINGS[0];
  if (!m) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sales Agent"
        description="Meeting summaries from your Read AI agent, plus AI coaching on the Hormozi lens."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* meeting list */}
        <Card className="h-fit overflow-hidden p-0">
          <div className="border-b px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Recent meetings</div>
          {MEETINGS.map((mt) => {
            const t = tone(mt.chip);
            return (
              <button
                key={mt.id}
                onClick={() => setCurId(mt.id)}
                className={cn(
                  'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
                  mt.id === curId && 'bg-sky-500/10 shadow-[inset_3px_0_0_var(--color-sky-500,#0ea5e9)]',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{mt.listTitle}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">{mt.listMeta}</div>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', CHIPBG[t])}>{mt.chip.toFixed(1)}</span>
              </button>
            );
          })}
        </Card>

        {/* detail */}
        <Card className="overflow-hidden p-0">
          <div className="border-b px-5 py-4">
            <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
              {m.title}
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-bold text-violet-500">Hormozi lens</span>
            </h2>
            <div className="mt-1 text-[12.5px] text-muted-foreground">{m.metaLine}</div>
          </div>

          <Tabs defaultValue="summary" className="w-full gap-0">
            <TabsList className="mx-4 mt-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="coaching">Coaching</TabsTrigger>
            </TabsList>

            {/* SUMMARY */}
            <TabsContent value="summary" className="px-5 py-4">
              <SectionLabel>Meeting metadata</SectionLabel>
              <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                {Object.entries(m.metadata).map(([k, v]) => (
                  <div key={k} className="contents">
                    <div className="text-muted-foreground">{k}</div>
                    <div className={k === 'Flags' && v.includes('⚠') ? 'text-red-500' : ''}>{v}</div>
                  </div>
                ))}
              </div>

              <SectionLabel>Read AI signals</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: m.signals.talk, k: 'Talk ratio · AE / client' },
                  { v: m.signals.sentiment, k: 'Sentiment', tone: m.signals.sentTone },
                  { v: m.signals.engagement, k: 'Engagement' },
                  { v: m.signals.questions, k: 'Questions · AE / client' },
                ].map((s) => (
                  <div key={s.k} className="min-w-[120px] flex-1 rounded-lg border bg-muted/30 px-3 py-2">
                    <div className={cn('text-[15px] font-bold', s.tone ? TEXT[s.tone] : '')}>{s.v}</div>
                    <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{s.k}</div>
                  </div>
                ))}
              </div>

              <SectionLabel>Executive summary</SectionLabel>
              <p className="text-[13.5px] leading-relaxed text-foreground/90">{m.exec}</p>

              <SectionLabel>Tender</SectionLabel>
              <div className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 px-4 py-3 text-[13px]">
                {m.tender.linked ? (
                  <div className="flex flex-wrap items-center gap-2">
                    🔗 Linked: <b>{m.tender.name}</b> <span className="text-muted-foreground">· {m.tender.meta}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    🔗 Not linked yet — AI suggests{' '}
                    <b className="text-violet-500">{m.tender.bestName}</b>
                    <span className="text-violet-500">· {m.tender.bestMatch} match</span>
                    <span>· {m.tender.bestMeta}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* COACHING */}
            <TabsContent value="coaching" className="px-5 py-4">
              <div className="mb-2 flex items-center gap-6">
                <Ring value={m.aeOverall} label="AE performance" />
                <Ring value={m.clientOverall} label="Client analysis" />
                <p className="max-w-[320px] text-[12.5px] text-muted-foreground">{m.headline}</p>
              </div>

              <SectionLabel>AE performance scores</SectionLabel>
              {m.aeDims.map((d) => (
                <DimBar key={d.name} d={d} withNote />
              ))}

              <SectionLabel>Client analysis</SectionLabel>
              {m.clientDims.map((d) => (
                <DimBar key={d.name} d={d} />
              ))}

              <SectionLabel>What worked</SectionLabel>
              {m.worked.map((w, i) => (
                <Collapsible
                  key={w.n}
                  open={i === 0}
                  summary={
                    <>
                      <span className="text-muted-foreground">▸</span>
                      {w.n} · {w.title}
                      <span className="ml-auto rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-500">{w.method}</span>
                    </>
                  }
                >
                  <p className="my-1.5 border-l-2 pl-2.5 italic text-foreground/80">&ldquo;{w.quote}&rdquo;</p>
                  <div className="text-[12.5px]"><b className="text-muted-foreground">Why:</b> {w.why}</div>
                </Collapsible>
              ))}

              <SectionLabel>What to improve</SectionLabel>
              {m.improve.map((w, i) => (
                <Collapsible
                  key={w.n}
                  open={i === 0}
                  summary={
                    <>
                      <span className="text-muted-foreground">▸</span>
                      {w.n} · {w.title}
                      <span className="ml-auto rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-500">{w.method}</span>
                    </>
                  }
                >
                  {w.what ? <div className="text-[12.5px]"><b className="text-muted-foreground">What happened:</b> {w.what}</div> : null}
                  <div className="text-[12.5px]"><b className="text-muted-foreground">Try:</b> {w.tryThis}</div>
                </Collapsible>
              ))}

              <div className="mt-3.5 text-[11.5px] text-muted-foreground">
                AI confidence {m.confidence} · scored from the Read AI transcript
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
