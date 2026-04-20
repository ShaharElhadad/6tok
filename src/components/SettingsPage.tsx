'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  RefreshCw,
  CircleAlert,
  CheckCircle2,
  Cloud,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Health = {
  ready: boolean;
  transcription_engine: 'local' | 'groq' | 'openai' | null;
  llm_provider: 'anthropic' | 'gemini' | null;

  whisper_url: string;
  whisper_ok: boolean;
  whisper_info?: any;

  groq_configured: boolean;
  groq_model: string;
  openai_configured: boolean;
  openai_base_url: string;
  whisper_model: string;

  anthropic_configured: boolean;
  anthropic_model: string;
  gemini_configured: boolean;
  gemini_model: string;

  db_path: string;
  uploads_path: string;
  version: string;
};

const ENGINE_LABEL: Record<string, string> = {
  local: 'Whisper מקומי (faster-whisper · חינם · ללא הגבלת גודל)',
  groq: 'Groq (חינם · whisper-large-v3 · עד 25MB)',
  openai: 'OpenAI (בתשלום · whisper-1 · עד 25MB)',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini (חינם)',
};

export function SettingsPage() {
  const [h, setH] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setTesting(true);
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      const j = await r.json();
      setH(j);
    } catch {}
    setLoading(false);
    setTesting(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Overall state */}
      <Section title="מצב המערכת">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-ink-900 px-4 py-3 ring-1 ring-white/[0.06]">
          <div className="flex items-center gap-3">
            {h?.ready ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <CircleAlert className="h-5 w-5 text-amber-400" />
            )}
            <div>
              <div className="text-[14px] font-medium text-ink-100">
                {h?.ready ? 'המערכת מוכנה לתמלול וניתוח' : 'חסרות הגדרות'}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-400">
                {h?.ready
                  ? `תמלול: ${ENGINE_LABEL[h.transcription_engine || '']} · ניתוח: ${ENGINE_LABEL[h.llm_provider || '']}`
                  : 'הוסף לפחות ספק תמלול וספק ניתוח אחד לקובץ .env.local'}
              </div>
            </div>
          </div>
          <button
            onClick={load}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1.5 text-[12px] text-ink-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', testing && 'animate-spin')} />
            בדוק מחדש
          </button>
        </div>
      </Section>

      {/* Transcription */}
      <Section title="תמלול" desc="ברירת מחדל: WhisperX מקומי. אם הוא לא רץ — Groq (חינמי), ואם לא — OpenAI.">
        <div className="grid gap-2">
          <ProviderRow
            label="Whisper מקומי (faster-whisper)"
            active={h?.transcription_engine === 'local'}
            ok={!!h?.whisper_ok}
            loading={loading}
            icon={<Server className="h-4 w-4" />}
            detail={
              h?.whisper_ok
                ? `${h.whisper_info?.model} · ${h.whisper_info?.device} · ${h.whisper_info?.engine || 'faster-whisper'}`
                : `פועל על ${h?.whisper_url} (לא מגיב)`
            }
            env="WHISPER_URL"
          />
          <ProviderRow
            label="Groq · whisper-large-v3 (חינם)"
            active={h?.transcription_engine === 'groq'}
            ok={!!h?.groq_configured}
            loading={loading}
            icon={<Cloud className="h-4 w-4" />}
            detail={h?.groq_configured ? 'מפתח מוגדר' : 'חסר GROQ_API_KEY — קבל מ־console.groq.com'}
            env="GROQ_API_KEY"
          />
          <ProviderRow
            label="OpenAI · whisper-1 (בתשלום)"
            active={h?.transcription_engine === 'openai'}
            ok={!!h?.openai_configured}
            loading={loading}
            icon={<Cloud className="h-4 w-4" />}
            detail={h?.openai_configured ? 'מפתח מוגדר' : 'חסר OPENAI_API_KEY'}
            env="OPENAI_API_KEY"
          />
        </div>
      </Section>

      {/* Analysis */}
      <Section title="ניתוח (LLM)" desc="ברירת מחדל: Anthropic. אם חסר — Gemini (חינמי).">
        <div className="grid gap-2">
          <ProviderRow
            label="Anthropic Claude"
            active={h?.llm_provider === 'anthropic'}
            ok={!!h?.anthropic_configured}
            loading={loading}
            icon={<Cloud className="h-4 w-4" />}
            detail={
              h?.anthropic_configured
                ? h.anthropic_model
                : 'חסר ANTHROPIC_API_KEY'
            }
            env="ANTHROPIC_API_KEY"
          />
          <ProviderRow
            label="Google Gemini (חינם)"
            active={h?.llm_provider === 'gemini'}
            ok={!!h?.gemini_configured}
            loading={loading}
            icon={<Cloud className="h-4 w-4" />}
            detail={
              h?.gemini_configured
                ? h.gemini_model
                : 'חסר GEMINI_API_KEY — קבל מ־aistudio.google.com/apikey'
            }
            env="GEMINI_API_KEY"
          />
        </div>
      </Section>

      {/* Paths */}
      <Section title="אחסון" desc="">
        <div className="grid gap-2">
          <ConfigRow label="DB" value={h?.db_path || '—'} />
          <ConfigRow label="UPLOADS" value={h?.uploads_path || '—'} />
        </div>
      </Section>

      <Section title="אודות">
        <div className="flex items-center justify-between rounded-lg bg-ink-900 px-4 py-3 ring-1 ring-white/[0.06]">
          <div>
            <div className="text-[14px] font-medium text-ink-100">6TOK</div>
            <div className="text-[11px] text-ink-400">מערכת לאימון מכירות — MVP</div>
          </div>
          <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-ink-300 ring-1 ring-white/[0.08]">
            v{h?.version || '0.1.0'}
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

function ProviderRow({
  label,
  active,
  ok,
  loading,
  icon,
  detail,
  env,
}: {
  label: string;
  active: boolean;
  ok: boolean;
  loading: boolean;
  icon: React.ReactNode;
  detail: string;
  env: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-4 py-3 ring-1 transition-colors',
        active
          ? 'bg-brand/[0.06] ring-brand/30'
          : ok
            ? 'bg-emerald-500/[0.04] ring-emerald-500/20'
            : 'bg-ink-900 ring-white/[0.06]',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex h-7 w-7 flex-none items-center justify-center rounded-md',
            active
              ? 'bg-brand/20 text-brand'
              : ok
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/[0.04] text-ink-400',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-ink-100">{label}</span>
            {active && (
              <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                פעיל
              </span>
            )}
            {!active && ok && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                מוכן
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-ink-400">{detail}</div>
        </div>
      </div>
      <span className="flex-none font-mono text-[10px] text-ink-500">{env}</span>
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
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
