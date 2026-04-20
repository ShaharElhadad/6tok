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

export type WhisperResult = {
  ok: boolean;
  language: string;
  duration_sec: number | null;
  segments: WhisperSegment[];
};

export async function transcribeFile(
  absFilePath: string,
  opts?: { language?: string; diarize?: boolean },
): Promise<WhisperResult> {
  const url = (process.env.WHISPER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
  const stat = fs.statSync(absFilePath);
  const filename = path.basename(absFilePath);

  const form = new FormData();
  const buf = fs.readFileSync(absFilePath);
  form.append('audio', new Blob([buf]), filename);
  if (opts?.language) form.append('language', opts.language);
  form.append('diarize', opts?.diarize ? '1' : '0');

  const res = await fetch(`${url}/transcribe`, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Whisper ${res.status}: ${txt || res.statusText}`);
  }
  return (await res.json()) as WhisperResult;
}
