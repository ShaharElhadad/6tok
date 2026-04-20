'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { cn } from '@/lib/cn';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  MessageCircleQuestion,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wand2,
  XCircle,
} from 'lucide-react';

type Word = { text: string; start_ms: number; end_ms: number };
type Segment = {
  id: number;
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
  speaker: string | null;
  words_json: string | null;
};

type Finding = {
  kind: string;
  severity: 'positive' | 'neutral' | 'negative';
  start_ms: number;
  end_ms: number;
  quote: string;
  note: string;
  suggestion?: string;
};

type Analysis = {
  score_overall: number | null;
  summary: string | null;
  strengths_json: string | null;
  weaknesses_json: string | null;
  findings_json: string | null;
  script_adherence_json: string | null;
  suggestions_json: string | null;
};

type Recording = {
  id: number;
  original_name: string;
  status: string;
  error: string | null;
  duration_sec: number | null;
};

const KIND_LABEL: Record<string, string> = {
  rapport: 'קירוב',
  distancing: 'הרחקה',
  open_question: 'שאלה פתוחה',
  closed_question: 'שאלה סגורה',
  objection_handling: 'טיפול בהתנגדות',
  emotion: 'רגש',
  tone_shift: 'שינוי טון',
  pacing: 'קצב',
  script_miss: 'חריגה מתסריט',
  script_hit: 'עמידה בתסריט',
  closing_attempt: 'ניסיון סגירה',
  filler: 'מילות מחזור',
  clarity: 'בהירות',
};

export function RecordingView({ id }: { id: number }) {
  const [rec, setRec] = useState<Recording | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [seek, setSeek] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const segRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const refresh = async () => {
    const res = await fetch(`/api/recordings/${id}`, { cache: 'no-store' });
    const j = await res.json();
    setRec(j.recording);
    setSegments(j.segments || []);
    setAnalysis(j.analysis || null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const pollStatuses = new Set(['uploaded', 'transcribing', 'analyzing']);
    const interval = setInterval(() => {
      if (rec && !pollStatuses.has(rec.status)) return;
      refresh();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.status]);

  // Auto-scroll active segment into view
  useEffect(() => {
    const active = activeSegment(segments, currentMs);
    if (active == null) return;
    const el = segRefs.current.get(active);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMs, segments]);

  const findings: Finding[] = useMemo(() => {
    if (!analysis?.findings_json) return [];
    try {
      return JSON.parse(analysis.findings_json);
    } catch {
      return [];
    }
  }, [analysis]);

  const strengths: string[] = JSONArr(analysis?.strengths_json);
  const weaknesses: string[] = JSONArr(analysis?.weaknesses_json);
  const suggestions: Array<{ priority: string; text: string }> = JSONArr(analysis?.suggestions_json);
  const scriptAd = analysis?.script_adherence_json ? JSON.parse(analysis.script_adherence_json) : null;

  const filteredFindings = useMemo(() => {
    if (filter === 'all') return findings;
    return findings.filter((f) => f.severity === filter);
  }, [findings, filter]);

  if (loading || !rec) {
    return (
      <div className="rounded-xl border border-white/5 bg-ink-900/60 p-10 text-center text-ink-300">
        טוען…
      </div>
    );
  }

  const analyzing = rec.status === 'transcribing' || rec.status === 'analyzing';
  const transcribingOrWaiting =
    rec.status === 'uploaded' || rec.status === 'transcribing' || segments.length === 0;

  const activeIdx = activeSegment(segments, currentMs);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <a
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-ink-200"
          >
            <ArrowRight className="h-3.5 w-3.5" /> חזור להקלטות
          </a>
          <h1 className="truncate text-2xl font-bold text-ink-100">{rec.original_name}</h1>
        </div>

        {analysis?.score_overall != null && (
          <ScoreBadge score={analysis.score_overall} />
        )}
      </div>

      {/* Player */}
      <AudioPlayer
        src={`/api/recordings/${id}/audio`}
        onTime={(ms) => setCurrentMs(ms)}
        seekTo={seek}
      />

      {/* Status banner */}
      {rec.status === 'failed' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="font-semibold">השיחה נכשלה</div>
          <div className="opacity-80">{rec.error}</div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => {
                await fetch(`/api/recordings/${id}/transcribe`, { method: 'POST' });
                refresh();
              }}
              className="rounded-md bg-red-500/20 px-3 py-1 text-xs ring-1 ring-red-500/30 hover:bg-red-500/30"
            >
              נסה שוב תמלול
            </button>
          </div>
        </div>
      )}

      {analyzing && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
          <Sparkles className="h-4 w-4 animate-pulse" />
          {rec.status === 'transcribing' ? 'מתמלל את השיחה…' : 'מנתח את השיחה…'}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Transcript */}
        <section className="rounded-2xl border border-white/5 bg-ink-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-100">תמלול</h2>
            <span className="text-xs text-ink-400">{segments.length} סגמנטים</span>
          </div>

          {transcribingOrWaiting ? (
            <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-ink-400">
              {rec.status === 'uploaded' ? 'ממתין לתמלול…' : 'מתמלל — זה עשוי לקחת כמה דקות לקובץ ארוך'}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                {segments.map((s) => {
                  const isActive = s.idx === activeIdx;
                  const words: Word[] = s.words_json ? JSON.parse(s.words_json) : [];
                  return (
                    <div
                      key={s.id}
                      ref={(el) => {
                        if (el) segRefs.current.set(s.idx, el);
                      }}
                      className={cn(
                        'group cursor-pointer rounded-lg px-3 py-2 transition-colors',
                        isActive
                          ? 'bg-brand/15 ring-1 ring-brand/40'
                          : 'hover:bg-white/[0.03]',
                      )}
                      onClick={() => setSeek(s.start_ms)}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-400">
                        <span className="tabular-nums">{fmtMs(s.start_ms)}</span>
                        {s.speaker && (
                          <span className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-300 ring-1 ring-white/5">
                            {s.speaker}
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] leading-relaxed text-ink-100">
                        {words.length > 0 ? (
                          <WordByWord
                            words={words}
                            currentMs={currentMs}
                            onWordClick={(w) => setSeek(w.start_ms)}
                          />
                        ) : (
                          s.text
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Analysis sidebar */}
        <aside className="space-y-4">
          {analysis ? (
            <>
              {analysis.summary && (
                <Card title="סיכום" icon={<Sparkles className="h-4 w-4" />}>
                  <p className="text-sm leading-relaxed text-ink-200">{analysis.summary}</p>
                </Card>
              )}

              {(strengths.length > 0 || weaknesses.length > 0) && (
                <Card title="חזקות וחולשות" icon={<Award className="h-4 w-4" />}>
                  <div className="space-y-3">
                    {strengths.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                          <TrendingUp className="h-3.5 w-3.5" /> חזקות
                        </div>
                        <ul className="space-y-1 text-sm text-ink-200">
                          {strengths.map((s, i) => (
                            <li key={i} className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-400" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {weaknesses.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-red-300">
                          <TrendingDown className="h-3.5 w-3.5" /> חולשות
                        </div>
                        <ul className="space-y-1 text-sm text-ink-200">
                          {weaknesses.map((s, i) => (
                            <li key={i} className="flex gap-2">
                              <XCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-red-400" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {scriptAd && (
                <Card title="השוואה לתסריט" icon={<Target className="h-4 w-4" />}>
                  {typeof scriptAd.coverage_pct === 'number' && (
                    <div className="mb-3">
                      <div className="mb-1 flex justify-between text-xs text-ink-300">
                        <span>כיסוי</span>
                        <span className="tabular-nums">{scriptAd.coverage_pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${scriptAd.coverage_pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {scriptAd.hit_items?.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1 text-xs text-emerald-300">הוזכר</div>
                      <ul className="space-y-1 text-xs text-ink-200">
                        {scriptAd.hit_items.map((x: string, i: number) => (
                          <li key={i}>✓ {x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {scriptAd.missed_items?.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs text-red-300">חסר</div>
                      <ul className="space-y-1 text-xs text-ink-200">
                        {scriptAd.missed_items.map((x: string, i: number) => (
                          <li key={i}>✗ {x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {suggestions.length > 0 && (
                <Card title="המלצות לשיפור" icon={<Wand2 className="h-4 w-4" />}>
                  <ul className="space-y-2 text-sm text-ink-200">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span
                          className={cn(
                            'mt-1 h-2 w-2 flex-none rounded-full',
                            s.priority === 'high'
                              ? 'bg-red-400'
                              : s.priority === 'medium'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400',
                          )}
                        />
                        <span>{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {findings.length > 0 && (
                <Card
                  title="רגעי מפתח"
                  icon={<MessageCircleQuestion className="h-4 w-4" />}
                  action={
                    <div className="flex gap-1">
                      {(['all', 'positive', 'negative'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[11px] ring-1 transition-colors',
                            filter === f
                              ? 'bg-brand/20 text-brand ring-brand/40'
                              : 'bg-ink-800 text-ink-300 ring-white/5 hover:bg-ink-700',
                          )}
                        >
                          {f === 'all' ? 'הכל' : f === 'positive' ? 'חיובי' : 'לשיפור'}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                    {filteredFindings.map((f, i) => (
                      <li
                        key={i}
                        onClick={() => setSeek(f.start_ms)}
                        className={cn(
                          'cursor-pointer rounded-lg border p-3 transition-colors',
                          f.severity === 'positive'
                            ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                            : f.severity === 'negative'
                              ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
                              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]',
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px]">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 font-medium',
                              f.severity === 'positive'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : f.severity === 'negative'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-ink-800 text-ink-300',
                            )}
                          >
                            {KIND_LABEL[f.kind] || f.kind}
                          </span>
                          <span className="tabular-nums text-ink-400">
                            {fmtMs(f.start_ms)}
                          </span>
                        </div>
                        <p className="text-[13px] text-ink-100">"{f.quote}"</p>
                        <p className="mt-1 text-xs text-ink-300">{f.note}</p>
                        {f.suggestion && (
                          <p className="mt-1 rounded bg-brand/10 px-2 py-1 text-xs text-brand">
                            💡 {f.suggestion}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          ) : (
            !analyzing && (
              <div className="rounded-xl border border-dashed border-white/10 bg-ink-900/40 p-6 text-center text-sm text-ink-300">
                {segments.length > 0 ? (
                  <>
                    התמלול מוכן.{' '}
                    <button
                      onClick={async () => {
                        await fetch(`/api/recordings/${id}/analyze`, { method: 'POST' });
                        refresh();
                      }}
                      className="text-brand hover:underline"
                    >
                      התחל ניתוח
                    </button>
                  </>
                ) : (
                  'ממתין לתמלול וניתוח'
                )}
              </div>
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function activeSegment(segments: Segment[], ms: number) {
  for (const s of segments) {
    if (ms >= s.start_ms && ms <= s.end_ms) return s.idx;
  }
  return null;
}

function WordByWord({
  words,
  currentMs,
  onWordClick,
}: {
  words: Word[];
  currentMs: number;
  onWordClick: (w: Word) => void;
}) {
  return (
    <>
      {words.map((w, i) => {
        const isActive = currentMs >= w.start_ms && currentMs <= w.end_ms;
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onWordClick(w);
            }}
            className={cn(
              'cursor-pointer rounded px-0.5 transition-colors',
              isActive ? 'bg-brand/40 text-white' : 'hover:bg-white/10',
            )}
          >
            {w.text}{' '}
          </span>
        );
      })}
    </>
  );
}

function Card({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-ink-900/60 p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/30">
            {icon}
          </span>
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-emerald-300 ring-emerald-500/30 bg-emerald-500/10' :
    score >= 60 ? 'text-brand ring-brand/30 bg-brand/10' :
    'text-red-300 ring-red-500/30 bg-red-500/10';
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2 ring-1',
        color,
      )}
    >
      <span className="text-xs">ציון כולל</span>
      <span className="text-2xl font-bold tabular-nums">{score}</span>
    </div>
  );
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function JSONArr<T = any>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const p = JSON.parse(s);
    return Array.isArray(p) ? (p as T[]) : [];
  } catch {
    return [];
  }
}
