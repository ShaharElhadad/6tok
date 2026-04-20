import { TopBar } from '@/components/TopBar';
import { UploadZone } from '@/components/UploadZone';
import { RecordingCard } from '@/components/RecordingCard';
import { getDb, type Recording } from '@/db';
import { Mic, Target, Brain } from 'lucide-react';

export const dynamic = 'force-dynamic';

function loadRecent() {
  const db = getDb();
  const recordings = db
    .prepare(
      `SELECT r.*, a.score_overall AS score
       FROM recordings r
       LEFT JOIN analyses a ON a.recording_id = r.id
       ORDER BY r.created_at DESC
       LIMIT 25`,
    )
    .all() as Array<Recording & { score: number | null }>;
  return recordings;
}

export default function Home() {
  const items = loadRecent();

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="mb-12 text-center">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-ink-100 sm:text-5xl">
            תנתח כל שיחת מכירה.{' '}
            <span className="text-brand">תלמד מכל מילה.</span>
          </h1>
          <p className="mt-4 text-balance text-lg text-ink-300">
            העלאת הקלטה → תמלול מדויק → ניתוח AI של קירובים, הרחקות, שאלות, טון ורגש —
            עם הצמדה לכל רגע בשיחה.
          </p>
        </section>

        <section className="mb-10">
          <UploadZone />
        </section>

        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Mic className="h-5 w-5" />}
            title="תמלול מדויק"
            body="WhisperX large-v3 עם יישור מילים מדויק לעברית"
          />
          <FeatureCard
            icon={<Brain className="h-5 w-5" />}
            title="ניתוח מקצועי"
            body="AI מזהה קירובים, הרחקות, שאלות פתוחות, התנגדויות וטון"
          />
          <FeatureCard
            icon={<Target className="h-5 w-5" />}
            title="השוואה לתסריט"
            body="מדגיש היכן עמדת בתסריט והיכן סטית — לכל רגע"
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-100">הקלטות אחרונות</h2>
            <span className="text-xs text-ink-400">
              סה״כ {items.length}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-ink-900/40 p-10 text-center text-ink-300">
              עוד לא העלית הקלטות. העלה אחת למעלה כדי להתחיל.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((r) => (
                <RecordingCard key={r.id} r={r} score={r.score} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-ink-900/60 p-5 shadow-card">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/30">
        {icon}
      </div>
      <h3 className="font-semibold text-ink-100">{title}</h3>
      <p className="mt-1 text-sm text-ink-300">{body}</p>
    </div>
  );
}
