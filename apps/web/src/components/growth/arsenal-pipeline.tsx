import { Crosshair, Mail, Moon, PenLine, Radar, Reply } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// The AIM sequence — the outbound arsenal, in order. AIM is the only stage the ERP
// fires directly (the "Launch" trigger); the rest run AUTONOMOUSLY in n8n off the
// campaign config AIM provisions (webhook + schedule triggers, per the live
// workflows). Documented here so the page shows the operator the full funnel.
type Stage = {
  code: string;
  label: string;
  role: string;
  trigger: string;
  icon: LucideIcon;
};

export const ARSENAL_STAGES: readonly Stage[] = [
  {
    code: 'AIM',
    label: 'AIM',
    role: 'Set the target — provisions the campaign Drive folder + config.json',
    trigger: 'Launch (here)',
    icon: Crosshair,
  },
  {
    code: 'LEAD_SATELLITE',
    label: 'Lead Satellite',
    role: 'Pull leads from public sources into the campaign sheet',
    trigger: 'Auto · webhook',
    icon: Radar,
  },
  {
    code: 'AMMO_FORGE',
    label: 'Ammo Forge',
    role: 'Write the outreach docs / emails',
    trigger: 'Auto · webhook',
    icon: PenLine,
  },
  {
    code: 'REACH_BAZOOKA',
    label: 'Reach Bazooka',
    role: 'Send outbound, track replies',
    trigger: 'Auto · daily',
    icon: Mail,
  },
  {
    code: 'REPLY_GLOCK',
    label: 'Reply Glock',
    role: 'Sort & answer replies, book meetings',
    trigger: 'Auto · 15 min',
    icon: Reply,
  },
  {
    code: 'SLEEPER_GRENADE',
    label: 'Sleeper Grenade',
    role: 'Sweep not-interested → snooze → re-email',
    trigger: 'Auto · daily',
    icon: Moon,
  },
];

export function ArsenalPipeline() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ARSENAL_STAGES.map((s, i) => {
        const Icon = s.icon;
        const isAim = s.code === 'AIM';
        return (
          <li
            key={s.code}
            className={cn(
              'rounded-lg border p-4',
              isAim ? 'border-primary/40 bg-primary/5' : 'bg-card',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <Icon className="size-4 shrink-0" />
                <span className="truncate text-sm font-medium">{s.label}</span>
              </div>
              <Badge
                variant={isAim ? 'default' : 'outline'}
                className="shrink-0 text-[10px]"
              >
                {s.trigger}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.role}</p>
          </li>
        );
      })}
    </ol>
  );
}
