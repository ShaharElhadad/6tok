import { NextResponse } from 'next/server';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const trainee = db.prepare('SELECT * FROM trainees WHERE id = ?').get(id);
  if (!trainee) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const recordings = db
    .prepare(
      `SELECT r.*, a.score_overall AS score
       FROM recordings r
       LEFT JOIN analyses a ON a.recording_id = r.id
       WHERE r.trainee_id = ?
       ORDER BY r.created_at DESC`,
    )
    .all(id);

  return NextResponse.json({ trainee, recordings });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const body = await req.json().catch(() => ({}));
  const db = getDb();

  const fields: string[] = [];
  const values: any[] = [];
  for (const k of ['name', 'email', 'phone', 'notes']) {
    if (typeof body[k] === 'string' || body[k] === null) {
      fields.push(`${k} = ?`);
      values.push(body[k]);
    }
  }
  if (fields.length === 0) return NextResponse.json({ ok: true });
  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE trainees SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  db.prepare('UPDATE recordings SET trainee_id = NULL WHERE trainee_id = ?').run(id);
  db.prepare('DELETE FROM trainees WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
