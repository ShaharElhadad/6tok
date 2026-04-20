'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Script = {
  id: number;
  name: string;
  content: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selected, setSelected] = useState<Script | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch('/api/scripts', { cache: 'no-store' });
    const j = await r.json();
    setScripts(j.scripts || []);
    if (j.scripts?.length && !selected) {
      const active = j.scripts.find((s: Script) => s.is_active) || j.scripts[0];
      pick(active);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (s: Script | null) => {
    setSelected(s);
    setName(s?.name || '');
    setContent(s?.content || '');
  };

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      if (selected) {
        await fetch(`/api/scripts/${selected.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, content }),
        });
      } else {
        await fetch('/api/scripts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: name || 'תסריט חדש', content, set_active: scripts.length === 0 }),
        });
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (s: Script) => {
    await fetch(`/api/scripts/${s.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ set_active: true }),
    });
    await load();
  };

  const del = async (s: Script) => {
    if (!confirm(`למחוק את "${s.name}"?`)) return;
    await fetch(`/api/scripts/${s.id}`, { method: 'DELETE' });
    if (selected?.id === s.id) pick(null);
    await load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-100">תסריטים</h2>
          <button
            onClick={() => pick(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/30 hover:bg-brand/20"
            title="תסריט חדש"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          {scripts.map((s) => (
            <div
              key={s.id}
              onClick={() => pick(s)}
              className={cn(
                'group cursor-pointer rounded-lg border p-3 transition-colors',
                selected?.id === s.id
                  ? 'border-brand/40 bg-brand/5'
                  : 'border-white/5 bg-ink-900/40 hover:border-white/10',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink-100">{s.name}</span>
                <div className="flex items-center gap-1">
                  {s.is_active ? (
                    <Star className="h-3.5 w-3.5 fill-brand text-brand" />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive(s);
                      }}
                      className="opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
                      title="קבע כפעיל"
                    >
                      <Star className="h-3.5 w-3.5 text-ink-400" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      del(s);
                    }}
                    className="opacity-0 text-ink-400 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    title="מחק"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {s.is_active ? (
                <div className="mt-1 text-[11px] text-brand">פעיל</div>
              ) : (
                <div className="mt-1 text-[11px] text-ink-400">
                  עודכן {new Date(s.updated_at + 'Z').toLocaleDateString('he-IL')}
                </div>
              )}
            </div>
          ))}
          {scripts.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-ink-400">
              עוד אין תסריטים
            </div>
          )}
        </div>
      </aside>

      <div className="rounded-2xl border border-white/5 bg-ink-900/60 p-5">
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-ink-300">שם התסריט</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: תסריט סגירה Q2"
              className="w-full rounded-lg border border-white/10 bg-ink-800/70 px-3 py-2 text-sm text-ink-100 outline-none transition-colors focus:border-brand/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-300">תוכן התסריט</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={22}
              placeholder="הדבק כאן את התסריט שלך. כלול פתיחה, שאלות גילוי, הצעה, טיפול בהתנגדויות, סגירה…"
              className="w-full rounded-lg border border-white/10 bg-ink-800/70 px-3 py-2 text-[15px] leading-relaxed text-ink-100 outline-none transition-colors focus:border-brand/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-ink-400">
            {selected ? `עורך: ${selected.name}` : 'תסריט חדש'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!content.trim() || saving}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                !content.trim() || saving
                  ? 'cursor-not-allowed bg-ink-800 text-ink-500'
                  : 'bg-brand text-white shadow-glow hover:bg-brand-600',
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {selected ? 'שמור שינויים' : 'צור תסריט'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
