import type { TenderRegime, TenderStatus } from '@evertrust/shared';

// Presentational helpers for tender data. Pure functions, no React — shared by
// the table, the board, and the detail view so formatting stays consistent.

// The 7 canonical statuses in lifecycle order (used to order the status board
// columns and the status <Select>). Mirrors STATE_MACHINE's keys; kept explicit
// so the board column order is intentional rather than object-key-order-dependent.
export const STATUS_ORDER: readonly TenderStatus[] = [
  'NOT_STARTED',
  'PIC_PRICING',
  'CUSTOMER_PRICING',
  'DOCUMENTS',
  'SUBMITTED',
  'AWARDED',
  'LOST',
];

// Human-readable status labels (the enum values are SCREAMING_SNAKE_CASE). Used
// anywhere a status is shown to a user instead of rendering the raw token.
export const STATUS_LABEL: Record<TenderStatus, string> = {
  NOT_STARTED: 'Not started',
  PIC_PRICING: 'PIC pricing',
  CUSTOMER_PRICING: 'Customer pricing',
  DOCUMENTS: 'Documents',
  SUBMITTED: 'Submitted',
  AWARDED: 'Awarded',
  LOST: 'Lost',
};

// Tailwind classes for each status badge. Tuned for the dark shell: a tinted
// surface + readable foreground, ramping from neutral (not started) through the
// pricing/documents stages, with AWARDED/LOST as the clear terminal signals.
export const STATUS_BADGE_CLASS: Record<TenderStatus, string> = {
  NOT_STARTED: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  PIC_PRICING: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  CUSTOMER_PRICING: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  DOCUMENTS: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  SUBMITTED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  AWARDED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  LOST: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
};

// Human-readable regime labels (the enum values are abbreviations).
export const REGIME_LABEL: Record<TenderRegime, string> = {
  VOB_A: 'VOB/A',
  VgV: 'VgV',
  UVgO: 'UVgO',
};

// Format an estimated value (a precision-preserving numeric STRING over the wire)
// as a localized currency amount. Falls back to a dash for null/unparseable.
export function formatValue(value: string | null, currency: string): string {
  if (value === null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // Unknown currency code — show the raw amount with the code appended.
    return `${n.toLocaleString('de-DE')} ${currency}`;
  }
}

// Format an ISO timestamp as a short date. Dash for null.
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format a byte count as a compact human size (e.g. "1.2 MB"). Dash for null.
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

// Format an ISO timestamp as date + time (used on the detail page for audit-ish
// fields like created/updated).
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
