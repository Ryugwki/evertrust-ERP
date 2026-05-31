'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlarmClock } from 'lucide-react';
import {
  ARSENAL_STAGE_META,
  BAZOOKA_TIMEZONES,
  DEFAULT_BAZOOKA_TIMEZONE,
} from '@evertrust/shared';
import {
  useArsenalSettings,
  useUpdateArsenalSettings,
} from '@/hooks/use-arsenal';
import { Can } from '@/components/auth/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RunStageButton } from './run-stage-button';

// All arsenal stages are runnable here. Per-campaign stages (Lead Satellite, Ammo
// Forge) fire across all campaigns when run from this panel; to target a single
// campaign, use its row in the campaign list instead.
const ALL_STAGES = Object.values(ARSENAL_STAGE_META);

export function ArsenalControls() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Arsenal controls</CardTitle>
        <CardDescription>
          Fire any arsenal stage now across all active campaigns, or set the daily
          Reach Bazooka send time.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <DailySendSetting />
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Run a stage now
          </p>
          <ul className="-mx-2 grid">
            {ALL_STAGES.map((m) => (
              <li
                key={m.stage}
                className="flex items-center justify-between gap-4 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.what}</p>
                </div>
                <Can permission="campaigns:write">
                  <RunStageButton stage={m.stage} label="Run now" />
                </Can>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// The ERP-editable daily Bazooka send. A `type="time"` input yields "HH:MM" and the
// Select yields an IANA zone — exactly what the API validates + the scheduler arms
// on save. The send fires at that wall-clock time in the chosen zone (DST-correct),
// so the schedule is explicit rather than tied to the opaque server clock.
function DailySendSetting() {
  const settings = useArsenalSettings();
  const update = useUpdateArsenalSettings();
  const [time, setTime] = useState('');
  const [timeZone, setTimeZone] = useState<string>(DEFAULT_BAZOOKA_TIMEZONE);

  const savedTime = settings.data?.bazookaDailyAt ?? null;
  const savedTz = settings.data?.bazookaTimezone ?? null;

  useEffect(() => {
    setTime(savedTime ?? '');
    setTimeZone(savedTz ?? DEFAULT_BAZOOKA_TIMEZONE);
  }, [savedTime, savedTz]);

  function save() {
    if (!time) {
      toast.error('Pick a time (or use Turn off).');
      return;
    }
    update.mutate(
      { bazookaDailyAt: time, bazookaTimezone: timeZone },
      {
        onSuccess: () =>
          toast.success(`Daily Bazooka send set to ${time} (${timeZone}).`),
        onError: (e) => toast.error(e.message ?? 'Could not save.'),
      },
    );
  }

  function turnOff() {
    // Clear the time but keep the chosen zone, so re-enabling remembers it.
    update.mutate(
      { bazookaDailyAt: null, bazookaTimezone: timeZone },
      {
        onSuccess: () => toast.success('Daily Bazooka send turned off.'),
        onError: (e) => toast.error(e.message ?? 'Could not save.'),
      },
    );
  }

  // Save is enabled only when the time — or, for an active send, the zone — differs
  // from what's stored. No-op saves are disabled; clearing is done via "Turn off".
  const timeDirty = (time || null) !== savedTime;
  const tzDirty = !!time && timeZone !== (savedTz ?? DEFAULT_BAZOOKA_TIMEZONE);
  const dirty = timeDirty || tzDirty;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
          <AlarmClock className="size-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Daily Reach Bazooka send</p>
            {settings.isLoading ? null : savedTime ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400"
              >
                On · {savedTime} · {zoneCity(savedTz)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Off
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Send the daily outbound batch automatically at this time, in the
            selected timezone. Runs independently of n8n&apos;s own schedule.
          </p>

          <Can permission="campaigns:write">
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <Label
                  htmlFor="bazooka-daily-at"
                  className="text-xs text-muted-foreground"
                >
                  Time
                </Label>
                <Input
                  id="bazooka-daily-at"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="grid gap-1">
                <Label
                  htmlFor="bazooka-timezone"
                  className="text-xs text-muted-foreground"
                >
                  Timezone
                </Label>
                <Select value={timeZone} onValueChange={setTimeZone}>
                  <SelectTrigger id="bazooka-timezone" className="w-[190px]">
                    <SelectValue placeholder="Timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAZOOKA_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={update.isPending || !dirty}
              >
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
              {savedTime ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={turnOff}
                  disabled={update.isPending}
                  className="text-muted-foreground"
                >
                  Turn off
                </Button>
              ) : null}
            </div>
          </Can>
        </div>
      </div>
    </div>
  );
}

// City label for the status badge: "Europe/Berlin" → "Berlin", "UTC" → "UTC". A null
// zone is a legacy row still on the server clock — say so honestly.
function zoneCity(tz: string | null): string {
  if (!tz) return 'server time';
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ');
}
