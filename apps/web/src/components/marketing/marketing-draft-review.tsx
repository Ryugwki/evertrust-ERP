'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Mock RAG drafts (UI-first). Real data later: the `EVERTRUST - RAG AGENT` n8n
// workflow drafts replies to "Unsure" leads (grounded in a knowledge file) and
// saves a Gmail draft "Do Not Send". On Approve, n8n sends that draft.
type Cite = { src: string; snippet: string };
type Draft = {
  id: string;
  company: string;
  email: string;
  area: 'finance' | 'technical' | 'timeline';
  thread: { from: string; when: string; text: string };
  question: string;
  unsureSection: string;
  explain: string;
  knowledge: string;
  cites: Cite[];
  subject: string;
  body: string;
  confidence: number;
};

const DRAFTS: Draft[] = [
  {
    id: 'cp',
    company: 'Code & Pepper',
    email: 'a.kopiczko@codeandpepper.com',
    area: 'finance',
    thread: {
      from: 'Adam Kopiczko',
      when: 'Today 10:41',
      text: 'Hi Hanna, thanks for the info earlier. Quick question on commercials — could you give me a quick overview of what your Market Entry package covers, and how your success fee works on a typical German public tender?\n\nBest, Adam',
    },
    question: 'Could you give me a quick overview of what your Market Entry package covers, and how your success fee works?',
    unsureSection: 'Market Entry package scope + success fee',
    explain: 'Commercial package scope and fee structure',
    knowledge: 'Evertrust — Services & Pricing KB',
    cites: [
      { src: 'Services & Pricing KB · §2 Market Entry', snippet: 'Prepares the company to bid under its own name: document review & structuring, qualification certificates, references, tax/insurance docs, platform onboarding, advisory.' },
      { src: 'Services & Pricing KB · §4 Fees', snippet: 'Fixed submission fee + success commission on award; rate is a % of contract value, scaled down for higher-value contracts.' },
    ],
    subject: 'Market Entry package and success fee overview',
    body: 'Dear Code & Pepper,\n\nOur Market Entry package prepares your company to bid under its own name — document review & structuring, qualification certificates, references, tax/insurance documents, platform onboarding, and market-entry advisory.\n\nThe model combines a fixed submission fee with a success commission on award (a % of contract value, lower for higher-value contracts).\n\nKind regards,\nHanna Nguyen\nEVERTRUST GmbH',
    confidence: 0.86,
  },
  {
    id: 'nw',
    company: 'Nordwind Energie GmbH',
    email: 'einkauf@nordwind-energie.de',
    area: 'technical',
    thread: { from: 'Einkauf Nordwind', when: 'Today 09:55', text: 'Before we proceed — can your modular units meet German KRITIS reliability standards, and what uptime SLA do you guarantee?' },
    question: 'Can your modular units meet German KRITIS reliability standards, and what uptime SLA do you guarantee?',
    unsureSection: 'KRITIS certification and the uptime SLA',
    explain: 'Technical compliance + service-level guarantee',
    knowledge: 'Evertrust — Technical & Compliance KB',
    cites: [
      { src: 'Technical & Compliance KB · KRITIS', snippet: 'Units engineered to German KRITIS reliability; certification evidence provided at qualification.' },
      { src: 'Technical & Compliance KB · SLA', snippet: '99.5% uptime SLA with service credits; defined response-and-restore window.' },
    ],
    subject: 'KRITIS compliance & our uptime SLA',
    body: 'Dear Nordwind Energie GmbH,\n\nOur modular units meet German KRITIS reliability requirements, with full certification documentation provided during qualification. We guarantee a 99.5% uptime SLA backed by service credits and a defined response-and-restore window.\n\nKind regards,\nHanna Nguyen\nEVERTRUST GmbH',
    confidence: 0.82,
  },
  {
    id: 'bm',
    company: 'Baltic Modular Sp. z o.o.',
    email: 'office@balticmodular.pl',
    area: 'timeline',
    thread: { from: 'Office Baltic Modular', when: 'Today 09:52', text: "What's a realistic lead time from order to on-site deployment for around 20 office modules?" },
    question: "What's a realistic lead time from order to on-site deployment for ~20 office modules?",
    unsureSection: 'Deployment lead time for ~20 modules',
    explain: 'Delivery timeline / capacity question',
    knowledge: 'Evertrust — Delivery & Capacity KB',
    cites: [{ src: 'Delivery & Capacity KB · Lead times', snippet: 'Order-to-site for 10–25 modules: 6–8 weeks subject to configuration and site readiness; staged delivery available.' }],
    subject: 'Lead time for a 20-module deployment',
    body: 'Dear Baltic Modular Sp. z o.o.,\n\nFor ~20 office modules, a realistic order-to-on-site lead time is 6–8 weeks, depending on configuration and site readiness. Staged delivery can begin earlier so your first units are usable while the rest are completed.\n\nKind regards,\nHanna Nguyen\nEVERTRUST GmbH',
    confidence: 0.74,
  },
];

// Count of RAG drafts awaiting review — surfaced in the Marketing funnel bar.
// (Mock today; becomes the real "Unsure"-bucket draft count once the RAG Agent
// workflow reports them.)
export const MARKETING_DRAFT_COUNT = DRAFTS.length;

const AREA_CLASS: Record<Draft['area'], string> = {
  finance: 'bg-sky-500/15 text-sky-500',
  technical: 'bg-violet-500/15 text-violet-500',
  timeline: 'bg-amber-500/15 text-amber-500',
};
function confClass(c: number) {
  return c >= 0.85 ? 'bg-emerald-500/15 text-emerald-500' : c >= 0.8 ? 'bg-amber-500/15 text-amber-500' : 'bg-red-500/15 text-red-500';
}

const FUNNEL = [
  { v: 5, k: 'Unsure' },
  { v: 3, k: 'Drafted', pc: '60%' },
  { v: 1, k: 'Approved', pc: '33%' },
  { v: 1, k: 'Sent', pc: '100%' },
  { v: 0, k: 'Replied', pc: '0%' },
];

export function MarketingDraftReview() {
  const [curId, setCurId] = useState('cp');
  const d = DRAFTS.find((x) => x.id === curId) ?? DRAFTS[0];
  if (!d) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* RAG draft funnel (mock) */}
      <div className="flex items-center gap-1">
        {FUNNEL.map((s, i) => (
          <div key={s.k} className="contents">
            <div className="flex-1 rounded-xl border bg-muted/30 px-2 py-2.5 text-center">
              <div className="text-lg font-bold">{s.v}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.k}</div>
              {s.pc ? <div className="text-[10px] text-sky-500">{s.pc}</div> : null}
            </div>
            {i < FUNNEL.length - 1 ? <span className="px-0.5 text-muted-foreground">▸</span> : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* queue */}
        <Card className="h-fit overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Awaiting review</span>
            <span className="text-amber-500">{DRAFTS.length}</span>
          </div>
          {DRAFTS.map((dr) => (
            <button
              key={dr.id}
              onClick={() => setCurId(dr.id)}
              className={cn(
                'block w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
                dr.id === curId && 'bg-sky-500/10 shadow-[inset_3px_0_0_#0ea5e9]',
              )}
            >
              <div className="text-[13px] font-semibold">{dr.company}</div>
              <div className="truncate text-[11.8px] text-muted-foreground">&ldquo;{dr.question}&rdquo;</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize', AREA_CLASS[dr.area])}>{dr.area}</span>
              </div>
            </button>
          ))}
        </Card>

        {/* detail */}
        <Card className="p-5">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold">{d.company}</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-500">✉ Gmail draft · not sent</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', confClass(d.confidence))}>● {d.confidence.toFixed(2)} confidence</span>
          </div>
          <div className="mb-3 text-[12.5px] text-muted-foreground">
            {d.email} · unsure area: <span className="font-semibold capitalize text-foreground">{d.area}</span>
          </div>

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Original thread</p>
          <details className="mb-3 overflow-hidden rounded-xl border bg-muted/30">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span>▸</span> From {d.thread.from} · {d.thread.when}
            </summary>
            <div className="whitespace-pre-wrap border-l-2 px-3.5 pb-3 text-[12.5px] text-foreground/80">{d.thread.text}</div>
          </details>

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Context — why this needs a reply</p>
          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="border-l-2 border-sky-500 pl-2.5 text-[13px] italic text-foreground/80">&ldquo;{d.question}&rdquo;</p>
            <div className="mt-3 grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
              <div className="text-muted-foreground">Unsure about</div>
              <div>{d.unsureSection}</div>
              <div className="text-muted-foreground">Area</div>
              <div className="capitalize">{d.area} — {d.explain}</div>
            </div>
            <p className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Grounded in: {d.knowledge}</p>
            {d.cites.map((c) => (
              <div key={c.src} className="mt-2 rounded-lg border bg-card px-3 py-2">
                <div className="text-[11px] font-semibold text-sky-500">{c.src}</div>
                <div className="text-xs text-foreground/80">{c.snippet}</div>
              </div>
            ))}
          </div>

          <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Drafted reply — edit before sending</p>
          <Input className="mb-2" defaultValue={d.subject} key={`${d.id}-subj`} />
          <Textarea className="min-h-[190px] whitespace-pre-wrap" defaultValue={d.body} key={`${d.id}-body`} />
          {d.confidence < 0.8 ? (
            <div className="mt-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Lower confidence ({d.confidence.toFixed(2)}) — verify against the cited source before sending.
            </div>
          ) : null}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Button onClick={() => toast.success(`Approved — n8n will send the reply to ${d.company}.`)}>✓ Approve &amp; send</Button>
            <Button variant="outline" onClick={() => toast('Draft edits saved.')}>Save edits</Button>
            <Button variant="outline" className="text-red-500" onClick={() => toast('Draft discarded.')}>Discard</Button>
            <span className="ml-auto text-[11.5px] text-muted-foreground">RAG draft · n8n sends on approve</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
