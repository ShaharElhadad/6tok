import { NextResponse } from 'next/server';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const whisperUrl = (process.env.WHISPER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

  let whisper_ok = false;
  let whisper_info: any = undefined;
  try {
    const r = await fetch(`${whisperUrl}/`, { signal: AbortSignal.timeout(1500) });
    if (r.ok) {
      whisper_info = await r.json().catch(() => undefined);
      whisper_ok = true;
    }
  } catch {}

  return NextResponse.json({
    whisper_url: whisperUrl,
    whisper_ok,
    whisper_info,
    anthropic_configured: !!process.env.ANTHROPIC_API_KEY,
    anthropic_model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
    db_path: path.join(process.cwd(), 'data', '6tok.db'),
    uploads_path: path.join(process.cwd(), 'uploads'),
    version: '0.1.0',
  });
}
