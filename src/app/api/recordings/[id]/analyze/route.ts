import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { analyzeTranscript } from '@/lib/analyze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 min

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as any;
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (rec.status === 'analyzing') return NextResponse.json({ status: 'analyzing' });
  if (rec.status !== 'transcribed' && rec.status !== 'analyzed' && rec.status !== 'failed') {
    return NextResponse.json({ error: `cannot analyze status=${rec.status}` }, { status: 400 });
  }

  const segments = db
    .prepare(
      `SELECT start_ms, end_ms, text, speaker
       FROM transcript_segments WHERE recording_id = ? ORDER BY idx ASC`,
    )
    .all(id) as Array<{ start_ms: number; end_ms: number; text: string; speaker: string | null }>;

  if (segments.length === 0)
    return NextResponse.json({ error: 'no transcript' }, { status: 400 });

  // Load active script (optional)
  const activeScript = db
    .prepare(`SELECT content FROM scripts WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1`)
    .get() as { content: string } | undefined;

  db.prepare(`UPDATE recordings SET status='analyzing', updated_at=datetime('now') WHERE id = ?`).run(id);

  (async () => {
    try {
      const result = await analyzeTranscript({
        transcript: segments,
        scriptContent: activeScript?.content || null,
      });

      const tx = db.transaction(() => {
        db.prepare('DELETE FROM analyses WHERE recording_id = ?').run(id);
        db.prepare(
          `INSERT INTO analyses
             (recording_id, score_overall, summary, strengths_json, weaknesses_json,
              findings_json, script_adherence_json, suggestions_json, raw_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          result.score_overall ?? null,
          result.summary ?? null,
          JSON.stringify(result.strengths || []),
          JSON.stringify(result.weaknesses || []),
          JSON.stringify(result.findings || []),
          JSON.stringify(result.script_adherence || {}),
          JSON.stringify(result.suggestions || []),
          JSON.stringify(result),
        );
        db.prepare(`UPDATE recordings SET status='analyzed', updated_at=datetime('now') WHERE id = ?`).run(
          id,
        );
      });
      tx();
    } catch (e: any) {
      db.prepare(`UPDATE recordings SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(
        String(e?.message || e),
        id,
      );
    }
  })();

  return NextResponse.json({ status: 'analyzing' });
}
