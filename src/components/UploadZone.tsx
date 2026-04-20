'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, AudioLines, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';

const ACCEPTED = '.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4,audio/*';

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setProgress(0);

      try {
        const fd = new FormData();
        fd.append('audio', file);

        const xhr = new XMLHttpRequest();
        const done = new Promise<{ id: number }>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error('תשובה לא תקינה מהשרת'));
              }
            } else {
              reject(new Error(xhr.responseText || 'שגיאת העלאה'));
            }
          };
          xhr.onerror = () => reject(new Error('שגיאת רשת'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(fd);

        const { id } = await done;

        // Kick off transcription in background
        fetch(`/api/recordings/${id}/transcribe`, { method: 'POST' }).catch(() => {});

        router.push(`/recordings/${id}`);
      } catch (e: any) {
        setError(e?.message || 'שגיאה');
        setUploading(false);
      }
    },
    [router],
  );

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={cn(
          'group relative w-full cursor-pointer rounded-2xl border border-dashed p-10 transition-all',
          'glass hover:border-brand/70 hover:shadow-glow',
          dragOver ? 'border-brand shadow-glow' : 'border-ink-600',
          uploading && 'pointer-events-none opacity-90',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl transition-all group-hover:bg-brand/30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-ink-800 ring-1 ring-white/5">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              ) : (
                <UploadCloud className="h-7 w-7 text-brand" />
              )}
            </div>
          </div>

          {uploading ? (
            <div className="w-full max-w-md">
              <p className="mb-2 text-sm text-ink-200">מעלה את ההקלטה… {progress}%</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-xl font-semibold text-ink-100">העלה הקלטת שיחה</h3>
                <p className="mt-1 text-sm text-ink-300">
                  גרור לכאן קובץ אודיו או לחץ לבחירה · MP3, WAV, M4A, OGG, FLAC
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-ink-800/70 px-3 py-1 text-xs text-ink-200 ring-1 ring-white/5">
                <AudioLines className="h-3.5 w-3.5 text-brand" />
                תמלול מדויק עם WhisperX large-v3 + ניתוח AI
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
