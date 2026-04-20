'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Mail,
  Phone,
  Calendar,
  X,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Trainee = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  recordings_count: number;
  avg_score: number | null;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
};

export function TeamPage() {
  const [items, setItems] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    const r = await fetch('/api/trainees', { cache: 'no-store' });
    const j = await r.json();
    setItems(j.trainees || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (t) =>
      !query ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(query.toLowerCase()),
  );

  const del = async (t: Trainee) => {
    if (!confirm(`למחוק את ${t.name}?`)) return;
    await fetch(`/api/trainees/${t.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryCard label="סה״כ מתאמנים" value={items.length} />
        <SummaryCard
          label="שיחות הוקלטו"
          value={items.reduce((s, t) => s + (t.recordings_count || 0), 0)}
        />
        <SummaryCard
          label="ציון ממוצע בצוות"
          value={(() => {
            const withScore = items.filter((t) => typeof t.avg_score === 'number');
            if (!withScore.length) return '—';
            return Math.round(
              withScore.reduce((s, t) => s + (t.avg_score ?? 0), 0) / withScore.length,
            );
          })()}
          accent
        />
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 ring-1 ring-white/[0.06] focus-within:ring-white/[0.15]">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם או אימייל…"
            className="w-full bg-transparent text-[13px] text-ink-100 outline-none placeholder:text-ink-500"
          />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-medium text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          מתאמן חדש
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-ink-900 ring-1 ring-white/[0.06]">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 border-b border-white/[0.05] px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-ink-500">
          <span className="w-9" />
          <span>שם</span>
          <span className="hidden w-32 text-center md:inline-block">אימייל</span>
          <span className="w-16 text-center">שיחות</span>
          <span className="w-16 text-center">ציון</span>
          <span className="w-10" />
        </div>

        {loading ? (
          <Empty label="טוען…" />
        ) : filtered.length === 0 ? (
          items.length === 0 ? (
            <Empty
              label="עוד אין מתאמנים"
              sub="הוסף את המתאמן הראשון כדי להתחיל לעקוב אחרי ההתקדמות שלו"
              action={
                <button
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-medium text-white hover:bg-brand-600"
                >
                  <Plus className="h-4 w-4" />
                  מתאמן חדש
                </button>
              }
            />
          ) : (
            <Empty label="לא נמצאו תוצאות" />
          )
        ) : (
          filtered.map((t) => <TraineeRow key={t.id} t={t} onDelete={() => del(t)} />)
        )}
      </div>

      {open && <AddTraineeModal onClose={() => setOpen(false)} onSaved={load} />}
    </div>
  );
}

function TraineeRow({ t, onDelete }: { t: Trainee; onDelete: () => void }) {
  const initials = t.name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div className="group grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-white/[0.05] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.02]">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand/10 text-[13px] font-semibold text-brand ring-1 ring-brand/30">
        {initials || <UserIcon className="h-4 w-4" />}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-ink-100">{t.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
          {t.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {t.phone}
            </span>
          )}
          {t.last_activity && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(t.last_activity + 'Z').toLocaleDateString('he-IL')}
            </span>
          )}
        </div>
      </div>

      <div className="hidden w-32 truncate text-center text-[12px] text-ink-300 md:block">
        {t.email || '—'}
      </div>

      <div className="w-16 text-center text-[14px] tabular-nums text-ink-200">
        {t.recordings_count}
      </div>

      <div className="w-16 text-center">
        {typeof t.avg_score === 'number' ? (
          <span
            className={cn(
              'text-[16px] font-semibold tabular-nums',
              t.avg_score >= 80
                ? 'text-emerald-400'
                : t.avg_score >= 60
                  ? 'text-brand'
                  : 'text-red-400',
            )}
          >
            {t.avg_score}
          </span>
        ) : (
          <span className="text-ink-500">—</span>
        )}
      </div>

      <button
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
        title="מחק"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddTraineeModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/trainees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, phone, notes }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-ink-900 p-5 ring-1 ring-white/[0.1]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink-100">מתאמן חדש</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-white/[0.05] hover:text-ink-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="שם מלא *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-md bg-ink-800 px-3 py-2 text-[14px] text-ink-100 ring-1 ring-white/[0.06] outline-none transition-colors focus:ring-brand/40"
            />
          </Field>
          <Field label="אימייל">
            <input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-ink-800 px-3 py-2 text-[14px] text-ink-100 ring-1 ring-white/[0.06] outline-none transition-colors focus:ring-brand/40"
            />
          </Field>
          <Field label="טלפון">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md bg-ink-800 px-3 py-2 text-[14px] text-ink-100 ring-1 ring-white/[0.06] outline-none transition-colors focus:ring-brand/40"
            />
          </Field>
          <Field label="הערות">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-ink-800 px-3 py-2 text-[14px] text-ink-100 ring-1 ring-white/[0.06] outline-none transition-colors focus:ring-brand/40"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[13px] text-ink-300 transition-colors hover:bg-white/[0.05] hover:text-ink-100"
          >
            ביטול
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className={cn(
              'rounded-md px-4 py-1.5 text-[13px] font-medium text-white transition-colors',
              !name.trim() || saving
                ? 'cursor-not-allowed bg-ink-700 text-ink-500'
                : 'bg-brand hover:bg-brand-600',
            )}
          >
            {saving ? 'שומר…' : 'הוסף'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-ink-400">{label}</div>
      {children}
    </label>
  );
}

function SummaryCard({
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

function Empty({
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
      {sub && <div className="max-w-sm text-[12px] text-ink-400">{sub}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
