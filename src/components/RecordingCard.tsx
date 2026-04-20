import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import type { Recording } from '@/db';
import { FileAudio } from 'lucide-react';
import { cn } from '@/lib/cn';

function fmtDuration(sec: number | null) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'Z');
  return d.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-brand';
  return 'text-red-400';
}

export function RecordingCard({
  r,
  score,
}: {
  r: Recording;
  score?: number | null;
  idx?: number;
}) {
  return (
    <Link
      href={`/recordings/${r.id}`}
      className="group grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-white/[0.05] px-4 py-3 transition-colors hover:bg-white/[0.02] last:border-b-0"
    >
      {/* Icon */}
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] transition-colors group-hover:bg-brand/10 group-hover:ring-brand/30">
        <FileAudio className="h-4 w-4 text-ink-300 transition-colors group-hover:text-brand" />
      </div>

      {/* Title */}
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-ink-100">
          {r.original_name}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-400">
          {fmtDate(r.created_at)}
        </div>
      </div>

      {/* Duration */}
      <div className="hidden w-16 text-center text-[13px] tabular-nums text-ink-300 md:block">
        {fmtDuration(r.duration_sec)}
      </div>

      {/* Status */}
      <div className="w-24 justify-end">
        <StatusBadge status={r.status} />
      </div>

      {/* Score */}
      <div className="w-14 text-left tabular-nums">
        {typeof score === 'number' ? (
          <span className={cn('text-[18px] font-semibold', scoreColor(score))}>
            {score}
          </span>
        ) : (
          <span className="text-ink-500">—</span>
        )}
      </div>
    </Link>
  );
}
