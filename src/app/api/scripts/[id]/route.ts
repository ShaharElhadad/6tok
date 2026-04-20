import { NextResponse } from 'next/server';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const body = await req.json().catch(() => ({}));
  const db = getDb();

  const tx = db.transaction(() => {
    if (body.set_active) {
      db.prepare(`UPDATE scripts SET is_active = 0`).run();
      db.prepare(`UPDATE scripts SET is_active = 1, updated_at = datetime('now') WHERE id = ?`).run(id);
    }
    if (typeof body.content === 'string') {
      db.prepare(`UPDATE scripts SET content = ?, updated_at = datetime('now') WHERE id = ?`).run(
        body.content,
        id,
      );
    }
    if (typeof body.name === 'string') {
      db.prepare(`UPDATE scripts SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(
        body.name,
        id,
      );
    }
  });
  tx();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
