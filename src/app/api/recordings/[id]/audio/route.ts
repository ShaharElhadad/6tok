import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '@/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const db = getDb();
  const rec = db.prepare('SELECT filename, mime_type FROM recordings WHERE id = ?').get(id) as
    | { filename: string; mime_type: string }
    | undefined;
  if (!rec) return new Response('not found', { status: 404 });

  const abs = path.join(process.cwd(), 'uploads', rec.filename);
  if (!fs.existsSync(abs)) return new Response('missing file', { status: 404 });

  const stat = fs.statSync(abs);
  const size = stat.size;
  const ext = path.extname(rec.filename).toLowerCase();
  const mime = MIME[ext] || rec.mime_type || 'application/octet-stream';

  const range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d+)-(\d+)?/.exec(range);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : size - 1;
      const chunk = end - start + 1;
      const stream = fs.createReadStream(abs, { start, end });
      return new Response(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunk),
          'Content-Type': mime,
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  const stream = fs.createReadStream(abs);
  return new Response(stream as any, {
    status: 200,
    headers: {
      'Content-Length': String(size),
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  });
}
