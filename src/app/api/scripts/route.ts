import { NextResponse } from 'next/server';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM scripts ORDER BY updated_at DESC`).all();
  return NextResponse.json({ scripts: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim() || 'תסריט ללא שם';
  const content = String(body.content || '').trim();
  const setActive = !!body.set_active;

  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const db = getDb();
  const tx = db.transaction(() => {
    if (setActive) db.prepare(`UPDATE scripts SET is_active = 0`).run();
    const info = db
      .prepare(
        `INSERT INTO scripts (name, content, is_active) VALUES (?, ?, ?)`,
      )
      .run(name, content, setActive ? 1 : 0);
    return Number(info.lastInsertRowid);
  });
  const id = tx();
  return NextResponse.json({ id });
}
