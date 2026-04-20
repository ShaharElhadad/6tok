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

  const groq_configured = !!process.env.GROQ_API_KEY;
  const openai_configured = !!process.env.OPENAI_API_KEY;
  const anthropic_configured = !!process.env.ANTHROPIC_API_KEY;
  const gemini_configured = !!process.env.GEMINI_API_KEY;

  // Which engine will actually handle a transcription now
  const transcription_engine = whisper_ok
    ? 'whisperx'
    : groq_configured
      ? 'groq'
      : openai_configured
        ? 'openai'
        : null;

  const forced = (process.env.LLM_PROVIDER || '').toLowerCase();
  const llm_provider =
    forced === 'gemini' && gemini_configured
      ? 'gemini'
      : forced === 'anthropic' && anthropic_configured
        ? 'anthropic'
        : anthropic_configured
          ? 'anthropic'
          : gemini_configured
            ? 'gemini'
            : null;

  const ready = !!transcription_engine && !!llm_provider;

  return NextResponse.json({
    ready,
    transcription_engine,
    llm_provider,

    // Local whisper
    whisper_url: whisperUrl,
    whisper_ok,
    whisper_info,

    // Cloud whisper options
    groq_configured,
    groq_model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
    openai_configured,
    openai_base_url: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    whisper_model: process.env.WHISPER_MODEL || 'whisper-1',

    // LLM options
    anthropic_configured,
    anthropic_model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
    gemini_configured,
    gemini_model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

    db_path: path.join(process.cwd(), 'data', '6tok.db'),
    uploads_path: path.join(process.cwd(), 'uploads'),
    version: '0.1.0',
  });
}
