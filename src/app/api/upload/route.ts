import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function POST(req: Request) {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const form = await req.formData();
    const file = form.get('audio');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'audio field missing' }, { status: 400 });
    }

    const original = file.name || 'recording';
    const ext = path.extname(original) || '.mp3';
    const base = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${base}${ext}`;
    const dest = path.join(UPLOAD_DIR, filename);

    const arrBuf = await file.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrBuf));

    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO recordings (filename, original_name, mime_type, size_bytes, status)
         VALUES (?, ?, ?, ?, 'uploaded')`,
      )
      .run(filename, original, file.type || 'audio/mpeg', arrBuf.byteLength);

    return NextResponse.json({ id: Number(info.lastInsertRowid), filename, original });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 });
  }
}
