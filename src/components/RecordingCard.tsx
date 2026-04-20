import Link from 'next/link';
import { Clock, FileAudio, ChevronLeft } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { Recording } from '@/db';

function fmtDuration(sec: number | null) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'Z');
  return d.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' });
}

export function RecordingCard({ r, score }: { r: Recording; score?: number | null }) {
  return (
    <Link
      href={`/recordings/${r.id}`}
      className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-ink-900/60 p-4 transition-all hover:border-brand/40 hover:bg-ink-900"
    >
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-ink-800 ring-1 ring-white/5 transition-colors group-hover:bg-brand/10">
        <FileAudio className="h-5 w-5 text-brand" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-ink-100">{r.original_name}</h3>
          <StatusBadge status={r.status} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-300">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {fmtDuration(r.duration_sec)}
          </span>
          <span>{fmtDate(r.created_at)}</span>
        </div>
      </div>

      {typeof score === 'number' && (
        <div className="flex flex-none flex-col items-center rounded-lg bg-ink-800/80 px-3 py-2 ring-1 ring-white/5">
          <span className="text-xs text-ink-300">ציון</span>
          <span className="text-lg font-bold text-brand">{score}</span>
        </div>
      )}

      <ChevronLeft className="h-5 w-5 flex-none text-ink-400 transition-transform group-hover:-translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}
