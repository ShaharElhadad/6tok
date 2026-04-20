'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw, CircleAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Health = {
  whisper_url: string;
  whisper_ok: boolean;
  whisper_info?: any;
  anthropic_configured: boolean;
  anthropic_model: string;
  db_path: string;
  uploads_path: string;
  version: string;
};

export function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setTesting(true);
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      const j = await r.json();
      setHealth(j);
    } catch {}
    setLoading(false);
    setTesting(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* System health */}
      <Section title="מצב המערכת" desc="סטטוס חיבורים ונתיבי קבצים">
        <div className="grid gap-2">
          <HealthRow
            label="שרת Whisper"
            sublabel={health?.whisper_url}
            ok={!!health?.whisper_ok}
            loading={loading}
            detail={
              health?.whisper_info
                ? `${health.whisper_info.model} · ${health.whisper_info.device} · ${health.whisper_info.compute_type}`
                : 'ודא ש־uvicorn רץ על port 8787'
            }
          />
          <HealthRow
            label="Anthropic API (Claude)"
            sublabel={health?.anthropic_model}
            ok={!!health?.anthropic_configured}
            loading={loading}
            detail={
              health?.anthropic_configured
                ? 'המפתח מוגדר'
                : 'הוסף ANTHROPIC_API_KEY ל־.env.local'
            }
          />
        </div>

        <button
          onClick={load}
          disabled={testing}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1.5 text-[12px] text-ink-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', testing && 'animate-spin')} />
          בדוק מחדש
        </button>
      </Section>

      {/* Config */}
      <Section
        title="תצורה"
        desc="הערכים נטענים מקובץ .env.local. לשינוי — ערוך את הקובץ והפעל מחדש את השרת."
      >
        <div className="grid gap-2 text-[13px]">
          <ConfigRow label="WHISPER_URL" value={health?.whisper_url || '—'} />
          <ConfigRow label="ANTHROPIC_MODEL" value={health?.anthropic_model || '—'} />
          <ConfigRow label="ANTHROPIC_API_KEY" value={health?.anthropic_configured ? '•••••••••• (מוגדר)' : '(חסר)'} />
        </div>
      </Section>

      {/* Paths */}
      <Section title="אחסון" desc="מיקום הקבצים במחשב/שרת">
        <div className="grid gap-2">
          <ConfigRow label="בסיס נתונים" value={health?.db_path || '—'} />
          <ConfigRow label="תיקיית העלאות" value={health?.uploads_path || '—'} />
        </div>
      </Section>

      {/* Version */}
      <Section title="אודות" desc="">
        <div className="flex items-center justify-between rounded-lg bg-ink-900 px-4 py-3 ring-1 ring-white/[0.06]">
          <div>
            <div className="text-[14px] font-medium text-ink-100">6TOK</div>
            <div className="text-[11px] text-ink-400">
              מערכת לאימון מכירות — MVP
            </div>
          </div>
          <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-ink-300 ring-1 ring-white/[0.08]">
            v{health?.version || '0.1.0'}
          </span>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold text-ink-100">{title}</h2>
        {desc && <p className="mt-1 text-[12px] text-ink-400">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function HealthRow({
  label,
  sublabel,
  ok,
  loading,
  detail,
}: {
  label: string;
  sublabel?: string;
  ok: boolean;
  loading: boolean;
  detail?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-4 py-3 ring-1 transition-colors',
        loading
          ? 'bg-ink-900 ring-white/[0.06]'
          : ok
            ? 'bg-emerald-500/[0.04] ring-emerald-500/20'
            : 'bg-red-500/[0.04] ring-red-500/20',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {!loading &&
            (ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <CircleAlert className="h-4 w-4 text-red-400" />
            ))}
          <span className="text-[14px] font-medium text-ink-100">{label}</span>
        </div>
        {detail && <div className="mt-1 text-[12px] text-ink-400">{detail}</div>}
      </div>
      {sublabel && (
        <span className="font-mono text-[11px] text-ink-400">{sublabel}</span>
      )}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="flex items-center justify-between rounded-lg bg-ink-900 px-4 py-2.5 ring-1 ring-white/[0.06]">
      <span className="font-mono text-[11px] font-medium text-ink-400">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[12px] text-ink-200">{value}</span>
        <button
          onClick={copy}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-white/[0.05] hover:text-ink-200"
          title="העתק"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
