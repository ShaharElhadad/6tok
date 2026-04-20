import { NextResponse } from 'next/server';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.*,
              (SELECT COUNT(*) FROM recordings WHERE trainee_id = t.id) AS recordings_count,
              (SELECT ROUND(AVG(a.score_overall))
                 FROM recordings r
                 JOIN analyses a ON a.recording_id = r.id
                WHERE r.trainee_id = t.id) AS avg_score,
              (SELECT MAX(created_at) FROM recordings WHERE trainee_id = t.id) AS last_activity
       FROM trainees t
       ORDER BY t.created_at DESC`,
    )
    .all();
  return NextResponse.json({ trainees: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = body.email ? String(body.email).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const db = getDb();
  const info = db
    .prepare('INSERT INTO trainees (name, email, phone, notes) VALUES (?, ?, ?, ?)')
    .run(name, email, phone, notes);
  return NextResponse.json({ id: Number(info.lastInsertRowid) });
}
