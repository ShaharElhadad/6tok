import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as any;
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const segments = db
    .prepare(
      `SELECT id, idx, start_ms, end_ms, text, speaker, words_json
       FROM transcript_segments WHERE recording_id = ? ORDER BY idx ASC`,
    )
    .all(id);

  const analysis = db.prepare(`SELECT * FROM analyses WHERE recording_id = ?`).get(id);

  return NextResponse.json({ recording: rec, segments, analysis });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const rec = db.prepare('SELECT filename FROM recordings WHERE id = ?').get(id) as
    | { filename: string }
    | undefined;
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });
  try {
    fs.unlinkSync(path.join(process.cwd(), 'uploads', rec.filename));
  } catch {}
  db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
