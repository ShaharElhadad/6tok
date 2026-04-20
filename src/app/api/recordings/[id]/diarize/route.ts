import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Agent, setGlobalDispatcher } from 'undici';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600;

let _dispatcherSet = false;
function ensureLongDispatcher() {
  if (_dispatcherSet) return;
  setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 10_000 }));
  _dispatcherSet = true;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as any;
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const segs = db
    .prepare(
      `SELECT idx, start_ms, end_ms FROM transcript_segments WHERE recording_id = ? ORDER BY idx ASC`,
    )
    .all(id) as Array<{ idx: number; start_ms: number; end_ms: number }>;

  if (segs.length === 0) {
    return NextResponse.json({ error: 'no transcript yet' }, { status: 400 });
  }

  (async () => {
    try {
      const whisperUrl = (process.env.WHISPER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
      const abs = path.join(process.cwd(), 'uploads', rec.filename);
      const buf = fs.readFileSync(abs);

      const form = new FormData();
      form.append('audio', new Blob([buf]), rec.filename);
      form.append('segments_json', JSON.stringify(segs));
      form.append('min_speakers', '2');
      form.append('max_speakers', '4');

      ensureLongDispatcher();
      const res = await fetch(`${whisperUrl}/diarize-only`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Diarize ${res.status}: ${txt || res.statusText}`);
      }
      const data = (await res.json()) as {
        assignments: Array<{ idx: number; speaker: string | null }>;
        speakers: string[];
      };

      const upd = db.prepare(
        `UPDATE transcript_segments SET speaker = ? WHERE recording_id = ? AND idx = ?`,
      );
      const tx = db.transaction(() => {
        for (const a of data.assignments) upd.run(a.speaker, id, a.idx);
      });
      tx();
    } catch (e: any) {
      console.error('diarize failed', e);
      // Do not flip the recording status on diarization failure — keep the transcript/analysis intact.
    }
  })();

  return NextResponse.json({ status: 'diarizing', segments: segs.length });
}
