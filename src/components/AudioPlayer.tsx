'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  src: string;
  onReady?: (duration: number) => void;
  onTime?: (ms: number) => void;
  /** Milliseconds */
  seekTo?: number | null;
};

export function AudioPlayer({ src, onReady, onTime, seekTo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 72,
      waveColor: '#3A3A3E',
      progressColor: '#E85D2B',
      cursorColor: '#F39A6B',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      url: src,
    });
    wsRef.current = ws;

    ws.on('ready', (d) => {
      setDuration(d);
      onReady?.(d);
    });
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));
    ws.on('timeupdate', (t) => {
      setCurrent(t);
      onTime?.(Math.round(t * 1000));
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (seekTo == null || !wsRef.current) return;
    const ws = wsRef.current;
    const d = ws.getDuration();
    if (!d) return;
    const target = Math.max(0, Math.min(seekTo / 1000, d - 0.05));
    ws.setTime(target);
    ws.play().catch(() => {});
  }, [seekTo]);

  const skip = (delta: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.setTime(Math.max(0, Math.min(ws.getCurrentTime() + delta, ws.getDuration())));
  };

  const setPlaybackRate = (r: number) => {
    setRate(r);
    wsRef.current?.setPlaybackRate(r, true);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-ink-900/70 p-4 shadow-card">
      <div ref={containerRef} className="mb-3" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconBtn onClick={() => skip(-5)} aria-label="חזור 5 שניות">
            <SkipForward className="h-4 w-4" />
          </IconBtn>
          <button
            onClick={() => wsRef.current?.playPause()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-glow transition-transform active:scale-95"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ps-0.5" />}
          </button>
          <IconBtn onClick={() => skip(5)} aria-label="קדימה 5 שניות">
            <SkipBack className="h-4 w-4" />
          </IconBtn>
        </div>

        <div className="flex items-center gap-2 text-sm tabular-nums text-ink-200">
          <span>{fmt(current)}</span>
          <span className="text-ink-500">/</span>
          <span className="text-ink-400">{fmt(duration)}</span>
        </div>

        <div className="flex items-center gap-1 text-xs">
          {[1, 1.25, 1.5, 2].map((r) => (
            <button
              key={r}
              onClick={() => setPlaybackRate(r)}
              className={cn(
                'rounded-md px-2 py-1 ring-1 transition-colors',
                rate === r
                  ? 'bg-brand/20 text-brand ring-brand/40'
                  : 'bg-ink-800 text-ink-200 ring-white/5 hover:bg-ink-700',
              )}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-ink-200 ring-1 ring-white/5 transition-colors hover:bg-ink-700"
      {...rest}
    >
      {children}
    </button>
  );
}

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
