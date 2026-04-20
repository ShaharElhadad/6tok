import { NextResponse } from 'next/server';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.*, a.score_overall AS score
       FROM recordings r
       LEFT JOIN analyses a ON a.recording_id = r.id
       ORDER BY r.created_at DESC
       LIMIT 200`,
    )
    .all();
  return NextResponse.json({ recordings: rows });
}
