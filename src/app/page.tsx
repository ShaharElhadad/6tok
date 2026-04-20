'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { UploadZone } from '@/components/UploadZone';
import { RecordingCard } from '@/components/RecordingCard';
import { SetupBanner } from '@/components/SetupBanner';
import { Plus, Search } from 'lucide-react';
import type { Recording } from '@/db';
import { cn } from '@/lib/cn';

type Row = Recording & { score: number | null };

export default function Home() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'analyzed' | 'processing'>('all');

  const load = async () => {
    const res = await fetch('/api/recordings', { cache: 'no-store' });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const j = await res.json();
    setItems(j.recordings || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const scored = items.filter((r) => typeof r.score === 'number');
  const analyzed = items.filter((r) => r.status === 'analyzed').length;
  const processing = items.filter(
    (r) => r.status === 'transcribing' || r.status === 'analyzing',
  ).length;
  const avg = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length)
    : null;

  const filtered = items.filter((r) => {
    if (query && !r.original_name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'analyzed' && r.status !== 'analyzed') return false;
    if (filter === 'processing' && r.status !== 'transcribing' && r.status !== 'analyzing') return false;
    return true;
  });

  return (
    <AppShell
      title="הקלטות"
      actions={
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          העלאת שיחה
        </button>
      }
    >
      <SetupBanner />

      <div className="mx-auto max-w-6xl p-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="סה״כ שיחות" value={items.length} />
          <StatCard label="מנותחות" value={analyzed} accent />
          <StatCard label="ציון ממוצע" value={avg ?? '—'} />
          <StatCard label="בעיבוד" value={processing} />
        </div>

        {/* Filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 ring-1 ring-white/[0.06] focus-within:ring-white/[0.15]">
            <Search className="h-4 w-4 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם שיחה…"
              className="w-full bg-transparent text-[13px] text-ink-100 outline-none placeholder:text-ink-500"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-ink-900 p-1 ring-1 ring-white/[0.06]">
            {(['all', 'analyzed', 'processing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[12px] transition-colors',
                  filter === f
                    ? 'bg-white/[0.08] text-ink-100'
                    : 'text-ink-300 hover:text-ink-100',
                )}
              >
                {f === 'all' ? 'הכל' : f === 'analyzed' ? 'מוכנות' : 'בעיבוד'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-ink-900 ring-1 ring-white/[0.06]">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-white/[0.05] px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-ink-500">
            <span className="w-9" />
            <span>שם</span>
            <span className="hidden w-16 text-center md:inline-block">משך</span>
            <span className="w-24 text-left">סטטוס</span>
            <span className="w-14 text-left">ציון</span>
          </div>

          {loading ? (
            <EmptyState label="טוען…" />
          ) : filtered.length === 0 ? (
            items.length === 0 ? (
              <EmptyState
                label="אין עדיין שיחות"
                sub="העלה הקלטה ראשונה כדי להתחיל"
                action={
                  <button
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-medium text-white hover:bg-brand-600"
                  >
                    <Plus className="h-4 w-4" />
                    העלאת שיחה
                  </button>
                }
              />
            ) : (
              <EmptyState label="לא נמצאו תוצאות" sub="שנה את הסינון או החיפוש" />
            )
          ) : (
            filtered.map((r) => <RecordingCard key={r.id} r={r} score={r.score} />)
          )}
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <UploadZone variant="modal" onClose={() => setShowUpload(false)} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-ink-900 p-4 ring-1 ring-white/[0.06]">
      <div className="text-[11px] font-medium text-ink-400">{label}</div>
      <div
        className={cn(
          'mt-2 text-[26px] font-semibold leading-none tabular-nums',
          accent ? 'text-brand' : 'text-ink-100',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  label,
  sub,
  action,
}: {
  label: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="text-[14px] font-medium text-ink-200">{label}</div>
      {sub && <div className="text-[12px] text-ink-400">{sub}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
