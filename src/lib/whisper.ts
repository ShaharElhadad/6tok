import fs from 'node:fs';
import path from 'node:path';

export type WhisperWord = {
  text: string;
  start_ms: number;
  end_ms: number;
  score?: number | null;
  speaker?: string | null;
};

export type WhisperSegment = {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
  speaker?: string | null;
  words: WhisperWord[];
};

export type WhisperEngine = 'whisperx' | 'groq' | 'openai';

export type WhisperResult = {
  ok: boolean;
  engine: WhisperEngine;
  language: string;
  duration_sec: number | null;
  segments: WhisperSegment[];
};

export class WhisperConfigError extends Error {}

/**
 * Transcribe an audio file. Priority:
 *   1. Local WhisperX server (WHISPER_URL) — free, unlimited size, strongest
 *   2. Groq Whisper `whisper-large-v3` (GROQ_API_KEY) — FREE tier, up to 25MB
 *   3. OpenAI Whisper (OPENAI_API_KEY) — paid, up to 25MB
 */
export async function transcribeFile(
  absFilePath: string,
  opts?: { language?: string; diarize?: boolean },
): Promise<WhisperResult> {
  const whisperUrl = (process.env.WHISPER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

  if (await isLocalWhisperUp(whisperUrl)) {
    return transcribeWithLocal(absFilePath, whisperUrl, opts);
  }

  // Groq — FREE tier with whisper-large-v3 (best free cloud option)
  if (process.env.GROQ_API_KEY) {
    return transcribeWithOpenAICompat(absFilePath, {
      engine: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
      language: opts?.language,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return transcribeWithOpenAICompat(absFilePath, {
      engine: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: process.env.WHISPER_MODEL || 'whisper-1',
      language: opts?.language,
    });
  }

  throw new WhisperConfigError(
    'אין שרת תמלול זמין. אפשרויות (בחר אחת): הפעל שרת Whisper מקומי (whisper-server), או הגדר GROQ_API_KEY (חינמי), או OPENAI_API_KEY ב־.env.local, ואז הפעל מחדש את השרת.',
  );
}

async function isLocalWhisperUp(url: string): Promise<boolean> {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1200) });
    return r.ok;
  } catch {
    return false;
  }
}

// -------- Local WhisperX (FastAPI + whisperX) --------

async function transcribeWithLocal(
  abs: string,
  url: string,
  opts?: { language?: string; diarize?: boolean },
): Promise<WhisperResult> {
  const filename = path.basename(abs);
  const buf = fs.readFileSync(abs);

  const form = new FormData();
  form.append('audio', new Blob([buf]), filename);
  if (opts?.language) form.append('language', opts.language);
  form.append('diarize', opts?.diarize ? '1' : '0');

  const res = await fetch(`${url}/transcribe`, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`WhisperX ${res.status}: ${txt || res.statusText}`);
  }
  const data = (await res.json()) as any;
  return {
    ok: true,
    engine: 'whisperx',
    language: data.language || opts?.language || 'he',
    duration_sec: data.duration_sec ?? null,
    segments: data.segments || [],
  };
}

// -------- Groq / OpenAI / any OpenAI-compatible Whisper --------

async function transcribeWithOpenAICompat(
  abs: string,
  cfg: {
    engine: 'groq' | 'openai';
    apiKey: string;
    baseUrl: string;
    model: string;
    language?: string;
  },
): Promise<WhisperResult> {
  const stat = fs.statSync(abs);
  if (stat.size > 25 * 1024 * 1024) {
    throw new Error(
      `קובץ אודיו גדול מ־25MB (${(stat.size / 1024 / 1024).toFixed(
        1,
      )}MB). APIs של Whisper בענן מוגבלים ל־25MB. הפעל שרת Whisper מקומי לקבצים גדולים יותר.`,
    );
  }

  const filename = path.basename(abs);
  const buf = fs.readFileSync(abs);

  const form = new FormData();
  form.append('file', new Blob([buf]), filename);
  form.append('model', cfg.model);
  form.append('language', cfg.language || 'he');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  form.append('timestamp_granularities[]', 'word');

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${cfg.engine === 'groq' ? 'Groq' : 'OpenAI'} Whisper ${res.status}: ${txt || res.statusText}`);
  }

  const data = (await res.json()) as {
    task?: string;
    language?: string;
    duration?: number;
    text?: string;
    segments?: Array<{ id: number; start: number; end: number; text: string }>;
    words?: Array<{ word: string; start: number; end: number }>;
  };

  const words: WhisperWord[] = (data.words || []).map((w) => ({
    text: w.word,
    start_ms: Math.round(w.start * 1000),
    end_ms: Math.round(w.end * 1000),
  }));

  const segments: WhisperSegment[] = (data.segments || []).map((s, i) => {
    const startMs = Math.round(s.start * 1000);
    const endMs = Math.round(s.end * 1000);
    const segWords = words.filter(
      (w) => w.start_ms >= startMs - 5 && w.end_ms <= endMs + 5,
    );
    return {
      idx: i,
      start_ms: startMs,
      end_ms: endMs,
      text: (s.text || '').trim(),
      words: segWords,
    };
  });

  if (segments.length === 0 && words.length > 0) {
    segments.push({
      idx: 0,
      start_ms: words[0].start_ms,
      end_ms: words[words.length - 1].end_ms,
      text: (data.text || '').trim(),
      words,
    });
  }

  return {
    ok: true,
    engine: cfg.engine,
    language: data.language || cfg.language || 'he',
    duration_sec: data.duration ?? null,
    segments,
  };
}
