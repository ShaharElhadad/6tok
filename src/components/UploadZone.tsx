'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/cn';

const ACCEPTED = '.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4,audio/*';

type Props = {
  variant?: 'inline' | 'modal';
  onClose?: () => void;
};

export function UploadZone({ variant = 'inline', onClose }: Props) {
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
              try { resolve(JSON.parse(xhr.responseText)); }
              catch { reject(new Error('תשובה לא תקינה מהשרת')); }
            } else reject(new Error(xhr.responseText || 'שגיאת העלאה'));
          };
          xhr.onerror = () => reject(new Error('שגיאת רשת'));
        });
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
        const { id } = await done;
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
    <div
      className={cn(
        'rounded-xl bg-ink-900 ring-1 ring-white/[0.06]',
        variant === 'modal' && 'p-4',
      )}
    >
      {variant === 'modal' && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-ink-100">העלאת שיחה</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-white/[0.05] hover:text-ink-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-all',
          dragOver
            ? 'border-brand bg-brand/[0.05]'
            : 'border-white/[0.08] bg-white/[0.01] hover:border-white/[0.14] hover:bg-white/[0.02]',
          uploading && 'pointer-events-none',
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

        <div
          className={cn(
            'mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 ring-1 transition-colors',
            dragOver ? 'ring-brand' : 'ring-brand/30',
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
          ) : (
            <Upload className="h-5 w-5 text-brand" />
          )}
        </div>

        {uploading ? (
          <>
            <div className="mb-2 text-[14px] font-medium text-ink-100">
              מעלה… {progress}%
            </div>
            <div className="h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-[14px] font-medium text-ink-100">
              גרור קובץ אודיו לכאן, או לחץ לבחירה
            </div>
            <div className="mt-1 text-[12px] text-ink-400">
              MP3 · WAV · M4A · OGG · FLAC · עד 500MB
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
