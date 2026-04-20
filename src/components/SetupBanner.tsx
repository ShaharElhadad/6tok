'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, CheckCircle2, Settings } from 'lucide-react';

export function SetupBanner() {
  const [h, setH] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setH)
      .catch(() => {});
  }, []);

  if (!h) return null;
  if (h.ready) return null;

  const missing: string[] = [];
  if (!h.transcription_engine) missing.push('תמלול (WhisperX / Groq / OpenAI)');
  if (!h.llm_provider) missing.push('ניתוח (Anthropic / Gemini)');

  return (
    <div className="mx-auto max-w-6xl px-6 pt-5">
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[13px] text-amber-200">
        <CircleAlert className="h-4 w-4 flex-none" />
        <div className="flex-1">
          <span className="font-medium">נדרש להשלים הגדרות:</span>{' '}
          <span className="text-amber-100/80">{missing.join(' · ')}</span>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 text-[12px] text-amber-100 transition-colors hover:bg-white/[0.1]"
        >
          <Settings className="h-3.5 w-3.5" />
          הגדרות
        </Link>
      </div>
    </div>
  );
}
