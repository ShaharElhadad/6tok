import { NextResponse } from 'next/server';
import path from 'node:path';
import { getDb } from '@/db';
import { transcribeFile } from '@/lib/whisper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 900; // 15 min

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as any;
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Prevent double-run
  if (rec.status === 'transcribing' || rec.status === 'analyzing') {
    return NextResponse.json({ status: rec.status });
  }

  db.prepare(`UPDATE recordings SET status='transcribing', error=NULL, updated_at=datetime('now') WHERE id=?`).run(id);

  // Fire and forget
  (async () => {
    try {
      const abs = path.join(process.cwd(), 'uploads', rec.filename);
      const result = await transcribeFile(abs, {
        language: 'he',
        // Sales calls: typically 2 speakers (coach/seller + trainee/customer). Allow 2–4.
        diarize: true,
        minSpeakers: 2,
        maxSpeakers: 4,
      });

      const tx = db.transaction(() => {
        db.prepare('DELETE FROM transcript_segments WHERE recording_id = ?').run(id);
        const ins = db.prepare(
          `INSERT INTO transcript_segments
           (recording_id, idx, start_ms, end_ms, text, speaker, words_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const s of result.segments) {
          ins.run(
            id,
            s.idx,
            s.start_ms,
            s.end_ms,
            s.text,
            s.speaker ?? null,
            JSON.stringify(s.words || []),
          );
        }
        db.prepare(
          `UPDATE recordings
           SET status='transcribed', duration_sec=?, updated_at=datetime('now')
           WHERE id = ?`,
        ).run(result.duration_sec ?? null, id);
      });
      tx();

      // Kick off analysis
      try {
        await fetch(new URL(`/api/recordings/${id}/analyze`, publicBaseUrl()).toString(), {
          method: 'POST',
        });
      } catch {
        /* analysis can be triggered from UI too */
      }
    } catch (e: any) {
      db.prepare(
        `UPDATE recordings SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`,
      ).run(String(e?.message || e), id);
    }
  })();

  return NextResponse.json({ status: 'transcribing' });
}

function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3300';
}
